import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { io } from "socket.io-client"
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet"
import API from "../api/api"
import { BACKEND_ORIGIN } from "../api/api"
import { useParams } from "react-router-dom"
import L from "leaflet"
import confetti from "canvas-confetti"
import { toast } from "sonner"
import "leaflet/dist/leaflet.css"

const socket = io(BACKEND_ORIGIN)

const DEFAULT_CUSTOMER_LOCATION = { lat: 28.6139, lng: 77.209, }

type TrackingSummary = {
  orderId: string
  status: string
  totalAmount: number
  createdAt: string
  estimatedDeliveryTime: number | null
  distanceKm: number | null
  routePath: [number, number][]
  routeSource: string | null
  deliveryStartTime: string | null
  lastLocationUpdateAt: string | null
  signalStatus: "idle" | "missing" | "stale" | "live"
  signalAgeMinutes: number | null
  delayStatus: "unknown" | "on_time" | "risk" | "delayed"
  delayMinutes: number | null
  isDelayed: boolean
  customerLocation: { lat: number; lng: number } | null
  deliveryLocation: { lat: number; lng: number } | null
  deliveryAddress: { line?: string; city?: string; pincode?: string } | null
  driver: { _id: string; name?: string; email?: string } | null
}

const statusDetails: Record<string, { label: string; title: string; message: string }> = {
  pending: {
    label: "Placed",
    title: "Order confirmed",
    message: "The store has received your order and dispatch planning is underway.",
  },
  accepted: {
    label: "Accepted",
    title: "Store accepted",
    message: "Your order is locked in and the team is preparing it for handoff.",
  },
  preparing: {
    label: "Preparing",
    title: "Packing in progress",
    message: "Items are being packed and staged for delivery.",
  },
  out_for_delivery: {
    label: "On the way",
    title: "Courier en route",
    message: "Your driver is moving toward your saved delivery location now.",
  },
  delivered: {
    label: "Delivered",
    title: "Delivered",
    message: "The order has been marked delivered. If anything is off, check with support quickly.",
  },
}

const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
  iconSize: [40, 40],
})

const customerIcon = L.divIcon({
  className: "",
  html: '<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:#111827;color:#fff;font-size:16px;border:2px solid #fff;box-shadow:0 8px 24px rgba(15,23,42,.25)">H</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

type LocationUpdateEvent = {
  orderId: string
  location: { lat: number; lng: number }
}

type StatusUpdateEvent = {
  orderId: string
  status: string
}

function AutoFollow({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap()

  useEffect(() => {
    if (!location) return

    map.flyTo([location.lat, location.lng], 16, {
      animate: true,
      duration: 1.1,
    })
  }, [location, map])

  return null
}

function FitToRoute({ points }: { points: [number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return

    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)))
    map.fitBounds(bounds, { padding: [36, 36] })
  }, [map, points])

  return null
}

export default function TrackOrder() {
  const { orderId } = useParams()

  const [rawLocation, setRawLocation] = useState<{ lat: number; lng: number } | null>(null)
  const smoothLocation = rawLocation

  const [eta, setEta] = useState<number | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [status, setStatus] = useState<string>("pending")
  const [customerLocation, setCustomerLocation] = useState(DEFAULT_CUSTOMER_LOCATION)
  const [routePath, setRoutePath] = useState<[number, number][]>([])
  const [routeSource, setRouteSource] = useState<string | null>(null)
  const [driverName, setDriverName] = useState<string>("Delivery partner")
  const [driverEmail, setDriverEmail] = useState<string>("")
  const [addressLabel, setAddressLabel] = useState<string>("Preparing route...")
  const [orderTotal, setOrderTotal] = useState<number | null>(null)
  const [createdAtLabel, setCreatedAtLabel] = useState<string>("")
  const [lastSyncAt, setLastSyncAt] = useState<string>("")
  const [signalStatus, setSignalStatus] = useState<TrackingSummary["signalStatus"]>("idle")
  const [signalAgeMinutes, setSignalAgeMinutes] = useState<number | null>(null)
  const [delayStatus, setDelayStatus] = useState<TrackingSummary["delayStatus"]>("unknown")
  const [delayMinutes, setDelayMinutes] = useState<number | null>(null)
  const [isDelayed, setIsDelayed] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied"
    return window.Notification.permission
  })
  const lastRouteRefreshRef = useRef(0)
  const previousStatusRef = useRef<string | null>(null)

  const statusSteps = ["pending", "accepted", "preparing", "out_for_delivery", "delivered"]
  const statusLabels: Record<string, string> = {
    pending: "Placed",
    accepted: "Accepted",
    preparing: "Preparing",
    out_for_delivery: "On the way",
    delivered: "Delivered",
  }

  const shareLink = `${window.location.origin}/track/${orderId}`
  const routePoints = useMemo<[number, number][]>(() => {
    if (routePath.length > 0) return routePath
    if (smoothLocation) {
      return [
        [smoothLocation.lat, smoothLocation.lng],
        [customerLocation.lat, customerLocation.lng],
      ]
    }
    return [[customerLocation.lat, customerLocation.lng]]
  }, [customerLocation.lat, customerLocation.lng, routePath, smoothLocation])
  const statusIndex = Math.max(statusSteps.indexOf(status), 0)

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    toast.success("Tracking link copied")
  }

  const requestNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not available here")
      return
    }

    const permission = await window.Notification.requestPermission()
    setNotificationPermission(permission)

    if (permission === "granted") {
      toast.success("Delivery notifications enabled")
    } else {
      toast.error("Notifications stay off until permission is granted")
    }
  }

  const notifyStatusChange = useCallback((nextStatus: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (window.Notification.permission !== "granted") return

    const detail = statusDetails[nextStatus] ?? statusDetails.pending
    const notification = new window.Notification(`Order ${detail.label}`, {
      body: detail.message,
      tag: `order-${orderId}-status`,
    })

    notification.onclick = () => window.focus()
  }, [orderId])

  const loadTracking = useCallback(async (force = false) => {
    if (!orderId) return

    const now = Date.now()
    if (!force && now - lastRouteRefreshRef.current < 12000) return

    lastRouteRefreshRef.current = now

    try {
      const res = await API.get<TrackingSummary>(`/orders/${orderId}/tracking`)
      const summary = res.data

      setStatus(summary.status)
      setEta(summary.estimatedDeliveryTime)
      setDistanceKm(summary.distanceKm)
      setRoutePath(summary.routePath || [])
      setRouteSource(summary.routeSource)
      setDriverName(summary.driver?.name || "Delivery partner")
      setDriverEmail(summary.driver?.email || "")
      setOrderTotal(summary.totalAmount)
      setCreatedAtLabel(new Date(summary.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }))
      setLastSyncAt(summary.lastLocationUpdateAt
        ? new Date(summary.lastLocationUpdateAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "")
      setSignalStatus(summary.signalStatus)
      setSignalAgeMinutes(summary.signalAgeMinutes)
      setDelayStatus(summary.delayStatus)
      setDelayMinutes(summary.delayMinutes)
      setIsDelayed(summary.isDelayed)

      if (previousStatusRef.current && previousStatusRef.current !== summary.status) {
        notifyStatusChange(summary.status)
      }

      previousStatusRef.current = summary.status

      if (summary.customerLocation) setCustomerLocation(summary.customerLocation)
      if (summary.deliveryLocation) setRawLocation(summary.deliveryLocation)

      if (summary.deliveryAddress) {
        const label = [summary.deliveryAddress.line, summary.deliveryAddress.city, summary.deliveryAddress.pincode]
          .filter(Boolean)
          .join(", ")
        setAddressLabel(label || "Live delivery destination")
      } else {
        setAddressLabel("Live delivery destination")
      }
    } catch {
      setAddressLabel("Unable to load route details right now")
    }
  }, [notifyStatusChange, orderId])

  useEffect(() => {
    if (!orderId) return

    const loadTimer = window.setTimeout(() => {
      void loadTracking(true)
    }, 0)

    socket.emit("joinOrderRoom", orderId)

    socket.on("deliveryLocationUpdate", (data: LocationUpdateEvent) => {
      if (data.orderId !== orderId) return
      setRawLocation(data.location)
      void loadTracking(false)
    })

    socket.on("orderStatusUpdated", (data: StatusUpdateEvent) => {
      if (data.orderId !== orderId) return

      setStatus(data.status)
      void loadTracking(true)

      if (data.status === "out_for_delivery") {
        toast.info("Rider is on the way")
      }

      if (data.status === "delivered") {
        toast.success("Order delivered")
        confetti()
      }

      if (previousStatusRef.current && previousStatusRef.current !== data.status) {
        notifyStatusChange(data.status)
      }

      previousStatusRef.current = data.status
    })

    return () => {
      window.clearTimeout(loadTimer)
      socket.off("deliveryLocationUpdate")
      socket.off("orderStatusUpdated")
    }
  }, [loadTracking, notifyStatusChange, orderId])

  const attentionCard = useMemo(() => {
    if (signalStatus === "missing") {
      return {
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        label: "Signal pending",
        detail: "The courier has not started broadcasting location yet. Tracking should catch up once the delivery app syncs.",
      }
    }

    if (signalStatus === "stale") {
      return {
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        label: "Signal stale",
        detail: `The last courier location update was ${signalAgeMinutes ?? 0} minutes ago.`,
      }
    }

    if (isDelayed || delayStatus === "delayed") {
      return {
        tone: "border-rose-200 bg-rose-50 text-rose-700",
        label: "Delivery running late",
        detail: `The trip is currently about ${delayMinutes ?? 0} minutes behind the planned ETA.`,
      }
    }

    if (delayStatus === "risk") {
      return {
        tone: "border-cyan-200 bg-cyan-50 text-cyan-700",
        label: "ETA at risk",
        detail: "The courier is still moving, but the schedule is starting to slip.",
      }
    }

    return null
  }, [delayMinutes, delayStatus, isDelayed, signalAgeMinutes, signalStatus])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">Live Tracking</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Track your order in real time</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">Follow the courier, route ETA, and delivery progress without leaving the order flow.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {notificationPermission !== "granted" && (
                <button
                  onClick={requestNotifications}
                  className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                  Enable alerts
                </button>
              )}
              <button
                onClick={copyLink}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Share tracking link
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Route View</p>
                  <p className="mt-1 text-sm text-slate-500">{addressLabel}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Last Sync</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{lastSyncAt || "Waiting"}</p>
                </div>
              </div>
            </div>

            <div className="h-[55vh] min-h-105 bg-slate-100">
              <MapContainer center={[customerLocation.lat, customerLocation.lng]} zoom={15} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitToRoute points={routePoints} />

                {smoothLocation && (
                  <>
                    <Marker position={[smoothLocation.lat, smoothLocation.lng]} icon={driverIcon} />
                    <Polyline positions={routePoints} pathOptions={{ color: routeSource === "road" ? "#2563eb" : "#64748b", weight: 6, opacity: 0.85 }} />
                    <AutoFollow location={smoothLocation} />
                  </>
                )}

                <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon} />
              </MapContainer>
            </div>
          </div>

          <div className="space-y-6">
            {attentionCard && (
              <div className={`rounded-3xl border p-5 shadow-sm ${attentionCard.tone}`}>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em]">Delivery Attention</p>
                <h2 className="mt-2 text-xl font-black">{attentionCard.label}</h2>
                <p className="mt-2 text-sm opacity-90">{attentionCard.detail}</p>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Courier Snapshot</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">{driverName}</h2>
              {driverEmail && <p className="mt-1 text-sm text-slate-500">{driverEmail}</p>}

              <div className="mt-4 grid grid-cols-2 gap-3">
                {orderTotal !== null && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Order Total</p>
                    <p className="mt-2 text-lg font-black text-slate-900">₹{orderTotal}</p>
                  </div>
                )}
                {distanceKm !== null && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Distance</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{distanceKm} km</p>
                  </div>
                )}
                {eta !== null && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">ETA</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{eta} min</p>
                  </div>
                )}
                {routeSource && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Route Type</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{routeSource === "road" ? "Road ETA" : "Local ETA"}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Signal</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{signalStatus === "live" ? "Live" : signalStatus === "stale" ? "Stale" : signalStatus === "missing" ? "Pending" : "Idle"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Order Progress</p>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{statusDetails[status]?.label ?? statusDetails.pending.label}</p>
                <p className="mt-2 text-lg font-black text-slate-900">{statusDetails[status]?.title ?? statusDetails.pending.title}</p>
                <p className="mt-2 text-sm text-slate-500">{statusDetails[status]?.message ?? statusDetails.pending.message}</p>
                {createdAtLabel && <p className="mt-3 text-xs text-slate-400">Placed {createdAtLabel}</p>}
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2">
                {statusSteps.map((step, index) => {
                  const active = statusIndex >= index

                  return (
                    <div key={step} className="text-center">
                      <div className={`mx-auto mb-2 h-3.5 w-3.5 rounded-full ${active ? "bg-green-500" : "bg-slate-300"}`} />
                      <p className={`text-[11px] font-semibold ${active ? "text-slate-900" : "text-slate-400"}`}>{statusLabels[step]}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
