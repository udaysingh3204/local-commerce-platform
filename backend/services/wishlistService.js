const User = require('../models/User');
const Product = require('../models/Product');
const eventBusService = require('./eventBusService');

/**
 * Wishlist & Saved Items Service - User favorites, price tracking, sharing
 * Save products, track price changes, share wishlists, recommendations
 */
class WishlistService {
  constructor() {
    this.wishlistCache = new Map();
    this.priceHistoryCache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Add product to wishlist
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @param {object} metadata - { tags, notes, notifyOnPriceDropPercent }
   */
  async addToWishlist(userId, productId, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      // Initialize wishlist if needed
      if (!user.wishlist) {
        user.wishlist = [];
      }

      // Check if already in wishlist
      const exists = user.wishlist.some(w => w.productId.toString() === productId);
      if (exists) {
        return {
          message: 'Product already in wishlist',
          status: 'already_exists'
        };
      }

      // Add to wishlist
      user.wishlist.push({
        productId,
        addedAt: new Date(),
        notes: metadata.notes || '',
        tags: metadata.tags || [],
        notifyOnPriceDrop: metadata.notifyOnPriceDropPercent || 10, // Notify on 10% drop by default
        priceWhenAdded: product.price,
        lastPriceCheckAt: new Date()
      });

      await user.save();
      this.wishlistCache.delete(userId.toString());

      // Publish event
      await eventBusService.publishEvent('product.saved', {
        productId,
        productName: product.name,
        price: product.price
      }, { userId });

      return {
        message: 'Added to wishlist',
        status: 'added',
        itemCount: user.wishlist.length
      };
    } catch (err) {
      console.error('[WishlistService] addToWishlist error:', err.message);
      throw err;
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(userId, productId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const initialLength = user.wishlist?.length || 0;

      user.wishlist = (user.wishlist || []).filter(
        w => w.productId.toString() !== productId
      );

      const itemRemoved = user.wishlist.length < initialLength;

      if (itemRemoved) {
        await user.save();
        this.wishlistCache.delete(userId.toString());
      }

      return {
        message: itemRemoved ? 'Removed from wishlist' : 'Product not in wishlist',
        status: itemRemoved ? 'removed' : 'not_found',
        itemCount: user.wishlist.length
      };
    } catch (err) {
      console.error('[WishlistService] removeFromWishlist error:', err.message);
      throw err;
    }
  }

  /**
   * Get user's wishlist with current prices
   */
  async getWishlist(userId, options = {}) {
    try {
      const cacheKey = userId.toString();
      if (this.wishlistCache.has(cacheKey)) {
        const cached = this.wishlistCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.wishlist.slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
        }
      }

      const user = await User.findById(userId).populate({
        path: 'wishlist.productId',
        select: 'name price description rating category image discount'
      });

      if (!user || !user.wishlist) {
        return [];
      }

      const enrichedWishlist = user.wishlist.map(item => {
        const product = item.productId;
        const priceDropPercent = ((item.priceWhenAdded - product.price) / item.priceWhenAdded) * 100;

        return {
          wishlistItemId: item._id,
          productId: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          priceWhenAdded: item.priceWhenAdded,
          priceDrop: item.priceWhenAdded - product.price,
          priceDropPercent: parseFloat(priceDropPercent.toFixed(2)),
          discount: product.discount || 0,
          rating: product.rating,
          category: product.category,
          image: product.image,
          addedAt: item.addedAt,
          notes: item.notes,
          tags: item.tags,
          notifyOnPriceDrop: item.notifyOnPriceDrop,
          shouldNotify: priceDropPercent >= item.notifyOnPriceDrop,
          isTrendingUp: product.trendScore > 50
        };
      });

      // Sort by price drop percentage if requested
      if (options.sortBy === 'priceDrop') {
        enrichedWishlist.sort((a, b) => b.priceDropPercent - a.priceDropPercent);
      }

      // Cache
      this.wishlistCache.set(cacheKey, {
        wishlist: enrichedWishlist,
        timestamp: Date.now()
      });

      return enrichedWishlist.slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
    } catch (err) {
      console.error('[WishlistService] getWishlist error:', err.message);
      throw err;
    }
  }

  /**
   * Update wishlist item metadata
   */
  async updateWishlistItem(userId, productId, updates) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.wishlist) throw new Error('Wishlist not found');

      const item = user.wishlist.find(w => w.productId.toString() === productId);
      if (!item) throw new Error('Product not in wishlist');

      if (updates.notes) item.notes = updates.notes;
      if (updates.tags) item.tags = updates.tags;
      if (updates.notifyOnPriceDrop !== undefined) item.notifyOnPriceDrop = updates.notifyOnPriceDrop;

      await user.save();
      this.wishlistCache.delete(userId.toString());

      return { message: 'Wishlist item updated', status: 'updated' };
    } catch (err) {
      console.error('[WishlistService] updateWishlistItem error:', err.message);
      throw err;
    }
  }

  /**
   * Bulk action on wishlist items
   */
  async bulkWishlistAction(userId, action, items) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.wishlist) user.wishlist = [];

      let count = 0;

      if (action === 'remove') {
        // Remove multiple items
        user.wishlist = user.wishlist.filter(w => !items.includes(w.productId.toString()));
        count = items.length;
      } else if (action === 'clear') {
        // Clear entire wishlist
        count = user.wishlist.length;
        user.wishlist = [];
      }

      await user.save();
      this.wishlistCache.delete(userId.toString());

      return {
        message: `${count} items removed from wishlist`,
        status: 'success',
        itemsRemoved: count,
        remainingItems: user.wishlist.length
      };
    } catch (err) {
      console.error('[WishlistService] bulkWishlistAction error:', err.message);
      throw err;
    }
  }

  /**
   * Create shareable wishlist (public link)
   */
  async createShareableWishlist(userId, config = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.shareableWishlists) {
        user.shareableWishlists = [];
      }

      const shareToken = this.generateShareToken();

      const sharedWishlist = {
        id: shareToken,
        name: config.name || 'My Wishlist',
        createdAt: new Date(),
        expiresAt: config.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days default
        isPublic: config.isPublic !== false,
        viewCount: 0,
        selectedItems: config.selectedItems || null // If null, share entire wishlist
      };

      user.shareableWishlists.push(sharedWishlist);
      await user.save();

      return {
        shareToken,
        shareUrl: `${process.env.APP_URL || 'https://app.local-commerce.com'}/wishlist/shared/${shareToken}`,
        expiresAt: sharedWishlist.expiresAt.toISOString()
      };
    } catch (err) {
      console.error('[WishlistService] createShareableWishlist error:', err.message);
      throw err;
    }
  }

  /**
   * Get shared wishlist by token
   */
  async getSharedWishlist(shareToken) {
    try {
      const user = await User.findOne({
        'shareableWishlists.id': shareToken
      }).populate({
        path: 'wishlist.productId',
        select: 'name price description rating category image discount'
      });

      if (!user) throw new Error('Wishlist not found');

      const sharedWishlist = user.shareableWishlists.find(w => w.id === shareToken);

      // Check expiry
      if (sharedWishlist.expiresAt < new Date()) {
        throw new Error('Wishlist link has expired');
      }

      // Increment view count
      sharedWishlist.viewCount++;
      await user.save();

      // Build response
      const items = sharedWishlist.selectedItems
        ? user.wishlist.filter(w => sharedWishlist.selectedItems.includes(w.productId.toString()))
        : user.wishlist;

      return {
        name: sharedWishlist.name,
        ownerName: user.name,
        itemCount: items.length,
        items: items.map(item => ({
          productId: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          rating: item.productId.rating,
          image: item.productId.image,
          discount: item.productId.discount
        }))
      };
    } catch (err) {
      console.error('[WishlistService] getSharedWishlist error:', err.message);
      throw err;
    }
  }

  /**
   * Check price drops and send notifications
   */
  async checkAndNotifyPriceDrops() {
    try {
      const users = await User.find({ wishlist: { $exists: true, $ne: [] } });

      for (const user of users) {
        for (const wishlistItem of user.wishlist) {
          const product = await Product.findById(wishlistItem.productId);
          if (!product) continue;

          const priceDropPercent = ((wishlistItem.priceWhenAdded - product.price) / wishlistItem.priceWhenAdded) * 100;

          if (priceDropPercent >= wishlistItem.notifyOnPriceDrop) {
            // Publish event for notification service
            await eventBusService.publishEvent('wishlist.price_dropped', {
              productId: product._id,
              productName: product.name,
              previousPrice: wishlistItem.priceWhenAdded,
              currentPrice: product.price,
              dropPercent: priceDropPercent
            }, { userId: user._id });
          }

          // Update last check
          wishlistItem.lastPriceCheckAt = new Date();
        }

        await user.save();
      }

      console.log('[WishlistService] Price drop notifications sent');
    } catch (err) {
      console.error('[WishlistService] checkAndNotifyPriceDrops error:', err.message);
    }
  }

  /**
   * Get wishlist recommendations (products similar to wishlist items)
   */
  async getWishlistRecommendations(userId, limit = 10) {
    try {
      const user = await User.findById(userId).populate({
        path: 'wishlist.productId',
        select: 'category tags'
      });

      if (!user || !user.wishlist || user.wishlist.length === 0) {
        return [];
      }

      // Extract categories and tags from wishlist
      const categories = new Set();
      const tags = new Set();

      user.wishlist.forEach(item => {
        if (item.productId?.category) {
          categories.add(item.productId.category);
        }
        if (item.productId?.tags) {
          item.productId.tags.forEach(tag => tags.add(tag));
        }
      });

      // Find similar products not in wishlist
      const wishlistProductIds = user.wishlist.map(w => w.productId._id);

      const recommendations = await Product.find({
        $and: [
          { _id: { $nin: wishlistProductIds } },
          {
            $or: [
              { category: { $in: Array.from(categories) } },
              { tags: { $in: Array.from(tags) } }
            ]
          }
        ],
        isActive: true
      })
        .limit(limit * 2)
        .sort({ rating: -1, trendScore: -1 })
        .lean();

      return recommendations.slice(0, limit);
    } catch (err) {
      console.error('[WishlistService] getWishlistRecommendations error:', err.message);
      throw err;
    }
  }

  // Private methods

  generateShareToken() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new WishlistService();
