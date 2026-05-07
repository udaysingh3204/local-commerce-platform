import { useEffect, useState } from "react"
import {
  ActivityIndicator, Pressable, RefreshControl,
  SafeAreaView, ScrollView, Text, View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { fetchJson } from "../../lib/shared"
import { API_BASE_URL } from "../../config/env"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing, STATUS_CONFIG, CATEGORY_CONFIG } from "../../theme"
import type { TabNavProp } from "../../navigation/types"

type StoreItem = { _id: string; storeName: string; category?: string; deliveryRadius?: number; address?: string }
type OrderSummary = { _id: string; status: string; totalAmount: number; paymentStatus?: string; createdAt?: string }
type ProfileLite = {
  referralCode?: string
  loyalty?: {
    tier?: string
    points?: number
    nextTier?: string | null
    pointsToNextTier?: number | null
  }
}

const HERO_GRADIENTS = ["#312e81", "#4f46e5", "#0f172a"]

const missionTone = (activeOrders: number, cartCount: number) => {
  if (activeOrders > 0) {
    return {
      eyebrow: "Drop mode active",
      title: "Your city run is already in motion.",
      body: "Peek at the latest order, open Delivery Radar, or queue up the next essentials haul before the current drop lands.",
    }
  }

  if (cartCount > 0) {
    return {
      eyebrow: "Cart energy detected",
      title: "Your basket is begging for a dramatic checkout.",
      body: "Cash in the coupon lab, flex the puzzle missions, and let the price melt a bit before you place the order.",
    }
  }

  return {
    eyebrow: "Neighborhood main character",
    title: "Today’s vibe is hyperlocal chaos, but curated.",
    body: "Jump into Explore, build a cart that actually slaps, and let LocalMart handle the quick run without the boring parts.",
  }
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

export default function HomeScreen() {
  const nav = useNavigation<TabNavProp>()
  const { user, startup, cartItemCount, withAuth } = useApp()
  const [stores, setStores] = useState<StoreItem[]>([])
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [profile, setProfile] = useState<ProfileLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true); else setRefreshing(true)
    setError(null)
    try {
      const [storesData, ordersData, profileData] = await Promise.all([
        fetchJson<StoreItem[]>(API_BASE_URL, "/api/stores"),
        user ? fetchJson<OrderSummary[]>(API_BASE_URL, `/api/orders/customer/${user._id}`) : Promise.resolve([]),
        user ? withAuth<ProfileLite>("/api/auth/me") : Promise.resolve(null),
      ])
      setStores(storesData.slice(0, 6))
      setOrders(ordersData.slice(0, 3))
      setProfile(profileData)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load")
    } finally {
      if (mode === "initial") setLoading(false); else setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [user?._id, withAuth])

  const activeOrders = orders.filter((order) => ["pending", "accepted", "preparing", "out_for_delivery"].includes(order.status)).length
  const deliveredOrders = orders.filter((order) => order.status === "delivered").length
  const tone = missionTone(activeOrders || startup.activeOrders, cartItemCount)
  const quickActions = [
    {
      key: "explore",
      icon: "⚡",
      title: "Rush a snack run",
      body: "Speed-scroll the nearby stores and find the fastest flex.",
      onPress: () => nav.navigate("Explore"),
    },
    {
      key: "checkout",
      icon: "🧪",
      title: "Unlock coupon chaos",
      body: cartItemCount > 0 ? "The mission deck is live in checkout right now." : "Build a cart first, then crack the coupon missions.",
      onPress: () => cartItemCount > 0 ? nav.navigate("Checkout") : nav.navigate("Explore"),
    },
    {
      key: "orders",
      icon: "🛰️",
      title: "Check the drop radar",
      body: activeOrders > 0 ? "One of your orders can jump straight into live tracking." : "No active orders yet, but the radar is ready when you are.",
      onPress: () => nav.navigate("Orders"),
    },
  ]
  const questCards = [
    {
      key: "coupon-quest",
      icon: "🧪",
      label: cartItemCount > 0 ? "Ready now" : "Start here",
      title: "Coupon mission streak",
      body: cartItemCount > 0
        ? `You already have ${cartItemCount} cart item${cartItemCount === 1 ? "" : "s"}. Open checkout and bully the total down.`
        : "Build a cart and the mission deck in checkout will start serving real promo puzzles.",
      cta: cartItemCount > 0 ? "Open Checkout" : "Build a Cart",
      onPress: () => cartItemCount > 0 ? nav.navigate("Checkout") : nav.navigate("Explore"),
      dark: false,
    },
    {
      key: "referral-quest",
      icon: "📣",
      label: profile?.referralCode ?? "Profile unlock",
      title: "Referral side quest",
      body: profile?.referralCode
        ? `Your live code is ${profile.referralCode}. Drop it in group chats and turn one order into a whole crew run.`
        : "Open your profile, grab the referral code, and start the network effect like a menace.",
      cta: "Open Profile",
      onPress: () => nav.navigate("Profile"),
      dark: false,
    },
    {
      key: "loyalty-quest",
      icon: "⭐",
      label: profile?.loyalty?.tier ?? "Bronze",
      title: "Loyalty climb",
      body: profile?.loyalty?.nextTier && profile.loyalty.pointsToNextTier != null
        ? `${profile.loyalty.pointsToNextTier} points to ${profile.loyalty.nextTier}. Every clean order keeps the climb moving.`
        : `You’ve stacked ${profile?.loyalty?.points ?? 0} points already. Keep the run active and let the perks snowball.`,
      cta: activeOrders > 0 ? "Track Orders" : "Start a Run",
      onPress: () => activeOrders > 0 ? nav.navigate("Orders") : nav.navigate("Explore"),
      dark: true,
    },
  ]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={Colors.primary} />}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={{
          paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
          backgroundColor: Colors.bgCard, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
          ...Shadow.md,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>
                LocalMart
              </Text>
              <Text style={{ fontSize: Font.xxl, fontWeight: "900", color: Colors.text, marginTop: 2 }}>
                {greeting()} 👋
              </Text>
              <Text style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 2 }}>
                {user?.name || "Guest"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: Spacing.sm }}>
              {/* Notifications */}
              <Pressable
                onPress={() => nav.navigate("Notifications")}
                style={({ pressed }) => ({
                  width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? Colors.bgMuted : Colors.bgCard,
                  justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
                })}
              >
                <Text style={{ fontSize: 20 }}>🔔</Text>
              </Pressable>
              {/* Cart */}
              <Pressable
                onPress={() => nav.navigate("Checkout")}
                style={({ pressed }) => ({
                  width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? Colors.primaryLight : Colors.primary,
                  justifyContent: "center", alignItems: "center", ...Shadow.sm,
                })}
              >
                <Text style={{ fontSize: 18 }}>🛒</Text>
                {cartItemCount > 0 && (
                  <View style={{
                    position: "absolute", top: -2, right: -2, backgroundColor: Colors.danger,
                    width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center",
                    borderWidth: 2, borderColor: Colors.bgCard,
                  }}>
                    <Text style={{ fontSize: 9, color: "#fff", fontWeight: "900" }}>{cartItemCount > 9 ? "9+" : cartItemCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg }}>
            {[
              { label: "Active Orders", value: startup.activeOrders, icon: "🚀", color: Colors.primary },
              { label: "Pending Pay", value: startup.pendingPayments, icon: "💳", color: Colors.warning },
              { label: "In Cart", value: cartItemCount, icon: "🛒", color: Colors.success },
            ].map((stat) => (
              <View key={stat.label} style={{
                flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: Spacing.md,
                borderWidth: 1, borderColor: Colors.border, alignItems: "center",
              }}>
                <Text style={{ fontSize: 20 }}>{stat.icon}</Text>
                <Text style={{ fontSize: Font.xl, fontWeight: "900", color: stat.color, marginTop: 4 }}>{stat.value}</Text>
                <Text style={{ fontSize: 10, color: Colors.textMuted, textAlign: "center", marginTop: 2 }}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={{
            marginTop: Spacing.lg,
            backgroundColor: HERO_GRADIENTS[0],
            borderRadius: 26,
            padding: Spacing.xl,
            overflow: "hidden",
          }}>
            <View style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -30 }} />
            <View style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(245,158,11,0.18)", bottom: -24, left: -16 }} />
            <Text style={{ fontSize: Font.xs, color: "#c4b5fd", fontWeight: "800", letterSpacing: 1.4 }}>{tone.eyebrow.toUpperCase()}</Text>
            <Text style={{ fontSize: Font.xxl, fontWeight: "900", color: "#fff", marginTop: 8, lineHeight: 30 }}>{tone.title}</Text>
            <Text style={{ fontSize: Font.sm, color: "#ddd6fe", marginTop: 8, lineHeight: 20 }}>{tone.body}</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.lg }}>
              <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.xs }}>{activeOrders || startup.activeOrders} live run{(activeOrders || startup.activeOrders) === 1 ? "" : "s"}</Text>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.xs }}>{deliveredOrders} wins landed</Text>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.xs }}>{stores.length} store vibes nearby</Text>
              </View>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 48, alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 12, color: Colors.textSecondary }}>Loading your feed…</Text>
          </View>
        ) : (
          <>
            {/* ── Category Pills ──────────────────────────────────────────── */}
            <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.xl }}>
              <Text style={{ fontSize: Font.lg, fontWeight: "800", color: Colors.text, marginBottom: Spacing.md }}>
                Today’s Power Moves
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {quickActions.map((action) => (
                  <Pressable
                    key={action.key}
                    onPress={action.onPress}
                    style={({ pressed }) => ({
                      width: 220,
                      marginHorizontal: 4,
                      backgroundColor: Colors.bgCard,
                      borderRadius: 24,
                      padding: Spacing.lg,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      opacity: pressed ? 0.85 : 1,
                      ...Shadow.sm,
                    })}
                  >
                    <Text style={{ fontSize: 28 }}>{action.icon}</Text>
                    <Text style={{ fontSize: Font.md, fontWeight: "900", color: Colors.text, marginTop: 10 }}>{action.title}</Text>
                    <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 18, marginTop: 6 }}>{action.body}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.xl }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={{ fontSize: Font.lg, fontWeight: "800", color: Colors.text }}>Side Quests</Text>
                <Pressable onPress={() => nav.navigate("Profile")}>
                  <Text style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: "800" }}>See profile →</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {questCards.map((quest) => (
                  <Pressable
                    key={quest.key}
                    onPress={quest.onPress}
                    style={({ pressed }) => ({
                      width: 236,
                      marginHorizontal: 4,
                      backgroundColor: quest.dark ? "#111827" : Colors.bgCard,
                      borderRadius: 24,
                      padding: Spacing.lg,
                      borderWidth: 1,
                      borderColor: quest.dark ? "#1f2937" : Colors.border,
                      opacity: pressed ? 0.86 : 1,
                      ...Shadow.sm,
                    })}
                  >
                    <Text style={{ fontSize: 28 }}>{quest.icon}</Text>
                    <Text style={{ fontSize: Font.xs, color: quest.dark ? "#93c5fd" : Colors.primary, fontWeight: "800", letterSpacing: 1, marginTop: 10 }}>{quest.label.toUpperCase()}</Text>
                    <Text style={{ fontSize: Font.md, fontWeight: "900", color: quest.dark ? "#fff" : Colors.text, marginTop: 6 }}>{quest.title}</Text>
                    <Text style={{ fontSize: Font.sm, color: quest.dark ? "#cbd5e1" : Colors.textSecondary, lineHeight: 18, marginTop: 6 }}>{quest.body}</Text>
                    <Text style={{ fontSize: Font.sm, color: quest.dark ? "#67e8f9" : Colors.primary, fontWeight: "900", marginTop: 12 }}>{quest.cta} →</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.xl }}>
              <Text style={{ fontSize: Font.lg, fontWeight: "800", color: Colors.text, marginBottom: Spacing.md }}>
                Shop by Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {Object.entries(CATEGORY_CONFIG).slice(0, 8).map(([key, cfg]) => (
                  <Pressable
                    key={key}
                    onPress={() => nav.navigate("Explore")}
                    style={({ pressed }) => ({
                      marginHorizontal: 4, alignItems: "center", opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View style={{
                      width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center",
                      backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm,
                    }}>
                      <Text style={{ fontSize: 26 }}>{cfg.icon}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: Colors.textSecondary, marginTop: 5, textTransform: "capitalize" }}>
                      {key.replace("-", " ")}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ── Featured Stores ─────────────────────────────────────────── */}
            <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.xl }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                <Text style={{ fontSize: Font.lg, fontWeight: "800", color: Colors.text }}>Nearby Stores</Text>
                <Pressable onPress={() => nav.navigate("Explore")}>
                  <Text style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: "700" }}>See all →</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {stores.map((store, idx) => {
                  const cat = CATEGORY_CONFIG[store.category ?? ""] ?? CATEGORY_CONFIG.default
                  const gradients = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"]
                  const color = gradients[idx % gradients.length]
                  return (
                    <Pressable
                      key={store._id}
                      onPress={() => nav.navigate("StoreDetail", { storeId: store._id, storeName: store.storeName })}
                      style={({ pressed }) => ({
                        width: 160, marginHorizontal: 4, borderRadius: Radius.xl,
                        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
                        overflow: "hidden", opacity: pressed ? 0.9 : 1, ...Shadow.sm,
                      })}
                    >
                      <View style={{
                        height: 90, backgroundColor: color, justifyContent: "center", alignItems: "center",
                      }}>
                        <Text style={{ fontSize: 44 }}>{cat.icon}</Text>
                      </View>
                      <View style={{ padding: Spacing.md }}>
                        <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.text }} numberOfLines={1}>
                          {store.storeName}
                        </Text>
                        <Text style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 2, textTransform: "capitalize" }}>
                          {store.category || "General"} · {store.deliveryRadius ?? 5}km
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>

            {/* ── Recent Orders ───────────────────────────────────────────── */}
            {orders.length > 0 && (
              <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.xl }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
                  <Text style={{ fontSize: Font.lg, fontWeight: "800", color: Colors.text }}>Recent Orders</Text>
                  <Pressable onPress={() => nav.navigate("Orders")}>
                    <Text style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: "700" }}>View all →</Text>
                  </Pressable>
                </View>
                {orders.map((order) => {
                  const s = STATUS_CONFIG[order.status] ?? { bg: "#f3f4f6", text: "#374151", label: order.status, icon: "📦" }
                  return (
                    <Pressable
                      key={order._id}
                      onPress={() => nav.navigate("OrderDetail", { orderId: order._id })}
                      style={({ pressed }) => ({
                        flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgCard,
                        borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm,
                        borderWidth: 1, borderColor: Colors.border, opacity: pressed ? 0.85 : 1, ...Shadow.sm,
                      })}
                    >
                      <View style={{
                        width: 44, height: 44, borderRadius: 22, backgroundColor: s.bg,
                        justifyContent: "center", alignItems: "center", marginRight: Spacing.md,
                      }}>
                        <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.text }}>
                          Order #{order._id.slice(-6).toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 1 }}>
                          {fmt(order.totalAmount)} · {order.status === "out_for_delivery" ? "Courier energy unlocked" : order.status === "delivered" ? "Delivered with style" : "Still moving through the pipeline"}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full }}>
                        <Text style={{ fontSize: Font.xs, color: s.text, fontWeight: "700" }}>{s.label}</Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            )}

            {error && (
              <View style={{
                margin: Spacing.xl, backgroundColor: "#fef2f2", borderRadius: Radius.lg,
                padding: Spacing.lg, borderWidth: 1, borderColor: "#fecaca",
              }}>
                <Text style={{ color: Colors.danger, fontSize: Font.sm }}>{error}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
