const Order = require('../models/Order');
const Store = require('../models/Store');
const Driver = require('../models/Driver');

// Machine Learning Service for delivery time prediction
// Uses historical order data to train and predict delivery durations

class DeliveryPredictionML {
  constructor() {
    this.model = null;
    this.features = null;
    this.isTraining = false;
    this.lastTrainTime = null;
    this.predictionCache = new Map();
    this.CACHE_TTL = 1000 * 60 * 10; // 10 minutes
  }

  /**
   * Extracts features from an order for ML training/prediction
   */
  async extractOrderFeatures(order) {
    try {
      const store = await Store.findById(order.storeId);
      const driver = order.deliveryPartnerId ? 
        await Driver.findById(order.deliveryPartnerId) : null;

      const pickupTime = new Date(order.createdAt);
      const hour = pickupTime.getHours();
      const dayOfWeek = pickupTime.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

      // Calculate distance (simplified - use actual lat/long distance if available)
      const distance = this.calculateDistance(
        order.storeLocation?.coordinates,
        order.deliveryLocation?.coordinates
      ) || 0;

      // Estimate items weight (approximation)
      const itemsCount = order.items?.length || 1;
      const itemsWeight = itemsCount * 0.5; // 500g per item estimate

      return {
        distance: distance || 1, // km
        itemsCount: itemsCount,
        itemsWeight: itemsWeight,
        storeType: store?.type || 'general', // grocery, restaurant, pharmacy, etc.
        hour: hour, // 0-23
        dayOfWeek: dayOfWeek, // 0-6
        isWeekend: isWeekend,
        isPeak: (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20) ? 1 : 0, // lunch/dinner peak
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

  /**
   * Calculate distance between two geographic points (Haversine formula)
   */
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return null;
    if (!coord1[0] || !coord2[0]) return null;

    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.max(distance, 0.1); // Min 100m
  }

  /**
   * Train ML model on historical order data
   * Uses simple linear regression and decision tree heuristics
   */
  async trainModel() {
    if (this.isTraining) return;
    
    try {
      this.isTraining = true;
      console.log('[ML] Starting model training on historical orders...');

      // Fetch completed orders with delivery durations
      const completedOrders = await Order.find({
        status: 'delivered',
        deliveryStartTime: { $exists: true },
        deliveryEndTime: { $exists: true }
      })
      .limit(1000)
      .lean()
      .exec();

      if (completedOrders.length < 10) {
        console.warn('[ML] Insufficient training data, using fallback model');
        this.initializeFallbackModel();
        return;
      }

      // Extract features and targets
      const trainingData = [];
      const targets = [];

      for (const order of completedOrders) {
        const features = await this.extractOrderFeatures(order);
        if (!features) continue;

        // Calculate actual delivery duration in minutes
        const startTime = new Date(order.deliveryStartTime);
        const endTime = new Date(order.deliveryEndTime);
        const durationMinutes = (endTime - startTime) / (1000 * 60);

        if (durationMinutes > 0 && durationMinutes < 180) { // Valid 0-3 hour deliveries
          trainingData.push(features);
          targets.push(Math.max(durationMinutes, 5)); // Min 5 min delivery
        }
      }

      if (trainingData.length < 5) {
        this.initializeFallbackModel();
        return;
      }

      // Train simple decision tree model with heuristics
      this.model = this.trainDecisionTree(trainingData, targets);
      this.lastTrainTime = new Date();
      
      // Calculate R² score for validation
      const r2 = this.calculateR2Score(trainingData, targets);
      console.log(`[ML] Model trained on ${trainingData.length} orders. R² = ${r2.toFixed(3)}`);

    } catch (error) {
      console.error('[ML] Training error:', error);
      this.initializeFallbackModel();
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Simple decision-tree-like model using weighted features
   */
  trainDecisionTree(trainingData, targets) {
    const model = {
      type: 'weighted_linear',
      baseTime: 15, // Base delivery time in minutes
      weights: {},
      storeTypeModifiers: {},
      hourModifiers: {}
    };

    // Calculate average by store type
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

    // Calculate modifiers by hour of day
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

    // Feature weights (importance in minutes per unit)
    model.weights = {
      distance: 3.5, // 3.5 min per km
      itemsCount: 1.2, // 1.2 min per item
      itemsWeight: 0.8, // 0.8 min per kg
      driverExperience: -0.01, // Experienced drivers are faster (-0.01 min per delivery)
      driverRating: -0.5, // Better rated drivers save time (-0.5 min per rating point)
      isPeak: 5, // Add 5 min during peak hours
      isWeekend: 2, // Add 2 min on weekends
      orderValue: 0.02 // 0.02 min per currency unit (high-value orders get priority)
    };

    return model;
  }

  /**
   * Initialize fallback model if training data insufficient
   */
  initializeFallbackModel() {
    this.model = {
      type: 'fallback',
      baseTime: 20,
      distanceFactor: 3
    };
    console.log('[ML] Using fallback model');
  }

  /**
   * Calculate R² (coefficient of determination) for model validation
   */
  calculateR2Score(trainingData, targets) {
    if (trainingData.length === 0) return 0;

    const predictions = trainingData.map(data => this.predictDuration(data));
    const meanTarget = targets.reduce((a, b) => a + b, 0) / targets.length;

    const ssRes = predictions.reduce((sum, pred, i) => {
      return sum + Math.pow(targets[i] - pred, 2);
    }, 0);

    const ssTot = targets.reduce((sum, target) => {
      return sum + Math.pow(target - meanTarget, 2);
    }, 0);

    return ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  }

  /**
   * Predict delivery duration for given features
   */
  predictDuration(features) {
    if (!this.model) this.initializeFallbackModel();

    if (this.model.type === 'fallback') {
      return this.model.baseTime + (features.distance * this.model.distanceFactor);
    }

    // Weighted linear model
    let prediction = this.model.baseTime;

    // Apply feature weights
    prediction += features.distance * this.model.weights.distance;
    prediction += features.itemsCount * this.model.weights.itemsCount;
    prediction += features.itemsWeight * this.model.weights.itemsWeight;
    prediction += features.driverExperience * this.model.weights.driverExperience;
    prediction += features.driverRating * this.model.weights.driverRating;
    prediction += features.isPeak * this.model.weights.isPeak;
    prediction += features.isWeekend * this.model.weights.isWeekend;
    prediction += features.orderValue * this.model.weights.orderValue;

    // Apply store type modifier
    const storeModifier = this.model.storeTypeModifiers[features.storeType] || 0;
    prediction += storeModifier;

    // Apply hour modifier
    const hourModifier = this.model.hourModifiers[features.hour] || 0;
    prediction += hourModifier;

    // Clamp to reasonable bounds (5-120 minutes)
    return Math.max(5, Math.min(120, Math.round(prediction)));
  }

  /**
   * Predict delivery metrics for an order
   * Returns predictedDurationMinutes and confidence score
   */
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
      
      // Confidence score based on training data completeness and feature quality
      const confidence = Math.min(
        0.95,
        0.6 + // Base confidence
        (features.distance > 0 ? 0.1 : 0) + // Distance available
        (features.driverExperience > 10 ? 0.15 : 0.05) + // Driver experience
        (this.lastTrainTime && Date.now() - this.lastTrainTime < 1000 * 60 * 60 ? 0.1 : 0) // Fresh model
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

  /**
   * Batch predict for multiple orders
   */
  async predictBatch(orders) {
    return Promise.all(
      orders.map(order => this.predictDeliveryMetrics(order))
    );
  }

  /**
   * Retrain model periodically
   * Should be called by a cron job or scheduled task
   */
  async schedulePeriodicRetraining(intervalMs = 1000 * 60 * 60) {
    setInterval(() => {
      this.trainModel().catch(err => 
        console.error('[ML] Scheduled retraining failed:', err)
      );
    }, intervalMs);
  }

  /**
   * Get model statistics for monitoring
   */
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

// Singleton instance
const deliveryPredictionML = new DeliveryPredictionML();

module.exports = deliveryPredictionML;
