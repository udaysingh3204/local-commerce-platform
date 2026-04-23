import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import axios from 'axios';

/**
 * Mobile Push Notification Service
 * Handles notification permissions, registration, and dispatch
 */
export class NotificationService {
  constructor(apiUrl, authToken) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
    this.notificationListener = null;
    this.responseListener = null;
    this.deviceToken = null;
  }

  /**
   * Initialize notifications
   * Set up channels, handlers, and register with backend
   */
  async initialize() {
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('[Notifications] Not on physical device');
        return false;
      }

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true
        }
      });

      if (status !== 'granted') {
        console.warn('[Notifications] Permission not granted');
        return false;
      }

      // Get device token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID
      });

      this.deviceToken = token.data;
      console.log('[Notifications] Device token:', this.deviceToken);

      // Set up notification handler
      this.setupNotificationHandler();

      // Register token with backend
      await this.registerDeviceToken();

      return true;

    } catch (error) {
      console.error('[Notifications] Initialization error:', error);
      return false;
    }
  }

  /**
   * Set up notification handler for incoming notifications
   */
  setupNotificationHandler() {
    // Configure notification display
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Show notification even when app is in foreground
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true
        };
      }
    });

    // Listen for incoming notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleNotificationReceived(notification);
      }
    );

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        this.handleNotificationResponse(response.notification);
      }
    );
  }

  /**
   * Register device token with backend
   */
  async registerDeviceToken() {
    try {
      if (!this.deviceToken || !this.authToken) return;

      await axios.post(
        `${this.apiUrl}/api/notifications/register-device`,
        {
          deviceToken: this.deviceToken,
          platform: 'expo',
          appVersion: '1.0.0'
        },
        {
          headers: { Authorization: `Bearer ${this.authToken}` }
        }
      );

      console.log('[Notifications] Device token registered');

    } catch (error) {
      console.error('[Notifications] Registration error:', error);
    }
  }

  /**
   * Handle notification received while app is in foreground
   */
  handleNotificationReceived(notification) {
    const { data } = notification.request.content;
    
    console.log('[Notifications] Received:', data);

    // Handle different notification types
    if (data.type === 'order_update') {
      this.handleOrderUpdate(data);
    } else if (data.type === 'delivery_status') {
      this.handleDeliveryStatus(data);
    } else if (data.type === 'achievement') {
      this.handleAchievement(data);
    } else if (data.type === 'promotion') {
      this.handlePromotion(data);
    }
  }

  /**
   * Handle notification response (user tapped notification)
   */
  handleNotificationResponse(notification) {
    const { data } = notification.request.content;

    console.log('[Notifications] Response:', data);

    // Navigate based on notification type
    switch (data.type) {
      case 'order_update':
        // Navigate to order details
        this.navigateTo('OrderDetails', { orderId: data.orderId });
        break;
      case 'delivery_status':
        // Navigate to tracking
        this.navigateTo('OrderTracking', { orderId: data.orderId });
        break;
      case 'achievement':
        // Navigate to achievements
        this.navigateTo('Achievements');
        break;
      case 'promotion':
        // Navigate to offers
        this.navigateTo('Offers', { offerId: data.offerId });
        break;
    }
  }

  /**
   * Handle order update notifications
   */
  handleOrderUpdate(data) {
    console.log('[Notifications] Order update:', data.orderId, data.message);
    // Additional logic
  }

  /**
   * Handle delivery status notifications
   */
  handleDeliveryStatus(data) {
    console.log('[Notifications] Delivery status:', data.status);
    // Update local state
  }

  /**
   * Handle achievement unlock notifications
   */
  handleAchievement(data) {
    console.log('[Notifications] Achievement:', data.badgeName);
    // Show special animation
  }

  /**
   * Handle promotion notifications
   */
  handlePromotion(data) {
    console.log('[Notifications] Promotion:', data.title);
    // Trigger promotion modal
  }

  /**
   * Send local notification (for testing)
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          badge: 1
        },
        trigger: null // Send immediately
      });
    } catch (error) {
      console.error('[Notifications] Send error:', error);
    }
  }

  /**
   * Navigation callback (should be overridden by app)
   */
  navigateTo(screen, params) {
    console.log('[Notifications] Navigate to:', screen, params);
  }

  /**
   * Unsubscribe from listeners on cleanup
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

/**
 * React Hook for notifications
 */
export function useNotifications(apiUrl, authToken, navigationRef) {
  const [notificationService] = React.useState(
    () => new NotificationService(apiUrl, authToken)
  );

  React.useEffect(() => {
    const initializeNotifications = async () => {
      // Override navigate function
      notificationService.navigateTo = (screen, params) => {
        navigationRef.navigate(screen, params);
      };

      await notificationService.initialize();
    };

    initializeNotifications();

    return () => {
      notificationService.cleanup();
    };
  }, [navigationRef]);

  return {
    sendLocalNotification: notificationService.sendLocalNotification.bind(notificationService),
    deviceToken: notificationService.deviceToken
  };
}

/**
 * Backend API Service for sending notifications
 */
export class NotificationAPIService {
  constructor(apiUrl, authToken) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: { Authorization: `Bearer ${authToken}` }
    });
  }

  /**
   * Send order update notification
   */
  async sendOrderUpdate(userId, orderId, status, message) {
    try {
      await this.client.post('/api/notifications/send', {
        userId,
        type: 'order_update',
        orderId,
        status,
        message,
        title: `Order ${status}`,
        body: message
      });
    } catch (error) {
      console.error('[API] Send order notification error:', error);
    }
  }

  /**
   * Send delivery status notification
   */
  async sendDeliveryStatus(userId, orderId, status, eta) {
    try {
      const messages = {
        assigned: `Driver ${driver.name} assigned to your order`,
        picked_up: 'Order picked up from store',
        out_for_delivery: 'Your order is on the way',
        delivered: 'Order delivered!'
      };

      await this.client.post('/api/notifications/send', {
        userId,
        type: 'delivery_status',
        orderId,
        status,
        eta,
        title: 'Delivery Update',
        body: messages[status] || 'Order status updated'
      });
    } catch (error) {
      console.error('[API] Send delivery notification error:', error);
    }
  }

  /**
   * Send achievement notification
   */
  async sendAchievement(userId, badgeName, badgeIcon) {
    try {
      await this.client.post('/api/notifications/send', {
        userId,
        type: 'achievement',
        badgeName,
        badgeIcon,
        title: `🎉 Achievement Unlocked!`,
        body: `You've earned the ${badgeName} badge!`
      });
    } catch (error) {
      console.error('[API] Send achievement notification error:', error);
    }
  }

  /**
   * Send promotional notification
   */
  async sendPromotion(userId, title, body, offerId) {
    try {
      await this.client.post('/api/notifications/send', {
        userId,
        type: 'promotion',
        title,
        body,
        offerId
      });
    } catch (error) {
      console.error('[API] Send promotion notification error:', error);
    }
  }

  /**
   * Send bulk notifications (admin)
   */
  async sendBulkNotification(userIds, title, body, data) {
    try {
      await this.client.post('/api/notifications/send-bulk', {
        userIds,
        title,
        body,
        data
      });
    } catch (error) {
      console.error('[API] Send bulk notification error:', error);
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId) {
    try {
      const response = await this.client.get(`/api/notifications/preferences/${userId}`);
      return response.data;
    } catch (error) {
      console.error('[API] Get preferences error:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId, preferences) {
    try {
      await this.client.patch(`/api/notifications/preferences/${userId}`, preferences);
    } catch (error) {
      console.error('[API] Update preferences error:', error);
    }
  }
}

export default {
  NotificationService,
  NotificationAPIService,
  useNotifications
};
