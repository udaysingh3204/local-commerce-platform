const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const subscriptionService = require('../services/subscriptionService');

const router = express.Router();

/**
 * Subscription Routes - Plans, upgrades, renewals, analytics
 */

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = subscriptionService.getAllPlans();

    res.json({
      success: true,
      plans
    });
  } catch (err) {
    console.error('[SubscriptionRoutes] GET plans error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/plans/:planId
 * Get specific plan details
 */
router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = subscriptionService.getPlan(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: `Plan '${planId}' not found`
      });
    }

    res.json({
      success: true,
      plan
    });
  } catch (err) {
    console.error('[SubscriptionRoutes] GET plan error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/current
 * Get user's current subscription
 */
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const subscription = await subscriptionService.getUserSubscription(userId);
    const benefits = subscriptionService.getSubscriptionBenefits(subscription.planId);

    res.json({
      success: true,
      subscription,
      benefits,
      plan: subscriptionService.getPlan(subscription.planId)
    });
  } catch (err) {
    console.error('[SubscriptionRoutes] GET current error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/subscribe
 * Subscribe user to a plan
 */
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { planId, paymentId } = req.body;
    const { userId } = req.user;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'planId is required'
      });
    }

    const result = await subscriptionService.subscribeToPlan(userId, planId, paymentId);

    res.json(result);
  } catch (err) {
    console.error('[SubscriptionRoutes] POST subscribe error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/upgrade
 * Upgrade to a better plan
 */
router.post('/upgrade', authMiddleware, async (req, res) => {
  try {
    const { planId, paymentId } = req.body;
    const { userId } = req.user;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'planId is required'
      });
    }

    const result = await subscriptionService.upgradePlan(userId, planId, paymentId);

    res.json(result);
  } catch (err) {
    console.error('[SubscriptionRoutes] POST upgrade error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription
 */
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { reason } = req.body;

    const result = await subscriptionService.cancelSubscription(userId, reason);

    res.json(result);
  } catch (err) {
    console.error('[SubscriptionRoutes] POST cancel error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/benefits/:planId
 * Get benefits for a specific plan
 */
router.get('/benefits/:planId', async (req, res) => {
  try {
    const { planId } = req.params;

    const benefits = subscriptionService.getSubscriptionBenefits(planId);

    res.json({
      success: true,
      benefits
    });
  } catch (err) {
    console.error('[SubscriptionRoutes] GET benefits error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/analytics
 * Get subscription analytics (admin only)
 */
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view analytics'
      });
    }

    const analytics = await subscriptionService.getSubscriptionAnalytics();

    res.json({
      success: true,
      analytics
    });
  } catch (err) {
    console.error('[SubscriptionRoutes] GET analytics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
