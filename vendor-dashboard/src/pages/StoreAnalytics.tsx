import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Card
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import { format, subDays } from 'date-fns';

const { width } = Dimensions.get('window');

/**
 * Store Manager Analytics Dashboard
 * Real-time sales, inventory, customer, and operational metrics for store owners
 */
export default function StoreAnalyticsScreen({ route }) {
  const { storeId } = route.params || {};

  // Analytics state
  const [metrics, setMetrics] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [salesTrend, setSalesTrend] = useState(null);
  const [customerMetrics, setCustomerMetrics] = useState(null);
  const [operationalMetrics, setOperationalMetrics] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const AUTH_TOKEN = null; // From auth context

  // Initialize
  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  /**
   * Load all analytics data
   */
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const rangeParam = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 1;

      const [
        dashboardResp,
        inventoryResp,
        salesResp,
        customerResp,
        operationalResp
      ] = await Promise.all([
        axios.get(
          `${API_URL}/api/analytics/store/${storeId}`,
          { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        ),
        axios.get(
          `${API_URL}/api/inventory/stock/${storeId}`,
          { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        ),
        axios.get(
          `${API_URL}/api/analytics/store/${storeId}/sales?days=${rangeParam}`,
          { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        ),
        axios.get(
          `${API_URL}/api/analytics/store/${storeId}/customers?days=${rangeParam}`,
          { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        ),
        axios.get(
          `${API_URL}/api/analytics/store/${storeId}/operations?days=${rangeParam}`,
          { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        )
      ]);

      setMetrics(dashboardResp.data);
      setInventory(inventoryResp.data);
      setSalesTrend(salesResp.data);
      setCustomerMetrics(customerResp.data);
      setOperationalMetrics(operationalResp.data);

    } catch (err) {
      console.error('[Analytics] Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b4a" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Store Analytics</Text>
        <View style={styles.timeRangeButtons}>
          {['today', '7days', '30days'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeButton,
                timeRange === range && styles.timeButtonActive
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[
                styles.timeButtonText,
                timeRange === range && styles.timeButtonTextActive
              ]}>
                {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : '30 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* KPI Cards */}
      {metrics && (
        <View style={styles.kpis}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Revenue</Text>
            <Text style={styles.kpiValue}>₹{(metrics.totalRevenue || 0).toLocaleString()}</Text>
            <Text style={styles.kpiChange}>
              {metrics.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(metrics.revenueChange)}%
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Orders</Text>
            <Text style={styles.kpiValue}>{metrics.totalOrders || 0}</Text>
            <Text style={styles.kpiChange}>
              {metrics.orderChange >= 0 ? '↑' : '↓'} {Math.abs(metrics.orderChange)}%
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg Order Value</Text>
            <Text style={styles.kpiValue}>₹{Math.round(metrics.avgOrderValue || 0)}</Text>
            <Text style={styles.kpiChange}>
              {metrics.aovChange >= 0 ? '↑' : '↓'} {Math.abs(metrics.aovChange)}%
            </Text>
          </View>
        </View>
      )}

      {/* Sales Trend Chart */}
      {salesTrend && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales Trend</Text>
          <LineChart
            data={{
              labels: salesTrend.labels,
              datasets: [{
                data: salesTrend.revenue
              }]
            }}
            width={width - 32}
            height={220}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              color: () => '#ff6b4a',
              labelColor: () => '#666'
            }}
            style={styles.chart}
          />
        </View>
      )}

      {/* Order Distribution */}
      {operationalMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status Distribution</Text>
          <View style={styles.orderStatus}>
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, { backgroundColor: '#ff9800' }]} />
              <Text style={styles.statusLabel}>Pending</Text>
              <Text style={styles.statusCount}>{operationalMetrics.pending || 0}</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.statusLabel}>In Progress</Text>
              <Text style={styles.statusCount}>{operationalMetrics.inProgress || 0}</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusLabel}>Completed</Text>
              <Text style={styles.statusCount}>{operationalMetrics.completed || 0}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Top Products */}
      {metrics && metrics.topProducts && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Products</Text>
          {metrics.topProducts.map((product, index) => (
            <View key={product.productId} style={styles.productItem}>
              <View style={styles.productRank}>
                <Text style={styles.productRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productStats}>
                  {product.unitsSOld} sold • ₹{(product.revenue || 0).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.productTrend}>
                {product.trend >= 0 ? '↑' : '↓'} {Math.abs(product.trend)}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Inventory Alerts */}
      {inventory && inventory.lowStock && inventory.lowStock.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
          {inventory.lowStock.map((item) => (
            <View key={item.productId} style={styles.alert}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={styles.alertInfo}>
                <Text style={styles.alertTitle}>{item.name}</Text>
                <Text style={styles.alertMessage}>
                  Only {item.currentStock} left in stock
                </Text>
              </View>
              <TouchableOpacity style={styles.alertAction}>
                <Text style={styles.alertActionText}>Reorder</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Customer Metrics */}
      {customerMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Insights</Text>
          <View style={styles.insightGrid}>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>New Customers</Text>
              <Text style={styles.insightValue}>{customerMetrics.newCustomers || 0}</Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Repeat Rate</Text>
              <Text style={styles.insightValue}>
                {customerMetrics.repeatRate || 0}%
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Avg Rating</Text>
              <Text style={styles.insightValue}>
                {customerMetrics.avgRating || 4.5}★
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Reviews</Text>
              <Text style={styles.insightValue}>{customerMetrics.reviewCount || 0}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Queue Analytics */}
      {operationalMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Queue Performance</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.perfCard}>
              <Text style={styles.perfLabel}>Avg Wait Time</Text>
              <Text style={styles.perfValue}>
                {operationalMetrics.avgWaitTime || 15} min
              </Text>
            </View>
            <View style={styles.perfCard}>
              <Text style={styles.perfLabel}>Avg Prep Time</Text>
              <Text style={styles.perfValue}>
                {operationalMetrics.avgPrepTime || 20} min
              </Text>
            </View>
            <View style={styles.perfCard}>
              <Text style={styles.perfLabel}>Delivery SLA</Text>
              <Text style={styles.perfValue}>
                {operationalMetrics.deliverySLA || 95}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Recommendations */}
      {metrics && metrics.recommendations && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actionable Insights</Text>
          {metrics.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendation}>
              <View style={[
                styles.recIcon,
                { backgroundColor: rec.priority === 'high' ? '#ffebee' : '#e3f2fd' }
              ]}>
                <Text>{rec.priority === 'high' ? '🔴' : '🔵'}</Text>
              </View>
              <Text style={styles.recText}>{rec.message}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
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
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    color: '#000'
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 8
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0'
  },
  timeButtonActive: {
    backgroundColor: '#ff6b4a'
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666'
  },
  timeButtonTextActive: {
    color: '#fff'
  },
  kpis: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee'
  },
  kpiLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4
  },
  kpiChange: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50'
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000'
  },
  chart: {
    borderRadius: 8
  },
  orderStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statusItem: {
    alignItems: 'center'
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  statusCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000'
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  productRankText: {
    fontWeight: '600',
    color: '#ff6b4a'
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000'
  },
  productStats: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  productTrend: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50'
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12
  },
  alertInfo: {
    flex: 1
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000'
  },
  alertMessage: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  alertAction: {
    backgroundColor: '#ff6b4a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4
  },
  alertActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  insightCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  insightLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff6b4a'
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  perfCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4
  },
  perfLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  perfValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333'
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8
  },
  recIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  recText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 18
  },
  spacer: {
    height: 40
  }
});
