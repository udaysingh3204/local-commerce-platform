const Driver = require('../models/Driver');
const Order = require('../models/Order');

class SmartDriverMatcher {
  constructor() {
    this.matchingWeights = {
      proximity: 0.25,
      availability: 0.20,
      onTimeRate: 0.20,
      rating: 0.15,
      experience: 0.10,
      specialization: 0.10
    };

    this.performanceTiers = {
      elite: { onTimeRate: 0.95, minDeliveries: 100 },
      excellent: { onTimeRate: 0.90, minDeliveries: 50 },
      good: { onTimeRate: 0.85, minDeliveries: 20 },
      standard: { onTimeRate: 0.80, minDeliveries: 0 }
    };
  }

  async matchDriversForOrder(order, availableDrivers = null, options = {}) {
    try {
      let drivers = availableDrivers;
      if (!drivers) {
        drivers = await this.getAvailableDrivers();
      }

      if (drivers.length === 0) {
        return [];
      }

      const matches = await Promise.all(
        drivers.map(async (driver) => ({
          driver,
          score: await this.calculateMatchScore(driver, order, options),
          factors: await this.calculateMatchFactors(driver, order)
        }))
      );

      return matches
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.topN || 5);
    } catch (error) {
      console.error('[SmartMatcher] Error matching drivers:', error);
      return [];
    }
  }

  async calculateMatchScore(driver, order, options = {}) {
    try {
      const factors = await this.calculateMatchFactors(driver, order);

      let score = 0;
      score += factors.proximityScore * this.matchingWeights.proximity;
      score += factors.availabilityScore * this.matchingWeights.availability;
      score += factors.performanceScore * this.matchingWeights.onTimeRate;
      score += factors.ratingScore * this.matchingWeights.rating;
      score += factors.experienceScore * this.matchingWeights.experience;
      score += factors.specializationScore * this.matchingWeights.specialization;

      if (options.maxDistance && factors.distance > options.maxDistance) {
        return 0;
      }

      if (options.minRating && driver.averageRating < options.minRating) {
        return 0;
      }

      const tier = this.getPerformanceTier(driver);
      if (tier !== 'standard') {
        const tierBonus = {
          elite: 0.10,
          excellent: 0.07,
          good: 0.04
        };
        score *= (1 + (tierBonus[tier] || 0));
      }

      if (factors.currentLoadScore < 0.3) {
        score *= 0.5;
      }

      return Math.min(100, Math.max(0, score));

    } catch (error) {
      console.error('[SmartMatcher] Error calculating score:', error);
      return 0;
    }
  }

  async calculateMatchFactors(driver, order) {
    try {
      const distance = this.calculateDistance(
        driver.currentLocation?.coordinates,
        order.storeLocation?.coordinates
      ) || 999;

      const proximityScore = Math.max(0, 100 - (distance * 5));

      const activeOrders = await Order.countDocuments({
        deliveryPartnerId: driver._id,
        status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
      });

      const maxCapacity = driver.vehicleType === 'bike' ? 5 : 12;
      const availabilityScore = Math.max(0, 100 - (activeOrders / maxCapacity * 100));

      const onTimeRate = driver.onTimeRate || 0.8;
      const performanceScore = onTimeRate * 100;

      const ratingScore = Math.min(100, (driver.averageRating || 4.5) / 5 * 100);
      const experienceScore = Math.min(100, (driver.totalDeliveries || 0) / 500 * 100);

      const itemsWeight = order.items?.reduce((sum, item) => sum + (item.weight || 0.5), 0) || 2.5;
      const isLightOrder = itemsWeight < 5;

      let specializationScore = 50;
      if (driver.vehicleType === 'bike' && isLightOrder) {
        specializationScore = 100;
      } else if (driver.vehicleType === 'bike' && !isLightOrder) {
        specializationScore = 30;
      } else if (driver.vehicleType === 'car' && !isLightOrder) {
        specializationScore = 100;
      }

      const currentLoadScore = availabilityScore / 100;

      return {
        distance: Math.round(distance * 100) / 100,
        proximityScore: Math.round(proximityScore),
        availabilityScore: Math.round(availabilityScore),
        performanceScore: Math.round(performanceScore),
        ratingScore: Math.round(ratingScore),
        experienceScore: Math.round(experienceScore),
        specializationScore: Math.round(specializationScore),
        currentLoadScore: Math.round(currentLoadScore * 100),
        activeOrders,
        onTimeRate: Math.round(onTimeRate * 100),
        rating: driver.averageRating || 4.5
      };

    } catch (error) {
      console.error('[SmartMatcher] Error calculating factors:', error);
      return {
        proximityScore: 0,
        availabilityScore: 0,
        performanceScore: 0,
        ratingScore: 0,
        experienceScore: 0,
        specializationScore: 0
      };
    }
  }

  async getAvailableDrivers(options = {}) {
    try {
      const query = {
        isActive: true,
        status: 'online'
      };

      if (options.excludeIds) {
        query._id = { $nin: options.excludeIds };
      }

      return await Driver.find(query)
        .select('+onTimeRate +averageRating +totalDeliveries +vehicleType +currentLocation')
        .lean()
        .exec();

    } catch (error) {
      console.error('[SmartMatcher] Error fetching drivers:', error);
      return [];
    }
  }

  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return 999;

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
    return R * c;
  }

  getPerformanceTier(driver) {
    const onTimeRate = driver.onTimeRate || 0;
    const deliveries = driver.totalDeliveries || 0;

    if (onTimeRate >= this.performanceTiers.elite.onTimeRate &&
      deliveries >= this.performanceTiers.elite.minDeliveries) {
      return 'elite';
    }

    if (onTimeRate >= this.performanceTiers.excellent.onTimeRate &&
      deliveries >= this.performanceTiers.excellent.minDeliveries) {
      return 'excellent';
    }

    if (onTimeRate >= this.performanceTiers.good.onTimeRate &&
      deliveries >= this.performanceTiers.good.minDeliveries) {
      return 'good';
    }

    return 'standard';
  }

  isViableMatch(driver, order, maxDistanceKm = 10) {
    const distance = this.calculateDistance(
      driver.currentLocation?.coordinates,
      order.storeLocation?.coordinates
    ) || 999;

    if (distance > maxDistanceKm) {
      return false;
    }

    if ((driver.averageRating || 5) < 3.5) {
      return false;
    }

    const maxCapacity = driver.vehicleType === 'bike' ? 5 : 12;
    if (driver.activeOrderCount >= maxCapacity) {
      return false;
    }

    return true;
  }

  async batchMatchOrders(orders, availableDrivers = null) {
    try {
      const drivers = availableDrivers || await this.getAvailableDrivers();
      const assignments = [];
      const usedDriverIds = new Set();

      const sortedOrders = orders.sort((a, b) => {
        const aPriority = (a.isUrgent ? 1000 : 0) - (a.waitingMinutes || 0);
        const bPriority = (b.isUrgent ? 1000 : 0) - (b.waitingMinutes || 0);
        return bPriority - aPriority;
      });

      for (const order of sortedOrders) {
        const matches = await this.matchDriversForOrder(order, drivers, {
          topN: 10
        });

        const assigned = matches.find((m) => !usedDriverIds.has(m.driver._id.toString()));

        if (assigned) {
          assignments.push({
            orderId: order._id,
            driverId: assigned.driver._id,
            score: assigned.score,
            factors: assigned.factors
          });
          usedDriverIds.add(assigned.driver._id.toString());
        }
      }

      return assignments;

    } catch (error) {
      console.error('[SmartMatcher] Batch matching error:', error);
      return [];
    }
  }

  async getMatchingStats(order) {
    const drivers = await this.getAvailableDrivers();
    const matches = await this.matchDriversForOrder(order, drivers, { topN: 10 });

    return {
      orderSummary: {
        id: order._id,
        store: order.storeId,
        from: order.storeLocation?.coordinates,
        to: order.deliveryLocation?.coordinates,
        itemsCount: order.items?.length || 0,
        weight: order.items?.reduce((sum, item) => sum + (item.weight || 0.5), 0) || 0
      },
      availableDriverCount: drivers.length,
      viableMatches: matches.length,
      topMatches: matches.slice(0, 3).map((m) => ({
        driverId: m.driver._id,
        driverName: m.driver.name,
        score: Math.round(m.score),
        tier: this.getPerformanceTier(m.driver),
        factors: {
          distance: m.factors.distance,
          onTimeRate: m.factors.onTimeRate,
          rating: m.factors.rating,
          activeOrders: m.factors.activeOrders
        }
      }))
    };
  }
}

const smartDriverMatcher = new SmartDriverMatcher();

module.exports = smartDriverMatcher;
