import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderItem = {
  productId: string
  name?: string
  quantity: number
  price: number
}

type DriverInfo = {
  _id: string
  name: string
  phone?: string
  vehicleType?: string
}

type TrackingPayload = {
  orderId: string
  status: string
  deliveryLocation?: { coordinates?: [number, number] } | null
  customerLocation?: { coordinates?: [number, number] } | null
  etaMinutes?: number | null
  roadEtaMinutes?: number | null
  routePath?: [number, number][] | null
  driver?: DriverInfo | null
  signalStatus?: "active" | "stale" | "missing" | null
  signalAgeMinutes?: number | null
  isDelayed?: boolean
  delayMinutes?: number | null
  lastLocationUpdateAt?: string | null
}

type OrderDetail = {
  _id: string
  status: string
  totalAmount: number
  paymentStatus?: string
  paymentMethod?: string
  createdAt?: string
  deliveryAddress?: string
  items?: OrderItem[]
  storeName?: string
  storeId?: string | { storeName?: string; _id?: string }
  promotionAudit?: {
    campaignId?: string
    couponCode?: string
    campaignName?: string
    discountAmount?: number
    appliedAt?: string
  } | null
  pricingBreakdown?: {
    subtotal?: number
    discountAmount?: number
    finalTotal?: number
  } | null
}

type OrderDetailScreenProps = {
  orderId: string
  onBack: () => void
  withAuth: <T>(path: string, options?: RequestInit) => Promise<T>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, { bg: string; text: string; label: string }> = {
  pending:          { bg: "#fff7ed", text: "#c2410c", label: "Pending" },
  accepted:         { bg: "#eff6ff", text: "#1d4ed8", label: "Accepted" },
  preparing:        { bg: "#f5f3ff", text: "#6d28d9", label: "Preparing" },
  out_for_delivery: { bg: "#ecfeff", text: "#0e7490", label: "Out for delivery" },
  delivered:        { bg: "#ecfdf5", text: "#047857", label: "Delivered" },
  cancelled:        { bg: "#fef2f2", text: "#b91c1c", label: "Cancelled" },
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

const fmtDate = (iso?: string) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const LIVE_STATUSES = new Set(["accepted", "preparing", "out_for_delivery"])

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderDetailScreen({ orderId, onBack, withAuth }: OrderDetailScreenProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [tracking, setTracking] = useState<TrackingPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchOrder = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const data = await withAuth<OrderDetail>(`/api/orders/${orderId}`)
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load order details")
    } finally {
      if (mode === "initial") setLoading(false)
      else setRefreshing(false)
    }
  }

  const fetchTracking = async () => {
    setTrackingLoading(true)
    try {
      const data = await withAuth<TrackingPayload>(`/api/orders/${orderId}/tracking`)
      setTracking(data)
    } catch {
      // silently ignore if tracking unavailable
    } finally {
      setTrackingLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrder()
    void fetchTracking()
  }, [orderId])

  // Poll tracking every 15 s when order is live
  useEffect(() => {
    if (!order) return
    if (!LIVE_STATUSES.has(order.status)) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => { void fetchTracking() }, 15000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [order?.status])

  const onRefresh = async () => {
    await Promise.all([fetchOrder("refresh"), fetchTracking()])
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const storeName =
    typeof order?.storeId === "object"
      ? (order.storeId as { storeName?: string }).storeName || "Unknown store"
      : order?.storeName || "Unknown store"

  const tone = STATUS_TONE[order?.status ?? ""] ?? { bg: "#f3f4f6", text: "#374151", label: order?.status ?? "Unknown" }

  const liveTracking = order && LIVE_STATUSES.has(order.status)
  const signalBad = tracking?.signalStatus === "stale" || tracking?.signalStatus === "missing"

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <Pressable onPress={onBack} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ fontSize: 20, color: "#6366f1" }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", flex: 1 }}>Order Details</Text>
        <Pressable onPress={onRefresh} style={{ padding: 4 }}>
          <Text style={{ fontSize: 16, color: "#6366f1" }}>↻</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>Loading order…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ fontSize: 16, color: "#ef4444", textAlign: "center", marginBottom: 16 }}>{error}</Text>
          <Pressable
            onPress={() => { void fetchOrder() }}
            style={{ backgroundColor: "#6366f1", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      ) : !order ? null : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* Status banner */}
          <View
            style={{
              backgroundColor: tone.bg,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 18,
              marginBottom: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontSize: 12, color: tone.text, marginBottom: 2, fontWeight: "600" }}>STATUS</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: tone.text }}>{tone.label}</Text>
              <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{fmtDate(order.createdAt)}</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: tone.text }}>{fmt(order.totalAmount)}</Text>
          </View>

          {/* Live tracking panel */}
          {liveTracking && (
            <View
              style={{
                backgroundColor: "#eff6ff",
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: "#bfdbfe",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <View
                  style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: signalBad ? "#f59e0b" : "#22c55e",
                    marginRight: 8,
                  }}
                />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#1d4ed8" }}>
                  {signalBad ? "Signal weak — tracking may lag" : "Live tracking active"}
                </Text>
                {trackingLoading && <ActivityIndicator size="small" color="#1d4ed8" style={{ marginLeft: 8 }} />}
              </View>

              {tracking?.driver && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: "#1e40af" }}>
                    🛵  {tracking.driver.name}
                    {tracking.driver.vehicleType ? `  ·  ${tracking.driver.vehicleType}` : ""}
                    {tracking.driver.phone ? `  ·  ${tracking.driver.phone}` : ""}
                  </Text>
                </View>
              )}

              {(tracking?.etaMinutes != null || tracking?.roadEtaMinutes != null) && (
                <Text style={{ fontSize: 13, color: "#1e40af" }}>
                  ⏱  ETA:{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {tracking.roadEtaMinutes ?? tracking.etaMinutes} min
                  </Text>
                  {tracking.isDelayed && (
                    <Text style={{ color: "#dc2626" }}>
                      {" "}·  ~{tracking.delayMinutes} min delayed
                    </Text>
                  )}
                </Text>
              )}

              {tracking?.deliveryLocation?.coordinates && (
                <Text style={{ fontSize: 12, color: "#3b82f6", marginTop: 4 }}>
                  📍 Driver at {tracking.deliveryLocation.coordinates[1].toFixed(4)},{" "}
                  {tracking.deliveryLocation.coordinates[0].toFixed(4)}
                </Text>
              )}
            </View>
          )}

          {/* Store & delivery */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 }}>DELIVERY INFO</Text>
            <Text style={{ fontSize: 14, color: "#111827" }}>🏪  {storeName}</Text>
            {order.deliveryAddress && (
              <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>📦  {order.deliveryAddress}</Text>
            )}
            <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              💳  {order.paymentMethod?.replace(/_/g, " ") ?? "—"}  ·  {order.paymentStatus ?? "—"}
            </Text>
          </View>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: "#e5e7eb",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 10 }}>
                ITEMS ({order.items.length})
              </Text>
              {order.items.map((item, idx) => (
                <View
                  key={item.productId + String(idx)}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 6,
                    borderBottomWidth: idx < order.items!.length - 1 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#111827", flex: 1 }}>
                    {item.name || "Product"}
                    <Text style={{ color: "#6b7280" }}> × {item.quantity}</Text>
                  </Text>
                  <Text style={{ fontSize: 14, color: "#111827", fontWeight: "600" }}>
                    {fmt(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Pricing breakdown */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 10 }}>
              PRICE BREAKDOWN
            </Text>

            {order.pricingBreakdown?.subtotal != null && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 14, color: "#6b7280" }}>Subtotal</Text>
                <Text style={{ fontSize: 14, color: "#111827" }}>{fmt(order.pricingBreakdown.subtotal)}</Text>
              </View>
            )}

            {order.promotionAudit?.discountAmount != null && order.promotionAudit.discountAmount > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 14, color: "#16a34a" }}>
                  🎟  {order.promotionAudit.campaignName || order.promotionAudit.couponCode || "Coupon"}
                </Text>
                <Text style={{ fontSize: 14, color: "#16a34a", fontWeight: "600" }}>
                  −{fmt(order.promotionAudit.discountAmount)}
                </Text>
              </View>
            )}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 8,
                marginTop: 6,
                borderTopWidth: 1,
                borderTopColor: "#e5e7eb",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>Total paid</Text>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>{fmt(order.totalAmount)}</Text>
            </View>
          </View>

          {/* Order ID */}
          <Text style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
            Order ID: {order._id}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
