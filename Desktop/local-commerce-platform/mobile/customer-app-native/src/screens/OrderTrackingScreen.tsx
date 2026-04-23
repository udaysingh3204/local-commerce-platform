import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import { io } from 'socket.io-client';

const { width, height } = Dimensions.get('window');

/**
 * Mobile Real-time Order Tracking Screen
 * Shows live delivery tracking, queue position, ETA, and driver info
 */
export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params || {};

  // Order state
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tracking state
  const [orderLocation, setOrderLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routePath, setRoutePath] = useState(null);

  // Queue state
  const [queuePosition, setQueuePosition] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(null);

  // Delivery prediction
  const [deliveryPrediction, setDeliveryPrediction] = useState(null);
  const [alertStatus, setAlertStatus] = useState(null);

  // Socket
  const socketRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const AUTH_TOKEN = null; // From auth context

  // Initialize
  useEffect(() => {
    initializeTracking();
    
    return () => {
      cleanup();
    };
  }, [orderId]);

  /**
   * Initialize tracking
   */
  const initializeTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch order details
      const orderResponse = await axios.get(
        `${API_URL}/api/orders/${orderId}/tracking`,
        { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
      );

      setOrder(orderResponse.data);
      setOrderLocation(orderResponse.data.deliveryLocation?.coordinates);
      setDriverLocation(orderResponse.data.driverLocation?.coordinates);
      setRoutePath(orderResponse.data.routePath);

      // Get delivery prediction
      const predictionResponse = await axios.get(
        `${API_URL}/api/dispatch/ml/predictions/${orderId}`,
        { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
      );

      setDeliveryPrediction(predictionResponse.data.prediction);

      // Get queue position
      const queueResponse = await axios.get(
        `${API_URL}/api/queue/position/${orderId}`,
        { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
      );

      setQueuePosition(queueResponse.data);
      setEstimatedWait(queueResponse.data.estimatedWaitMinutes);

      // Evaluate alerts
      evaluateAlerts(orderResponse.data);

      // Connect to WebSocket for realtime updates
      connectWebSocket();

      // Start polling for periodic updates
      startPolling();

      setLoading(false);

    } catch (err) {
      console.error('[Tracking] Initialization error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  /**
   * Connect to WebSocket for real-time updates
   */
  const connectWebSocket = () => {
    try {
      socketRef.current = io(API_URL, {
        auth: { token: AUTH_TOKEN },
        transports: ['websocket', 'polling']
      });

      // Join order room
      socketRef.current.emit('joinOrderRoom', orderId);

      // Listen for location updates
      socketRef.current.on('deliveryLocationUpdate', (data) => {
        if (data.orderId === orderId) {
          setDriverLocation(data.location?.coordinates);
          setOrder(prev => ({
            ...prev,
            driverLocation: data.location
          }));
        }
      });

      // Listen for status updates
      socketRef.current.on('orderStatusUpdated', (data) => {
        if (data.orderId === orderId) {
          setOrder(data);
          evaluateAlerts(data);
        }
      });

      // Listen for queue updates
      socketRef.current.on('queuePositionUpdated', (data) => {
        if (data.orderId === orderId) {
          refetchQueuePosition();
        }
      });

      console.log('[Tracking] WebSocket connected');

    } catch (err) {
      console.error('[Tracking] WebSocket error:', err);
    }
  };

  /**
   * Start polling for updates (fallback if WebSocket fails)
   */
  const startPolling = () => {
    pollIntervalRef.current = setInterval(() => {
      refetchOrderData();
    }, 5000); // Poll every 5 seconds
  };

  /**
   * Refetch order data
   */
  const refetchOrderData = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/orders/${orderId}/tracking`,
        { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
      );

      setOrder(response.data);
      setDriverLocation(response.data.driverLocation?.coordinates);
      evaluateAlerts(response.data);

    } catch (err) {
      console.warn('[Tracking] Refetch error:', err);
    }
  };

  /**
   * Refetch queue position
   */
  const refetchQueuePosition = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/queue/position/${orderId}`,
        { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
      );

      setQueuePosition(response.data);
      setEstimatedWait(response.data.estimatedWaitMinutes);

    } catch (err) {
      console.warn('[Tracking] Queue refetch error:', err);
    }
  };

  /**
   * Evaluate delivery alerts (signal stale, delayed, etc.)
   */
  const evaluateAlerts = (orderData) => {
    const alerts = [];

    if (orderData.signalStatus === 'stale') {
      alerts.push({
        type: 'stale_signal',
        severity: 'warning',
        message: `Signal is stale (${orderData.signalAgeMinutes} min old)`,
        icon: '📡'
      });
    }

    if (orderData.isDelayed) {
      alerts.push({
        type: 'delayed',
        severity: 'alert',
        message: `Order is ${orderData.delayMinutes} minutes late`,
        icon: '⏰'
      });
    }

    if (orderData.delayStatus === 'risk') {
      alerts.push({
        type: 'delay_risk',
        severity: 'info',
        message: 'Delivery may be delayed',
        icon: '⚠️'
      });
    }

    setAlertStatus(alerts.length > 0 ? alerts[0] : null);
  };

  /**
   * Cleanup on unmount
   */
  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  /**
   * Cancel order
   */
  const handleCancelOrder = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.patch(
                `${API_URL}/api/orders/${orderId}`,
                { status: 'cancelled' },
                { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
              );

              Alert.alert('Order Cancelled', 'Your order has been cancelled');
              navigation.goBack();

            } catch (err) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  /**
   * Contact driver
   */
  const handleContactDriver = () => {
    if (order?.deliveryPartner?.phone) {
      Alert.alert(
        'Contact Driver',
        `Call ${order.deliveryPartner.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // Would use Linking.openURL(`tel:${order.deliveryPartner.phone}`)
            Alert.alert('Calling driver...');
          }}
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b4a" />
          <Text style={styles.loadingText}>Loading tracking data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={initializeTracking}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: orderLocation?.[1] || 13.0826,
          longitude: orderLocation?.[0] || 80.2707,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        {/* Order Location Marker */}
        {orderLocation && (
          <Marker
            coordinate={{
              latitude: orderLocation[1],
              longitude: orderLocation[0]
            }}
            title="Delivery Location"
            pinColor="blue"
          />
        )}

        {/* Driver Location Marker */}
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation[1],
              longitude: driverLocation[0]
            }}
            title={order?.deliveryPartner?.name || 'Driver'}
            pinColor="red"
          />
        )}

        {/* Route Path */}
        {routePath && (
          <Polyline
            coordinates={routePath.map(coord => ({
              latitude: coord[1],
              longitude: coord[0]
            }))}
            strokeColor="#ff6b4a"
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Tracking Sheet */}
      <ScrollView style={styles.sheet}>
        {/* Alert Banner */}
        {alertStatus && (
          <View style={[
            styles.alertBanner,
            alertStatus.severity === 'alert' && styles.alertBannerDanger,
            alertStatus.severity === 'warning' && styles.alertBannerWarning
          ]}>
            <Text style={styles.alertIcon}>{alertStatus.icon}</Text>
            <Text style={styles.alertMessage}>{alertStatus.message}</Text>
          </View>
        )}

        {/* Order Status */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Order Status</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {order?.status?.toUpperCase() || 'IN PROGRESS'}
            </Text>
          </View>
        </View>

        {/* Queue Position */}
        {queuePosition && (
          <View style={styles.queueSection}>
            <Text style={styles.sectionTitle}>📍 Queue Position</Text>
            <View style={styles.queueCard}>
              <View style={styles.queueRow}>
                <Text style={styles.queueLabel}>Position</Text>
                <Text style={styles.queueValue}>#{queuePosition.queuePosition}</Text>
              </View>
              <View style={styles.queueRow}>
                <Text style={styles.queueLabel}>In Queue</Text>
                <Text style={styles.queueValue}>{queuePosition.totalInQueue} orders</Text>
              </View>
              <View style={styles.queueRow}>
                <Text style={styles.queueLabel}>Wait Time</Text>
                <Text style={styles.queueValue}>~{estimatedWait || '15'} min</Text>
              </View>
              <View style={styles.queueBar}>
                <View
                  style={[
                    styles.queueProgress,
                    {
                      width: `${(queuePosition.queuePosition / queuePosition.totalInQueue) * 100}%`
                    }
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Delivery Prediction */}
        {deliveryPrediction && (
          <View style={styles.predictionSection}>
            <Text style={styles.sectionTitle}>⏱️ Estimated Delivery</Text>
            <View style={styles.predictionCard}>
              <Text style={styles.predictionTime}>
                ~{deliveryPrediction.predictedDurationMinutes} minutes
              </Text>
              <Text style={styles.predictionConfidence}>
                {Math.round(deliveryPrediction.confidence * 100)}% confidence
              </Text>
              <Text style={styles.predictionSource}>
                AI-powered estimate
              </Text>
            </View>
          </View>
        )}

        {/* Driver Info */}
        {order?.deliveryPartner && (
          <View style={styles.driverSection}>
            <Text style={styles.sectionTitle}>👤 Driver Info</Text>
            <View style={styles.driverCard}>
              <Text style={styles.driverName}>{order.deliveryPartner.name}</Text>
              <Text style={styles.driverRating}>
                ⭐ {order.deliveryPartner.averageRating?.toFixed(1) || 'N/A'} 
                {' '}({order.deliveryPartner.totalDeliveries} deliveries)
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactDriver}
              >
                <Text style={styles.contactButtonText}>📞 Contact Driver</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>📦 Order Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order ID</Text>
            <Text style={styles.detailValue}>{orderId?.substring(0, 8)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <Text style={styles.detailValue}>₹{order?.totalPrice}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCancelOrder}
          >
            <Text style={styles.secondaryButtonText}>Cancel Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('OrderDetails', { orderId })}
          >
            <Text style={styles.primaryButtonText}>View Full Details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  map: {
    height: height * 0.45
  },
  sheet: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 20,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#ff6b4a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
    borderRadius: 8
  },
  alertBannerDanger: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#d32f2f'
  },
  alertBannerWarning: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#f57c00'
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8
  },
  alertMessage: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  statusSection: {
    margin: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  statusBadge: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  statusBadgeText: {
    color: '#2e7d32',
    fontWeight: '600',
    fontSize: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000'
  },
  queueSection: {
    margin: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  queueCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8
  },
  queueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  queueLabel: {
    fontSize: 14,
    color: '#666'
  },
  queueValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b4a'
  },
  queueBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden'
  },
  queueProgress: {
    height: '100%',
    backgroundColor: '#4CAF50'
  },
  predictionSection: {
    margin: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  predictionCard: {
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  predictionTime: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1976d2'
  },
  predictionConfidence: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  predictionSource: {
    fontSize: 11,
    color: '#999',
    marginTop: 4
  },
  driverSection: {
    margin: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  driverCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  driverRating: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  contactButton: {
    backgroundColor: '#ff6b4a',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center'
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  detailsSection: {
    margin: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  actionButtons: {
    flexDirection: 'row',
    margin: 12,
    gap: 12
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#ff6b4a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14
  },
  spacer: {
    height: 40
  }
});
