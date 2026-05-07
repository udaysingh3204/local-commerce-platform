import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"
import { fetchJson, MOBILE_STORAGE_KEYS, createAuthHeaders } from "../lib/shared"
import { API_BASE_URL } from "../config/env"
import { getSecureValue } from "../lib/secureStore"

const c = {
  bg: "#030712",
  card: "#0f172a",
  border: "#1e293b",
  amber: "#f59e0b",
  amberDim: "#fbbf24",
  cyan: "#22d3ee",
  green: "#4ade80",
  red: "#f87171",
  muted: "#64748b",
  sub: "#94a3b8",
  text: "#f8fafc",
  textDim: "#cbd5e1",
} as const

type OrderItem = {
  productId: string
  name: string
  quantity: number
  price: number
}

type OrderDetail = {
  _id: string
  status: string
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  estimatedDeliveryTime?: number
  deliveryAddress?: { line?: string; city?: string; pincode?: string }
  customerLocation?: { lat: number; lng: number }
  storeLocation?: { coordinates?: number[] }
  items: OrderItem[]
  createdAt: string
  pricingBreakdown?: { subtotalAmount?: number; discountAmount?: number; deliveryCharge?: number }
}

const statusTone: Record<string, { bg: string; text: string; label: string }> = {
  accepted:         { bg: "#1e3a8a", text: "#bfdbfe", label: "Accepted" },
  preparing:        { bg: "#312e81", text: "#ddd6fe", label: "Preparing" },
  out_for_delivery: { bg: "#164e63", text: "#a5f3fc", label: "Out for Delivery" },
  delivered:        { bg: "#14532d", text: "#bbf7d0", label: "Delivered" },
  cancelled:        { bg: "#7f1d1d", text: "#fecaca", label: "Cancelled" },
  pending:          { bg: "#78350f", text: "#fde68a", label: "Pending" },
}

const getNextStatus = (s: string) => {
  if (s === "accepted") return "preparing"
  if (s === "preparing") return "out_for_delivery"
  if (s === "out_for_delivery") return "delivered"
  return null
}

const getActionLabel = (s: string) => {
  if (s === "accepted") return "Start Preparing"
  if (s === "preparing") return "Mark Out for Delivery"
  if (s === "out_for_delivery") return "Mark Delivered"
  return null
}

type OrderDetailScreenProps = {
  orderId: string
  onBack: () => void
  onStatusUpdated?: (orderId: string, newStatus: string) => void
}

export default function OrderDetailScreen({ orderId, onBack, onStatusUpdated }: OrderDetailScreenProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getSecureValue(MOBILE_STORAGE_KEYS.driverToken)
      if (!token) throw new Error("Session expired")
      const data = await fetchJson<OrderDetail>(
        API_BASE_URL,
        `/api/orders/${orderId}`,
        { headers: createAuthHeaders(token) }
      )
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [orderId])

  const handleStatusUpdate = async () => {
    if (!order) return
    const nextStatus = getNextStatus(order.status)
    if (!nextStatus) return

    setUpdating(true)
    setUpdateMsg(null)
    try {
      const token = await getSecureValue(MOBILE_STORAGE_KEYS.driverToken)
      await fetchJson<{ status: string }>(
        API_BASE_URL,
        `/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: { ...createAuthHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      )
      setOrder((prev) => prev ? { ...prev, status: nextStatus } : prev)
      setUpdateMsg(`Updated to ${nextStatus.replace(/_/g, " ")}`)
      onStatusUpdated?.(orderId, nextStatus)
    } catch (e) {
      setUpdateMsg(e instanceof Error ? e.message : "Update failed")
    } finally {
      setUpdating(false)
    }
  }

  const tone = order ? (statusTone[order.status] ?? { bg: "#334155", text: "#e2e8f0", label: order.status }) : null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Nav bar */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={onBack} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ color: c.amber, fontSize: 20 }}>←</Text>
        </Pressable>
        <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>
          Order #{orderId.slice(-6).toUpperCase()}
        </Text>
        {tone && (
          <View style={{ marginLeft: "auto", backgroundColor: tone.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: tone.text, fontSize: 11, fontWeight: "800" }}>{tone.label}</Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={c.amber} size="large" />
        </View>
      )}

      {error && (
        <View style={{ margin: 20, backgroundColor: "#450a0a", borderWidth: 1, borderColor: "#7f1d1d", borderRadius: 14, padding: 14 }}>
          <Text style={{ color: c.red }}>{error}</Text>
          <Pressable onPress={() => void load()} style={{ marginTop: 10 }}>
            <Text style={{ color: c.amber, fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      )}

      {order && (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Delivery Address */}
          {order.deliveryAddress && (
            <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: c.muted, marginBottom: 8 }}>DELIVER TO</Text>
              {order.deliveryAddress.line && (
                <Text style={{ color: c.text, fontWeight: "700", fontSize: 14 }}>{order.deliveryAddress.line}</Text>
              )}
              <Text style={{ color: c.sub, marginTop: 2 }}>
                {[order.deliveryAddress.city, order.deliveryAddress.pincode].filter(Boolean).join(" — ")}
              </Text>
            </View>
          )}

          {/* Items */}
          <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: c.muted, marginBottom: 10 }}>
              ITEMS ({order.items.length})
            </Text>
            {order.items.map((item, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "600" }}>{item.name}</Text>
                  <Text style={{ color: c.sub, fontSize: 11 }}>×{item.quantity}</Text>
                </View>
                <Text style={{ color: c.amberDim, fontWeight: "700" }}>₹{Math.round(item.price * item.quantity)}</Text>
              </View>
            ))}
            {order.pricingBreakdown && (
              <View style={{ borderTopWidth: 1, borderTopColor: c.border, marginTop: 8, paddingTop: 8 }}>
                {typeof order.pricingBreakdown.discountAmount === "number" && order.pricingBreakdown.discountAmount > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: c.sub, fontSize: 12 }}>Discount</Text>
                    <Text style={{ color: c.green, fontSize: 12, fontWeight: "700" }}>-₹{Math.round(order.pricingBreakdown.discountAmount)}</Text>
                  </View>
                )}
                {typeof order.pricingBreakdown.deliveryCharge === "number" && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ color: c.sub, fontSize: 12 }}>Delivery fee</Text>
                    <Text style={{ color: c.text, fontSize: 12 }}>₹{Math.round(order.pricingBreakdown.deliveryCharge)}</Text>
                  </View>
                )}
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.border, marginTop: 8, paddingTop: 8 }}>
              <Text style={{ color: c.text, fontWeight: "800" }}>Total</Text>
              <Text style={{ color: c.amber, fontWeight: "900", fontSize: 16 }}>₹{Math.round(order.totalAmount)}</Text>
            </View>
          </View>

          {/* Payment & ETA */}
          <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: c.muted, marginBottom: 10 }}>PAYMENT & TIMING</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.sub, fontSize: 10, fontWeight: "700" }}>METHOD</Text>
                <Text style={{ color: c.text, fontWeight: "700", marginTop: 2, textTransform: "uppercase" }}>{order.paymentMethod}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.sub, fontSize: 10, fontWeight: "700" }}>STATUS</Text>
                <Text style={{ color: order.paymentStatus === "paid" ? c.green : c.amberDim, fontWeight: "700", marginTop: 2, textTransform: "uppercase" }}>
                  {order.paymentStatus}
                </Text>
              </View>
              {order.estimatedDeliveryTime && (
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.sub, fontSize: 10, fontWeight: "700" }}>ETA</Text>
                  <Text style={{ color: c.cyan, fontWeight: "700", marginTop: 2 }}>{order.estimatedDeliveryTime} min</Text>
                </View>
              )}
            </View>
          </View>

          {/* Feedback / update message */}
          {updateMsg && (
            <View style={{ backgroundColor: updating ? "#1e3a5f" : "#052e16", borderWidth: 1, borderColor: updating ? "#1d4ed8" : "#14532d", borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <Text style={{ color: updating ? "#bfdbfe" : c.green, fontWeight: "700" }}>{updateMsg}</Text>
            </View>
          )}

          {/* Action button */}
          {getNextStatus(order.status) && (
            <Pressable
              onPress={() => void handleStatusUpdate()}
              disabled={updating}
              style={{
                backgroundColor: c.amber,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                opacity: updating ? 0.6 : 1,
                marginBottom: 20,
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "900", fontSize: 15 }}>
                {updating ? "Updating…" : getActionLabel(order.status)}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
