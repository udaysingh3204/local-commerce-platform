const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const Order = require('../models/Order');
const deliveryPredictionML = require('../services/deliveryPredictionML');
const smartDriverMatcher = require('../services/smartDriverMatcher');
const dispatchServiceML = require('../services/dispatchServiceML');

/**
 * GET /api/dispatch/ml/predictions/:orderId
 * Get ML delivery time prediction for an order
 * Admin & dispatch staff only
 */
router.get('/ml/predictions/:orderId', authMiddleware, roleMiddleware(['admin', 'dispatcher']), async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const prediction = await deliveryPredictionML.predictDeliveryMetrics(order);
    const modelStats = deliveryPredictionML.getModelStats();

    res.json({
      orderId,
      prediction,
      modelStats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[API] Prediction error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dispatch/ml/matching/:orderId
 * Get smart driver matching for an order
 * Admin & dispatch staff only
 */
router.get('/ml/matching/:orderId', authMiddleware, roleMiddleware(['admin', 'dispatcher']), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { topN = 5 } = req.query;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const matches = await smartDriverMatcher.matchDriversForOrder(order, null, {
      topN: parseInt(topN, 10)
    });

    const stats = await smartDriverMatcher.getMatchingStats(order);

    res.json({
      orderId,
      stats,
      matches: matches.map((m) => ({
        driverId: m.driver._id,
        driverName: m.driver.name,
        driverPhone: m.driver.phone,
        matchScore: Math.round(m.score),
        tier: smartDriverMatcher.getPerformanceTier(m.driver),
        factors: m.factors
      })),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[API] Matching error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dispatch/ml/recommendations/:orderId
 * Get full dispatch recommendations from dispatchServiceML
 * Admin & dispatch staff only
 */
router.get('/ml/recommendations/:orderId', authMiddleware, roleMiddleware(['admin', 'dispatcher']), async (req, res) => {
  try {
    const { orderId } = req.params;

    const recommendations = await dispatchServiceML.getDispatchRecommendations(orderId);

    res.json(recommendations);

  } catch (error) {
    console.error('[API] Recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dispatch/ml/auto-assign/:orderId
 * Auto-assign order to best matching driver
 * Admin & dispatch staff only
 */
router.post('/ml/auto-assign/:orderId', authMiddleware, roleMiddleware(['admin', 'dispatcher']), async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await dispatchServiceML.autoAssignOrder(orderId);

    res.json({
      message: 'Order assigned successfully',
      ...result
    });

  } catch (error) {
    console.error('[API] Auto-assign error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/dispatch/ml/queue
 * Get dispatch queue with AI priorities
 * Admin & dispatch staff only
 */
router.get('/ml/queue', authMiddleware, roleMiddleware(['admin', 'dispatcher']), async (req, res) => {
  try {
    const queue = await dispatchServiceML.getDispatchQueue();

    res.json({
      queueSize: queue.length,
      queue,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[API] Queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dispatch/ml/batch-assign
 * Batch assign multiple orders optimally
 * Admin & dispatch staff only
 */
router.post('/ml/batch-assign', authMiddleware, roleMiddleware(['admin', 'dispatcher']), async (req, res) => {
  try {
    const { orderIds } = req.body;

    const result = await dispatchServiceML.batchAssignOrders(orderIds);

    res.json(result);

  } catch (error) {
    console.error('[API] Batch assign error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dispatch/ml/stats
 * Get ML model statistics and training status
 * Admin only
 */
router.get('/ml/stats', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const predictionStats = deliveryPredictionML.getModelStats();

    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'delivered' });
    const assignedOrders = await Order.countDocuments({ status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] } });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    res.json({
      predictionModel: predictionStats,
      orderStats: {
        total: totalOrders,
        completed: completedOrders,
        assigned: assignedOrders,
        pending: pendingOrders,
        completionRate: totalOrders > 0 ? Math.round(completedOrders / totalOrders * 100) : 0
      },
      modelReadiness: {
        isPredictionModelReady: predictionStats.modelType !== 'none',
        lastModelChange: predictionStats.lastTrainTime,
        trainingStatus: predictionStats.isTraining ? 'in_progress' : 'idle'
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[API] Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dispatch/ml/retrain
 * Manually trigger model retraining (admin only)
 */
router.post('/ml/retrain', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    deliveryPredictionML.trainModel().catch((err) =>
      console.error('[API] Background retrain failed:', err)
    );

    res.json({
      message: 'Model retraining initiated',
      status: 'training_started',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[API] Retrain error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
