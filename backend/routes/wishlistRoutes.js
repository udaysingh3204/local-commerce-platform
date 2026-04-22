const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const wishlistService = require('../services/wishlistService');

/**
 * Wishlist & Saved Items Routes
 */

/**
 * GET /api/wishlist
 * Get user's wishlist
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0, sortBy } = req.query;

    const wishlist = await wishlistService.getWishlist(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy
    });

    res.json({
      status: 'success',
      count: wishlist.length,
      wishlist
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/wishlist/bulk-action
 * Perform bulk actions on wishlist
 */
router.post('/bulk-action', authMiddleware, async (req, res) => {
  try {
    const { action, items } = req.body; // action: 'remove' or 'clear'

    if (!['remove', 'clear'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const result = await wishlistService.bulkWishlistAction(req.user.id, action, items || []);

    res.json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/wishlist/share
 * Create a shareable wishlist link
 */
router.post('/share', authMiddleware, async (req, res) => {
  try {
    const { name, expiresAt, isPublic, selectedItems } = req.body;

    const result = await wishlistService.createShareableWishlist(req.user.id, {
      name,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isPublic,
      selectedItems
    });

    res.status(201).json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/wishlist/shared/:shareToken
 * View a shared wishlist
 */
router.get('/shared/:shareToken', async (req, res) => {
  try {
    const wishlist = await wishlistService.getSharedWishlist(req.params.shareToken);

    res.json({
      status: 'success',
      ...wishlist
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/wishlist/recommendations
 * Get recommendations based on wishlist
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations = await wishlistService.getWishlistRecommendations(
      req.user.id,
      parseInt(limit)
    );

    res.json({
      status: 'success',
      count: recommendations.length,
      recommendations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/wishlist/:productId
 * Add product to wishlist
 */
router.post('/:productId', authMiddleware, async (req, res) => {
  try {
    const { notes, tags, notifyOnPriceDropPercent } = req.body;

    const result = await wishlistService.addToWishlist(req.user.id, req.params.productId, {
      notes,
      tags: tags || [],
      notifyOnPriceDropPercent
    });

    res.status(201).json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/wishlist/:productId
 * Remove product from wishlist
 */
router.delete('/:productId', authMiddleware, async (req, res) => {
  try {
    const result = await wishlistService.removeFromWishlist(req.user.id, req.params.productId);

    res.json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/wishlist/:productId
 * Update wishlist item metadata
 */
router.put('/:productId', authMiddleware, async (req, res) => {
  try {
    const { notes, tags, notifyOnPriceDrop } = req.body;

    const result = await wishlistService.updateWishlistItem(req.user.id, req.params.productId, {
      notes,
      tags,
      notifyOnPriceDrop
    });

    res.json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
