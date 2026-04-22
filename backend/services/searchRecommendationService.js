const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Store = require('../models/Store');

/**
 * Smart Search & Recommendation Engine - AI-powered discovery with personalization
 * Full-text search, filters, collaborative filtering, trending products
 */
class SearchRecommendationService {
  constructor() {
    this.searchCache = new Map();
    this.recommendationCache = new Map();
    this.cacheTTL = 30 * 60 * 1000; // 30 minutes
    this.userBehavior = new Map(); // userId → { searches, views, purchases, ratings }
  }

  /**
   * Full-text search across products with filters
   * @param {string} query - Search query
   * @param {object} filters - { category, storeId, priceMin, priceMax, rating, sort }
   * @param {object} options - { limit, offset, userId }
   * @returns {array} Ranked search results
   */
  async searchProducts(query, filters = {}, options = {}) {
    try {
      const cacheKey = `search_${query}_${JSON.stringify(filters)}`;
      if (this.searchCache.has(cacheKey)) {
        const cached = this.searchCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.results.slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
        }
      }

      let searchQuery = {};

      // Full-text search
      if (query && query.trim()) {
        searchQuery.$or = [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } }
        ];
      }

      // Apply filters
      if (filters.category) {
        searchQuery.category = filters.category;
      }
      if (filters.storeId) {
        searchQuery.storeId = filters.storeId;
      }
      if (filters.priceMin || filters.priceMax) {
        searchQuery.price = {};
        if (filters.priceMin) searchQuery.price.$gte = filters.priceMin;
        if (filters.priceMax) searchQuery.price.$lte = filters.priceMax;
      }
      if (filters.rating) {
        searchQuery.rating = { $gte: filters.rating };
      }

      // Determine sort
      let sortOption = { createdAt: -1 }; // Default: newest
      if (filters.sort === 'price_asc') sortOption = { price: 1 };
      if (filters.sort === 'price_desc') sortOption = { price: -1 };
      if (filters.sort === 'rating') sortOption = { rating: -1 };
      if (filters.sort === 'popularity') sortOption = { orderCount: -1 };
      if (filters.sort === 'trending') sortOption = { trendScore: -1 };

      // Execute search
      const products = await Product.find(searchQuery)
        .populate('storeId', 'name rating')
        .sort(sortOption)
        .lean();

      // Enhance with relevance scores
      const enhanced = products.map(product => {
        let relevanceScore = 100;

        // Boost by match quality
        if (query && query.trim()) {
          if (product.name.toLowerCase().includes(query.toLowerCase())) {
            relevanceScore += 50;
          }
          if (product.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
            relevanceScore += 30;
          }
        }

        // Boost by rating
        relevanceScore += (product.rating || 0) * 10;

        // Boost by popularity
        relevanceScore += Math.min(product.orderCount || 0, 100);

        return {
          ...product,
          relevanceScore,
          displayPrice: `₹${product.price}`,
          discount: product.discount || 0,
          finalPrice: product.price * (1 - (product.discount || 0) / 100)
        };
      });

      // Sort by relevance
      enhanced.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Cache results
      this.searchCache.set(cacheKey, {
        results: enhanced,
        timestamp: Date.now()
      });

      // Track search (for analytics)
      if (options.userId) {
        await this.trackUserSearch(options.userId, query, enhanced.length);
      }

      return enhanced.slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
    } catch (err) {
      console.error('[SearchRecommendationService] searchProducts error:', err.message);
      throw err;
    }
  }

  /**
   * Get personalized recommendations for user
   * @param {string} userId - User ID
   * @param {object} options - { limit, excludeCategories, includeCategories }
   * @returns {array} Recommended products ranked by predicted preference
   */
  async getRecommendations(userId, options = {}) {
    try {
      const limit = options.limit || 10;
      const cacheKey = `rec_${userId}`;

      if (this.recommendationCache.has(cacheKey)) {
        const cached = this.recommendationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.recommendations.slice(0, limit);
        }
      }

      const user = await User.findById(userId).select('preferences language subscription');
      const userOrders = await Order.find({ userId }).populate('items.productId');
      const userPurchasedCategories = this.extractUserPurchaseCategories(userOrders);

      // Build recommendation query
      let query = { isActive: true };

      if (options.includeCategories) {
        query.category = { $in: options.includeCategories };
      } else if (userPurchasedCategories.length > 0) {
        query.category = { $in: userPurchasedCategories };
      }

      if (options.excludeCategories) {
        query.category = { $nin: options.excludeCategories };
      }

      const candidates = await Product.find(query)
        .populate('storeId', 'name rating')
        .lean();

      // Score candidates by predicted preference
      const scored = candidates.map(product => {
        let score = 100;

        // Weight by user's purchase history
        if (userPurchasedCategories.includes(product.category)) {
          score += 50;
        }

        // Weight by rating (proxy for quality)
        score += (product.rating || 0) * 15;

        // Weight by popularity
        score += Math.min(product.orderCount || 0, 50);

        // Apply discount bonus (limited-time deals)
        if (product.discount && product.discount > 20) {
          score += 30;
        }

        // Trending boost
        score += (product.trendScore || 0);

        return {
          ...product,
          predictionScore: score,
          recommendationReason: this.getRecommendationReason(product, userPurchasedCategories)
        };
      });

      // Rank and select top recommendations
      const recommendations = scored
        .sort((a, b) => b.predictionScore - a.predictionScore)
        .slice(0, limit * 2) // Get 2x to filter
        .filter(p => !userOrders.some(o => o.items?.some(i => i.productId?._id?.toString() === p._id.toString()))) // Exclude already bought
        .slice(0, limit);

      // Cache
      this.recommendationCache.set(cacheKey, {
        recommendations,
        timestamp: Date.now()
      });

      return recommendations;
    } catch (err) {
      console.error('[SearchRecommendationService] getRecommendations error:', err.message);
      throw err;
    }
  }

  /**
   * Get trending products (across platform)
   */
  async getTrendingProducts(limit = 10) {
    try {
      const cacheKey = 'trending_products';
      if (this.recommendationCache.has(cacheKey)) {
        const cached = this.recommendationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 min cache
          return cached.recommendations;
        }
      }

      // Get products with recent orders
      const recentOrders = await Order.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }).populate('items.productId');

      const productScores = {};

      recentOrders.forEach(order => {
        (order.items || []).forEach(item => {
          if (item.productId?._id) {
            const id = item.productId._id.toString();
            if (!productScores[id]) {
              productScores[id] = { product: item.productId, count: 0, score: 0 };
            }
            productScores[id].count++;
            productScores[id].score += item.quantity || 1;
          }
        });
      });

      const trending = Object.values(productScores)
        .map(entry => ({
          ...entry.product,
          trendScore: entry.score,
          orderCount: entry.count,
          trend: entry.count > 10 ? '🔥 Hot' : '⬆️ Rising'
        }))
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, limit);

      this.recommendationCache.set(cacheKey, {
        recommendations: trending,
        timestamp: Date.now()
      });

      return trending;
    } catch (err) {
      console.error('[SearchRecommendationService] getTrendingProducts error:', err.message);
      throw err;
    }
  }

  /**
   * Get similar products (used in product detail page)
   */
  async getSimilarProducts(productId, limit = 5) {
    try {
      const product = await Product.findById(productId);
      if (!product) return [];

      const similar = await Product.find({
        $and: [
          { _id: { $ne: productId } },
          {
            $or: [
              { category: product.category },
              { store: product.storeId },
              { tags: { $in: product.tags || [] } }
            ]
          }
        ],
        isActive: true
      })
        .populate('storeId', 'name')
        .limit(limit)
        .lean();

      return similar;
    } catch (err) {
      console.error('[SearchRecommendationService] getSimilarProducts error:', err.message);
      throw err;
    }
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(query, limit = 10) {
    try {
      if (!query || query.length < 2) return [];

      const cacheKey = `suggestions_${query}`;
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey).results.slice(0, limit);
      }

      // Get distinct product names/categories matching query
      const [productNames, categories] = await Promise.all([
        Product.distinct('name', { name: { $regex: query, $options: 'i' }, isActive: true }).limit(limit),
        Product.distinct('category', { category: { $regex: query, $options: 'i' }, isActive: true }).limit(5)
      ]);

      const suggestions = [
        ...productNames.map(name => ({ text: name, type: 'product' })),
        ...categories.map(cat => ({ text: cat, type: 'category' }))
      ].slice(0, limit);

      this.searchCache.set(cacheKey, {
        results: suggestions,
        timestamp: Date.now()
      });

      return suggestions;
    } catch (err) {
      console.error('[SearchRecommendationService] getSearchSuggestions error:', err.message);
      throw err;
    }
  }

  /**
   * Track product view for recommendation weighting
   */
  async trackProductView(userId, productId) {
    try {
      const key = userId.toString();
      if (!this.userBehavior.has(key)) {
        this.userBehavior.set(key, { searches: [], views: [], purchases: [], ratings: [] });
      }

      const behavior = this.userBehavior.get(key);
      behavior.views.push({
        productId: productId.toString(),
        timestamp: Date.now()
      });

      // Keep only last 100 views
      if (behavior.views.length > 100) {
        behavior.views.shift();
      }

      // Clear recommendation cache for this user
      this.recommendationCache.delete(`rec_${userId}`);
    } catch (err) {
      console.error('[SearchRecommendationService] trackProductView error:', err.message);
    }
  }

  // Private methods

  extractUserPurchaseCategories(orders) {
    const categories = new Set();
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        if (item.category) {
          categories.add(item.category);
        }
      });
    });
    return Array.from(categories);
  }

  getRecommendationReason(product, userCategories) {
    if (userCategories.includes(product.category)) {
      return '📌 Based on your purchases';
    }
    if (product.discount > 20) {
      return '💰 Great deal';
    }
    if (product.trendScore > 100) {
      return '🔥 Trending now';
    }
    if (product.rating > 4.5) {
      return '⭐ Highly rated';
    }
    return '✨ Recommended for you';
  }

  async trackUserSearch(userId, query, resultCount) {
    try {
      const key = userId.toString();
      if (!this.userBehavior.has(key)) {
        this.userBehavior.set(key, { searches: [], views: [], purchases: [], ratings: [] });
      }

      const behavior = this.userBehavior.get(key);
      behavior.searches.push({
        query,
        resultCount,
        timestamp: Date.now()
      });

      // Keep last 50
      if (behavior.searches.length > 50) {
        behavior.searches.shift();
      }
    } catch (err) {
      console.error('[SearchRecommendationService] trackUserSearch error:', err.message);
    }
  }
}

// Export singleton
module.exports = new SearchRecommendationService();
