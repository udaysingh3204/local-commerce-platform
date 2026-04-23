import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import axios from 'axios';

/**
 * Mobile Checkout Screen
 * Complete ordering flow with address, delivery options, and payment
 */
export default function CheckoutScreen({ route, navigation }) {
  const { cartItems, storeId, storeName } = route.params || {};

  // Address state
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customLocation, setCustomLocation] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Delivery options
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);

  // Order state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState(null);
  const [orderSummary, setOrderSummary] = useState(null);

  // Dynamic pricing
  const [priceDetails, setPriceDetails] = useState({
    subtotal: 0,
    tax: 0,
    deliveryFee: 0,
    total: 0
  });

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const AUTH_TOKEN = null; // Should come from auth context

  // Initialize
  useEffect(() => {
    initializeCheckout();
  }, []);

  /**
   * Initialize checkout (get saved addresses, calculate pricing)
   */
  const initializeCheckout = async () => {
    try {
      // Load saved addresses
      const addresses = await loadSavedAddresses();
      setSavedAddresses(addresses);

      // Try to get current location
      const location = await getCurrentLocation();
      if (location) {
        setCustomLocation(location);
        setDeliveryAddress(`${location.latitude}, ${location.longitude}`);
      }

      // Calculate initial pricing
      calculatePricing(cartItems);

    } catch (err) {
      console.error('[Checkout] Init error:', err);
      setError(err.message);
    }
  };

  /**
   * Get user's current location
   */
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('[Checkout] Location permission denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      };

    } catch (err) {
      console.error('[Checkout] Location error:', err);
      return null;
    }
  };

  /**
   * Load saved delivery addresses from AsyncStorage
   */
  const loadSavedAddresses = async () => {
    try {
      const addresses = [
        {
          id: '1',
          label: 'Home',
          address: '123 Main St, Apt 4B, City, State 12345',
          coordinates: [80.2707, 13.0826],
          isDefault: true
        },
        {
          id: '2',
          label: 'Office',
          address: '456 Business Ave, Suite 100, City, State 12346',
          coordinates: [80.2710, 13.0828],
          isDefault: false
        }
      ];

      return addresses;

    } catch (err) {
      console.error('[Checkout] Load addresses error:', err);
      return [];
    }
  };

  /**
   * Calculate order pricing with dynamic delivery fee
   */
  const calculatePricing = async (items) => {
    try {
      if (!items || items.length === 0) return;

      // Calculate subtotal
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Calculate tax (5% by default)
      const tax = subtotal * 0.05;

      // Get dynamic delivery fee from backend
      let deliveryFeeAmount = 40; // Default
      if (selectedAddress && storeId) {
        try {
          const response = await axios.post(
            `${API_URL}/api/pricing/estimate`,
            {
              storeLocation: [80.2707, 13.0826], // Mock store location
              deliveryLocation: selectedAddress.coordinates
            }
          );
          deliveryFeeAmount = response.data.finalFee || 40;
        } catch (err) {
          console.warn('[Checkout] Pricing API error:', err);
        }
      }

      // Urgent order surcharge
      if (isUrgent) {
        deliveryFeeAmount *= 1.5;
      }

      const total = subtotal + tax + deliveryFeeAmount;

      setPriceDetails({
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        deliveryFee: Math.round(deliveryFeeAmount),
        total: Math.round(total)
      });

      setDeliveryFee(deliveryFeeAmount);

    } catch (err) {
      console.error('[Checkout] Pricing calc error:', err);
    }
  };

  /**
   * Handle address selection
   */
  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setDeliveryAddress(address.address);
    setShowAddressModal(false);
    calclatePricing(cartItems);
  };

  /**
   * Use current location as delivery address
   */
  const useCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        const newAddress = {
          id: 'current',
          label: 'Current Location',
          address: `${location.latitude}, ${location.longitude}`,
          coordinates: [location.longitude, location.latitude],
          temporary: true
        };
        handleAddressSelect(newAddress);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not get current location');
    }
  };

  /**
   * Place order
   */
  const handlePlaceOrder = async () => {
    try {
      if (!selectedAddress && !customLocation) {
        Alert.alert('Error', 'Please select a delivery address');
        return;
      }

      if (!AUTH_TOKEN) {
        Alert.alert('Error', 'Please login to place order');
        navigation.navigate('Login');
        return;
      }

      setIsPlacingOrder(true);
      setError(null);

      const orderData = {
        storeId,
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        deliveryAddress: selectedAddress?.address || deliveryAddress,
        deliveryLocation: {
          type: 'Point',
          coordinates: selectedAddress?.coordinates || [customLocation.longitude, customLocation.latitude]
        },
        deliveryNotes,
        isUrgent,
        totalPrice: priceDetails.total,
        deliveryFee: priceDetails.deliveryFee
      };

      // Create order via API
      const response = await axios.post(
        `${API_URL}/api/orders`,
        orderData,
        {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
        }
      );

      if (response.data.orderId) {
        setOrderSummary(response.data);
        
        // Navigate to payment if needed
        navigation.navigate('Payment', {
          orderId: response.data.orderId,
          amount: priceDetails.total,
          orderSummary: response.data
        });
      }

    } catch (err) {
      console.error('[Checkout] Order error:', err);
      const message = err.response?.data?.message || err.message;
      Alert.alert('Order Failed', message);
      setError(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (isPlacingOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b4a" />
          <Text style={styles.loadingText}>Placing your order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.storeName}>{storeName}</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Delivery Address</Text>

          <TouchableOpacity
            style={styles.addressInput}
            onPress={() => setShowAddressModal(true)}
          >
            <Text style={styles.addressText}>
              {selectedAddress?.label || 'Select or enter address'}
            </Text>
            <Text style={styles.addressSubtext}>
              {selectedAddress?.address || 'Tap to select'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={useCurrentLocation}
          >
            <Text style={styles.secondaryButtonText}>📍 Use Current Location</Text>
          </TouchableOpacity>
        </View>

        {/* Delivery Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Delivery Options</Text>

          <TextInput
            style={styles.notesInput}
            placeholder="Add delivery instructions (optional)"
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[
              styles.urgentButton,
              isUrgent && styles.urgentButtonActive
            ]}
            onPress={() => {
              setIsUrgent(!isUrgent);
              calculatePricing(cartItems);
            }}
          >
            <Text style={styles.urgentButtonText}>
              {isUrgent ? '⭐ Urgent Delivery (+50%)' : 'Urgent Delivery'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{priceDetails.subtotal}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxes & Fees</Text>
            <Text style={styles.summaryValue}>₹{priceDetails.tax}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹{priceDetails.deliveryFee}</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{priceDetails.total}</Text>
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <TextInput
            style={styles.promoInput}
            placeholder="Enter promo code (optional)"
            placeholderTextColor="#999"
          />
        </View>

        {/* Place Order Button */}
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}
        >
          <Text style={styles.placeOrderText}>
            Place Order • ₹{priceDetails.total}
          </Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Delivery Address</Text>
            <View style={{ width: 30 }} />
          </View>

          <FlatList
            data={savedAddresses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.addressOption,
                  selectedAddress?.id === item.id && styles.addressOptionSelected
                ]}
                onPress={() => handleAddressSelect(item)}
              >
                <View>
                  <Text style={styles.addressOptionLabel}>{item.label}</Text>
                  <Text style={styles.addressOptionText}>{item.address}</Text>
                </View>
                {selectedAddress?.id === item.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={styles.addNewAddressButton}
            onPress={() => {
              // Navigate to add address screen
              setShowAddressModal(false);
            }}
          >
            <Text style={styles.addNewAddressText}>+ Add New Address</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000'
  },
  storeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f'
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000'
  },
  addressInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  addressSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  secondaryButtonText: {
    color: '#555',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500'
  },
  notesInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
    color: '#333'
  },
  urgentButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  urgentButtonActive: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800'
  },
  urgentButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingVertical: 12,
    marginTop: 8
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff6b4a'
  },
  promoInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333'
  },
  placeOrderButton: {
    backgroundColor: '#ff6b4a',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  spacer: {
    height: 40
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  closeButton: {
    fontSize: 24,
    color: '#666'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000'
  },
  addressOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  addressOptionSelected: {
    backgroundColor: '#f0f7ff'
  },
  addressOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  addressOptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: '700'
  },
  addNewAddressButton: {
    margin: 16,
    paddingVertical: 14,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center'
  },
  addNewAddressText: {
    color: '#ff6b4a',
    fontSize: 16,
    fontWeight: '600'
  }
});
