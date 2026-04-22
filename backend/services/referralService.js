const User = require('../models/User');
const Order = require('../models/Order');
const paymentService = require('./paymentService');

/**
 * Referral Service - Gamified user acquisition with tiered rewards
 * Referrer and referee both get benefits, unlimited earning potential
 */
class ReferralService {
  constructor() {
    this.referralRewards = {
      level1: {
        referrerBonus: 150, // Bonus for each successful referral
        refereeDiscount: 100, // Discount for new user
        minPurchaseRequired: 200 // Referee must spend this to unlock bonus
      },
      level2: {
        referralBonus: 250, // After 5 successful referrals
        refereeDiscount: 150,
        thresholdReferrals: 5
      },
      level3: {
        referralBonus: 500, // After 15 successful referrals (pro)
        refereeDiscount: 200,
        thresholdReferrals: 15
      },
      level4: {
        referralBonus: 1000, // After 30 successful referrals (elite)
        refereeDiscount: 300,
        thresholdReferrals: 30
      }
    };

    this.referralCache = new Map(); // userId → { code, referrals[], earnings, tier }
    this.codeToUserMap = new Map(); // code → userId
  }

  /**
   * Generate unique referral code for user
   * @param {string} userId - User ID
   * @returns {object} Referral code and details
   */
  async generateReferralCode(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Check if user already has a code
      if (user.referral?.code) {
        return {
          success: true,
          code: user.referral.code,
          url: `${process.env.APP_URL}/refer/${user.referral.code}`,
          alreadyExists: true
        };
      }

      // Generate unique code
      const code = this.generateUniqueCode(user.name);

      // Update user
      user.referral = {
        code,
        createdAt: new Date(),
        totalReferrals: 0,
        successfulReferrals: 0,
        totalEarnings: 0,
        tier: 'level1',
        referredUsers: []
      };

      await user.save();

      // Update map
      this.codeToUserMap.set(code, userId.toString());
      this.referralCache.delete(userId.toString());

      return {
        success: true,
        code,
        url: `${process.env.APP_URL}/refer/${code}`,
        isNewCode: true
      };
    } catch (err) {
      console.error('[ReferralService] generateReferralCode error:', err.message);
      throw err;
    }
  }

  /**
   * Apply referral code on user signup
   * @param {string} referralCode - Referral code from referrer
   * @param {string} newUserId - New user being referred
   * @returns {object} Referral acceptance with bonuses
   */
  async applyReferralCode(referralCode, newUserId) {
    try {
      if (!referralCode) {
        return {
          success: false,
          error: 'Referral code is invalid'
        };
      }

      const referrerId = this.codeToUserMap.get(referralCode);
      if (!referrerId) {
        return {
          success: false,
          error: 'Referral code not found or expired'
        };
      }

      const referrer = await User.findById(referrerId);
      const newUser = await User.findById(newUserId);

      if (!referrer || !newUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Prevent self-referral
      if (referrerId === newUserId.toString()) {
        return {
          success: false,
          error: 'Cannot refer yourself'
        };
      }

      // Track referral
      referrer.referral.referredUsers.push({
        userId: newUserId,
        referredAt: new Date(),
        status: 'pending', // pending → confirmed after first purchase
        isConfirmed: false
      });

      referrer.referral.totalReferrals++;

      await referrer.save();

      // Give referee signup bonus
      await paymentService.addToWallet(newUserId, this.referralRewards.level1.refereeDiscount, 'referral_signup_bonus');

      // Update new user
      newUser.referredBy = referrerId;
      newUser.referralStatus = 'active';
      await newUser.save();

      // Clear cache
      this.referralCache.delete(referrerId);
      this.referralCache.delete(newUserId.toString());

      return {
        success: true,
        message: 'Referral code applied successfully',
        referee: {
          userId: newUserId,
          signupBonus: this.referralRewards.level1.refereeDiscount
        },
        referrer: {
          userId: referrerId,
          message: `${newUser.name} joined via your referral!`
        }
      };
    } catch (err) {
      console.error('[ReferralService] applyReferralCode error:', err.message);
      throw err;
    }
  }

  /**
   * Confirm referral (when referee makes first purchase)
   */
  async confirmReferral(refereeUserId) {
    try {
      const newUser = await User.findById(refereeUserId);
      if (!newUser || !newUser.referredBy) {
        return;
      }

      const referrer = await User.findById(newUser.referredBy);
      if (!referrer) return;

      // Mark as confirmed
      const referral = referrer.referral.referredUsers.find(
        r => r.userId.toString() === refereeUserId.toString()
      );

      if (referral) {
        referral.isConfirmed = true;
        referral.confirmedAt = new Date();
        referral.status = 'confirmed';
      }

      referrer.referral.successfulReferrals++;

      // Calculate referrer bonus based on tier
      const tier = this.calculateReferralTier(referrer.referral.successfulReferrals);
      const previousTier = referrer.referral.tier;
      referrer.referral.tier = tier;

      const rewardConfig = this.referralRewards[tier];
      const bonus = rewardConfig.referrerBonus;

      // Add bonus to referrer wallet
      await paymentService.addToWallet(referrer._id, bonus, `referral_confirmation_${refereeUserId}`);

      referrer.referral.totalEarnings += bonus;

      await referrer.save();

      // Clear cache
      this.referralCache.delete(referrer._id.toString());

      return {
        referrerId: referrer._id,
        bonus,
        newTier: tier,
        tierUpgrade: tier !== previousTier
      };
    } catch (err) {
      console.error('[ReferralService] confirmReferral error:', err.message);
    }
  }

  /**
   * Get referral details for user
   */
  async getReferralDetails(userId) {
    try {
      const key = userId.toString();

      // Check cache
      if (this.referralCache.has(key)) {
        return this.referralCache.get(key);
      }

      const user = await User.findById(userId).select('referral name email');

      if (!user?.referral?.code) {
        // Generate code if doesn't exist
        return this.generateReferralCode(userId);
      }

      const details = {
        code: user.referral.code,
        url: `${process.env.APP_URL}/refer/${user.referral.code}`,
        totalReferrals: user.referral.totalReferrals || 0,
        successfulReferrals: user.referral.successfulReferrals || 0,
        totalEarnings: user.referral.totalEarnings || 0,
        tier: user.referral.tier || 'level1',
        tierMultiplier: this.getTierMultiplier(user.referral.tier),
        referrerDetails: this.getReferrerProfile(user),
        referredUsers: (user.referral.referredUsers || []).map(r => ({
          userId: r.userId,
          referredAt: r.referredAt,
          status: r.status,
          isConfirmed: r.isConfirmed
        })),
        nextTierThreshold: this.getNextTierThreshold(user.referral.successfulReferrals)
      };

      this.referralCache.set(key, details);
      return details;
    } catch (err) {
      console.error('[ReferralService] getReferralDetails error:', err.message);
      throw err;
    }
  }

  /**
   * Get leaderboard of top referrers
   */
  async getReferralLeaderboard(limit = 20, timeframe = '30days') {
    try {
      const users = await User.find({ 'referral.successfulReferrals': { $gt: 0 } })
        .select('name referral.successfulReferrals referral.totalEarnings referral.tier')
        .sort({ 'referral.successfulReferrals': -1 })
        .limit(limit);

      const leaderboard = users.map((user, index) => ({
        rank: index + 1,
        userId: user._id,
        name: user.name,
        referrals: user.referral?.successfulReferrals || 0,
        earnings: user.referral?.totalEarnings || 0,
        tier: user.referral?.tier || 'level1',
        badge: this.getRankBadge(index + 1)
      }));

      return {
        success: true,
        leaderboard,
        timeframe
      };
    } catch (err) {
      console.error('[ReferralService] getReferralLeaderboard error:', err.message);
      throw err;
    }
  }

  /**
   * Get referral analytics
   */
  async getReferralAnalytics() {
    try {
      const users = await User.find({ 'referral.successfulReferrals': { $gte: 0 } });

      const stats = {
        totalReferrers: users.filter(u => u.referral?.successfulReferrals > 0).length,
        totalReferrals: 0,
        totalReferralEarnings: 0,
        byTier: {
          level1: 0,
          level2: 0,
          level3: 0,
          level4: 0
        }
      };

      users.forEach(user => {
        if (user.referral) {
          stats.totalReferrals += user.referral.successfulReferrals || 0;
          stats.totalReferralEarnings += user.referral.totalEarnings || 0;
          const tier = user.referral.tier || 'level1';
          stats.byTier[tier]++;
        }
      });

      return {
        success: true,
        stats
      };
    } catch (err) {
      console.error('[ReferralService] getReferralAnalytics error:', err.message);
      throw err;
    }
  }

  // Private methods

  generateUniqueCode(name) {
    const base = name.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${base}${random}`;
  }

  calculateReferralTier(successfulReferrals) {
    if (successfulReferrals >= 30) return 'level4';
    if (successfulReferrals >= 15) return 'level3';
    if (successfulReferrals >= 5) return 'level2';
    return 'level1';
  }

  getTierMultiplier(tier) {
    const multipliers = { level1: 1, level2: 1.67, level3: 3.33, level4: 6.67 };
    return multipliers[tier] || 1;
  }

  getNextTierThreshold(currentReferrals) {
    if (currentReferrals < 5) return { tier: 'level2', referralsNeeded: 5 - currentReferrals };
    if (currentReferrals < 15) return { tier: 'level3', referralsNeeded: 15 - currentReferrals };
    if (currentReferrals < 30) return { tier: 'level4', referralsNeeded: 30 - currentReferrals };
    return { tier: 'max', referralsNeeded: 0 };
  }

  getRankBadge(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    return '👤';
  }

  getReferrerProfile(user) {
    return {
      userId: user._id,
      name: user.name,
      avatar: user.avatar || null,
      rating: user.rating || 0,
      tier: user.referral?.tier
    };
  }
}

// Export singleton
module.exports = new ReferralService();
