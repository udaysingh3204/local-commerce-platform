import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native"
import { createAuthHeaders, fetchJson, MOBILE_STORAGE_KEYS } from "../lib/shared"
import type { AppConfig, DriverStartup, DriverUser } from "../lib/shared"
import { API_BASE_URL } from "../config/env"
import { getSecureValue } from "../lib/secureStore"
import { useGpsTracker } from "../hooks/useGpsTracker"
import OrderDetailScreen from "./OrderDetailScreen"

type DriverHomeScreenProps = {
  appConfig: AppConfig | null
  driver: DriverUser
  startup: DriverStartup
  onLogout: () => Promise<void>
}

const card = {
  borderRadius: 20,
  backgroundColor: "#0f172a",
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#1e293b",
} as const

type DriverOrder = {
  _id: string
  status: string
  totalAmount: number
  estimatedDeliveryTime?: number
  paymentMethod?: string
  items?: { quantity?: number }[]
}

const statusTone: Record<string, { bg: string; text: string; label: string }> = {
  accepted:         { bg: "#1e3a8a", text: "#bfdbfe", label: "Accepted" },
  preparing:        { bg: "#312e81", text: "#ddd6fe", label: "Preparing" },
  out_for_delivery: { bg: "#164e63", text: "#a5f3fc", label: "Out for delivery" },
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
  if (s === "preparing") return "Mark Out For Delivery"
  if (s === "out_for_delivery") return "Mark Delivered"
  return "Update"
}

export default function DriverHomeScreen({ driver, startup, onLogout }: DriverHomeScreenProps) {
  const [orders, setOrders] = useState<DriverOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const disposedRef = useRef(false)

  const hasActiveDelivery = orders.some((o) => o.status === "out_for_delivery")
  useGpsTracker(hasActiveDelivery)

  const fetchOrders = async () => {
    const token = await getSecureValue(MOBILE_STORAGE_KEYS.driverToken)
    if (!token) throw new Error("Session expired")
    const data = await fetchJson<DriverOrder[]>(
      API_BASE_URL,
      `/api/orders?driverId=${driver._id}&includeCompleted=true`,
      { headers: createAuthHeaders(token) }
    )
    setOrders(data.slice(0, 10))
    setLastSyncedAt(new Date())
  }

  const updateStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus)
    if (!nextStatus) return
    setActionLoadingId(orderId)
    setActionError(null)
    setActionMessage(null)
    const snap = orders
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: nextStatus } : o))
    try {
      const token = await getSecureValue(MOBILE_STORAGE_KEYS.driverToken)
      if (!token) throw new Error("Session expired")
      await fetchJson<{ message?: string }>(API_BASE_URL, `/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { ...createAuthHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      setActionMessage(`Moved to ${nextStatus.replace(/_/g, " ")}`)
      setLastSyncedAt(new Date())
    } catch (e) {
      setOrders(snap)
      setActionError(e instanceof Error ? e.message : "Update failed")
    } finally {
      setActionLoadingId(null)
    }
  }

  useEffect(() => {
    disposedRef.current = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try { if (!disposedRef.current) await fetchOrders() }
      catch (e) { if (!disposedRef.current) setLoadError(e instanceof Error ? e.message : "Could not load orders") }
      finally { if (!disposedRef.current) setLoading(false) }
    }
    void load()
    const timer = setInterval(() => { void load() }, 30_000)
    return () => { disposedRef.current = true; clearInterval(timer) }
  }, [driver._id])

  const onRefresh = async () => {
    setRefreshing(true)
    setLoadError(null)
    try { await fetchOrders() }
    catch (e) { setLoadError(e instanceof Error ? e.message : "Refresh failed") }
    finally { setRefreshing(false) }
  }

  // ── Order detail drill-in ────────────────────────────────────────────────
  if (selectedOrderId) {
    return (
      <OrderDetailScreen
        orderId={selectedOrderId}
        onBack={() => setSelectedOrderId(null)}
        onStatusUpdated={(id, status) =>
          setOrders((prev) => prev.map((o) => o._id === id ? { ...o, status } : o))
        }
      />
    )
  }

  const active = orders.filter((o) => ["accepted", "preparing", "out_for_delivery"].includes(o.status))
  const completed = orders.filter((o) => o.status === "delivered")

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#030712" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor="#f59e0b" />}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 2, color: "#f59e0b" }}>
              {hasActiveDelivery ? "📡 GPS ACTIVE" : "DRIVER DASHBOARD"}
            </Text>
            <Text style={{ marginTop: 6, fontSize: 26, fontWeight: "900", color: "#f8fafc" }}>
              Hey, {driver.name?.split(" ")[0] ?? driver.email}
            </Text>
          </View>
          <Pressable onPress={() => void onLogout()} style={{ borderRadius: 999, backgroundColor: "#f59e0b", paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: "#111827", fontWeight: "800" }}>Logout</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={{ ...card, flex: 1, marginBottom: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: "#fbbf24" }}>Active</Text>
            <Text style={{ marginTop: 6, fontSize: 26, fontWeight: "900", color: "#f8fafc" }}>{startup.activeDeliveries}</Text>
          </View>
          <View style={{ ...card, flex: 1, marginBottom: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: "#22d3ee" }}>Completed</Text>
            <Text style={{ marginTop: 6, fontSize: 26, fontWeight: "900", color: "#f8fafc" }}>{startup.completedDeliveries}</Text>
          </View>
        </View>

        {lastSyncedAt && (
          <Text style={{ color: "#475569", fontSize: 11, marginBottom: 12 }}>Last sync: {lastSyncedAt.toLocaleTimeString()}</Text>
        )}

        {/* Active orders */}
        <View style={card}>
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: "#fbbf24" }}>Active Run Queue</Text>
          {loading && (
            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={{ color: "#94a3b8" }}>Syncing orders…</Text>
            </View>
          )}
          {!loading && active.length === 0 && !loadError && (
            <Text style={{ marginTop: 10, color: "#64748b" }}>No active orders right now.</Text>
          )}
          {!loading && active.map((order) => {
            const tone = statusTone[order.status] ?? { bg: "#334155", text: "#e2e8f0", label: order.status }
            const itemCount = order.items?.reduce((s, i) => s + (i.quantity ?? 1), 0) ?? null
            return (
              <View key={order._id} style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: "#1e3a5f", padding: 14, backgroundColor: "#020617" }}>
                <Pressable onPress={() => setSelectedOrderId(order._id)}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: "#f8fafc", fontWeight: "800" }}>#{order._id.slice(-6).toUpperCase()}</Text>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <View style={{ borderRadius: 999, backgroundColor: tone.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ color: tone.text, fontSize: 11, fontWeight: "800" }}>{tone.label}</Text>
                      </View>
                      <Text style={{ color: "#f59e0b", fontSize: 18 }}>›</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                    <Text style={{ color: "#fef3c7", fontWeight: "700" }}>ETA: {order.estimatedDeliveryTime ?? "—"} min</Text>
                    <Text style={{ color: "#94a3b8", fontSize: 12 }}>₹{Math.round(order.totalAmount)}</Text>
                    {itemCount !== null && <Text style={{ color: "#64748b", fontSize: 12 }}>{itemCount} items</Text>}
                  </View>
                </Pressable>
                {getNextStatus(order.status) && (
                  <Pressable
                    onPress={() => void updateStatus(order._id, order.status)}
                    disabled={actionLoadingId === order._id}
                    style={{ marginTop: 12, borderRadius: 12, backgroundColor: "#f59e0b", paddingVertical: 11, alignItems: "center", opacity: actionLoadingId === order._id ? 0.6 : 1 }}
                  >
                    <Text style={{ color: "#111827", fontSize: 12, fontWeight: "900" }}>
                      {actionLoadingId === order._id ? "Updating…" : getActionLabel(order.status)}
                    </Text>
                  </Pressable>
                )}
              </View>
            )
          })}
        </View>

        {loadError && (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#7f1d1d", backgroundColor: "#450a0a", padding: 12, marginBottom: 14 }}>
            <Text style={{ color: "#fecaca" }}>{loadError}</Text>
          </View>
        )}
        {actionError && (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#7f1d1d", backgroundColor: "#450a0a", padding: 12, marginBottom: 14 }}>
            <Text style={{ color: "#fecaca" }}>{actionError}</Text>
          </View>
        )}
        {actionMessage && (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#14532d", backgroundColor: "#052e16", padding: 12, marginBottom: 14 }}>
            <Text style={{ color: "#86efac" }}>{actionMessage}</Text>
          </View>
        )}

        {/* Recent deliveries */}
        <View style={card}>
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: "#fbbf24" }}>Recent Deliveries</Text>
          {!loading && completed.length === 0 && (
            <Text style={{ marginTop: 10, color: "#64748b" }}>Completed deliveries will appear here.</Text>
          )}
          {!loading && completed.slice(0, 5).map((order) => (
            <Pressable key={order._id} onPress={() => setSelectedOrderId(order._id)}
              style={{ marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: "#1e293b", padding: 12, backgroundColor: "#020617" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#f8fafc", fontWeight: "800" }}>#{order._id.slice(-6).toUpperCase()}</Text>
                <Text style={{ color: "#4ade80", fontWeight: "700" }}>₹{Math.round(order.totalAmount)}</Text>
              </View>
              <Text style={{ marginTop: 4, color: "#86efac", fontSize: 12, fontWeight: "700" }}>Delivered ›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}