const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const searchRecommendationService = require('../services/searchRecommendationService');

/**
 * Smart Search & Recommendation Routes
 */

/**
 * GET /api/search
 * Full-text search with filters
 */
router.get('/', async (req, res) => {
  try {
    const { q, category, store, priceMin, priceMax, rating, sort, limit = 20, offset = 0 } = req.query;

    const filters = {
      category: category || null,
      storeId: store || null,
      priceMin: priceMin ? parseInt(priceMin) : null,
      priceMax: priceMax ? parseInt(priceMax) : null,
      rating: rating ? parseFloat(rating) : null,
      sort: sort || 'relevance'
    };

    const results = await searchRecommendationService.searchProducts(q || '', filters, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      userId: req.user?.id
    });

    res.json({
      query: q,
      count: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/suggestions
 * Search autocomplete suggestions
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    const suggestions = await searchRecommendationService.getSearchSuggestions(q || '', parseInt(limit));

    res.json({
      query: q,
      suggestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/trending
 * Get trending products
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trending = await searchRecommendationService.getTrendingProducts(parseInt(limit));

    res.json({
      count: trending.length,
      products: trending
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/recommendations
 * Get personalized recommendations
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const { limit = 10, excludeCategories, includeCategories } = req.query;

    const recommendations = await searchRecommendationService.getRecommendations(req.user.id, {
      limit: parseInt(limit),
      excludeCategories: excludeCategories ? excludeCategories.split(',') : undefined,
      includeCategories: includeCategories ? includeCategories.split(',') : undefined
    });

    res.json({
      count: recommendations.length,
      recommendations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/similar/:productId
 * Get similar products
 */
router.get('/similar/:productId', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const similar = await searchRecommendationService.getSimilarProducts(
      req.params.productId,
      parseInt(limit)
    );

    res.json({
      count: similar.length,
      similar
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/search/track-view/:productId
 * Track product view for analytics
 */
router.post('/track-view/:productId', authMiddleware, async (req, res) => {
  try {
    await searchRecommendationService.trackProductView(req.user.id, req.params.productId);

    res.json({
      status: 'tracked',
      message: 'Product view tracked'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
