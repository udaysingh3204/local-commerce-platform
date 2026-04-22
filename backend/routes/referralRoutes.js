const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const referralService = require('../services/referralService');

const router = express.Router();

/**
 * Referral Routes - Codes, signup, leaderboard, analytics
 */

/**
 * POST /api/referral/generate-code
 * Generate or get referral code for user
 */
router.post('/generate-code', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User identity missing in token' });
    }

    const result = await referralService.generateReferralCode(userId);

    res.json(result);
  } catch (err) {
    console.error('[ReferralRoutes] POST generate-code error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/referral/apply-code
 * Apply referral code during signup (public - no auth needed)
 */
router.post('/apply-code', authMiddleware, async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User identity missing in token' });
    }

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }

    const result = await referralService.applyReferralCode(referralCode, userId);

    res.json(result);
  } catch (err) {
    console.error('[ReferralRoutes] POST apply-code error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/referral/confirm/:refereeUserId
 * Confirm referral after referee's first purchase (internal)
 */
router.post('/confirm/:refereeUserId', async (req, res) => {
  try {
    // This would typically be called by order service when payment completes
    const { refereeUserId } = req.params;

    const result = await referralService.confirmReferral(refereeUserId);

    res.json({
      success: true,
      result
    });
  } catch (err) {
    console.error('[ReferralRoutes] POST confirm error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/referral/my-details
 * Get current user's referral details
 */
router.get('/my-details', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User identity missing in token' });
    }

    const details = await referralService.getReferralDetails(userId);

    res.json({
      success: true,
      ...details
    });
  } catch (err) {
    console.error('[ReferralRoutes] GET my-details error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/referral/leaderboard
 * Get top referrers leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 20, timeframe = '30days' } = req.query;

    const result = await referralService.getReferralLeaderboard(
      Math.min(parseInt(limit), 100),
      timeframe
    );

    res.json(result);
  } catch (err) {
    console.error('[ReferralRoutes] GET leaderboard error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/referral/analytics
 * Get referral program analytics (admin only)
 */
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view analytics'
      });
    }

    const result = await referralService.getReferralAnalytics();

    res.json(result);
  } catch (err) {
    console.error('[ReferralRoutes] GET analytics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/referral/public/:code
 * Public page to view referrer info and apply code (no auth)
 */
router.get('/public/:code', async (req, res) => {
  try {
    const { code } = req.params;

    // This would fetch referrer details for display on public landing page
    // When user clicks "Join via referral" they see referrer's profile
    // Then they signup and code gets applied

    res.json({
      success: true,
      referralCode: code,
      message: 'Referral code is valid. Complete signup to apply.'
    });
  } catch (err) {
    console.error('[ReferralRoutes] GET public error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
