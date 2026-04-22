const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminAnalyticsService = require('../services/adminAnalyticsService');

const router = express.Router();

/**
 * Admin Analytics Routes - Comprehensive business intelligence
 * All endpoints require admin role
 */

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only admins can access analytics'
    });
  }
  next();
};

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard metrics
 */
router.get('/dashboard', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { daysBack = 30 } = req.query;

    const analytics = await adminAnalyticsService.getDashboardAnalytics(parseInt(daysBack));

    res.json({
      success: true,
      ...analytics
    });
  } catch (err) {
    console.error('[AdminAnalyticsRoutes] GET dashboard error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/revenue-trends
 * Get GMV and revenue trends over time
 */
router.get('/revenue-trends', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { daysBack = 30 } = req.query;

    const result = await adminAnalyticsService.getRevenueTrends(parseInt(daysBack));

    res.json(result);
  } catch (err) {
    console.error('[AdminAnalyticsRoutes] GET revenue-trends error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/customer-cohorts
 * Get customer segmentation by cohort
 */
router.get('/customer-cohorts', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await adminAnalyticsService.getCohortAnalysis();

    res.json(result);
  } catch (err) {
    console.error('[AdminAnalyticsRoutes] GET customer-cohorts error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/driver-performance
 * Get driver metrics and rankings
 */
router.get('/driver-performance', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await adminAnalyticsService.getDriverAnalytics();

    res.json(result);
  } catch (err) {
    console.error('[AdminAnalyticsRoutes] GET driver-performance error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/sla-metrics
 * Get SLA and operational performance
 */
router.get('/sla-metrics', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { daysBack = 30 } = req.query;

    const result = await adminAnalyticsService.getSLAMetrics(parseInt(daysBack));

    res.json(result);
  } catch (err) {
    console.error('[AdminAnalyticsRoutes] GET sla-metrics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/stores
 * Get store performance analytics
 */
router.get('/stores', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await adminAnalyticsService.getStoreAnalytics();

    res.json(result);
  } catch (err) {
    console.error('[AdminAnalyticsRoutes] GET stores error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/export/:type
 * Export analytics data as CSV/JSON
 */
router.get('/export/:type', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    // Get data based on type
    let data;
    switch (type) {
      case 'dashboard':
        data = await adminAnalyticsService.getDashboardAnalytics(30);
        break;
      case 'revenue':
        data = await adminAnalyticsService.getRevenueTrends(30);
        break;
      case 'drivers':
        data = await adminAnalyticsService.getDriverAnalytics();
        break;
      case 'stores':
        data = await adminAnalyticsService.getStoreAnalytics();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="analytics_${type}_${Date.now()}.csv"`);
      // Would implement CSV serialization here
      res.send('CSV export not yet implemented');
    } else {
      res.json({
        success: true,
        type,
        data
      });
    }
  } catch (err) {
    console.error('[AdminAnalyticsRoutes] GET export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
