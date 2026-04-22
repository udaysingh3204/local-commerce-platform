import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator, Modal, Pressable, RefreshControl,
  SafeAreaView, ScrollView, Text, View,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing, STATUS_CONFIG } from "../../theme"
import type { RootNavProp, OrderDetailRouteProp } from "../../navigation/types"

type OrderItem = { productId: string; name?: string; quantity: number; price: number }
type DriverInfo = { _id: string; name: string; phone?: string; vehicleType?: string }
type TrackingPayload = {
  orderId: string; status: string
  deliveryLocation?: { coordinates?: [number, number] } | null
  etaMinutes?: number | null; roadEtaMinutes?: number | null
  driver?: DriverInfo | null
  signalStatus?: "active" | "stale" | "missing" | null
  isDelayed?: boolean; delayMinutes?: number | null
}
type OrderDetail = {
  _id: string; status: string; totalAmount: number
  paymentStatus?: string; paymentMethod?: string; createdAt?: string
  deliveryAddress?: string; items?: OrderItem[]
  storeId?: string | { storeName?: string; _id?: string }
  storeName?: string
  promotionAudit?: { campaignName?: string; couponCode?: string; discountAmount?: number } | null
  pricingBreakdown?: { subtotal?: number; discountAmount?: number; finalTotal?: number } | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

const LIVE_STATUSES = new Set(["accepted", "preparing", "out_for_delivery"])

// Timeline steps
const TIMELINE = [
  { status: "pending", label: "Order Placed", icon: "📝" },
  { status: "accepted", label: "Accepted", icon: "✅" },
  { status: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { status: "out_for_delivery", label: "On the Way", icon: "🛵" },
  { status: "delivered", label: "Delivered", icon: "🎉" },
]
const STATUS_ORDER = ["pending", "accepted", "preparing", "out_for_delivery", "delivered"]

export default function OrderDetailScreenV2() {
  const nav = useNavigation<RootNavProp>()
  const route = useRoute<OrderDetailRouteProp>()
  const { orderId } = route.params
  const { withAuth } = useApp()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [tracking, setTracking] = useState<TrackingPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const CANCEL_REASONS = [
    "Changed my mind",
    "Ordered by mistake",
    "Taking too long",
    "Other",
  ]

  const handleCancelOrder = async () => {
    if (!order) return
    setCancelling(true)
    try {
      await withAuth<unknown>(`/api/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Customer cancelled" }),
      })
      setOrder(prev => prev ? { ...prev, status: "cancelled" } : prev)
      setShowCancelModal(false)
      setCancelReason("")
    } catch { /* ignore – error shown inline */ } finally {
      setCancelling(false)
    }
  }

  const fetchOrder = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true); else setRefreshing(true)
    try {
      const data = await withAuth<OrderDetail>(`/api/orders/${orderId}`)
      setOrder(data)
    } catch { /* ignore */ } finally {
      if (mode === "initial") setLoading(false); else setRefreshing(false)
    }
  }

  const fetchTracking = async () => {
    try { setTracking(await withAuth<TrackingPayload>(`/api/orders/${orderId}/tracking`)) } catch { /* ignore */ }
  }

  useEffect(() => {
    void fetchOrder()
    void fetchTracking()
  }, [orderId])

  useEffect(() => {
    if (!order) return
    if (!LIVE_STATUSES.has(order.status)) { if (pollRef.current) clearInterval(pollRef.current); return }
    pollRef.current = setInterval(() => { void fetchTracking() }, 15000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [order?.status])

  const onRefresh = async () => { await Promise.all([fetchOrder("refresh"), fetchTracking()]) }

  const storeName =
    typeof order?.storeId === "object"
      ? (order.storeId as { storeName?: string }).storeName ?? "Store"
      : order?.storeName ?? "Store"

  const currentStepIdx = order ? STATUS_ORDER.indexOf(order.status) : -1
  const isCancelled = order?.status === "cancelled"
  const s = STATUS_CONFIG[order?.status ?? ""] ?? { bg: "#f3f4f6", text: "#374151", label: order?.status ?? "", icon: "📦" }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{
        backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg, flexDirection: "row", alignItems: "center",
      }}>
        <Pressable onPress={() => nav.goBack()} style={{ marginRight: Spacing.md, padding: 4 }}>
          <Text style={{ fontSize: 22, color: "#fff" }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: Font.lg, fontWeight: "800", color: "#fff", flex: 1 }}>Order Details</Text>
        <Pressable onPress={onRefresh} style={{ padding: 4 }}>
          <Text style={{ fontSize: 18, color: "rgba(255,255,255,0.8)" }}>↻</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 12, color: Colors.textSecondary }}>Loading order…</Text>
        </View>
      ) : !order ? null : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {/* Status card */}
          <View style={{ backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl }}>
            <View style={{
              backgroundColor: "rgba(255,255,255,0.15)", borderRadius: Radius.xl, padding: Spacing.lg,
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            }}>
              <View>
                <Text style={{ fontSize: Font.xs, color: "rgba(255,255,255,0.7)", fontWeight: "700", letterSpacing: 1 }}>
                  ORDER #{order._id.slice(-6).toUpperCase()}
                </Text>
                <Text style={{ fontSize: Font.xxl, fontWeight: "900", color: "#fff", marginTop: 4 }}>{s.icon}  {s.label}</Text>
                <Text style={{ fontSize: Font.sm, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{fmtDate(order.createdAt)}</Text>
              </View>
              <Text style={{ fontSize: Font.xxxl, fontWeight: "900", color: "#fff" }}>{fmt(order.totalAmount)}</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: Spacing.xl, marginTop: -Spacing.xl }}>
            {/* ── Timeline ────────────────────────────────────────────────── */}
            {!isCancelled && (
              <View style={{
                backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.xl,
                marginBottom: Spacing.lg, ...Shadow.md,
              }}>
                <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.text, marginBottom: Spacing.lg }}>
                  Order Progress
                </Text>
                {TIMELINE.map((step, idx) => {
                  const done = currentStepIdx >= idx
                  const active = currentStepIdx === idx
                  return (
                    <View key={step.status} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: idx < TIMELINE.length - 1 ? 0 : 0 }}>
                      <View style={{ alignItems: "center", marginRight: Spacing.md }}>
                        <View style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: done ? Colors.primary : Colors.bgMuted,
                          justifyContent: "center", alignItems: "center",
                          borderWidth: active ? 2 : 0, borderColor: Colors.primaryDark,
                        }}>
                          <Text style={{ fontSize: active ? 16 : 14 }}>{step.icon}</Text>
                        </View>
                        {idx < TIMELINE.length - 1 && (
                          <View style={{ width: 2, height: 28, backgroundColor: done ? Colors.primary : Colors.border }} />
                        )}
                      </View>
                      <View style={{ paddingTop: 7, flex: 1 }}>
                        <Text style={{
                          fontSize: Font.md, fontWeight: active ? "900" : "600",
                          color: done ? Colors.text : Colors.textMuted,
                        }}>{step.label}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {/* ── Live Tracking ────────────────────────────────────────────── */}
            {LIVE_STATUSES.has(order.status) && (
              <View style={{
                backgroundColor: "#eff6ff", borderRadius: Radius.xl, padding: Spacing.lg,
                marginBottom: Spacing.lg, borderWidth: 1, borderColor: "#bfdbfe", ...Shadow.sm,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4, marginRight: 8,
                    backgroundColor: tracking?.signalStatus === "active" ? "#22c55e" : "#f59e0b",
                  }} />
                  <Text style={{ fontSize: Font.md, fontWeight: "800", color: "#1d4ed8" }}>Live Tracking</Text>
                </View>
                {tracking?.driver && (
                  <Text style={{ fontSize: Font.md, color: "#1e40af", marginBottom: 4 }}>
                    🛵  {tracking.driver.name}
                    {tracking.driver.vehicleType ? ` · ${tracking.driver.vehicleType}` : ""}
                  </Text>
                )}
                {(tracking?.etaMinutes ?? tracking?.roadEtaMinutes) != null && (
                  <Text style={{ fontSize: Font.md, color: "#1e40af" }}>
                    ⏱  ETA:{" "}
                    <Text style={{ fontWeight: "900" }}>{tracking?.roadEtaMinutes ?? tracking?.etaMinutes} min</Text>
                    {tracking?.isDelayed && (
                      <Text style={{ color: Colors.danger }}> · ~{tracking.delayMinutes}m delayed</Text>
                    )}
                  </Text>
                )}
                <Pressable
                  onPress={() => nav.navigate("DeliveryRadar", { orderId })}
                  style={({ pressed }) => ({
                    marginTop: Spacing.md,
                    backgroundColor: "#1d4ed8",
                    borderRadius: Radius.full,
                    paddingVertical: 12,
                    paddingHorizontal: Spacing.lg,
                    alignSelf: "flex-start",
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.sm }}>Open Delivery Radar</Text>
                </Pressable>
              </View>
            )}

            {/* ── Delivery Info ───────────────────────────────────────────── */}
            <View style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm }}>
              <Text style={{ fontSize: Font.sm, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
                DELIVERY INFO
              </Text>
              <Text style={{ fontSize: Font.md, color: Colors.text }}>🏪  {storeName}</Text>
              {order.deliveryAddress && (
                <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 4 }}>📦  {order.deliveryAddress}</Text>
              )}
              <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 4 }}>
                💳  {order.paymentMethod?.replace(/_/g, " ") ?? "—"} · {order.paymentStatus ?? "—"}
              </Text>
            </View>

            {/* ── Items ───────────────────────────────────────────────────── */}
            {order.items && order.items.length > 0 && (
              <View style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm }}>
                <Text style={{ fontSize: Font.sm, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
                  ITEMS ({order.items.length})
                </Text>
                {order.items.map((item, idx) => (
                  <View key={item.productId + idx} style={{
                    flexDirection: "row", justifyContent: "space-between", paddingVertical: 8,
                    borderBottomWidth: idx < order.items!.length - 1 ? 1 : 0, borderBottomColor: Colors.border,
                  }}>
                    <Text style={{ fontSize: Font.md, color: Colors.text, flex: 1 }}>
                      {item.name || "Product"}
                      <Text style={{ color: Colors.textSecondary }}> × {item.quantity}</Text>
                    </Text>
                    <Text style={{ fontSize: Font.md, fontWeight: "700", color: Colors.text }}>{fmt(item.price * item.quantity)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Price Breakdown ─────────────────────────────────────────── */}
            <View style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm }}>
              <Text style={{ fontSize: Font.sm, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
                PRICE BREAKDOWN
              </Text>
              {order.pricingBreakdown?.subtotal != null && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: Font.md, color: Colors.textSecondary }}>Subtotal</Text>
                  <Text style={{ fontSize: Font.md, color: Colors.text }}>{fmt(order.pricingBreakdown.subtotal)}</Text>
                </View>
              )}
              {order.promotionAudit?.discountAmount != null && order.promotionAudit.discountAmount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: Font.md, color: Colors.success }}>
                    🎟  {order.promotionAudit.campaignName || order.promotionAudit.couponCode || "Coupon"}
                  </Text>
                  <Text style={{ fontSize: Font.md, color: Colors.success, fontWeight: "700" }}>
                    −{fmt(order.promotionAudit.discountAmount)}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border }}>
                <Text style={{ fontSize: Font.lg, fontWeight: "900", color: Colors.text }}>Total Paid</Text>
                <Text style={{ fontSize: Font.lg, fontWeight: "900", color: Colors.primary }}>{fmt(order.totalAmount)}</Text>
              </View>
            </View>

            <Text style={{ fontSize: Font.xs, color: Colors.textMuted, textAlign: "center" }}>ID: {order._id}</Text>

            {/* ── Cancel Button ───────────────────────────────────────────── */}
            {["pending", "accepted"].includes(order.status) && (
              <Pressable
                onPress={() => setShowCancelModal(true)}
                style={({ pressed }) => ({
                  marginTop: Spacing.xl, borderWidth: 1.5, borderColor: Colors.danger,
                  borderRadius: Radius.lg, paddingVertical: 14, alignItems: "center",
                  opacity: pressed ? 0.7 : 1, backgroundColor: "#fff5f5",
                })}
              >
                <Text style={{ color: Colors.danger, fontWeight: "800", fontSize: Font.md }}>Cancel Order</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Cancel Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={{
          flex: 1, justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.45)",
        }}>
          <View style={{
            backgroundColor: Colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: Spacing.xl, paddingBottom: 40,
          }}>
            <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.text, marginBottom: 4 }}>
              Cancel this order?
            </Text>
            <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, marginBottom: Spacing.xl }}>
              Order #{order?._id.slice(-6).toUpperCase()} will be cancelled. This cannot be undone.
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
                  marginBottom: Spacing.sm, backgroundColor: cancelReason === reason ? "#ede9fe" : Colors.bg,
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
                onPress={() => { setShowCancelModal(false); setCancelReason("") }}
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
