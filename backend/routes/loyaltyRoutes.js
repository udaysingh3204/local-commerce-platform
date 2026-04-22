const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const loyaltyService = require('../services/loyaltyService');

/**
 * Loyalty Points & Rewards Routes
 */

/**
 * GET /api/loyalty/my-balance
 * Get user's loyalty balance and tier
 */
router.get('/my-balance', authMiddleware, async (req, res) => {
  try {
    const loyalty = await loyaltyService.getUserLoyalty(req.user.id);

    res.json({
      status: 'success',
      ...loyalty
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/loyalty/redeem
 * Redeem loyalty points for discount
 */
router.post('/redeem', authMiddleware, async (req, res) => {
  try {
    const { orderId, points } = req.body;

    if (!points || points < 100) {
      return res.status(400).json({
        error: 'Minimum redemption is 100 points'
      });
    }

    const result = await loyaltyService.redeemPoints(req.user.id, orderId, points);

    res.json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/loyalty/leaderboard
 * Get loyalty leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const leaderboard = await loyaltyService.getLeaderboard(parseInt(limit));

    res.json({
      status: 'success',
      count: leaderboard.length,
      leaderboard
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/loyalty/benefits/:tier
 * Get benefits for a tier
 */
router.get('/benefits/:tier', async (req, res) => {
  try {
    const tier = req.params.tier?.toLowerCase();

    if (!loyaltyService.LOYALTY_TIERS[tier]) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const tierData = loyaltyService.LOYALTY_TIERS[tier];

    res.json({
      status: 'success',
      tier,
      name: tierData.name,
      emoji: tierData.emoji,
      benefits: tierData.benefits
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/loyalty/estimates
 * Get estimated cashback for order
 */
router.get('/estimates', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({ error: 'Order amount required' });
    }

    const loyalty = await loyaltyService.getUserLoyalty(req.user.id);
    const cashback = loyaltyService.getCashbackForOrder(parseFloat(amount), loyalty.tier);
    const freeDelivery = loyaltyService.isEligibleForFreeDelivery(parseFloat(amount), loyalty.tier);

    res.json({
      status: 'success',
      orderAmount: parseFloat(amount),
      userTier: loyalty.tier,
      estimatedCashback: cashback,
      eligibleForFreeDelivery: freeDelivery,
      message: `You'll earn ₹${cashback} cashback on this order`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/loyalty/tiers
 * Get all tiers info
 */
router.get('/tiers', async (req, res) => {
  try {
    const tiers = [];

    for (const [key, tier] of Object.entries(loyaltyService.LOYALTY_TIERS)) {
      tiers.push({
        id: key,
        name: tier.name,
        emoji: tier.emoji,
        minPoints: tier.minPoints,
        benefits: tier.benefits
      });
    }

    res.json({
      status: 'success',
      count: tiers.length,
      tiers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
