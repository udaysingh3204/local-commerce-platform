const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Loyalty Points & Rewards Program - Gamified purchase incentives
 * Points accumulation, tier progression, redemption, exclusive perks
 */
class LoyaltyService {
  constructor() {
    this.pointsCache = new Map();
    this.leaderboardCache = null;
    this.leaderboardTTL = 60 * 60 * 1000; // 1 hour
    this.lastLeaderboardUpdate = 0;
  }

  /**
   * Loyalty tiers with progressive benefits
   */
  LOYALTY_TIERS = {
    bronze: {
      name: 'Bronze Member',
      minPoints: 0,
      emoji: '🥉',
      benefits: {
        pointsMultiplier: 1.0,
        cashbackPercent: 0.5,
        freeDliveryThreshold: 250,
        birthDayBonus: 50
      }
    },
    silver: {
      name: 'Silver Member',
      minPoints: 500,
      emoji: '⚪',
      benefits: {
        pointsMultiplier: 1.25,
        cashbackPercent: 1.0,
        freeDeliveryThreshold: 200,
        birthDayBonus: 100,
        exclusiveDeals: true
      }
    },
    gold: {
      name: 'Gold Member',
      minPoints: 2000,
      emoji: '🥇',
      benefits: {
        pointsMultiplier: 1.5,
        cashbackPercent: 1.5,
        freeDeliveryThreshold: 150,
        birthDayBonus: 200,
        exclusiveDeals: true,
        prioritySupport: true
      }
    },
    platinum: {
      name: 'Platinum Member',
      minPoints: 5000,
      emoji: '💎',
      benefits: {
        pointsMultiplier: 2.0,
        cashbackPercent: 2.0,
        freeDeliveryThreshold: 100,
        birthDayBonus: 500,
        exclusiveDeals: true,
        prioritySupport: true,
        personalShopper: true,
        earlyAccess: true
      }
    }
  };

  /**
   * Add points for purchase/action
   * @param {string} userId - User ID
   * @param {object} transaction - { orderId, amount, action, metadata }
   * @returns {object} { pointsAdded, newBalance, tier }
   */
  async addPoints(userId, transaction) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Initialize loyalty if needed
      if (!user.loyalty) {
        user.loyalty = {
          totalPoints: 0,
          pointsBalance: 0,
          pointsRedeemed: 0,
          tier: 'bronze',
          createdAt: new Date(),
          redemptions: [],
          transactions: [],
          lastTierUpdateAt: new Date()
        };
      }

      // Calculate points based on action
      let pointsToAdd = 0;
      switch (transaction.action) {
        case 'purchase':
          // ₹1 = 1 point base
          pointsToAdd = Math.floor(transaction.amount / 1);
          break;
        case 'referral':
          pointsToAdd = transaction.metadata?.points || 100;
          break;
        case 'review':
          pointsToAdd = 25;
          break;
        case 'social_share':
          pointsToAdd = 50;
          break;
        case 'birthday_bonus':
          pointsToAdd = 100;
          break;
        default:
          pointsToAdd = 0;
      }

      // Apply tier multiplier
      const currentTier = this.LOYALTY_TIERS[user.loyalty.tier];
      const multiplier = currentTier.benefits.pointsMultiplier || 1.0;
      pointsToAdd = Math.floor(pointsToAdd * multiplier);

      // Update balance
      const previousPoints = user.loyalty.totalPoints;
      user.loyalty.totalPoints += pointsToAdd;
      user.loyalty.pointsBalance += pointsToAdd;

      // Add transaction record
      user.loyalty.transactions.push({
        type: transaction.action,
        points: pointsToAdd,
        metadata: transaction.metadata,
        orderId: transaction.orderId,
        createdAt: new Date()
      });

      // Keep last 50 transactions
      if (user.loyalty.transactions.length > 50) {
        user.loyalty.transactions.shift();
      }

      // Check tier upgrade
      const newTier = this.determineTier(user.loyalty.totalPoints);
      if (newTier !== user.loyalty.tier) {
        user.loyalty.tier = newTier;
        user.loyalty.lastTierUpdateAt = new Date();

        // Award tier upgrade bonus
        const tierBonus = 100;
        user.loyalty.pointsBalance += tierBonus;
        user.loyalty.transactions.push({
          type: 'tier_upgrade',
          points: tierBonus,
          metadata: { previousTier: user.loyalty.tier, newTier },
          createdAt: new Date()
        });
      }

      await user.save();
      this.pointsCache.delete(userId.toString());

      return {
        pointsAdded,
        newBalance: user.loyalty.pointsBalance,
        totalPoints: user.loyalty.totalPoints,
        tier: user.loyalty.tier,
        tierName: this.LOYALTY_TIERS[user.loyalty.tier].name,
        multiplyerApplied: multiplier
      };
    } catch (err) {
      console.error('[LoyaltyService] addPoints error:', err.message);
      throw err;
    }
  }

  /**
   * Redeem points for discount/cashback
   * @param {string} userId - User ID
   * @param {number} orderId - Order ID to apply redemption to
   * @param {number} pointsToRedeem - Points amount
   * @returns {object} { cashbackAmount, newBalance, discountApplied }
   */
  async redeemPoints(userId, orderId, pointsToRedeem) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.loyalty) throw new Error('User not found');

      if (user.loyalty.pointsBalance < pointsToRedeem) {
        throw new Error('Insufficient points balance');
      }

      // Conversion: 100 points = ₹10 cashback
      const cashbackAmount = Math.floor((pointsToRedeem / 100) * 10);
      const minRedemption = 100; // Minimum 100 points = ₹10

      if (pointsToRedeem < minRedemption) {
        throw new Error(`Minimum redemption is ${minRedemption} points (₹10)`);
      }

      // Apply redemption
      user.loyalty.pointsBalance -= pointsToRedeem;
      user.loyalty.pointsRedeemed += pointsToRedeem;

      user.loyalty.redemptions.push({
        orderId,
        pointsRedeemed: pointsToRedeem,
        cashbackAmount,
        appliedAt: new Date()
      });

      // Keep last 30 redemptions
      if (user.loyalty.redemptions.length > 30) {
        user.loyalty.redemptions.shift();
      }

      // Update order with loyalty discount
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          order.loyaltyDiscount = cashbackAmount;
          await order.save();
        }
      }

      await user.save();
      this.pointsCache.delete(userId.toString());

      return {
        pointsRedeemed,
        cashbackAmount,
        newBalance: user.loyalty.pointsBalance,
        message: `${pointsToRedeem} points redeemed for ₹${cashbackAmount} cashback`
      };
    } catch (err) {
      console.error('[LoyaltyService] redeemPoints error:', err.message);
      throw err;
    }
  }

  /**
   * Get user's loyalty details
   */
  async getUserLoyalty(userId) {
    try {
      const cacheKey = userId.toString();
      if (this.pointsCache.has(cacheKey)) {
        return this.pointsCache.get(cacheKey);
      }

      const user = await User.findById(userId).select('loyalty');
      if (!user || !user.loyalty) {
        return {
          totalPoints: 0,
          pointsBalance: 0,
          tier: 'bronze',
          tierName: 'Bronze Member',
          nextTierAt: 500,
          pointsToNextTier: 500,
          benefits: this.LOYALTY_TIERS.bronze.benefits
        };
      }

      const tier = this.LOYALTY_TIERS[user.loyalty.tier];
      const nextTier = Object.values(this.LOYALTY_TIERS).find(
        t => t.minPoints > user.loyalty.totalPoints
      );

      const response = {
        totalPoints: user.loyalty.totalPoints,
        pointsBalance: user.loyalty.pointsBalance,
        pointsRedeemed: user.loyalty.pointsRedeemed,
        tier: user.loyalty.tier,
        tierEmoji: tier.emoji,
        tierName: tier.name,
        nextTierAt: nextTier?.minPoints || 5000,
        pointsToNextTier: nextTier ? nextTier.minPoints - user.loyalty.totalPoints : 0,
        benefits: tier.benefits,
        recentTransactions: user.loyalty.transactions.slice(-10),
        lastTierUpdateAt: user.loyalty.lastTierUpdateAt
      };

      this.pointsCache.set(cacheKey, response);
      return response;
    } catch (err) {
      console.error('[LoyaltyService] getUserLoyalty error:', err.message);
      throw err;
    }
  }

  /**
   * Get loyalty leaderboard
   */
  async getLeaderboard(limit = 20) {
    try {
      if (this.leaderboardCache && Date.now() - this.lastLeaderboardUpdate < this.leaderboardTTL) {
        return this.leaderboardCache.slice(0, limit);
      }

      const users = await User.find({ 'loyalty.totalPoints': { $gt: 0 } })
        .select('name email phone loyalty')
        .sort({ 'loyalty.totalPoints': -1 })
        .limit(limit * 2)
        .lean();

      const leaderboard = users.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        phone: user.phone,
        points: user.loyalty?.totalPoints || 0,
        tier: user.loyalty?.tier || 'bronze',
        tierEmoji: this.LOYALTY_TIERS[user.loyalty?.tier || 'bronze'].emoji,
        badge: this.getRankBadge(index + 1)
      }));

      this.leaderboardCache = leaderboard;
      this.lastLeaderboardUpdate = Date.now();

      return leaderboard.slice(0, limit);
    } catch (err) {
      console.error('[LoyaltyService] getLeaderboard error:', err.message);
      throw err;
    }
  }

  /**
   * Check and award birthday bonus
   */
  async awardBirthdayBonus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.dateOfBirth) return null;

      const today = new Date();
      const dob = new Date(user.dateOfBirth);

      // Check if today is birthday
      if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
        const tier = this.LOYALTY_TIERS[user.loyalty?.tier || 'bronze'];
        const bonus = tier.benefits.birthDayBonus;

        return await this.addPoints(userId, {
          action: 'birthday_bonus',
          amount: 0,
          metadata: { bonus }
        });
      }

      return null;
    } catch (err) {
      console.error('[LoyaltyService] awardBirthdayBonus error:', err.message);
      throw err;
    }
  }

  /**
   * Get available cashback for order
   */
  getCashbackForOrder(orderAmount, tier) {
    try {
      const tierData = this.LOYALTY_TIERS[tier || 'bronze'];
      const cashbackPercent = tierData.benefits.cashbackPercent || 0;
      return Math.floor((orderAmount * cashbackPercent) / 100);
    } catch (err) {
      console.error('[LoyaltyService] getCashbackForOrder error:', err.message);
      return 0;
    }
  }

  /**
   * Check if user is eligible for free delivery
   */
  isEligibleForFreeDelivery(orderAmount, tier) {
    const tierData = this.LOYALTY_TIERS[tier || 'bronze'];
    const threshold = tierData.benefits.freeDeliveryThreshold;
    return orderAmount >= threshold;
  }

  // Private methods

  determineTier(points) {
    if (points >= 5000) return 'platinum';
    if (points >= 2000) return 'gold';
    if (points >= 500) return 'silver';
    return 'bronze';
  }

  getRankBadge(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }
}

module.exports = new LoyaltyService();
