const Order = require('../models/Order');
const Store = require('../models/Store');

// Dynamic Pricing Engine
// Adjusts delivery fees and base prices based on demand, location, and time patterns

class DynamicPricingEngine {
  constructor() {
    this.baseFeePerKm = 5; // Base delivery fee per km
    this.demandMultipliers = {
      low: 0.8,
      normal: 1.0,
      high: 1.3,
      veryHigh: 1.5,
      peak: 1.8
    };

    this.timeMultipliers = {
      offPeak: 0.9, // 10-11am, 2-5pm, 10pm+
      normal: 1.0,  // 11am-2pm, 5-7pm
      peak: 1.2,    // 12-1pm, 6-7pm (lunch/dinner)
      veryPeak: 1.4 // 12:30-12:45pm, 6:30-6:45pm surge
    };

    this.distanceMultipliers = {
      nearby: 1.0,       // 0-2km
      medium: 1.1,       // 2-5km
      far: 1.3,          // 5-10km
      veryFar: 1.5       // 10km+
    };

    // Demand zones (geographic areas with surge pricing)
    this.demandZones = new Map();
    this.zoneActivityCache = new Map();
    this.CACHE_TTL = 1000 * 60 * 15; // 15 minutes

    this.priceFloor = 40; // Minimum delivery fee
    this.priceCeiling = 300; // Maximum delivery fee
  }

  /**
   * Calculate dynamic delivery fee
   * Considers demand, time of day, distance, and location
   */
  async calculateDeliveryFee(order, storeLocation = null, deliveryLocation = null) {
    try {
      // Extract coordinates
      const from = storeLocation || order.storeLocation?.coordinates;
      const to = deliveryLocation || order.deliveryLocation?.coordinates;

      if (!from || !to) {
        return {
          baseFee: this.priceFloor,
          surgeMultiplier: 1.0,
          finalFee: this.priceFloor,
          breakdownReason: 'Location data missing'
        };
      }

      // Calculate distance
      const distance = this.calculateDistance(from, to);

      // Get current demand level
      const demandLevel = await this.getCurrentDemandLevel(from);
      const demandMultiplier = this.demandMultipliers[demandLevel];

      // Get time-based multiplier
      const hour = new Date().getHours();
      const dayOfWeek = new Date().getDay();
      const timeMultiplier = this.getTimeMultiplier(hour, dayOfWeek);

      // Get distance-based multiplier
      const distanceMultiplier = this.getDistanceMultiplier(distance);

      // Calculate base fee (distance-based)
      let fee = Math.max(this.priceFloor, distance * this.baseFeePerKm);

      // Apply all multipliers
      const totalMultiplier = demandMultiplier * timeMultiplier * distanceMultiplier;
      fee = fee * totalMultiplier;

      // Add location surge if applicable
      const locationBonus = await this.getLocationBonus(from);
      fee += locationBonus;

      // Clamp to ceiling
      fee = Math.min(fee, this.priceCeiling);
      fee = Math.ceil(fee); // Round up

      return {
        baseFee: Math.ceil(distance * this.baseFeePerKm),
        distance: Math.round(distance * 100) / 100,
        demandLevel,
        demandMultiplier,
        timeMultiplier,
        distanceMultiplier,
        locationBonus: Math.round(locationBonus),
        finalFee: fee,
        breakdown: {
          'Base (distance)': Math.ceil(distance * this.baseFeePerKm),
          'Demand surge': Math.round((demandMultiplier - 1) * 100) + '%',
          'Time surge': Math.round((timeMultiplier - 1) * 100) + '%',
          'Distance rate': Math.round((distanceMultiplier - 1) * 100) + '%',
          'Location bonus': locationBonus + ' INR'
        }
      };

    } catch (error) {
      console.error('[DynamicPricing] Error calculating fee:', error);
      return {
        baseFee: this.priceFloor,
        finalFee: this.priceFloor,
        error: error.message
      };
    }
  }

  /**
   * Get current demand level for a geographic area
   * Analyzes recent order volume and delivery times
   */
  async getCurrentDemandLevel(coordinates) {
    try {
      // Create zone key (grid-based approach)
      const zoneKey = this.getZoneKey(coordinates);
      
      // Check cache
      const cached = this.zoneActivityCache.get(zoneKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.demandLevel;
      }

      // Get recent orders in this zone (last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const activeOrders = await Order.countDocuments({
        'storeLocation.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: 5000 // 5km radius
          }
        },
        createdAt: { $gte: twoHoursAgo },
        status: { $in: ['pending', 'assigned', 'picked_up', 'out_for_delivery'] }
      });

      // Calculate demand level based on active order count
      let demandLevel = 'normal';
      if (activeOrders <= 3) demandLevel = 'low';
      else if (activeOrders <= 8) demandLevel = 'normal';
      else if (activeOrders <= 15) demandLevel = 'high';
      else if (activeOrders <= 25) demandLevel = 'veryHigh';
      else demandLevel = 'peak';

      // Cache result
      this.zoneActivityCache.set(zoneKey, {
        demandLevel,
        activeOrders,
        timestamp: Date.now()
      });

      return demandLevel;

    } catch (error) {
      console.error('[DynamicPricing] Error calculating demand:', error);
      return 'normal';
    }
  }

  /**
   * Get time-based price multiplier
   */
  getTimeMultiplier(hour, dayOfWeek) {
    // Weekend surcharge
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendBonus = isWeekend ? 1.1 : 1.0;

    // Peak hours
    if ((hour === 12) || (hour === 13) || (hour === 19) || (hour === 20)) {
      return this.timeMultipliers.peak * weekendBonus;
    }

    // Very peak (lunch/dinner rush exact times)
    if ((hour === 12 && getMinutes() > 30) || (hour === 19 && getMinutes() > 30)) {
      return this.timeMultipliers.veryPeak * weekendBonus;
    }

    // Normal hours
    if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
      return this.timeMultipliers.normal * weekendBonus;
    }

    // Off-peak
    return this.timeMultipliers.offPeak;
  }

  /**
   * Get distance-based multiplier
   */
  getDistanceMultiplier(distanceKm) {
    if (distanceKm <= 2) return this.distanceMultipliers.nearby;
    if (distanceKm <= 5) return this.distanceMultipliers.medium;
    if (distanceKm <= 10) return this.distanceMultipliers.far;
    return this.distanceMultipliers.veryFar;
  }

  /**
   * Get location-based bonus for high-traffic areas
   */
  async getLocationBonus(coordinates) {
    try {
      // High-density urban areas get surcharge
      const nearbyStores = await Store.countDocuments({
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: 2000 // 2km radius
          }
        }
      });

      if (nearbyStores > 20) return 50; // Premium urban area
      if (nearbyStores > 10) return 25;
      return 0;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate distance between two geographic points
   */
  calculateDistance(coord1, coord2) {
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
   * Create grid-based zone key from coordinates
   * Useful for geographic partitioning
   */
  getZoneKey(coordinates) {
    const [lon, lat] = coordinates;
    const gridSize = 0.05; // ~5km grid
    const gridX = Math.floor(lon / gridSize);
    const gridY = Math.floor(lat / gridSize);
    return `${gridX}_${gridY}`;
  }

  /**
   * Register high-demand zone (manual configuration)
   */
  registerDemandZone(name, coordinates, radius, multiplier) {
    this.demandZones.set(name, {
      coordinates,
      radius,
      multiplier,
      createdAt: new Date()
    });
  }

  /**
   * Get analytics on pricing changes
   */
  async getPricingAnalytics(ordersLast24h = 100) {
    try {
      const orders24h = await Order.find({
        createdAt: { 
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
        }
      })
      .limit(ordersLast24h)
      .lean();

      const feeStats = {
        totalOrders: orders24h.length,
        averageFee: 0,
        minFee: Infinity,
        maxFee: -Infinity,
        averageDistance: 0
      };

      let totalFee = 0;
      let totalDistance = 0;

      for (const order of orders24h) {
        const fee = order.deliveryFee || 0;
        const distance = this.calculateDistance(
          order.storeLocation?.coordinates,
          order.deliveryLocation?.coordinates
        ) || 0;

        totalFee += fee;
        totalDistance += distance;
        feeStats.minFee = Math.min(feeStats.minFee, fee);
        feeStats.maxFee = Math.max(feeStats.maxFee, fee);
      }

      feeStats.averageFee = Math.round(totalFee / orders24h.length);
      feeStats.averageDistance = Math.round(totalDistance / orders24h.length * 100) / 100;

      return feeStats;

    } catch (error) {
      console.error('[DynamicPricing] Error getting analytics:', error);
      return null;
    }
  }

  /**
   * Test pricing model with given parameters
   */
  async testPricing(distance, demandLevel = 'normal', hour = 12) {
    const from = [80.2707, 13.0826]; // Default location (Chennai)
    const to = [80.2707 + (distance / 111), 13.0826]; // Add distance

    const fakeOrder = {
      storeLocation: { coordinates: from },
      deliveryLocation: { coordinates: to }
    };

    const result = await this.calculateDeliveryFee(fakeOrder);
    return result;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.zoneActivityCache.clear();
  }
}

// Singleton instance
const dynamicPricingEngine = new DynamicPricingEngine();

module.exports = dynamicPricingEngine;
