import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TabBarIOS,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';

const { width } = Dimensions.get('window');

/**
 * Driver Earnings & Performance Dashboard (Mobile)
 * Real-time earnings, achievements, leaderboard, and gamification
 */
export default function DriverDashboardScreen({ navigation }) {
  // State
  const [selectedTab, setSelectedTab] = useState(0);
  const [gamification, setGamification] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const AUTH_TOKEN = null; // From auth context

  // Initialize
  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Load all dashboard data
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [gamifResp, leaderResp, insightsResp] = await Promise.all([
        axios.get(
          `${API_URL}/api/gamification/dashboard`,
          { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        ),
        axios.get(
          `${API_URL}/api/gamification/leaderboard?limit=10&category=overall`
        ),
        axios.get(
          `${API_URL}/api/driver/me/insights`,
          { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        )
      ]);

      setGamification(gamifResp.data);
      setLeaderboard(leaderResp.data.leaderboard || []);
      setInsights(insightsResp.data);

    } catch (err) {
      console.error('[Dashboard] Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b4a" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TabBarIOS
        unselectedTintColor="#999"
        tintColor="#ff6b4a"
        barTintColor="#fff"
        style={styles.tabBar}
      >
        {/* Earnings Tab */}
        <TabBarIOS.Item
          title="Earnings"
          icon={{ uri: '💰' }}
          onPress={() => setSelectedTab(0)}
          selected={selectedTab === 0}
        >
          <ScrollView style={styles.tabContent}>
            {/* Earnings Summary */}
            {insights && (
              <>
                <View style={styles.earningsSummary}>
                  <Text style={styles.summaryTitle}>Today's Earnings</Text>
                  <View style={styles.earningsGrid}>
                    <View style={styles.earningsCard}>
                      <Text style={styles.cardValue}>₹{insights.todayEarnings || 0}</Text>
                      <Text style={styles.cardLabel}>Today</Text>
                    </View>
                    <View style={styles.earningsCard}>
                      <Text style={styles.cardValue}>₹{insights.weekEarnings || 0}</Text>
                      <Text style={styles.cardLabel}>This Week</Text>
                    </View>
                    <View style={styles.earningsCard}>
                      <Text style={styles.cardValue}>₹{insights.monthEarnings || 0}</Text>
                      <Text style={styles.cardLabel}>This Month</Text>
                    </View>
                  </View>
                </View>

                {/* Weekly Trend Chart */}
                {insights.weeklyTrend && (
                  <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Weekly Trend</Text>
                    <BarChart
                      data={{
                        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        datasets: [{
                          data: insights.weeklyTrend
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

                {/* Active Orders */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Orders</Text>
                    <Text style={styles.activeBadge}>{insights.activeOrders?.length || 0}</Text>
                  </View>

                  {insights.activeOrders && insights.activeOrders.length > 0 ? (
                    <FlatList
                      data={insights.activeOrders.slice(0, 5)}
                      keyExtractor={(item) => item.orderId}
                      renderItem={({ item }) => (
                        <View style={styles.orderItem}>
                          <View>
                            <Text style={styles.orderId}>Order #{item.orderId.substring(0, 6)}</Text>
                            <Text style={styles.orderPrice}>₹{item.deliveryFee}</Text>
                          </View>
                          <Text style={styles.orderStatus}>{item.status}</Text>
                        </View>
                      )}
                      scrollEnabled={false}
                    />
                  ) : (
                    <Text style={styles.emptyText}>No active orders</Text>
                  )}
                </View>

                {/* Recent Deliveries */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Deliveries</Text>
                  </View>

                  {insights.recentDeliveries && insights.recentDeliveries.length > 0 ? (
                    <FlatList
                      data={insights.recentDeliveries.slice(0, 5)}
                      keyExtractor={(item) => item.orderId}
                      renderItem={({ item }) => (
                        <View style={styles.deliveryItem}>
                          <View style={styles.deliveryTime}>
                            <Text style={styles.deliveryDuration}>{item.deliveryMinutes}min</Text>
                          </View>
                          <View style={styles.deliveryInfo}>
                            <Text style={styles.deliveryLabel}>Order #{item.orderId.substring(0, 6)}</Text>
                            <Text style={styles.deliveryPayment}>₹{item.deliveryFee} • {item.completedAt}</Text>
                          </View>
                          <Text style={styles.deliveryRating}>⭐ {item.rating || 'N/A'}</Text>
                        </View>
                      )}
                      scrollEnabled={false}
                    />
                  ) : (
                    <Text style={styles.emptyText}>No recent deliveries</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </TabBarIOS.Item>

        {/* Achievements Tab */}
        <TabBarIOS.Item
          title="Achievements"
          icon={{ uri: '🏆' }}
          onPress={() => setSelectedTab(1)}
          selected={selectedTab === 1}
        >
          <ScrollView style={styles.tabContent}>
            {gamification && (
              <>
                {/* Performance Tier */}
                <View style={styles.tierSection}>
                  <Text style={styles.tierTitle}>Current Tier</Text>
                  <View style={[styles.tierCard, styles[`tier${gamification.tier.level}`]]}>
                    <Text style={styles.tierLevel}>{gamification.tier.level.toUpperCase()}</Text>
                    <Text style={styles.tierScore}>Score: {gamification.overview.currentScore}</Text>
                    <Text style={styles.tierRank}>Rank: #{gamification.leaderboardContext.yourRank}</Text>

                    {gamification.tier.nextTierScore && (
                      <>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.min(100, (gamification.overview.currentScore / gamification.tier.nextTierScore) * 100)}%`
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.tierProgress}>
                          {gamification.tier.scoreToNextTier} points to next tier
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Perks */}
                {gamification.tier.perks && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Perks</Text>
                    {gamification.tier.perks.map((perk, index) => (
                      <View key={index} style={styles.perkItem}>
                        <Text style={styles.checkmark}>✓</Text>
                        <Text style={styles.perkText}>{perk}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Badges */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Badges Unlocked</Text>
                    <Text style={styles.badgeCount}>
                      {gamification.overview.earnedBadges}/{gamification.overview.totalBadgesAvailable}
                    </Text>
                  </View>

                  {gamification.achievements && gamification.achievements.length > 0 ? (
                    <View style={styles.badgeGrid}>
                      {gamification.achievements.map((badge) => (
                        <View key={badge.id} style={styles.badgeItem}>
                          <Text style={styles.badgeIcon}>{badge.icon}</Text>
                          <Text style={styles.badgeName}>{badge.name}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No badges unlocked yet. Keep delivering!</Text>
                  )}
                </View>

                {/* Next Milestone */}
                {gamification.nextMilestone && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Next Milestone</Text>
                    <View style={styles.milestoneCard}>
                      <Text style={styles.milestoneIcon}>{gamification.nextMilestone.badge.icon}</Text>
                      <View style={styles.milestoneInfo}>
                        <Text style={styles.milestoneName}>{gamification.nextMilestone.badge.name}</Text>
                        <Text style={styles.milestoneDesc}>{gamification.nextMilestone.badge.description}</Text>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.min(100, (gamification.nextMilestone.current / gamification.nextMilestone.target) * 100)}%`
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.milestoneProgress}>
                          {gamification.nextMilestone.current}/{gamification.nextMilestone.target}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </TabBarIOS.Item>

        {/* Leaderboard Tab */}
        <TabBarIOS.Item
          title="Leaderboard"
          icon={{ uri: '📊' }}
          onPress={() => setSelectedTab(2)}
          selected={selectedTab === 2}
        >
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Performers</Text>

              {leaderboard && leaderboard.length > 0 ? (
                <FlatList
                  data={leaderboard}
                  keyExtractor={(item) => item.driverId}
                  renderItem={({ item }) => (
                    <View style={[
                      styles.leaderboardItem,
                      item.rank <= 3 && styles.leaderboardItemTop
                    ]}>
                      <View style={styles.leaderboardRank}>
                        <Text style={styles.leaderboardRankText}>
                          {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                        </Text>
                      </View>

                      <View style={styles.leaderboardInfo}>
                        <Text style={styles.leaderboardName}>{item.name}</Text>
                        <Text style={styles.leaderboardTier}>{item.tier.toUpperCase()}</Text>
                      </View>

                      <View style={styles.leaderboardScore}>
                        <Text style={styles.leaderboardScoreValue}>{item.score}</Text>
                        <Text style={styles.leaderboardScoreLabel}>pts</Text>
                      </View>
                    </View>
                  )}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyText}>Loading leaderboard...</Text>
              )}
            </View>
          </ScrollView>
        </TabBarIOS.Item>
      </TabBarIOS>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  tabBar: {
    height: 60
  },
  tabContent: {
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
  earningsSummary: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#000'
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  earningsCard: {
    flex: 1,
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff6b4a'
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  chartSection: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 8
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000'
  },
  chart: {
    borderRadius: 8
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 8
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  activeBadge: {
    backgroundColor: '#ff6b4a',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600'
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  orderId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b4a',
    marginTop: 2
  },
  orderStatus: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  deliveryTime: {
    alignItems: 'center',
    marginRight: 12
  },
  deliveryDuration: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff6b4a'
  },
  deliveryInfo: {
    flex: 1
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  deliveryPayment: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  deliveryRating: {
    fontSize: 14,
    fontWeight: '600'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20
  },
  tierSection: {
    padding: 12
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#000'
  },
  tierCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  tierpro: {
    backgroundColor: '#e8f5e9'
  },
  tierelite: {
    backgroundColor: '#fff3e0'
  },
  tierlegend: {
    backgroundColor: '#f3e5f5'
  },
  tierLevel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  tierScore: {
    fontSize: 14,
    color: '#666',
    marginTop: 8
  },
  tierRank: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 12,
    width: '100%',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff6b4a'
  },
  tierProgress: {
    fontSize: 12,
    color: '#999',
    marginTop: 8
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  checkmark: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 12
  },
  perkText: {
    fontSize: 14,
    color: '#333'
  },
  badgeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b4a'
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around'
  },
  badgeItem: {
    alignItems: 'center',
    padding: 12,
    width: '30%'
  },
  badgeIcon: {
    fontSize: 40,
    marginBottom: 8
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  milestoneCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8
  },
  milestoneIcon: {
    fontSize: 40,
    marginRight: 12
  },
  milestoneInfo: {
    flex: 1
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  milestoneDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  milestoneProgress: {
    fontSize: 11,
    color: '#999',
    marginTop: 4
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  leaderboardItemTop: {
    backgroundColor: '#fffef0'
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center'
  },
  leaderboardRankText: {
    fontSize: 18,
    fontWeight: '700'
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  leaderboardTier: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  leaderboardScore: {
    alignItems: 'center'
  },
  leaderboardScoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b4a'
  },
  leaderboardScoreLabel: {
    fontSize: 10,
    color: '#999'
  }
});
