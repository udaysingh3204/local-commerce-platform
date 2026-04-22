const Order = require('../models/Order');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const { subDays, startOfDay, endOfDay } = require('date-fns');

/**
 * Admin Analytics Service - Comprehensive platform insights
 * GMV, cohort analysis, SLAs, driver performance, customer segments
 */
class AdminAnalyticsService {
  constructor() {
    this.analyticsCache = new Map();
    this.cacheDuration = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(daysBack = 30) {
    try {
      const cacheKey = `dashboard_${daysBack}`;
      if (this.analyticsCache.has(cacheKey)) {
        const cached = this.analyticsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheDuration) {
          return cached.data;
        }
      }

      const startDate = subDays(new Date(), daysBack);

      const [ordersData, usersData, driversData, storesData] = await Promise.all([
        Order.find({ createdAt: { $gte: startDate } }),
        User.find({ userType: 'customer', createdAt: { $gte: startDate } }),
        User.find({ userType: 'driver', createdAt: { $gte: startDate } }),
        Store.find({ createdAt: { $gte: startDate } })
      ]);

      // Calculate KPIs
      const gmv = ordersData.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const avgOrderValue = ordersData.length ? gmv / ordersData.length : 0;
      const totalOrders = ordersData.length;
      const completedOrders = ordersData.filter(o => o.status === 'delivered').length;
      const completionRate = totalOrders ? (completedOrders / totalOrders) * 100 : 0;

      // Customer metrics
      const newCustomers = usersData.length;
      const totalCustomers = await User.countDocuments({ userType: 'customer' });
      const repeatRate = totalCustomers > newCustomers 
        ? ((totalCustomers - newCustomers) / totalCustomers) * 100 
        : 0;

      // Driver metrics
      const newDrivers = driversData.length;
      const totalDrivers = await User.countDocuments({ userType: 'driver' });
      const activeDrivers = await User.countDocuments({ userType: 'driver', isActive: true });
      const driverUtilization = totalDrivers ? (activeDrivers / totalDrivers) * 100 : 0;

      // Store metrics
      const newStores = storesData.length;
      const totalStores = await Store.countDocuments({});

      // Revenue breakdown
      const revenueBreakdown = {
        deliveryFees: ordersData.reduce((sum, o) => sum + (o.deliveryFee || 0), 0),
        productSales: ordersData.reduce((sum, o) => sum + (o.subtotal || 0), 0),
        commissions: ordersData.reduce((sum, o) => sum + (o.commission || 0), 0),
        refunds: ordersData.filter(o => o.refundStatus === 'completed')
          .reduce((sum, o) => sum + (o.refundAmount || 0), 0)
      };

      const analytics = {
        period: `Last ${daysBack} days`,
        kpis: {
          gmv: Math.round(gmv),
          avgOrderValue: Math.round(avgOrderValue),
          totalOrders,
          completedOrders,
          completionRate: Math.round(completionRate),
          activeUsers: totalCustomers,
          newCustomers,
          repeatRate: Math.round(repeatRate)
        },
        drivers: {
          total: totalDrivers,
          active: activeDrivers,
          new: newDrivers,
          utilization: Math.round(driverUtilization)
        },
        stores: {
          total: totalStores,
          new: newStores
        },
        revenue: revenueBreakdown,
        trends: await this.calculateTrends(ordersData, daysBack)
      };

      // Cache result
      this.analyticsCache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;
    } catch (err) {
      console.error('[AdminAnalytics] getDashboardAnalytics error:', err.message);
      throw err;
    }
  }

  /**
   * Get GMV and revenue trends
   */
  async getRevenueTrends(daysBack = 30) {
    try {
      const orders = await Order.find({
        createdAt: { $gte: subDays(new Date(), daysBack) }
      });

      const dailyData = {};

      // Aggregate by day
      orders.forEach(order => {
        const date = startOfDay(order.createdAt).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            gmv: 0,
            orders: 0,
            avgOrderValue: 0,
            completedOrders: 0
          };
        }

        dailyData[date].gmv += order.totalAmount || 0;
        dailyData[date].orders += 1;
        if (order.status === 'delivered') {
          dailyData[date].completedOrders += 1;
        }
      });

      // Calculate averages
      const trends = Object.values(dailyData).map(day => ({
        ...day,
        gmv: Math.round(day.gmv),
        avgOrderValue: Math.round(day.gmv / day.orders)
      }));

      return {
        success: true,
        trends: trends.sort((a, b) => new Date(a.date) - new Date(b.date))
      };
    } catch (err) {
      console.error('[AdminAnalytics] getRevenueTrends error:', err.message);
      throw err;
    }
  }

  /**
   * Get customer cohort analysis
   */
  async getCohortAnalysis() {
    try {
      const customers = await User.find({ userType: 'customer' }).populate('subscription');

      const cohorts = {
        bySignupMonth: {},
        bySubscription: {},
        byGeography: {}
      };

      customers.forEach(customer => {
        // By signup month
        const signupMonth = startOfDay(customer.createdAt)
          .toISOString()
          .substring(0, 7);
        if (!cohorts.bySignupMonth[signupMonth]) {
          cohorts.bySignupMonth[signupMonth] = { count: 0, activeOrders: 0, totalSpent: 0 };
        }
        cohorts.bySignupMonth[signupMonth].count++;

        // By subscription
        const planId = customer.subscription?.planId || 'free';
        if (!cohorts.bySubscription[planId]) {
          cohorts.bySubscription[planId] = 0;
        }
        cohorts.bySubscription[planId]++;

        // By geography (state)
        const state = customer.address?.state || 'unknown';
        if (!cohorts.byGeography[state]) {
          cohorts.byGeography[state] = 0;
        }
        cohorts.byGeography[state]++;
      });

      return {
        success: true,
        cohorts
      };
    } catch (err) {
      console.error('[AdminAnalytics] getCohortAnalysis error:', err.message);
      throw err;
    }
  }

  /**
   * Get driver performance analysis
   */
  async getDriverAnalytics() {
    try {
      const drivers = await User.find({ userType: 'driver' });
      const orders = await Order.find({});

      const driverMetrics = [];

      for (const driver of drivers) {
        const driverOrders = orders.filter(o => o.driverId?.toString() === driver._id.toString());

        if (driverOrders.length === 0) continue;

        const completedOrders = driverOrders.filter(o => o.status === 'delivered');
        const lateOrders = driverOrders.filter(o => o.isLate === true);

        const metric = {
          driverId: driver._id,
          name: driver.name,
          totalDeliveries: driverOrders.length,
          completionRate: Math.round((completedOrders.length / driverOrders.length) * 100),
          onTimeRate: Math.round(((driverOrders.length - lateOrders.length) / driverOrders.length) * 100),
          avgRating: driver.rating || 0,
          earnings: driverOrders.reduce((sum, o) => sum + (o.driverEarnings || 0), 0),
          status: driver.isActive ? 'active' : 'inactive',
          lastDeliveryDate: completedOrders[completedOrders.length - 1]?.deliveredAt || null
        };

        driverMetrics.push(metric);
      }

      // Sort by earnings
      driverMetrics.sort((a, b) => b.earnings - a.earnings);

      return {
        success: true,
        metrics: driverMetrics,
        topEarners: driverMetrics.slice(0, 10),
        topPerformers: driverMetrics
          .sort((a, b) => b.onTimeRate - a.onTimeRate)
          .slice(0, 10)
      };
    } catch (err) {
      console.error('[AdminAnalytics] getDriverAnalytics error:', err.message);
      throw err;
    }
  }

  /**
   * Get SLA and performance metrics
   */
  async getSLAMetrics(daysBack = 30) {
    try {
      const orders = await Order.find({
        createdAt: { $gte: subDays(new Date(), daysBack) }
      });

      const slas = {
        deliveryTimeTarget: 30, // minutes
        prepTimeTarget: 15, // minutes
        cancellationRate: 0,
        refundRate: 0,
        performance: {}
      };

      let totalDeliveries = 0;
      let onTimedDeliveries = 0;
      let cancelledOrders = 0;
      let refundedOrders = 0;

      const deliveryTimes = [];
      const prepTimes = [];

      orders.forEach(order => {
        if (order.status === 'delivered') {
          totalDeliveries++;
          const duration = (order.deliveredAt - order.createdAt) / (1000 * 60); // minutes
          deliveryTimes.push(duration);

          if (duration <= slas.deliveryTimeTarget) {
            onTimedDeliveries++;
          }
        }

        if (order.status === 'cancelled') {
          cancelledOrders++;
        }

        if (order.refundStatus === 'completed') {
          refundedOrders++;
        }

        if (order.preparedAt) {
          const prepTime = (order.preparedAt - order.createdAt) / (1000 * 60);
          prepTimes.push(prepTime);
        }
      });

      const avgDeliveryTime = deliveryTimes.length 
        ? deliveryTimes.reduce((a, b) => a + b) / deliveryTimes.length 
        : 0;

      const avgPrepTime = prepTimes.length 
        ? prepTimes.reduce((a, b) => a + b) / prepTimes.length 
        : 0;

      slas.performance = {
        deliverySLA: totalDeliveries ? Math.round((onTimedDeliveries / totalDeliveries) * 100) : 0,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        avgPrepTime: Math.round(avgPrepTime),
        cancellationRate: orders.length ? Math.round((cancelledOrders / orders.length) * 100) : 0,
        refundRate: orders.length ? Math.round((refundedOrders / orders.length) * 100) : 0
      };

      return {
        success: true,
        slas
      };
    } catch (err) {
      console.error('[AdminAnalytics] getSLAMetrics error:', err.message);
      throw err;
    }
  }

  /**
   * Get store performance analytics
   */
  async getStoreAnalytics() {
    try {
      const stores = await Store.find({});
      const orders = await Order.find({}).populate('storeId');

      const storeMetrics = [];

      for (const store of stores) {
        const storeOrders = orders.filter(o => o.storeId?._id?.toString() === store._id.toString());

        const metric = {
          storeId: store._id,
          storeName: store.name,
          city: store.city,
          totalOrders: storeOrders.length,
          totalRevenue: storeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
          avgOrderValue: storeOrders.length ? storeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / storeOrders.length : 0,
          completionRate: storeOrders.length ? Math.round((storeOrders.filter(o => o.status === 'delivered').length / storeOrders.length) * 100) : 0,
          avgRating: store.rating || 0,
          topProducts: await this.getTopProducts(store._id, 5)
        };

        storeMetrics.push(metric);
      }

      // Sort by revenue
      storeMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

      return {
        success: true,
        stores: storeMetrics,
        topStores: storeMetrics.slice(0, 10)
      };
    } catch (err) {
      console.error('[AdminAnalytics] getStoreAnalytics error:', err.message);
      throw err;
    }
  }

  // Private methods

  async calculateTrends(orders, daysBack) {
    const dailyOrders = {};
    orders.forEach(order => {
      const date = startOfDay(order.createdAt).toISOString().split('T')[0];
      dailyOrders[date] = (dailyOrders[date] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyOrders).sort();
    const avgDailyOrders = sortedDates.length ? orders.length / sortedDates.length : 0;

    return {
      avgDailyOrders: Math.round(avgDailyOrders),
      peakDay: Object.entries(dailyOrders).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    };
  }

  async getTopProducts(storeId, limit = 5) {
    const orders = await Order.find({ storeId }).populate('items.productId');
    const productMap = {};

    orders.forEach(order => {
      (order.items || []).forEach(item => {
        if (item.productId) {
          const productId = item.productId._id.toString();
          if (!productMap[productId]) {
            productMap[productId] = {
              name: item.productId.name,
              quantity: 0,
              revenue: 0
            };
          }
          productMap[productId].quantity += item.quantity || 1;
          productMap[productId].revenue += item.price * (item.quantity || 1);
        }
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
}

// Export singleton
module.exports = new AdminAnalyticsService();
