const Order = require('../models/Order');
const Store = require('../models/Store');
const Driver = require('../models/Driver');

class DeliveryPredictionML {
  constructor() {
    this.model = null;
    this.isTraining = false;
    this.lastTrainTime = null;
    this.predictionCache = new Map();
    this.CACHE_TTL = 1000 * 60 * 10;
  }

  async extractOrderFeatures(order) {
    try {
      const store = await Store.findById(order.storeId);
      const driver = order.deliveryPartnerId ? await Driver.findById(order.deliveryPartnerId) : null;

      const pickupTime = new Date(order.createdAt);
      const hour = pickupTime.getHours();
      const dayOfWeek = pickupTime.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

      const distance = this.calculateDistance(
        order.storeLocation?.coordinates,
        order.deliveryLocation?.coordinates
      ) || 0;

      const itemsCount = order.items?.length || 1;
      const itemsWeight = itemsCount * 0.5;

      return {
        distance: distance || 1,
        itemsCount,
        itemsWeight,
        storeType: store?.type || 'general',
        hour,
        dayOfWeek,
        isWeekend,
        isPeak: (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20) ? 1 : 0,
        driverExperience: driver?.totalDeliveries || 0,
        driverRating: driver?.averageRating || 4.5,
        orderValue: order.totalPrice || 0,
        isProductionDeploy: process.env.NODE_ENV === 'production' ? 1 : 0
      };
    } catch (error) {
      console.error('Error extracting order features:', error);
      return null;
    }
  }

  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return null;
    if (!coord1[0] || !coord2[0]) return null;

    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.max(distance, 0.1);
  }

  async trainModel() {
    if (this.isTraining) return;

    try {
      this.isTraining = true;
      console.log('[ML] Starting model training on historical orders...');

      const completedOrders = await Order.find({
        status: 'delivered',
        deliveryStartTime: { $exists: true },
        deliveryEndTime: { $exists: true }
      }).limit(1000).lean().exec();

      if (completedOrders.length < 10) {
        console.warn('[ML] Insufficient training data, using fallback model');
        this.initializeFallbackModel();
        return;
      }

      const trainingData = [];
      const targets = [];

      for (const order of completedOrders) {
        const features = await this.extractOrderFeatures(order);
        if (!features) continue;

        const startTime = new Date(order.deliveryStartTime);
        const endTime = new Date(order.deliveryEndTime);
        const durationMinutes = (endTime - startTime) / (1000 * 60);

        if (durationMinutes > 0 && durationMinutes < 180) {
          trainingData.push(features);
          targets.push(Math.max(durationMinutes, 5));
        }
      }

      if (trainingData.length < 5) {
        this.initializeFallbackModel();
        return;
      }

      this.model = this.trainDecisionTree(trainingData, targets);
      this.lastTrainTime = new Date();

      const r2 = this.calculateR2Score(trainingData, targets);
      console.log(`[ML] Model trained on ${trainingData.length} orders. R2 = ${r2.toFixed(3)}`);

    } catch (error) {
      console.error('[ML] Training error:', error);
      this.initializeFallbackModel();
    } finally {
      this.isTraining = false;
    }
  }

  trainDecisionTree(trainingData, targets) {
    const model = {
      type: 'weighted_linear',
      baseTime: 15,
      weights: {},
      storeTypeModifiers: {},
      hourModifiers: {}
    };

    const storeTypeGroups = {};
    for (let i = 0; i < trainingData.length; i++) {
      const type = trainingData[i].storeType;
      if (!storeTypeGroups[type]) storeTypeGroups[type] = [];
      storeTypeGroups[type].push(targets[i]);
    }

    for (const type in storeTypeGroups) {
      const avg = storeTypeGroups[type].reduce((a, b) => a + b, 0) / storeTypeGroups[type].length;
      model.storeTypeModifiers[type] = Math.max(avg - model.baseTime, -5);
    }

    const hourGroups = {};
    for (let i = 0; i < trainingData.length; i++) {
      const hour = trainingData[i].hour;
      if (!hourGroups[hour]) hourGroups[hour] = [];
      hourGroups[hour].push(targets[i]);
    }

    for (const hour in hourGroups) {
      const avg = hourGroups[hour].reduce((a, b) => a + b, 0) / hourGroups[hour].length;
      model.hourModifiers[hour] = Math.max(avg - model.baseTime, -5);
    }

    model.weights = {
      distance: 3.5,
      itemsCount: 1.2,
      itemsWeight: 0.8,
      driverExperience: -0.01,
      driverRating: -0.5,
      isPeak: 5,
      isWeekend: 2,
      orderValue: 0.02
    };

    return model;
  }

  initializeFallbackModel() {
    this.model = {
      type: 'fallback',
      baseTime: 20,
      distanceFactor: 3
    };
    console.log('[ML] Using fallback model');
  }

  calculateR2Score(trainingData, targets) {
    if (trainingData.length === 0) return 0;

    const predictions = trainingData.map((data) => this.predictDuration(data));
    const meanTarget = targets.reduce((a, b) => a + b, 0) / targets.length;

    const ssRes = predictions.reduce((sum, pred, i) => sum + Math.pow(targets[i] - pred, 2), 0);
    const ssTot = targets.reduce((sum, target) => sum + Math.pow(target - meanTarget, 2), 0);

    return ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  }

  predictDuration(features) {
    if (!this.model) this.initializeFallbackModel();

    if (this.model.type === 'fallback') {
      return this.model.baseTime + (features.distance * this.model.distanceFactor);
    }

    let prediction = this.model.baseTime;

    prediction += features.distance * this.model.weights.distance;
    prediction += features.itemsCount * this.model.weights.itemsCount;
    prediction += features.itemsWeight * this.model.weights.itemsWeight;
    prediction += features.driverExperience * this.model.weights.driverExperience;
    prediction += features.driverRating * this.model.weights.driverRating;
    prediction += features.isPeak * this.model.weights.isPeak;
    prediction += features.isWeekend * this.model.weights.isWeekend;
    prediction += features.orderValue * this.model.weights.orderValue;

    const storeModifier = this.model.storeTypeModifiers[features.storeType] || 0;
    prediction += storeModifier;

    const hourModifier = this.model.hourModifiers[features.hour] || 0;
    prediction += hourModifier;

    return Math.max(5, Math.min(120, Math.round(prediction)));
  }

  async predictDeliveryMetrics(order) {
    try {
      const cacheKey = `${order._id}`;
      const cached = this.predictionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.metrics;
      }

      if (!this.model) {
        await this.trainModel();
      }

      const features = await this.extractOrderFeatures(order);
      if (!features) {
        return {
          predictedDurationMinutes: 20,
          confidence: 0.3,
          source: 'fallback_no_features'
        };
      }

      const duration = this.predictDuration(features);
      const confidence = Math.min(
        0.95,
        0.6 +
        (features.distance > 0 ? 0.1 : 0) +
        (features.driverExperience > 10 ? 0.15 : 0.05) +
        (this.lastTrainTime && Date.now() - this.lastTrainTime < 1000 * 60 * 60 ? 0.1 : 0)
      );

      const metrics = {
        predictedDurationMinutes: duration,
        confidence: Math.round(confidence * 100) / 100,
        source: 'ml_model',
        features: {
          distance: features.distance,
          storeType: features.storeType,
          isPeak: features.isPeak === 1,
          driverRating: features.driverRating
        }
      };

      this.predictionCache.set(cacheKey, {
        metrics,
        timestamp: Date.now()
      });

      return metrics;

    } catch (error) {
      console.error('[ML] Prediction error:', error);
      return {
        predictedDurationMinutes: 20,
        confidence: 0.2,
        source: 'error_fallback'
      };
    }
  }

  async predictBatch(orders) {
    return Promise.all(orders.map((order) => this.predictDeliveryMetrics(order)));
  }

  async schedulePeriodicRetraining(intervalMs = 1000 * 60 * 60) {
    setInterval(() => {
      this.trainModel().catch((err) => console.error('[ML] Scheduled retraining failed:', err));
    }, intervalMs);
  }

  getModelStats() {
    return {
      modelType: this.model?.type || 'none',
      lastTrainTime: this.lastTrainTime,
      isTraining: this.isTraining,
      cacheSize: this.predictionCache.size,
      modelWeights: this.model?.type === 'weighted_linear' ? this.model.weights : null
    };
  }
}

const deliveryPredictionML = new DeliveryPredictionML();

module.exports = deliveryPredictionML;
