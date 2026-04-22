const User = require('../models/User');
const Order = require('../models/Order');
const paymentService = require('./paymentService');

/**
 * Subscription Service - Handle recurring subscription plans and benefits
 * Monthly/yearly plans with VIP perks, discounts, and exclusive features
 */
class SubscriptionService {
  constructor() {
    this.plans = {
      free: {
        id: 'free',
        name: 'Free',
        description: 'Basic membership',
        price: 0,
        billingPeriod: null,
        features: {
          orderDiscount: 0,
          freeDelivery: 0, // free deliveries per month
          prioritySupport: false,
          fastTrack: false,
          cachedOrders: false,
          maxDeliveryDistance: Infinity
        },
        maxOrderValue: Infinity
      },
      basic: {
        id: 'basic',
        name: 'Plus',
        description: 'Save on deliveries',
        price: 99,
        billingPeriod: 'monthly',
        features: {
          orderDiscount: 5, // 5% discount on orders
          freeDelivery: 2, // free deliveries per month
          prioritySupport: false,
          fastTrack: false,
          cachedOrders: false,
          maxDeliveryDistance: 15
        },
        maxOrderValue: Infinity,
        perks: ['5% cashback on all orders', '2 free deliveries monthly', 'Order tracking']
      },
      pro: {
        id: 'pro',
        name: 'Premium',
        description: 'Premium benefits',
        price: 299,
        billingPeriod: 'monthly',
        features: {
          orderDiscount: 10,
          freeDelivery: 5,
          prioritySupport: true,
          fastTrack: false,
          cachedOrders: false,
          maxDeliveryDistance: 20
        },
        maxOrderValue: Infinity,
        perks: [
          '10% cashback + instant credits',
          '5 free deliveries monthly',
          'Priority customer support',
          'Order scheduling (5 orders)',
          'Birthday discount (15%)'
        ]
      },
      elite: {
        id: 'elite',
        name: 'Elite',
        description: 'Maximum savings',
        price: 899,
        billingPeriod: 'monthly',
        features: {
          orderDiscount: 15,
          freeDelivery: 15,
          prioritySupport: true,
          fastTrack: true, // 1-hour delivery
          cachedOrders: true, // pre-stocked popular items
          maxDeliveryDistance: 25
        },
        maxOrderValue: Infinity,
        perks: [
          '15% instant credits on orders',
          '15 free deliveries monthly',
          'VIP 24/7 support',
          'Express delivery (60 min) - 5 months',
          'Exclusive member deals',
          'Free subscription if 0 usage',
          'Birthday month free membership'
        ]
      },
      yearly: {
        id: 'yearly',
        name: 'Elite Annual',
        description: 'Best value',
        price: 8999,
        billingPeriod: 'yearly',
        features: {
          orderDiscount: 18,
          freeDelivery: 20,
          prioritySupport: true,
          fastTrack: true,
          cachedOrders: true,
          maxDeliveryDistance: 25
        },
        maxOrderValue: Infinity,
        perks: [
          '18% instant credits on orders',
          '20 free deliveries yearly',
          'VIP 24/7 support',
          'Express delivery (60 min) - 12 months',
          'Monthly surprise deals',
          'Free annual membership upgrade'
        ],
        savings: 'Save ₹2,880/year vs monthly'
      }
    };

    this.subscriptionCache = new Map(); // userId → { plan, startDate, endDate, renewalDate }
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Get all subscription plans
   */
  getAllPlans() {
    return Object.values(this.plans);
  }

  /**
   * Get plan details
   */
  getPlan(planId) {
    return this.plans[planId];
  }

  /**
   * Get or create user subscription
   */
  async getUserSubscription(userId) {
    try {
      const key = userId.toString();

      // Check cache
      if (this.subscriptionCache.has(key)) {
        return this.subscriptionCache.get(key);
      }

      // Fetch from user document
      const user = await User.findById(userId).select('subscription');
      
      const subscription = user?.subscription || {
        planId: 'free',
        startDate: new Date(),
        endDate: null,
        renewalDate: null,
        isActive: true,
        autoRenew: false
      };

      // Determine if subscription has expired
      if (subscription.endDate && new Date() > subscription.endDate) {
        subscription.isActive = false;
        subscription.planId = 'free';
      }

      this.subscriptionCache.set(key, subscription);
      return subscription;
    } catch (err) {
      console.error('[SubscriptionService] getUserSubscription error:', err.message);
      throw err;
    }
  }

  /**
   * Subscribe user to a plan
   */
  async subscribeToPlan(userId, planId, paymentId = null) {
    try {
      const plan = this.plans[planId];
      if (!plan) throw new Error(`Plan '${planId}' not found`);

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Calculate dates
      const startDate = new Date();
      const endDate = plan.billingPeriod 
        ? new Date(startDate.getTime() + (plan.billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000)
        : null;

      // Update user
      user.subscription = {
        planId,
        startDate,
        endDate,
        renewalDate: endDate,
        isActive: true,
        autoRenew: true,
        features: plan.features,
        lastPaymentId: paymentId,
        lastPaymentDate: new Date()
      };

      await user.save();

      // Clear cache
      this.subscriptionCache.delete(userId.toString());

      // Add welcome credit bonus
      if (plan.price > 0) {
        const bonus = Math.round(plan.price * 0.2); // 20% bonus credit
        await paymentService.addToWallet(userId, bonus, `${planId}_signup_bonus`);
      }

      return {
        success: true,
        subscription: user.subscription,
        setupFee: plan.price,
        welcomeBonus: plan.price > 0 ? Math.round(plan.price * 0.2) : 0
      };
    } catch (err) {
      console.error('[SubscriptionService] subscribeToPlan error:', err.message);
      throw err;
    }
  }

  /**
   * Calculate discounts based on subscription
   */
  getSubscriptionBenefits(planId) {
    const plan = this.plans[planId];
    if (!plan) return this.plans.free.features;

    return {
      planId,
      planName: plan.name,
      orderDiscount: plan.features.orderDiscount,
      freeDeliveries: plan.features.freeDelivery,
      bonusCredit: plan.price > 0 ? Math.round(plan.price * 0.2) : 0,
      prioritySupport: plan.features.prioritySupport,
      fastDelivery: plan.features.fastTrack,
      cachedOrders: plan.features.cachedOrders,
      perks: plan.perks || []
    };
  }

  /**
   * Auto-renew subscription (called by cron job weekly)
   */
  async autoRenewSubscriptions() {
    try {
      const users = await User.find({
        'subscription.autoRenew': true,
        'subscription.renewalDate': { $lte: new Date() }
      });

      const renewalResults = [];

      for (const user of users) {
        try {
          const plan = this.plans[user.subscription.planId];
          if (!plan || plan.price === 0) continue; // Skip free plan

          // Deduct subscription fee from wallet
          const walletResult = await paymentService.deductFromWallet(
            user._id,
            plan.price,
            `subscription_renewal_${plan.billingPeriod}`
          );

          if (walletResult.success) {
            // Update subscription
            user.subscription.startDate = new Date();
            user.subscription.endDate = new Date(
              Date.now() + (plan.billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000
            );
            user.subscription.renewalDate = user.subscription.endDate;
            user.subscription.isActive = true;
            await user.save();

            renewalResults.push({
              userId: user._id,
              planId: plan.id,
              status: 'renewed',
              amount: plan.price
            });
          } else {
            // Insufficient funds - pause subscription
            user.subscription.isActive = false;
            user.subscription.pausedAt = new Date();
            await user.save();

            renewalResults.push({
              userId: user._id,
              planId: plan.id,
              status: 'paused',
              reason: 'insufficient_funds'
            });
          }
        } catch (err) {
          console.error(`[SubscriptionService] Error renewing subscription for user ${user._id}:`, err.message);
        }
      }

      return {
        total: renewalResults.length,
        renewed: renewalResults.filter(r => r.status === 'renewed').length,
        paused: renewalResults.filter(r => r.status === 'paused').length,
        results: renewalResults
      };
    } catch (err) {
      console.error('[SubscriptionService] autoRenewSubscriptions error:', err.message);
      throw err;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, reason = 'user_request') {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      user.subscription.isActive = false;
      user.subscription.cancelledAt = new Date();
      user.subscription.cancellationReason = reason;
      user.subscription.planId = 'free';

      await user.save();

      // Clear cache
      this.subscriptionCache.delete(userId.toString());

      return {
        success: true,
        message: 'Subscription cancelled',
        refund: null // No refunds for now
      };
    } catch (err) {
      console.error('[SubscriptionService] cancelSubscription error:', err.message);
      throw err;
    }
  }

  /**
   * Upgrade subscription
   */
  async upgradePlan(userId, newPlanId, paymentId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const oldPlan = this.plans[user.subscription?.planId || 'free'];
      const newPlan = this.plans[newPlanId];
      if (!newPlan) throw new Error(`Plan ${newPlanId} not found`);

      // Calculate prorated credit
      let credit = 0;
      if (user.subscription?.endDate) {
        const daysRemaining = Math.ceil(
          (user.subscription.endDate - new Date()) / (24 * 60 * 60 * 1000)
        );
        const dailyRate = oldPlan.price / 30;
        credit = Math.round(dailyRate * daysRemaining);
      }

      // Charge difference
      const priceDifference = newPlan.price - credit;

      if (priceDifference > 0) {
        await paymentService.deductFromWallet(userId, priceDifference, `plan_upgrade_${newPlanId}`);
      } else if (priceDifference < 0) {
        // Refund credit
        await paymentService.addToWallet(userId, Math.abs(priceDifference), `plan_upgrade_credit`);
      }

      // Update subscription
      const startDate = new Date();
      user.subscription = {
        planId: newPlanId,
        startDate,
        endDate: new Date(startDate.getTime() + (newPlan.billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
        renewalDate: new Date(startDate.getTime() + (newPlan.billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
        isActive: true,
        autoRenew: true,
        features: newPlan.features,
        upgradedFrom: oldPlan.id,
        upgradedAt: new Date()
      };

      await user.save();

      // Clear cache
      this.subscriptionCache.delete(userId.toString());

      return {
        success: true,
        upgrade: {
          fromPlan: oldPlan.id,
          toPlan: newPlan.id,
          credit,
          charged: priceDifference > 0 ? priceDifference : 0,
          refunded: priceDifference < 0 ? Math.abs(priceDifference) : 0
        }
      };
    } catch (err) {
      console.error('[SubscriptionService] upgradePlan error:', err.message);
      throw err;
    }
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics() {
    try {
      const users = await User.find({}).select('subscription');

      const stats = {
        totalUsers: users.length,
        byPlan: {},
        activeSubscriptions: 0,
        monthlyRecurringRevenue: 0,
        annualRecurringRevenue: 0
      };

      Object.keys(this.plans).forEach(planId => {
        stats.byPlan[planId] = 0;
      });

      users.forEach(user => {
        const planId = user.subscription?.planId || 'free';
        stats.byPlan[planId] = (stats.byPlan[planId] || 0) + 1;

        if (user.subscription?.isActive) {
          stats.activeSubscriptions++;
          const plan = this.plans[planId];
          if (plan.billingPeriod === 'monthly') {
            stats.monthlyRecurringRevenue += plan.price;
          } else if (plan.billingPeriod === 'yearly') {
            stats.annualRecurringRevenue += plan.price;
          }
        }
      });

      return stats;
    } catch (err) {
      console.error('[SubscriptionService] getSubscriptionAnalytics error:', err.message);
      throw err;
    }
  }
}

// Export singleton
module.exports = new SubscriptionService();
