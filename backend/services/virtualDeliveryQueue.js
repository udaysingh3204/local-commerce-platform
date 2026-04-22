const Order = require('../models/Order');

// Virtual Delivery Queue System
// Provides customers with real-time position in delivery queue
// Shows exact order ahead/behind, not just ETA

class VirtualDeliveryQueue {
  constructor() {
    this.queueCache = new Map(); // Store: { orders[], lastUpdated }
    this.CACHE_TTL = 1000 * 60; // 1 minute
    this.customerQueueUpdates = new Map(); // For realtime socket updates
  }

  /**
   * Get customer's position in delivery queue
   * Returns queue position, wait time estimate, and nearby orders
   */
  async getCustomerQueuePosition(orderId) {
    try {
      const order = await Order.findById(orderId)
        .select('+storeId +status +createdAt +deliveryPartnerId')
        .lean();

      if (!order) {
        return { error: 'Order not found' };
      }

      // Get store's delivery queue
      const queue = await this.getStoreQueue(order.storeId);
      
      // Find this order's position
      const position = queue.findIndex(o => o.orderId.toString() === orderId);
      
      if (position === -1) {
        return { error: 'Order not in queue' };
      }

      // Calculate position-based metrics
      const queueAhead = position; // Orders ahead of this one
      const queueBehind = queue.length - position - 1; // Orders behind
      
      // Get surrounding orders (for context display)
      const surrounding = {
        ahead: queue.slice(Math.max(0, position - 2), position),
        current: queue[position],
        behind: queue.slice(position + 1, Math.min(queue.length, position + 3))
      };

      // Calculate wait time estimate based on queue ahead
      const estimatedWaitMinutes = await this.estimateWaitTime(
        queue.slice(0, position),
        order.storeId
      );

      // Get delivery driver info if assigned
      let driverInfo = null;
      if (order.deliveryPartnerId) {
        driverInfo = await this.getDriverQueueInfo(order.deliveryPartnerId, order.storeId);
      }

      // Determine queue status
      const status = this.getQueueStatus(position, queue.length);

      return {
        orderId,
        queuePosition: position + 1, // 1-based index
        totalInQueue: queue.length,
        ordersAhead: queueAhead,
        ordersBehind: queueBehind,
        estimatedWaitMinutes,
        queuePercentile: Math.round((position / Math.max(1, queue.length)) * 100),
        status,
        surrounding,
        driverInfo,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[VirtualQueue] Error getting position:', error);
      return { error: error.message };
    }
  }

  /**
   * Get all orders in queue for a store
   * Orders sorted by priority and status
   */
  async getStoreQueue(storeId) {
    try {
      // Check cache
      const cacheKey = `store_${storeId}`;
      const cached = this.queueCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.queue;
      }

      // Fetch orders in queue (pending + assigned, not yet picked up)
      const orders = await Order.find({
        storeId: storeId,
        status: { $in: ['pending', 'assigned', 'picked_up'] }
      })
      .select('_id storeId status deliveryPartnerId createdAt prepTime')
      .lean()
      .sort({ createdAt: 1 }); // FIFO

      // Enrich with estimated times
      const enrichedQueue = orders.map((order, index) => ({
        orderId: order._id,
        position: index + 1,
        status: order.status,
        createdAt: order.createdAt,
        deliveryPartnerId: order.deliveryPartnerId,
        prepTime: order.prepTime || 15,
        waitingMinutes: Math.round((Date.now() - new Date(order.createdAt)) / 60000)
      }));

      // Cache result
      this.queueCache.set(cacheKey, {
        queue: enrichedQueue,
        timestamp: Date.now()
      });

      return enrichedQueue;

    } catch (error) {
      console.error('[VirtualQueue] Error getting store queue:', error);
      return [];
    }
  }

  /**
   * Estimate wait time for orders ahead in queue
   */
  async estimateWaitTime(ordersAhead, storeId) {
    try {
      if (ordersAhead.length === 0) return 0;

      // Average prep + packaging time per order
      const avgPrepTime = 15; // minutes
      const avgDeliveryTime = 5; // minutes for handoff/update
      
      // Parallel deliveries reduce wait time
      const concurrentDeliveries = await Order.countDocuments({
        storeId,
        status: { $in: ['out_for_delivery', 'picked_up'] }
      });

      // Calculate total prep time
      let totalPrepMinutes = ordersAhead.length * avgPrepTime;
      
      // Account for existing deliveries in progress
      const parallelFactor = Math.max(0.5, 1 - (concurrentDeliveries * 0.2));
      totalPrepMinutes *= parallelFactor;

      return Math.round(totalPrepMinutes);

    } catch (error) {
      console.error('[VirtualQueue] Error estimating wait:', error);
      return 20; // Fallback estimate
    }
  }

  /**
   * Get driver's queue information
   * Shows which orders this driver will deliver
   */
  async getDriverQueueInfo(driverId, storeId) {
    try {
      // Orders assigned to this driver from this store
      const driverOrders = await Order.find({
        deliveryPartnerId: driverId,
        storeId: storeId,
        status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
      })
      .select('_id status createdAt')
      .lean()
      .limit(5);

      return {
        driverId,
        ordersToDeliver: driverOrders.length,
        orders: driverOrders.map(o => ({
          orderId: o._id,
          status: o.status
        })),
        estimatedCapacity: 8 // Average vehicle capacity
      };

    } catch (error) {
      console.error('[VirtualQueue] Error getting driver info:', error);
      return null;
    }
  }

  /**
   * Determine queue status for UI display
   */
  getQueueStatus(position, totalInQueue) {
    if (position === 0) {
      return {
        label: 'Next',
        color: 'green',
        description: 'Your order is next in line!'
      };
    }

    if (position <= 2 && totalInQueue >= 3) {
      return {
        label: 'Soon',
        color: 'yellow',
        description: `${position} order(s) ahead of you`
      };
    }

    const percentile = position / Math.max(1, totalInQueue);
    if (percentile < 0.5) {
      return {
        label: 'Moderate',
        color: 'blue',
        description: `In the first half of queue`
      };
    }

    return {
      label: 'Busy',
      color: 'orange',
      description: `Queue is busy, but moving`
    };
  }

  /**
   * Get queue analytics for store
   */
  async getQueueAnalytics(storeId, hoursBack = 24) {
    try {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const deliveredOrders = await Order.find({
        storeId,
        status: 'delivered',
        deliveryEndTime: { $gte: since }
      })
      .select('createdAt deliveryStartTime deliveryEndTime')
      .lean();

      if (deliveredOrders.length === 0) {
        return { message: 'No orders in this period', analytics: null };
      }

      // Calculate dwell times (time from order to delivery)
      const dwellTimes = deliveredOrders.map(order => {
        const start = new Date(order.createdAt);
        const end = new Date(order.deliveryEndTime);
        return (end - start) / (1000 * 60); // minutes
      });

      const avgDwellTime = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
      const maxDwellTime = Math.max(...dwellTimes);
      const minDwellTime = Math.min(...dwellTimes);

      // Calculate hourly distribution to identify peak times
      const hourlyBreakdown = {};
      for (let h = 0; h < 24; h++) {
        hourlyBreakdown[h] = 0;
      }

      deliveredOrders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        hourlyBreakdown[hour]++;
      });

      return {
        period: `Last ${hoursBack} hours`,
        totalOrders: deliveredOrders.length,
        averageDwellTimeMinutes: Math.round(avgDwellTime),
        maxDwellTimeMinutes: Math.round(maxDwellTime),
        minDwellTimeMinutes: Math.round(minDwellTime),
        peakHour: Object.entries(hourlyBreakdown).sort((a, b) => b[1] - a[1])[0][0],
        hourlyDistribution: hourlyBreakdown,
        recommendations: this.getQueueRecommendations(avgDwellTime, deliveredOrders.length)
      };

    } catch (error) {
      console.error('[VirtualQueue] Error getting analytics:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate recommendations based on queue metrics
   */
  getQueueRecommendations(avgDwellTime, orderCount) {
    const recommendations = [];

    if (avgDwellTime > 45) {
      recommendations.push({
        priority: 'high',
        message: 'Average delivery time is high. Consider adding more drivers during peak hours.'
      });
    }

    if (orderCount > 50) {
      recommendations.push({
        priority: 'medium',
        message: 'High order volume detected. Optimize staff scheduling.'
      });
    }

    if (avgDwellTime < 20) {
      recommendations.push({
        priority: 'info',
        message: 'Excellent queue efficiency! Maintain current operations.'
      });
    }

    return recommendations;
  }

  /**
   * Broadcast queue update to customer via Socket.IO
   * Called when orders change status
   */
  notifyQueueUpdate(orderId, io) {
    try {
      // Emit to specific order room
      io.to(orderId).emit('queuePositionUpdated', {
        orderId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[VirtualQueue] Error broadcasting update:', error);
    }
  }

  /**
   * Clear queue cache (for testing/refresh)
   */
  clearCache(storeId = null) {
    if (storeId) {
      this.queueCache.delete(`store_${storeId}`);
    } else {
      this.queueCache.clear();
    }
  }
}

// Singleton instance
const virtualDeliveryQueue = new VirtualDeliveryQueue();

module.exports = virtualDeliveryQueue;
