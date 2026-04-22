const EventEmitter = require('events');
const axios = require('axios');

/**
 * Universal Event Bus & Webhook System - Real-time integration for third parties
 * Event publishing, webhook delivery, retry logic, event history
 */
class EventBusService extends EventEmitter {
  constructor() {
    super();
    this.webhooks = new Map(); // webhookId → config
    this.eventHistory = [];
    this.maxHistorySize = 10000;
    this.eventQueue = [];
    this.isProcessing = false;
    this.retryConfig = {
      maxAttempts: 5,
      baseDelay: 1000, // 1 second
      maxDelay: 60000 // 1 minute
    };

    // Internal event types
    this.EVENT_TYPES = {
      // Order events
      'order.created': 'New order placed',
      'order.confirmed': 'Order confirmed by store',
      'order.processing': 'Order is being prepared',
      'order.ready': 'Order ready for pickup/delivery',
      'order.enroute': 'Order on the way',
      'order.delivered': 'Order delivered successfully',
      'order.cancelled': 'Order cancelled',
      'order.refund_initiated': 'Refund initiated',

      // Payment events
      'payment.successful': 'Payment completed successfully',
      'payment.failed': 'Payment failed',
      'payment.refunded': 'Payment refunded',

      // User events
      'user.registered': 'New user registered',
      'user.tier_upgraded': 'User upgraded loyalty tier',
      'user.subscription_renewed': 'Subscription auto-renewed',

      // Product events
      'product.added': 'New product added',
      'product.updated': 'Product updated',
      'product.out_of_stock': 'Product out of stock',

      // Store events
      'store.rating_updated': 'Store rating changed',
      'store.status_changed': 'Store status changed',

      // Driver events
      'driver.assigned': 'Driver assigned to order',
      'driver.location_updated': 'Driver location updated',

      // Chat events
      'chat.message_sent': 'Chat message sent',
      'chat.agent_assigned': 'Agent assigned to chat'
    };
  }

  /**
   * Register a webhook for events
   * @param {object} config - { url, events, secret, active, metadata }
   * @returns {string} Webhook ID
   */
  registerWebhook(config) {
    try {
      const webhookId = this.generateWebhookId();

      const webhook = {
        id: webhookId,
        url: config.url,
        events: config.events || Object.keys(this.EVENT_TYPES), // Subscribe to all if not specified
        secret: config.secret || this.generateSecret(),
        active: config.active !== false,
        metadata: config.metadata || {},
        createdAt: new Date(),
        failureCount: 0,
        successCount: 0,
        lastDeliveryAt: null
      };

      this.webhooks.set(webhookId, webhook);
      console.log(`[EventBusService] Webhook registered: ${webhookId}`);

      return {
        webhookId,
        secret: webhook.secret,
        message: 'Webhook registered successfully'
      };
    } catch (err) {
      console.error('[EventBusService] registerWebhook error:', err.message);
      throw err;
    }
  }

  /**
   * Publish an event to all subscribed webhooks
   * @param {string} eventType - Type of event
   * @param {object} data - Event payload
   * @param {object} context - { userId, orderId, storeId, etc }
   */
  async publishEvent(eventType, data, context = {}) {
    try {
      if (!this.EVENT_TYPES[eventType]) {
        console.warn(`[EventBusService] Unknown event type: ${eventType}`);
      }

      const event = {
        id: this.generateEventId(),
        type: eventType,
        timestamp: new Date(),
        data,
        context,
        deliveryStatus: {}
      };

      // Record in history
      this.eventHistory.push(event);
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }

      // Queue for delivery
      this.eventQueue.push(event);

      // Emit internally (for in-process subscribers)
      this.emit(eventType, { event, timestamp: Date.now() });

      // Process queue asynchronously
      this.processEventQueue();

      return { eventId: event.id, published: true };
    } catch (err) {
      console.error('[EventBusService] publishEvent error:', err.message);
      throw err;
    }
  }

  /**
   * Process queued events and deliver to webhooks
   */
  async processEventQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();

        // Get webhooks subscribed to this event type
        const subscribedWebhooks = Array.from(this.webhooks.values()).filter(
          wh => wh.active && wh.events.includes(event.type)
        );

        // Deliver to each webhook
        for (const webhook of subscribedWebhooks) {
          this.deliverWebhookWithRetry(event, webhook);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Deliver webhook with exponential backoff retry
   */
  async deliverWebhookWithRetry(event, webhook, attempt = 1) {
    try {
      const payload = {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
        context: event.context
      };

      // Generate signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Event-ID': event.id,
          'X-Event-Type': event.type,
          'X-Signature': signature,
          'X-Delivery-Attempt': attempt.toString()
        },
        timeout: 10000
      });

      // Success
      event.deliveryStatus[webhook.id] = {
        status: 'delivered',
        attempt,
        statusCode: response.status,
        deliveredAt: new Date()
      };

      webhook.successCount++;
      webhook.lastDeliveryAt = new Date();
      webhook.failureCount = 0;

      console.log(`[EventBusService] Webhook delivered: ${webhook.id} (attempt ${attempt})`);
    } catch (err) {
      console.error(`[EventBusService] Webhook delivery failed: ${webhook.id} - ${err.message}`);

      if (attempt < this.retryConfig.maxAttempts) {
        // Schedule retry with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelay
        );

        setTimeout(() => {
          this.deliverWebhookWithRetry(event, webhook, attempt + 1);
        }, delay);

        event.deliveryStatus[webhook.id] = {
          status: 'retrying',
          nextAttempt: attempt + 1,
          delay,
          lastError: err.message
        };
      } else {
        // Max retries exceeded
        event.deliveryStatus[webhook.id] = {
          status: 'failed',
          attempt,
          lastError: err.message,
          failedAt: new Date()
        };

        webhook.failureCount++;

        // Disable webhook after 10 consecutive failures
        if (webhook.failureCount >= 10) {
          webhook.active = false;
          console.warn(`[EventBusService] Webhook disabled due to repeated failures: ${webhook.id}`);
        }
      }
    }
  }

  /**
   * Subscribe to local events (in-process)
   * Passes through to EventEmitter.on()
   */
  subscribe(eventType, handler) {
    if (!this.EVENT_TYPES[eventType]) {
      console.warn(`[EventBusService] Subscribing to unknown event type: ${eventType}`);
    }
    this.on(eventType, handler);
  }

  /**
   * Get webhook details
   */
  getWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    return {
      ...webhook,
      secret: webhook.secret.substring(0, 10) + '***' // Mask secret
    };
  }

  /**
   * Update webhook configuration
   */
  updateWebhook(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) throw new Error('Webhook not found');

    if (updates.url) webhook.url = updates.url;
    if (updates.events) webhook.events = updates.events;
    if (updates.active !== undefined) webhook.active = updates.active;

    return webhook;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId) {
    return this.webhooks.delete(webhookId);
  }

  /**
   * Get all webhooks
   */
  getAllWebhooks() {
    return Array.from(this.webhooks.values()).map(wh => ({
      id: wh.id,
      url: wh.url,
      events: wh.events,
      active: wh.active,
      successCount: wh.successCount,
      failureCount: wh.failureCount,
      lastDeliveryAt: wh.lastDeliveryAt,
      createdAt: wh.createdAt
    }));
  }

  /**
   * Get event history with filtering
   */
  getEventHistory(filters = {}) {
    let history = this.eventHistory;

    if (filters.eventType) {
      history = history.filter(e => e.type === filters.eventType);
    }

    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * Get webhook delivery stats
   */
  getWebhookStats(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    const deliveries = this.eventHistory.filter(e => e.deliveryStatus[webhookId]);

    return {
      webhookId,
      url: webhook.url,
      totalEvents: deliveries.length,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount,
      successRate: deliveries.length > 0
        ? ((webhook.successCount / deliveries.length) * 100).toFixed(2) + '%'
        : '0%',
      lastDeliveryAt: webhook.lastDeliveryAt,
      isActive: webhook.active
    };
  }

  // Private methods

  generateWebhookId() {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSecret() {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

module.exports = new EventBusService();
