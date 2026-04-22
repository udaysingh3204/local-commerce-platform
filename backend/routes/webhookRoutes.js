const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const eventBusService = require('../services/eventBusService');

/**
 * Event Bus & Webhook Routes
 */

/**
 * POST /api/webhooks
 * Register a new webhook
 */
router.post('/', authMiddleware, roleMiddleware(['admin', 'developer']), async (req, res) => {
  try {
    const { url, events, secret, metadata } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Webhook URL required' });
    }

    const result = eventBusService.registerWebhook({
      url,
      events: events || null,
      secret,
      metadata
    });

    res.status(201).json({
      status: 'success',
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/webhooks
 * Get all registered webhooks
 */
router.get('/', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const webhooks = eventBusService.getAllWebhooks();

    res.json({
      status: 'success',
      count: webhooks.length,
      webhooks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/webhooks/:webhookId
 * Get webhook details
 */
router.get('/:webhookId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const webhook = eventBusService.getWebhook(req.params.webhookId);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      status: 'success',
      webhook
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/webhooks/:webhookId
 * Update webhook configuration
 */
router.put('/:webhookId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { url, events, active } = req.body;

    const webhook = eventBusService.updateWebhook(req.params.webhookId, {
      url,
      events,
      active
    });

    res.json({
      status: 'success',
      webhook
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/webhooks/:webhookId
 * Delete webhook
 */
router.delete('/:webhookId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const deleted = eventBusService.deleteWebhook(req.params.webhookId);

    res.json({
      status: deleted ? 'success' : 'not_found',
      message: deleted ? 'Webhook deleted' : 'Webhook not found'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/webhooks/:webhookId/stats
 * Get webhook delivery statistics
 */
router.get('/:webhookId/stats', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const stats = eventBusService.getWebhookStats(req.params.webhookId);

    if (!stats) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      status: 'success',
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/webhooks/events/types
 * Get available event types
 */
router.get('/events/types', async (req, res) => {
  try {
    const eventTypes = Object.entries(eventBusService.EVENT_TYPES).map(([key, value]) => ({
      type: key,
      description: value
    }));

    res.json({
      status: 'success',
      count: eventTypes.length,
      eventTypes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/webhooks/events/history
 * Get event history
 */
router.get('/events/history', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { eventType, limit = 50 } = req.query;

    const history = eventBusService.getEventHistory({
      eventType,
      limit: parseInt(limit)
    });

    res.json({
      status: 'success',
      count: history.length,
      events: history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
