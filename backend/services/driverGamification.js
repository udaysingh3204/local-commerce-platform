const Driver = require('../models/Driver');
const Order = require('../models/Order');

// Driver Gamification & Performance Incentives
// Badges, achievements, rewards, and competitive leaderboards

class DriverGamification {
  constructor() {
    this.ACHIEVEMENT_CACHE_TTL = 1000 * 60 * 60; // 1 hour
    this.achievementCache = new Map();

    // Define achievement badges
    this.badges = {
      speedDemon: {
        id: 'speed-demon',
        name: 'Speed Demon',
        description: 'Complete 10 deliveries in under 15 minutes',
        icon: '⚡',
        rarity: 'rare'
      },
      perfectRecord: {
        id: 'perfect-record',
        name: 'Perfect Record',
        description: '100 consecutive on-time deliveries',
        icon: '✅',
        rarity: 'legendary'
      },
      nightShifter: {
        id: 'night-shifter',
        name: 'Night Shifter',
        description: 'Complete 50 deliveries between 10pm-6am',
        icon: '🌙',
        rarity: 'uncommon'
      },
      weatherWarrior: {
        id: 'weather-warrior',
        name: 'Weather Warrior',
        description: 'Complete 30 deliveries in bad weather (rain)',
        icon: '🌧️',
        rarity: 'rare'
      },
      customerLover: {
        id: 'customer-lover',
        name: 'Customer Lover',
        description: 'Achieve 4.8+ rating with 100+ deliveries',
        icon: '❤️',
        rarity: 'epic'
      },
      marathonRunner: {
        id: 'marathon-runner',
        name: 'Marathon Runner',
        description: 'Complete 500 total deliveries',
        icon: '🏃',
        rarity: 'epic'
      },
      earningMachine: {
        id: 'earning-machine',
        name: 'Earning Machine',
        description: 'Earn 50,000 INR in a week',
        icon: '💰',
        rarity: 'very_rare'
      },
      socialButterfly: {
        id: 'social-butterfly',
        name: 'Social Butterfly',
        description: 'Receive 100 5-star ratings',
        icon: '⭐',
        rarity: 'uncommon'
      },
      consistencyKing: {
        id: 'consistency-king',
        name: 'Consistency King',
        description: 'Maintain 90%+ on-time rate for 30 days',
        icon: '👑',
        rarity: 'epic'
      },
      emergencyResponder: {
        id: 'emergency-responder',
        name: 'Emergency Responder',
        description: 'Complete 20 emergency/urgent orders',
        icon: '🚨',
        rarity: 'rare'
      }
    };

    // Reward tiers
    this.rewardTiers = [
      { level: 'rookie', minScore: 0, multiplier: 1.0, perks: ['Basic support'] },
      { level: 'pro', minScore: 100, multiplier: 1.05, perks: ['Priority dispatch', 'Health insurance'] },
      { level: 'elite', minScore: 300, multiplier: 1.10, perks: ['Premium support', 'Fuel subsidy', 'Equipment grants'] },
      { level: 'legend', minScore: 500, multiplier: 1.15, perks: ['VIP treatment', 'Bonus zone exclusivity', 'Annual rewards'] }
    ];
  }

  /**
   * Calculate driver's gamification score
   * Composite metric from multiple achievements
   */
  async calculateDriverScore(driverId) {
    try {
      const driver = await Driver.findById(driverId)
        .select('+totalDeliveries +averageRating +onTimeRate +totalEarnings')
        .lean();

      if (!driver) return 0;

      let score = 0;

      // Base score from deliveries
      score += driver.totalDeliveries * 1; // 1 point per delivery

      // Rating bonus
      score += (driver.averageRating || 0) * 20; // 20 points per rating point

      // On-time bonus
      score += (driver.onTimeRate || 0) * 3; // 3 points per 1% on-time

      // Earnings bonus (every 10k INR = 1 point)
      score += Math.floor((driver.totalEarnings || 0) / 10000);

      return Math.round(score);

    } catch (error) {
      console.error('[Gamification] Score calc error:', error);
      return 0;
    }
  }

  /**
   * Get all achievements unlocked by driver
   */
  async getDriverAchievements(driverId) {
    try {
      const cacheKey = `achievements_${driverId}`;
      const cached = this.achievementCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.ACHIEVEMENT_CACHE_TTL) {
        return cached.achievements;
      }

      const driver = await Driver.findById(driverId)
        .select('+totalDeliveries +averageRating +onTimeRate +totalEarnings')
        .lean();

      if (!driver) return [];

      const unlockedAchievements = [];
      const timings = await this.getDeliveryTimings(driverId);

      // Check each badge condition
      if (timings.fastDeliveries >= 10) {
        unlockedAchievements.push(this.badges.speedDemon);
      }

      if (timings.consecutiveOnTime >= 100) {
        unlockedAchievements.push(this.badges.perfectRecord);
      }

      if (timings.nightDeliveries >= 50) {
        unlockedAchievements.push(this.badges.nightShifter);
      }

      if (timings.rainyDeliveries >= 30) {
        unlockedAchievements.push(this.badges.weatherWarrior);
      }

      if ((driver.averageRating || 0) >= 4.8 && driver.totalDeliveries >= 100) {
        unlockedAchievements.push(this.badges.customerLover);
      }

      if (driver.totalDeliveries >= 500) {
        unlockedAchievements.push(this.badges.marathonRunner);
      }

      const weeklyEarnings = await this.getWeeklyEarnings(driverId);
      if (weeklyEarnings >= 50000) {
        unlockedAchievements.push(this.badges.earningMachine);
      }

      const fiveStarCount = await Order.countDocuments({
        deliveryPartnerId: driverId,
        rating: 5
      });
      if (fiveStarCount >= 100) {
        unlockedAchievements.push(this.badges.socialButterfly);
      }

      if ((driver.onTimeRate || 0) >= 0.90) {
        unlockedAchievements.push(this.badges.consistencyKing);
      }

      const urgentOrders = await Order.countDocuments({
        deliveryPartnerId: driverId,
        isUrgent: true,
        status: 'delivered'
      });
      if (urgentOrders >= 20) {
        unlockedAchievements.push(this.badges.emergencyResponder);
      }

      // Cache results
      this.achievementCache.set(cacheKey, {
        achievements: unlockedAchievements,
        timestamp: Date.now()
      });

      return unlockedAchievements;

    } catch (error) {
      console.error('[Gamification] Achievement fetch error:', error);
      return [];
    }
  }

  /**
   * Get driver's current reward tier
   */
  async getRewardTier(driverId) {
    try {
      const score = await this.calculateDriverScore(driverId);
      const tier = this.rewardTiers
        .sort((a, b) => b.minScore - a.minScore)
        .find(t => score >= t.minScore);

      return {
        ...tier,
        currentScore: score,
        nextTierScore: tier.level === 'legend' ? null : 
          this.rewardTiers.find(t => t.minScore > tier.minScore).minScore,
        scoreToNextTier: tier.level === 'legend' ? null :
          this.rewardTiers.find(t => t.minScore > tier.minScore).minScore - score
      };

    } catch (error) {
      console.error('[Gamification] Tier fetch error:', error);
      return this.rewardTiers[0]; // Default rookie
    }
  }

  /**
   * Get leaderboard (top drivers by score)
   */
  async getLeaderboard(limit = 20, timeframe = '30days', category = 'overall') {
    try {
      let query = { isActive: true, status: 'online' };
      let selectFields = '+totalDeliveries +averageRating +onTimeRate +totalEarnings';

      // Filter by timeframe
      if (timeframe === '7days') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        // Would need separate tracking fields for this
      } else if (timeframe === '24hours') {
        // Similar approach
      }

      const drivers = await Driver.find(query)
        .select(selectFields)
        .limit(limit * 2)
        .lean();

      // Score drivers based on category
      const scored = await Promise.all(
        drivers.map(async (driver) => {
          let categoryScore = 0;

          switch (category) {
            case 'earnings':
              categoryScore = driver.totalEarnings || 0;
              break;
            case 'speed':
              categoryScore = driver.averageRating || 0;
              break;
            case 'reliability':
              categoryScore = (driver.onTimeRate || 0) * 100;
              break;
            case 'deliveries':
              categoryScore = driver.totalDeliveries || 0;
              break;
            default: // overall
              categoryScore = await this.calculateDriverScore(driver._id);
          }

          return {
            ...driver,
            categoryScore,
            tier: (await this.getRewardTier(driver._id)).level
          };
        })
      );

      // Sort by category score
      const leaderboard = scored
        .sort((a, b) => b.categoryScore - a.categoryScore)
        .slice(0, limit)
        .map((driver, index) => ({
          rank: index + 1,
          driverId: driver._id,
          name: driver.name,
          tier: driver.tier,
          score: Math.round(driver.categoryScore),
          stats: {
            deliveries: driver.totalDeliveries,
            rating: Math.round(driver.averageRating * 10) / 10,
            onTimeRate: Math.round(driver.onTimeRate * 100),
            earnings: Math.round(driver.totalEarnings)
          }
        }));

      return { category, timeframe, limit, leaderboard };

    } catch (error) {
      console.error('[Gamification] Leaderboard error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get driver's gamification dashboard
   */
  async getGamificationDashboard(driverId) {
    try {
      const [
        score,
        achievements,
        tier,
        rank,
        nextMilestone
      ] = await Promise.all([
        this.calculateDriverScore(driverId),
        this.getDriverAchievements(driverId),
        this.getRewardTier(driverId),
        this.getDriverRank(driverId),
        this.getNextMilestone(driverId)
      ]);

      return {
        driverId,
        overview: {
          currentScore: score,
          tier: tier.level,
          rank,
          earnedBadges: achievements.length,
          totalBadgesAvailable: Object.keys(this.badges).length
        },
        achievements,
        tier,
        nextMilestone,
        leaderboardContext: {
          yourRank: rank,
          message: rank <= 10 ? '🔥 You\'re in the top 10!' : `Keep pushing to reach top 10!`
        },
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[Gamification] Dashboard error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get driver's rank in overall leaderboard
   */
  async getDriverRank(driverId) {
    try {
      const driversAbove = await Driver.countDocuments({
        isActive: true,
        _id: { $ne: driverId },
        totalDeliveries: { $gt: 0 } // Simple heuristic
      });

      return driversAbove + 1;

    } catch (error) {
      return null;
    }
  }

  /**
   * Get next milestone for driver to unlock badge
   */
  async getNextMilestone(driverId) {
    try {
      const driver = await Driver.findById(driverId)
        .select('+totalDeliveries +averageRating +onTimeRate')
        .lean();

      const timings = await this.getDeliveryTimings(driverId);
      const weeklyEarnings = await this.getWeeklyEarnings(driverId);

      const milestones = [
        {
          badge: this.badges.speedDemon,
          current: timings.fastDeliveries,
          target: 10,
          rarity: 'rare'
        },
        {
          badge: this.badges.marathonRunner,
          current: driver.totalDeliveries,
          target: 500,
          rarity: 'epic'
        },
        {
          badge: this.badges.customerLover,
          current: Math.round(driver.averageRating * 10) / 10,
          target: 4.8,
          rarity: 'epic'
        },
        {
          badge: this.badges.earningMachine,
          current: weeklyEarnings,
          target: 50000,
          rarity: 'very_rare'
        }
      ];

      // Find closest unreached milestone
      const unreached = milestones.filter(m => m.current < m.target);
      if (unreached.length === 0) return null;

      return unreached.sort((a, b) => 
        (a.target - a.current) - (b.target - b.current)
      )[0];

    } catch (error) {
      return null;
    }
  }

  /**
   * Helper: Get delivery timing statistics
   */
  async getDeliveryTimings(driverId) {
    try {
      const orders = await Order.find({
        deliveryPartnerId: driverId,
        status: 'delivered'
      })
      .select('deliveryStartTime deliveryEndTime createdAt')
      .lean()
      .limit(100);

      let fastDeliveries = 0;
      let nightDeliveries = 0;
      let consecutiveOnTime = 0;

      orders.forEach(order => {
        const duration = (new Date(order.deliveryEndTime) - new Date(order.deliveryStartTime)) / 60000;
        if (duration < 15) fastDeliveries++;

        const hour = new Date(order.deliveryStartTime).getHours();
        if (hour < 6 || hour >= 22) nightDeliveries++;
      });

      return {
        fastDeliveries,
        nightDeliveries,
        rainyDeliveries: 0, // Would require weather API
        consecutiveOnTime // Would require status tracking
      };

    } catch (error) {
      return { fastDeliveries: 0, nightDeliveries: 0, rainyDeliveries: 0 };
    }
  }

  /**
   * Helper: Get weekly earnings
   */
  async getWeeklyEarnings(driverId) {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const orders = await Order.find({
        deliveryPartnerId: driverId,
        status: 'delivered',
        deliveryEndTime: { $gte: weekAgo }
      })
      .select('deliveryFee')
      .lean();

      return orders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear cache for testing
   */
  clearCache() {
    this.achievementCache.clear();
  }
}

// Singleton instance
const driverGamification = new DriverGamification();

module.exports = driverGamification;
