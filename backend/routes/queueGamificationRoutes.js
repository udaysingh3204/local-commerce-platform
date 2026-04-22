const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const virtualDeliveryQueue = require('../services/virtualDeliveryQueue');
const driverGamification = require('../services/driverGamification');
const dynamicPricingEngine = require('../services/dynamicPricingEngine');

/**
 * GET /api/queue/position/:orderId
 * Get customer's position in delivery queue
 * Customer only
 */
router.get('/position/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const position = await virtualDeliveryQueue.getCustomerQueuePosition(orderId);

    res.json(position);

  } catch (error) {
    console.error('[API] Queue position error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/queue/store/:storeId
 * Get all orders in queue for a store
 * Admin & store staff only
 */
router.get('/store/:storeId', authMiddleware, roleMiddleware(['admin', 'vendor']), async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const queue = await virtualDeliveryQueue.getStoreQueue(storeId);

    res.json({
      storeId,
      queueSize: queue.length,
      queue,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[API] Store queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/queue/analytics/:storeId
 * Get queue performance analytics
 * Admin & vendor only
 */
router.get('/analytics/:storeId', authMiddleware, roleMiddleware(['admin', 'vendor']), async (req, res) => {
  try {
    const { storeId } = req.params;
    const { hoursBack = 24 } = req.query;
    
    const analytics = await virtualDeliveryQueue.getQueueAnalytics(storeId, parseInt(hoursBack));

    res.json(analytics);

  } catch (error) {
    console.error('[API] Queue analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/dashboard
 * Get driver's gamification dashboard
 * Driver only
 */
router.get('/gamification/dashboard', authMiddleware, roleMiddleware(['driver']), async (req, res) => {
  try {
    const driverId = req.user?.id;
    
    if (!driverId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const dashboard = await driverGamification.getGamificationDashboard(driverId);

    res.json(dashboard);

  } catch (error) {
    console.error('[API] Gamification dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard
 * Public endpoint
 */
router.get('/gamification/leaderboard', async (req, res) => {
  try {
    const { limit = 20, timeframe = '30days', category = 'overall' } = req.query;
    
    const leaderboard = await driverGamification.getLeaderboard(
      parseInt(limit),
      timeframe,
      category
    );

    res.json(leaderboard);

  } catch (error) {
    console.error('[API] Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/achievements/:driverId
 * Get driver's achievements
 * Public endpoint
 */
router.get('/gamification/achievements/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const achievements = await driverGamification.getDriverAchievements(driverId);
    const tier = await driverGamification.getRewardTier(driverId);
    const score = await driverGamification.calculateDriverScore(driverId);

    res.json({
      driverId,
      score,
      tier,
      achievements,
      unlocked: achievements.length,
      total: Object.keys(driverGamification.badges).length
    });

  } catch (error) {
    console.error('[API] Achievements error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pricing/estimate
 * Estimate dynamic delivery fee
 * Customer only
 */
router.post('/pricing/estimate', authMiddleware, async (req, res) => {
  try {
    const { storeLocation, deliveryLocation } = req.body;
    
    if (!storeLocation || !deliveryLocation) {
      return res.status(400).json({ error: 'Missing locations' });
    }

    const fakeOrder = {
      storeLocation: { coordinates: storeLocation },
      deliveryLocation: { coordinates: deliveryLocation }
    };

    const pricing = await dynamicPricingEngine.calculateDeliveryFee(fakeOrder);

    res.json(pricing);

  } catch (error) {
    console.error('[API] Pricing estimate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pricing/analytics
 * Get pricing analytics (admin only)
 */
router.get('/pricing/analytics', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { ordersLast24h = 100 } = req.query;
    
    const analytics = await dynamicPricingEngine.getPricingAnalytics(parseInt(ordersLast24h));

    res.json(analytics);

  } catch (error) {
    console.error('[API] Pricing analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pricing/test
 * Test pricing model (admin/debug only)
 */
router.get('/pricing/test', async (req, res) => {
  try {
    const { distance = 5, demand = 'normal', hour = 12 } = req.query;
    
    const pricing = await dynamicPricingEngine.testPricing(
      parseFloat(distance),
      demand,
      parseInt(hour)
    );

    res.json(pricing);

  } catch (error) {
    console.error('[API] Pricing test error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
