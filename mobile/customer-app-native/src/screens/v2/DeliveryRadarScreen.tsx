import { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { io, type Socket } from "socket.io-client"
import { API_BASE_URL } from "../../config/env"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing } from "../../theme"
import type { DeliveryRadarRouteProp, RootNavProp } from "../../navigation/types"

type DriverInfo = { _id: string; name?: string; phone?: string; vehicleType?: string }
type Point = { lat: number; lng: number }
type TrackingPayload = {
  orderId: string
  status: string
  totalAmount: number
  createdAt: string
  estimatedDeliveryTime?: number | null
  distanceKm?: number | null
  routePath?: [number, number][]
  routeSource?: string | null
  deliveryStartTime?: string | null
  lastLocationUpdateAt?: string | null
  signalStatus?: "idle" | "missing" | "stale" | "live" | null
  signalAgeMinutes?: number | null
  delayStatus?: "unknown" | "on_time" | "risk" | "delayed"
  delayMinutes?: number | null
  isDelayed?: boolean
  customerLocation?: Point | null
  deliveryLocation?: Point | null
  deliveryAddress?: { line?: string; city?: string; pincode?: string } | null
  driver?: DriverInfo | null
}

const LIVE_STATUSES = new Set(["accepted", "preparing", "out_for_delivery"])
const MAP_W = 320
const MAP_H = 280
const MAP_PAD = 28
const SOCKET_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "")

const statusCopy: Record<string, { eyebrow: string; title: string; note: string }> = {
  pending: {
    eyebrow: "Kitchen gossip pending",
    title: "Store squad just clocked your order.",
    note: "Radar warms up once the order gets accepted and courier motion starts.",
  },
  accepted: {
    eyebrow: "Motion unlocked",
    title: "Your order is in prep orbit.",
    note: "Courier matching and route shaping are live behind the scenes.",
  },
  preparing: {
    eyebrow: "Heat check",
    title: "Packing energy is high and route logic is cooking.",
    note: "Open the radar whenever you want the live lane instead of plain status text.",
  },
  out_for_delivery: {
    eyebrow: "Main character entrance",
    title: "Courier is moving. The drop is officially inbound.",
    note: "This view updates ETA, route shape, and signal health in one place.",
  },
  delivered: {
    eyebrow: "Drop completed",
    title: "Mission cleared. Your order made it home.",
    note: "Replay the trip summary or jump back into the app for the next chaos run.",
  },
}

const fmtMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)

const fmtClock = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--"

function toPoints(tracking: TrackingPayload | null): Point[] {
  if (!tracking) return []

  const route = Array.isArray(tracking.routePath)
    ? tracking.routePath
        .filter((entry) => Array.isArray(entry) && entry.length >= 2)
        .map((entry) => ({ lat: Number(entry[0]), lng: Number(entry[1]) }))
        .filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lng))
    : []

  if (route.length > 1) {
    if (tracking.deliveryLocation) {
      const next = [...route]
      next[0] = tracking.deliveryLocation
      return next
    }
    return route
  }

  const fallback: Point[] = []
  if (tracking.deliveryLocation) fallback.push(tracking.deliveryLocation)
  if (tracking.customerLocation) fallback.push(tracking.customerLocation)
  return fallback
}

function project(points: Point[]) {
  if (points.length === 0) return [] as Array<{ x: number; y: number }>
  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latSpan = Math.max(maxLat - minLat, 0.0015)
  const lngSpan = Math.max(maxLng - minLng, 0.0015)

  return points.map((point) => ({
    x: MAP_PAD + ((point.lng - minLng) / lngSpan) * (MAP_W - MAP_PAD * 2),
    y: MAP_H - MAP_PAD - ((point.lat - minLat) / latSpan) * (MAP_H - MAP_PAD * 2),
  }))
}

function segmentStyle(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const width = Math.max(Math.sqrt(dx * dx + dy * dy), 2)
  const angle = `${Math.atan2(dy, dx)}rad`

  return {
    position: "absolute" as const,
    left: from.x,
    top: from.y,
    width,
    height: 3,
    borderRadius: Radius.full,
    backgroundColor: "#67e8f9",
    transform: [{ translateY: -1.5 }, { rotate: angle }],
    opacity: 0.9,
  }
}

export default function DeliveryRadarScreen() {
  const nav = useNavigation<RootNavProp>()
  const route = useRoute<DeliveryRadarRouteProp>()
  const { orderId } = route.params
  const { withAuth, appConfig } = useApp()
  const [tracking, setTracking] = useState<TrackingPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const fetchTracking = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true)
    else setRefreshing(true)

    try {
      const data = await withAuth<TrackingPayload>(`/api/orders/${orderId}/tracking`)
      setTracking(data)
    } catch {
      setTracking(null)
    } finally {
      if (mode === "initial") setLoading(false)
      else setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchTracking()
  }, [orderId])

  useEffect(() => {
    if (!tracking || !LIVE_STATUSES.has(tracking.status)) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    pollRef.current = setInterval(() => {
      void fetchTracking("refresh")
    }, 12000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [tracking?.status, orderId])

  useEffect(() => {
    if (!tracking || !LIVE_STATUSES.has(tracking.status)) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    const socket = io(SOCKET_ORIGIN, { transports: ["websocket", "polling"] })
    socketRef.current = socket

    const joinEvent = appConfig?.realtime.joinOrderRoomEvent ?? "joinOrderRoom"
    const locationEvent = appConfig?.realtime.orderLocationEvent ?? "deliveryLocationUpdate"
    const statusEvent = appConfig?.realtime.orderStatusEvent ?? "orderStatusUpdated"

    socket.on("connect", () => {
      socket.emit(joinEvent, orderId)
    })

    socket.on(locationEvent, (payload: { orderId?: string; location?: Point }) => {
      if (!payload?.location || payload.orderId !== orderId) return
      setTracking((current) => current
        ? {
            ...current,
            deliveryLocation: payload.location,
            signalStatus: "live",
            signalAgeMinutes: 0,
            lastLocationUpdateAt: new Date().toISOString(),
          }
        : current)
    })

    socket.on(statusEvent, (payload: { orderId?: string; status?: string }) => {
      if (!payload?.status || payload.orderId !== orderId) return
      setTracking((current) => current ? { ...current, status: payload.status ?? current.status } : current)
      void fetchTracking("refresh")
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [appConfig?.realtime.joinOrderRoomEvent, appConfig?.realtime.orderLocationEvent, appConfig?.realtime.orderStatusEvent, orderId, tracking?.status])

  const routePoints = useMemo(() => toPoints(tracking), [tracking])
  const projected = useMemo(() => project(routePoints), [routePoints])

  const courierPoint = projected[0] ?? null
  const homePoint = projected[projected.length - 1] ?? null
  const vibe = useMemo(() => {
    if (!tracking) return { tone: "No signal", color: Colors.warning, body: "Radar is waiting for its next pulse." }
    if (tracking.signalStatus === "missing") return { tone: "Ghost mode", color: Colors.warning, body: "Courier signal is hiding. We’ll keep poking the route feed." }
    if (tracking.signalStatus === "stale") return { tone: "Lagging tea", color: Colors.secondary, body: "Signal is a bit dusty, so route movement may trail reality." }
    if (tracking.isDelayed) return { tone: "Drama alert", color: Colors.danger, body: `Route is running ~${tracking.delayMinutes ?? 0}m late right now.` }
    if (tracking.status === "out_for_delivery") return { tone: "Locked in", color: Colors.success, body: "Courier motion is live and the drop is approaching your pin." }
    return { tone: "Warming up", color: Colors.info, body: "Route logic is active and waiting for the next move." }
  }, [tracking])

  const narrative = tracking ? statusCopy[tracking.status] ?? statusCopy.pending : statusCopy.pending
  const destinationLabel = tracking?.deliveryAddress
    ? [tracking.deliveryAddress.line, tracking.deliveryAddress.city, tracking.deliveryAddress.pincode].filter(Boolean).join(", ")
    : "Your saved drop zone"

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08101d" }}>
      <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg, backgroundColor: "#08101d" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={() => nav.goBack()} style={{ marginRight: Spacing.md, padding: 4 }}>
            <Text style={{ fontSize: 22, color: "#fff" }}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: Font.xs, color: "#7dd3fc", fontWeight: "800", letterSpacing: 1.6 }}>DELIVERY RADAR</Text>
            <Text style={{ fontSize: Font.xl, color: "#fff", fontWeight: "900", marginTop: 2 }}>Map mode, but sassier.</Text>
          </View>
          <Pressable onPress={() => void fetchTracking("refresh")} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: "#dbeafe", fontWeight: "800" }}>Pulse</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#67e8f9" />
          <Text style={{ marginTop: 12, color: "#bfdbfe" }}>Tuning the radar…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void fetchTracking("refresh")} tintColor="#67e8f9" />}
        >
          <View style={{ backgroundColor: "#0f172a", borderRadius: 28, padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadow.lg }}>
            <Text style={{ color: "#fbbf24", fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.4 }}>{narrative.eyebrow}</Text>
            <Text style={{ color: "#fff", fontSize: Font.xxl, fontWeight: "900", marginTop: 8, lineHeight: 30 }}>{narrative.title}</Text>
            <Text style={{ color: "#cbd5e1", fontSize: Font.sm, marginTop: 8, lineHeight: 20 }}>{narrative.note}</Text>

            <View style={{ marginTop: Spacing.xl, borderRadius: 24, backgroundColor: "#020617", padding: Spacing.md, borderWidth: 1, borderColor: "rgba(103,232,249,0.15)" }}>
              (
                <View style={{ height: MAP_H, borderRadius: 20, overflow: "hidden", backgroundColor: "#020817", position: "relative" }}>
                  {[0, 1, 2, 3, 4].map((line) => (
                    <View key={`h-${line}`} style={{ position: "absolute", left: 0, right: 0, top: line * (MAP_H / 4), height: 1, backgroundColor: "rgba(148,163,184,0.12)" }} />
                  ))}
                  {[0, 1, 2, 3, 4, 5].map((line) => (
                    <View key={`v-${line}`} style={{ position: "absolute", top: 0, bottom: 0, left: line * (MAP_W / 5), width: 1, backgroundColor: "rgba(148,163,184,0.08)" }} />
                  ))}

                  {projected.slice(0, -1).map((point, idx) => (
                    <View key={`segment-${idx}`} style={segmentStyle(point, projected[idx + 1])} />
                  ))}

                  {courierPoint ? (
                    <View style={{ position: "absolute", left: courierPoint.x - 16, top: courierPoint.y - 16, alignItems: "center" }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#22d3ee", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#cffafe" }}>
                        <Text style={{ fontSize: 15 }}>🛵</Text>
                      </View>
                      <Text style={{ color: "#67e8f9", fontSize: 10, fontWeight: "800", marginTop: 6 }}>COURIER</Text>
                    </View>
                  ) : null}

                  {homePoint ? (
                    <View style={{ position: "absolute", left: homePoint.x - 16, top: homePoint.y - 16, alignItems: "center" }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f472b6", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fce7f3" }}>
                        <Text style={{ fontSize: 15 }}>🏠</Text>
                      </View>
                      <Text style={{ color: "#f9a8d4", fontSize: 10, fontWeight: "800", marginTop: 6 }}>YOU</Text>
                    </View>
                  ) : null}

                  {!routePoints.length ? (
                    <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
                      <Text style={{ fontSize: 46 }}>🛰️</Text>
                      <Text style={{ color: "#fff", fontSize: Font.lg, fontWeight: "800", marginTop: 12, textAlign: "center" }}>Route data will land here once the trip starts moving.</Text>
                      <Text style={{ color: "#94a3b8", fontSize: Font.sm, marginTop: 8, textAlign: "center" }}>No dead UI. This panel wakes up as soon as customer and courier coordinates exist.</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.lg }}>
            <View style={{ minWidth: "47%", flex: 1, backgroundColor: "#111827", borderRadius: Radius.xl, padding: Spacing.lg }}>
              <Text style={{ color: "#93c5fd", fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.2 }}>ETA ENERGY</Text>
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 6 }}>{tracking?.estimatedDeliveryTime ?? "--"}m</Text>
              <Text style={{ color: "#94a3b8", fontSize: Font.sm, marginTop: 4 }}>Route source: {tracking?.routeSource ?? "local pulse"}</Text>
            </View>
            <View style={{ minWidth: "47%", flex: 1, backgroundColor: "#111827", borderRadius: Radius.xl, padding: Spacing.lg }}>
              <Text style={{ color: "#fca5a5", fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.2 }}>VIBE METER</Text>
              <Text style={{ color: vibe.color, fontSize: 24, fontWeight: "900", marginTop: 6 }}>{vibe.tone}</Text>
              <Text style={{ color: "#cbd5e1", fontSize: Font.sm, marginTop: 4 }}>{vibe.body}</Text>
            </View>
          </View>

          <View style={{ backgroundColor: "#ffffff", borderRadius: 28, padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadow.md }}>
            <Text style={{ fontSize: Font.xs, color: Colors.primary, fontWeight: "800", letterSpacing: 1.3 }}>LIVE FEED</Text>
            <Text style={{ fontSize: Font.xl, color: Colors.text, fontWeight: "900", marginTop: 6 }}>Everything active, zero boring.</Text>

            <View style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
              <View style={{ backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: Spacing.lg }}>
                <Text style={{ color: Colors.textSecondary, fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.1 }}>DESTINATION</Text>
                <Text style={{ color: Colors.text, fontSize: Font.md, fontWeight: "700", marginTop: 6 }}>{destinationLabel}</Text>
              </View>
              <View style={{ backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: Spacing.lg }}>
                <Text style={{ color: Colors.textSecondary, fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.1 }}>COURIER</Text>
                <Text style={{ color: Colors.text, fontSize: Font.md, fontWeight: "700", marginTop: 6 }}>{tracking?.driver?.name ?? "Courier will appear once assigned"}</Text>
                <Text style={{ color: Colors.textSecondary, fontSize: Font.sm, marginTop: 4 }}>
                  {tracking?.driver?.vehicleType ?? "Vehicle syncing"}
                  {tracking?.driver?.phone ? ` · ${tracking.driver.phone}` : ""}
                </Text>
              </View>
              <View style={{ backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: Spacing.lg }}>
                <Text style={{ color: Colors.textSecondary, fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.1 }}>SIGNAL + TIMING</Text>
                <Text style={{ color: Colors.text, fontSize: Font.md, fontWeight: "700", marginTop: 6 }}>
                  Signal {tracking?.signalStatus ?? "idle"}
                  {tracking?.signalAgeMinutes != null ? ` · ${tracking.signalAgeMinutes}m old` : ""}
                </Text>
                <Text style={{ color: tracking?.isDelayed ? Colors.danger : Colors.textSecondary, fontSize: Font.sm, marginTop: 4 }}>
                  {tracking?.isDelayed ? `Delay running at ~${tracking.delayMinutes ?? 0}m` : "Trip timing looks clean right now."}
                </Text>
              </View>
              <View style={{ backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: Spacing.lg }}>
                <Text style={{ color: Colors.textSecondary, fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.1 }}>REALTIME SOURCE</Text>
                <Text style={{ color: Colors.text, fontSize: Font.md, fontWeight: "700", marginTop: 6 }}>
                  {socketRef.current?.connected ? "Socket live in this order room" : "Polling fallback active"}
                </Text>
                <Text style={{ color: Colors.textSecondary, fontSize: Font.sm, marginTop: 4 }}>
                  Live movement uses {appConfig?.realtime.orderLocationEvent ?? "deliveryLocationUpdate"} and keeps the radar warmer than a plain refresh loop.
                </Text>
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: "#1d1634", borderRadius: 28, padding: Spacing.xl, ...Shadow.md }}>
            <Text style={{ color: "#f5d0fe", fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.3 }}>ORDER FLEX</Text>
            <Text style={{ color: "#fff", fontSize: Font.xl, fontWeight: "900", marginTop: 8 }}>Order #{tracking?.orderId.slice(-6).toUpperCase() ?? orderId.slice(-6).toUpperCase()}</Text>
            <Text style={{ color: "#ddd6fe", fontSize: Font.sm, marginTop: 8 }}>Placed at {fmtClock(tracking?.createdAt)} · Last sync {fmtClock(tracking?.lastLocationUpdateAt)}</Text>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", marginTop: Spacing.lg }}>{tracking ? fmtMoney(tracking.totalAmount) : "--"}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}