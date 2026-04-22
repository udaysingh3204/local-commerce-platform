import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator, Modal, Pressable, RefreshControl,
  SafeAreaView, ScrollView, Text, View,
} from "react-native"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { fetchJson } from "@local-commerce-platform/mobile-shared"
import { API_BASE_URL } from "../../config/env"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing, STATUS_CONFIG } from "../../theme"
import type { TabNavProp } from "../../navigation/types"

type Order = { _id: string; status: string; totalAmount: number; paymentStatus?: string; createdAt?: string; storeName?: string }

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

const fmtDate = (iso?: string) => {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

const FILTERS = ["all", "active", "delivered", "cancelled"]

const CANCEL_REASONS = ["Changed my mind", "Ordered by mistake", "Taking too long", "Other"]

const statusNarrative: Record<string, string> = {
  pending: "Store has the brief. Chaos is organizing itself.",
  accepted: "Accepted and moving. Team is on the case.",
  preparing: "Pack squad is doing their thing.",
  out_for_delivery: "Courier is outside in spirit, if not yet at the gate.",
  delivered: "Drop landed clean. W energy.",
  cancelled: "Mission scrapped. Nothing is in motion now.",
}

export default function OrdersScreen() {
  const nav = useNavigation<TabNavProp>()
  const { user, withAuth } = useApp()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancelModal, setCancelModal] = useState<{ orderId: string; orderRef: string } | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!user) return
    if (mode === "initial") setLoading(true); else setRefreshing(true)
    try {
      const data = await fetchJson<Order[]>(API_BASE_URL, `/api/orders/customer/${user._id}`)
      setOrders(data)
    } catch { /* ignore */ } finally {
      if (mode === "initial") setLoading(false); else setRefreshing(false)
    }
  }, [user?._id])

  useEffect(() => { void load() }, [load])
  useFocusEffect(useCallback(() => { void load("refresh") }, [load]))

  const handleCancelOrder = async () => {
    if (!cancelModal) return
    setCancelling(true)
    try {
      await withAuth<unknown>(`/api/orders/${cancelModal.orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Customer cancelled" }),
      })
      setOrders(prev => prev.map(o => o._id === cancelModal.orderId ? { ...o, status: "cancelled" } : o))
      setCancelModal(null)
      setCancelReason("")
    } catch { /* ignore */ } finally {
      setCancelling(false)
    }
  }

  const filtered = orders.filter((o) => {
    if (filter === "all") return true
    if (filter === "active") return ["pending", "accepted", "preparing", "out_for_delivery"].includes(o.status)
    if (filter === "delivered") return o.status === "delivered"
    if (filter === "cancelled") return o.status === "cancelled"
    return true
  })

  const activeCount = orders.filter((order) => ["pending", "accepted", "preparing", "out_for_delivery"].includes(order.status)).length
  const deliveredCount = orders.filter((order) => order.status === "delivered").length
  const delayedStyleOrders = orders.filter((order) => order.paymentStatus !== "paid").length

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
        backgroundColor: Colors.bgCard, ...Shadow.sm,
      }}>
        <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.text }}>My Orders</Text>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}
        style={{ backgroundColor: Colors.bgCard, maxHeight: 56 }}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={({ pressed }) => ({
              paddingHorizontal: 18, paddingVertical: 7, borderRadius: Radius.full,
              marginRight: Spacing.sm, opacity: pressed ? 0.8 : 1,
              backgroundColor: filter === f ? Colors.primary : Colors.bg,
              borderWidth: 1, borderColor: filter === f ? Colors.primary : Colors.border,
            })}
          >
            <Text style={{
              fontSize: Font.sm, fontWeight: "700", textTransform: "capitalize",
              color: filter === f ? "#fff" : Colors.textSecondary,
            }}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm, backgroundColor: Colors.bg }}>
        <View style={{ flexDirection: "row", gap: Spacing.sm }}>
          {[
            { label: "Live runs", value: activeCount, tone: Colors.primary, icon: "🛰️" },
            { label: "Delivered", value: deliveredCount, tone: Colors.success, icon: "🎉" },
            { label: "Payment follow-up", value: delayedStyleOrders, tone: Colors.warning, icon: "💳" },
          ].map((card) => (
            <View key={card.label} style={{ flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm }}>
              <Text style={{ fontSize: 18 }}>{card.icon}</Text>
              <Text style={{ fontSize: Font.xl, fontWeight: "900", color: card.tone, marginTop: 4 }}>{card.value}</Text>
              <Text style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 3 }}>{card.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={Colors.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={{ padding: 48, alignItems: "center" }}>
              <Text style={{ fontSize: 48 }}>📦</Text>
              <Text style={{ fontSize: Font.lg, fontWeight: "700", color: Colors.text, marginTop: 12 }}>
                {filter === "all" ? "No orders yet" : `No ${filter} orders`}
              </Text>
              <Text style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 4, textAlign: "center" }}>
                {filter === "all" ? "Start shopping to place your first order!" : "Try a different filter"}
              </Text>
              {filter === "all" && (
                <Pressable
                  onPress={() => nav.navigate("Explore")}
                  style={{
                    marginTop: Spacing.xl, backgroundColor: Colors.primary,
                    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radius.full,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.md }}>Browse Stores</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filtered.map((order) => {
              const s = STATUS_CONFIG[order.status] ?? { bg: "#f3f4f6", text: "#374151", label: order.status, icon: "📦" }
              return (
                <Pressable
                  key={order._id}
                  onPress={() => nav.navigate("OrderDetail", { orderId: order._id })}
                  style={({ pressed }) => ({
                    backgroundColor: Colors.bgCard, borderRadius: Radius.xl, marginBottom: Spacing.md,
                    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
                    opacity: pressed ? 0.9 : 1, ...Shadow.sm,
                  })}
                >
                  {/* Status bar */}
                  <View style={{ height: 4, backgroundColor: s.text }} />
                  <View style={{ padding: Spacing.lg }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.text }}>
                          Order #{order._id.slice(-6).toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 2 }}>
                          {fmtDate(order.createdAt)}
                        </Text>
                        <Text style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 6 }}>
                          {statusNarrative[order.status] ?? "Order update ready."}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full }}>
                        <Text style={{ fontSize: Font.xs, fontWeight: "800", color: s.text }}>
                          {s.icon}  {s.label}
                        </Text>
                      </View>
                    </View>
                    <View style={{
                      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                      marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
                    }}>
                      <Text style={{ fontSize: Font.lg, fontWeight: "900", color: Colors.text }}>
                        {fmt(order.totalAmount)}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{
                          paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm,
                          backgroundColor: order.paymentStatus === "paid" ? "#dcfce7" : "#fef9c3",
                        }}>
                          <Text style={{
                            fontSize: Font.xs, fontWeight: "700",
                            color: order.paymentStatus === "paid" ? "#15803d" : "#854d0e",
                          }}>
                            {order.paymentStatus === "paid" ? "✓ Paid" : "⏳ " + (order.paymentStatus || "pending")}
                          </Text>
                        </View>
                        <Text style={{ color: Colors.primary, fontSize: Font.sm, fontWeight: "700" }}>Details →</Text>
                      </View>
                    </View>

                    {order.status === "out_for_delivery" && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.()
                          nav.navigate("DeliveryRadar", { orderId: order._id })
                        }}
                        style={({ pressed }) => ({
                          marginTop: Spacing.sm,
                          backgroundColor: "#dbeafe",
                          borderRadius: Radius.md,
                          paddingVertical: 10,
                          alignItems: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ color: "#1d4ed8", fontSize: Font.sm, fontWeight: "900" }}>Open Delivery Radar</Text>
                      </Pressable>
                    )}

                    {/* Cancel button for cancellable orders */}
                    {["pending", "accepted"].includes(order.status) && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.()
                          setCancelModal({ orderId: order._id, orderRef: order._id.slice(-6).toUpperCase() })
                        }}
                        style={({ pressed }) => ({
                          marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.danger,
                          borderRadius: Radius.md, paddingVertical: 9, alignItems: "center",
                          opacity: pressed ? 0.7 : 1, backgroundColor: "#fff5f5",
                        })}
                      >
                        <Text style={{ fontSize: Font.sm, fontWeight: "800", color: Colors.danger }}>Cancel Order</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              )
            })
          )}
        </ScrollView>
      )}

      {/* ── Cancel Confirmation Modal ───────────────────────────────────── */}
      <Modal
        visible={!!cancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModal(null)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View style={{
            backgroundColor: Colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: Spacing.xl, paddingBottom: 40,
          }}>
            <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.text, marginBottom: 4 }}>
              Cancel this order?
            </Text>
            <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, marginBottom: Spacing.xl }}>
              Order #{cancelModal?.orderRef} will be cancelled. This cannot be undone.
            </Text>

            <Text style={{ fontSize: Font.xs, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, textTransform: "uppercase", marginBottom: Spacing.md }}>
              Reason (optional)
            </Text>
            {CANCEL_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => setCancelReason(reason)}
                style={({ pressed }) => ({
                  borderWidth: 1.5,
                  borderColor: cancelReason === reason ? Colors.primary : Colors.border,
                  borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.lg,
                  marginBottom: Spacing.sm,
                  backgroundColor: cancelReason === reason ? "#ede9fe" : Colors.bg,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{
                  fontSize: Font.md, fontWeight: "600",
                  color: cancelReason === reason ? Colors.primary : Colors.text,
                }}>{reason}</Text>
              </Pressable>
            ))}

            <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg }}>
              <Pressable
                onPress={() => { setCancelModal(null); setCancelReason("") }}
                style={({ pressed }) => ({
                  flex: 1, borderWidth: 1.5, borderColor: Colors.border,
                  borderRadius: Radius.lg, paddingVertical: 14, alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontWeight: "800", fontSize: Font.md, color: Colors.text }}>Keep Order</Text>
              </Pressable>
              <Pressable
                onPress={handleCancelOrder}
                disabled={cancelling}
                style={({ pressed }) => ({
                  flex: 1, backgroundColor: Colors.danger, borderRadius: Radius.lg,
                  paddingVertical: 14, alignItems: "center",
                  opacity: pressed || cancelling ? 0.7 : 1,
                })}
              >
                {cancelling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.md }}>Yes, Cancel</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
