// Delivery dispatch service with ML-powered predictions and smart matching
// Integrates deliveryPredictionML and smartDriverMatcher for optimal assignments

const Order = require('../models/Order');
const Driver = require('../models/Driver');
const deliveryPredictionML = require('./deliveryPredictionML');
const smartDriverMatcher = require('./smartDriverMatcher');

class DispatchServiceML {
  constructor() {
    this.maxDistanceKm = process.env.DISPATCH_MAX_DISTANCE_METERS 
      ? parseInt(process.env.DISPATCH_MAX_DISTANCE_METERS) / 1000 
      : 10;
  }

  /**
   * Get detailed dispatch recommendations for an order
   * Includes ML predictions and smart driver matching
   */
  async getDispatchRecommendations(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('storeId')
        .populate('deliveryPartnerId')
        .lean();

      if (!order) {
        throw new Error('Order not found');
      }

      // Get ML delivery time prediction
      const prediction = await deliveryPredictionML.predictDeliveryMetrics(order);

      // Get smart driver matches
      const driverMatches = await smartDriverMatcher.matchDriversForOrder(order, null, {
        maxDistance: this.maxDistanceKm,
        topN: 5
      });

      // Get matching statistics for admin visibility
      const stats = await smartDriverMatcher.getMatchingStats(order);

      return {
        orderId: order._id,
        orderSummary: {
          createdAt: order.createdAt,
          totalPrice: order.totalPrice,
          itemsCount: order.items?.length || 0,
          storeId: order.storeId?._id || order.storeId,
          storeName: order.storeId?.name || 'Unknown Store'
        },
        deliveryPrediction: prediction,
        driverRecommendations: driverMatches.map(match => ({
          driverId: match.driver._id,
          driverName: match.driver.name,
          driverPhone: match.driver.phone,
          matchScore: Math.round(match.score),
          tier: smartDriverMatcher.getPerformanceTier(match.driver),
          factors: {
            distance: Math.round(match.factors.distance * 100) / 100,
            proximityScore: match.factors.proximityScore,
            availabilityScore: match.factors.availabilityScore,
            performanceScore: match.factors.performanceScore,
            ratingScore: match.factors.ratingScore,
            experienceScore: match.factors.experienceScore,
            onTimeRate: match.factors.onTimeRate,
            rating: Math.round(match.factors.rating * 100) / 100,
            activeOrders: match.factors.activeOrders
          },
          recommendation: this.buildRecommendation(match)
        })),
        matchingStats: {
          availableDrivers: stats.availableDriverCount,
          viableMatches: stats.viableMatches,
          suggestionReason: this.getRecommendationReason(order, driverMatches)
        }
      };

    } catch (error) {
      console.error('[DispatchServiceML] Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Build recommendation text based on match factors
   */
  buildRecommendation(match) {
    const tier = smartDriverMatcher.getPerformanceTier(match.driver);
    const distance = match.factors.distance;
    const onTimeRate = match.factors.onTimeRate;

    let reason = [];

    if (tier === 'elite') {
      reason.push('⭐ Elite performer - exceptional on-time rate');
    } else if (tier === 'excellent') {
      reason.push('✓ Excellent performance history');
    }

    if (distance < 2) {
      reason.push('📍 Very close to pickup location');
    } else if (distance < 5) {
      reason.push('📍 Reasonably close to pickup');
    }

    if (onTimeRate >= 95) {
      reason.push('⏱️ Outstanding on-time performance');
    } else if (onTimeRate >= 90) {
      reason.push('⏱️ Strong on-time performance');
    }

    if (match.factors.activeOrders === 0) {
      reason.push('🚗 Currently available');
    } else if (match.factors.activeOrders <= 2) {
      reason.push('🚗 Low workload');
    }

    return reason.join(' • ');
  }

  /**
   * Get reason for top recommendation
   */
  getRecommendationReason(order, matches) {
    if (matches.length === 0) {
      return 'No drivers available within distance threshold';
    }

    const topMatch = matches[0];
    const tier = smartDriverMatcher.getPerformanceTier(topMatch.driver);
    
    return `Top recommendation: ${topMatch.driver.name} (${tier} performer, ${topMatch.factors.onTimeRate}% on-time)`;
  }

  /**
   * Auto-assign order to best driver
   */
  async autoAssignOrder(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) throw new Error('Order not found');
      if (order.deliveryPartnerId) {
        throw new Error('Order already assigned');
      }

      const recommendations = await this.getDispatchRecommendations(orderId);
      
      if (recommendations.driverRecommendations.length === 0) {
        throw new Error('No suitable drivers available');
      }

      const topDriver = recommendations.driverRecommendations[0];
      
      // Update order with assignment
      order.deliveryPartnerId = topDriver.driverId;
      order.status = 'assigned';
      order.assignedAt = new Date();
      
      await order.save();

      return {
        orderId: order._id,
        assignedDriverId: topDriver.driverId,
        assignedDriverName: topDriver.driverName,
        matchScore: topDriver.matchScore,
        estimatedDuration: recommendations.deliveryPrediction.predictedDurationMinutes,
        reason: topDriver.recommendation
      };

    } catch (error) {
      console.error('[DispatchServiceML] Auto-assign error:', error);
      throw error;
    }
  }

  /**
   * Get dispatch queue with AI priorities
   * Orders sorted by urgency, wait time, and matching availability
   */
  async getDispatchQueue() {
    try {
      const unassignedOrders = await Order.find({
        status: 'pending',
        deliveryPartnerId: null
      })
      .sort({ createdAt: 1 })
      .limit(20);

      const queueWithScores = await Promise.all(
        unassignedOrders.map(async (order) => {
          const waitMinutes = (Date.now() - new Date(order.createdAt)) / (1000 * 60);
          const recommendations = await this.getDispatchRecommendations(order._id);
          
          // Priority score: higher = more urgent
          let priorityScore = waitMinutes * 2; // 2 points per minute waiting
          
          if (recommendations.driverRecommendations.length === 0) {
            priorityScore += 100; // High priority if no drivers available
          } else {
            priorityScore += (100 - recommendations.driverRecommendations[0].matchScore) / 2;
          }

          return {
            orderId: order._id,
            createdAt: order.createdAt,
            waitMinutes: Math.round(waitMinutes),
            priorityScore: Math.round(priorityScore),
            topMatch: recommendations.driverRecommendations[0],
            prediction: recommendations.deliveryPrediction
          };
        })
      );

      // Sort by priority
      return queueWithScores.sort((a, b) => b.priorityScore - a.priorityScore);

    } catch (error) {
      console.error('[DispatchServiceML] Error getting queue:', error);
      return [];
    }
  }

  /**
   * Batch assign orders optimally
   * Avoids driver conflicts and assigns multiple orders at once
   */
  async batchAssignOrders(orderIds = null) {
    try {
      // Get orders to assign
      let orders;
      if (orderIds && orderIds.length > 0) {
        orders = await Order.find({
          _id: { $in: orderIds },
          status: 'pending'
        }).limit(10);
      } else {
        orders = await Order.find({
          status: 'pending',
          deliveryPartnerId: null
        }).sort({ createdAt: 1 }).limit(10);
      }

      if (orders.length === 0) {
        return { message: 'No orders to assign', assigned: [] };
      }

      // Get available drivers
      const drivers = await smartDriverMatcher.getAvailableDrivers();
      
      // Batch match
      const assignments = await smartDriverMatcher.batchMatchOrders(orders, drivers);

      // Apply assignments
      const results = [];
      for (const assignment of assignments) {
        try {
          const order = await Order.findById(assignment.orderId);
          order.deliveryPartnerId = assignment.driverId;
          order.status = 'assigned';
          order.assignedAt = new Date();
          
          await order.save();

          const driver = drivers.find(d => d._id.toString() === assignment.driverId.toString());
          results.push({
            orderId: assignment.orderId,
            driverId: assignment.driverId,
            driverName: driver?.name || 'Unknown',
            matchScore: Math.round(assignment.score),
            success: true
          });
        } catch (err) {
          console.error('[DispatchServiceML] Failed to assign order:', err);
          results.push({
            orderId: assignment.orderId,
            success: false,
            error: err.message
          });
        }
      }

      return {
        message: `Assigned ${results.filter(r => r.success).length}/${orders.length} orders`,
        assigned: results.filter(r => r.success),
        failed: results.filter(r => !r.success)
      };

    } catch (error) {
      console.error('[DispatchServiceML] Batch assign error:', error);
      throw error;
    }
  }

  /**
   * Initialize ML models on service startup
   */
  async initialize() {
    console.log('[DispatchServiceML] Initializing ML models...');
    try {
      await deliveryPredictionML.trainModel();
      
      // Schedule periodic retraining
      deliveryPredictionML.schedulePeriodicRetraining(1000 * 60 * 60); // Hourly
      
      console.log('[DispatchServiceML] Initialization complete');
    } catch (error) {
      console.error('[DispatchServiceML] Initialization error:', error);
    }
  }
}

// Singleton instance
const dispatchServiceML = new DispatchServiceML();

module.exports = dispatchServiceML;
