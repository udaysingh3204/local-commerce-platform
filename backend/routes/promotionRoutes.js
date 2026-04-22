const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const promotionService = require('../services/promotionService');

/**
 * Promotions & Campaign Routes
 */

/**
 * POST /api/promotions
 * Create a new promotion campaign
 */
router.post('/', authMiddleware, roleMiddleware(['admin', 'marketing']), async (req, res) => {
  try {
    const { name, type, target, discount, validFrom, validTo, maxUsagePerUser, totalBudget, metadata, code } = req.body;

    const campaign = await promotionService.createCampaign({
      name,
      code,
      type, // 'percentage', 'flat', 'bogo', 'tiered'
      target,
      discount,
      validFrom,
      validTo,
      maxUsagePerUser,
      totalBudget,
      metadata
    });

    res.status(201).json({
      status: 'success',
      campaign
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/promotions
 * Get all campaigns with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, type, active } = req.query;

    const campaigns = await promotionService.getAllCampaigns({
      status,
      type,
      active: active === 'true'
    });

    res.json({
      status: 'success',
      count: campaigns.length,
      campaigns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/promotions/:campaignId
 * Get specific campaign
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const campaign = await promotionService.getCampaign(req.params.campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      status: 'success',
      campaign
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/promotions/:campaignId
 * Update campaign
 */
router.put('/:campaignId', authMiddleware, roleMiddleware(['admin', 'marketing']), async (req, res) => {
  try {
    const campaign = await promotionService.updateCampaign(req.params.campaignId, req.body);

    res.json({
      status: 'success',
      campaign
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/promotions/:campaignId/apply
 * Apply promotion to order
 */
router.post('/:campaignId/apply', authMiddleware, async (req, res) => {
  try {
    const { order } = req.body;
    const userId = req.user.id || req.user.userId || req.user._id;

    if (!order) {
      return res.status(400).json({ error: 'Order details required' });
    }

    const result = await promotionService.applyPromotion(req.params.campaignId, order, userId);

    res.json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/promotions/code/:couponCode
 * Validate and fetch campaign by coupon code
 */
router.get('/code/:couponCode', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    const campaign = await promotionService.getCampaignByCodeForUser(req.params.couponCode, userId);

    if (!campaign) {
      return res.status(404).json({ error: 'Coupon code not found' });
    }

    res.json({
      status: 'success',
      campaign
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/promotions/code/:couponCode/apply
 * Apply a promotion by coupon code
 */
router.post('/code/:couponCode/apply', authMiddleware, async (req, res) => {
  try {
    const { order } = req.body;
    const userId = req.user.id || req.user.userId || req.user._id;

    if (!order) {
      return res.status(400).json({ error: 'Order details required' });
    }

    const result = await promotionService.applyCouponCode(req.params.couponCode, order, userId);

    res.json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/promotions/:campaignId/toggle-status
 * Pause or resume campaign
 */
router.post('/:campaignId/toggle-status', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { status } = req.body; // 'paused' or 'active'

    if (!['paused', 'active'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const campaign = await promotionService.toggleCampaignStatus(req.params.campaignId, status);

    res.json({
      status: 'success',
      message: `Campaign ${status}`,
      campaign
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/promotions/:campaignId/metrics
 * Get campaign performance metrics
 */
router.get('/:campaignId/metrics', authMiddleware, roleMiddleware(['admin', 'marketing']), async (req, res) => {
  try {
    const metrics = await promotionService.getCampaignMetrics(req.params.campaignId);

    if (!metrics) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      status: 'success',
      metrics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/promotions/available/for-order
 * Get applicable promotions for user's cart
 */
router.get('/available/for-order', authMiddleware, async (req, res) => {
  try {
    const { products, totalAmount, storeId } = req.query;

    if (!totalAmount || !products) {
      return res.status(400).json({ error: 'Products and totalAmount required' });
    }

    const applicable = await promotionService.getApplicablePromotions({
      userId: req.user.id || req.user.userId || req.user._id,
      products: JSON.parse(products),
      totalAmount: parseFloat(totalAmount),
      storeId
    });

    res.json({
      status: 'success',
      count: applicable.length,
      promotions: applicable
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/promotions/:campaignId
 * Delete campaign
 */
router.delete('/:campaignId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const deleted = await promotionService.deleteCampaign(req.params.campaignId);

    res.json({
      status: deleted ? 'success' : 'not_found',
      message: deleted ? 'Campaign deleted' : 'Campaign not found'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
