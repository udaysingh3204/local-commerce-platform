const Driver = require('../models/Driver');
const Order = require('../models/Order');

// Smart Driver Matching Algorithm
// Finds optimal driver assignments based on multiple factors: skill, capacity, location, performance

class SmartDriverMatcher {
  constructor() {
    this.matchingWeights = {
      proximity: 0.25, // Closest driver
      availability: 0.20, // Low current load
      onTimeRate: 0.20, // Historical performance
      rating: 0.15, // Customer satisfaction
      experience: 0.10, // Delivery count
      specialization: 0.10 // Type match (bike for light, car for heavy)
    };
    
    // Performance tiers for bonuses
    this.performanceTiers = {
      elite: { onTimeRate: 0.95, minDeliveries: 100 },
      excellent: { onTimeRate: 0.90, minDeliveries: 50 },
      good: { onTimeRate: 0.85, minDeliveries: 20 },
      standard: { onTimeRate: 0.80, minDeliveries: 0 }
    };
  }

  /**
   * Find best drivers for an order
   * @param {Object} order - Order document
   * @param {Array} availableDrivers - List of available drivers
   * @param {Object} options - Algorithm options
   * @returns {Array} Ranked drivers with match scores
   */
  async matchDriversForOrder(order, availableDrivers = null, options = {}) {
    try {
      // Fetch available drivers if not provided
      let drivers = availableDrivers;
      if (!drivers) {
        drivers = await this.getAvailableDrivers();
      }

      if (drivers.length === 0) {
        return [];
      }

      // Calculate match score for each driver
      const matches = await Promise.all(
        drivers.map(async (driver) => ({
          driver,
          score: await this.calculateMatchScore(driver, order, options),
          factors: await this.calculateMatchFactors(driver, order)
        }))
      );

      // Sort by score descending
      return matches
        .filter(m => m.score > 0) // Only viable matches
        .sort((a, b) => b.score - a.score)
        .slice(0, options.topN || 5);
    } catch (error) {
      console.error('[SmartMatcher] Error matching drivers:', error);
      return [];
    }
  }

  /**
   * Calculate composite match score (0-100)
   */
  async calculateMatchScore(driver, order, options = {}) {
    try {
      const factors = await this.calculateMatchFactors(driver, order);

      // Weighted score calculation
      let score = 0;
      score += factors.proximityScore * this.matchingWeights.proximity;
      score += factors.availabilityScore * this.matchingWeights.availability;
      score += factors.performanceScore * this.matchingWeights.onTimeRate;
      score += factors.ratingScore * this.matchingWeights.rating;
      score += factors.experienceScore * this.matchingWeights.experience;
      score += factors.specializationScore * this.matchingWeights.specialization;

      // Hard constraints (disqualify if violated)
      if (options.maxDistance && factors.distance > options.maxDistance) {
        return 0;
      }

      if (options.minRating && driver.averageRating < options.minRating) {
        return 0;
      }

      // Bonus for performance tier
      const tier = this.getPerformanceTier(driver);
      if (tier !== 'standard') {
        const tierBonus = {
          elite: 0.10,
          excellent: 0.07,
          good: 0.04
        };
        score *= (1 + (tierBonus[tier] || 0));
      }

      // Penalty for overload
      if (factors.currentLoadScore < 0.3) { // Nearly full
        score *= 0.5;
      }

      return Math.min(100, Math.max(0, score));

    } catch (error) {
      console.error('[SmartMatcher] Error calculating score:', error);
      return 0;
    }
  }

  /**
   * Calculate individual match factors
   */
  async calculateMatchFactors(driver, order) {
    try {
      // 1. Proximity score (0-100): Lower distance = higher score
      const distance = this.calculateDistance(
        driver.currentLocation?.coordinates,
        order.storeLocation?.coordinates
      ) || 999;
      
      const proximityScore = Math.max(0, 100 - (distance * 5)); // Decreases 5 points per km

      // 2. Availability score (0-100): Based on current active orders
      const activeOrders = await Order.countDocuments({
        deliveryPartnerId: driver._id,
        status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
      });

      const maxCapacity = driver.vehicleType === 'bike' ? 5 : 12;
      const availabilityScore = Math.max(0, 100 - (activeOrders / maxCapacity * 100));

      // 3. Performance score (0-100): On-time delivery rate
      const onTimeRate = driver.onTimeRate || 0.8;
      const performanceScore = onTimeRate * 100;

      // 4. Rating score (0-100): Customer satisfaction
      const ratingScore = Math.min(100, (driver.averageRating || 4.5) / 5 * 100);

      // 5. Experience score (0-100): Number of deliveries
      const experienceScore = Math.min(100, (driver.totalDeliveries || 0) / 500 * 100);

      // 6. Specialization score (0-100): Vehicle-order match
      const itemsWeight = order.items?.reduce((sum, item) => sum + (item.weight || 0.5), 0) || 2.5;
      const isLightOrder = itemsWeight < 5; // Less than 5kg
      
      let specializationScore = 50; // Base score
      if (driver.vehicleType === 'bike' && isLightOrder) {
        specializationScore = 100; // Perfect match
      } else if (driver.vehicleType === 'bike' && !isLightOrder) {
        specializationScore = 30; // Poor match
      } else if (driver.vehicleType === 'car' && !isLightOrder) {
        specializationScore = 100; // Perfect match
      }

      // 7. Current load score (relative to capacity)
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

  /**
   * Get drivers available for assignment
   */
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

  /**
   * Calculate distance between coordinates (Haversine formula)
   */
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return 999;
    
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
    return R * c;
  }

  /**
   * Get performance tier for driver
   */
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

  /**
   * Detect and prevent bad matchings
   * Returns true if matching is viable
   */
  isViableMatch(driver, order, maxDistanceKm = 10) {
    const distance = this.calculateDistance(
      driver.currentLocation?.coordinates,
      order.storeLocation?.coordinates
    ) || 999;

    // Distance constraint
    if (distance > maxDistanceKm) {
      return false;
    }

    // Very low rating constraint
    if ((driver.averageRating || 5) < 3.5) {
      return false;
    }

    // Overload constraint
    const maxCapacity = driver.vehicleType === 'bike' ? 5 : 12;
    if (driver.activeOrderCount >= maxCapacity) {
      return false;
    }

    return true;
  }

  /**
   * Batch match orders to drivers
   * Attempts to assign multiple orders while avoiding conflicts
   */
  async batchMatchOrders(orders, availableDrivers = null) {
    try {
      const drivers = availableDrivers || await this.getAvailableDrivers();
      const assignments = [];
      const usedDriverIds = new Set();

      // Sort orders by priority (urgent first)
      const sortedOrders = orders.sort((a, b) => {
        const aPriority = (a.isUrgent ? 1000 : 0) - (a.waitingMinutes || 0);
        const bPriority = (b.isUrgent ? 1000 : 0) - (b.waitingMinutes || 0);
        return bPriority - aPriority;
      });

      for (const order of sortedOrders) {
        const matches = await this.matchDriversForOrder(order, drivers, {
          topN: 10
        });

        // Find first available driver not yet used
        const assigned = matches.find(m => !usedDriverIds.has(m.driver._id.toString()));
        
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

  /**
   * Get matching statistics (for debugging/monitoring)
   */
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
      topMatches: matches.slice(0, 3).map(m => ({
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

// Singleton instance
const smartDriverMatcher = new SmartDriverMatcher();

module.exports = smartDriverMatcher;
