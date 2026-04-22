import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import API from "../api/api"
import { useAuth } from "../context/useAuth"

type ActiveOrder = {
  _id: string
  status: string
  totalAmount: number
}

type TrackingPreview = {
  orderId: string
  status: string
  estimatedDeliveryTime: number | null
  distanceKm: number | null
  routeSource: string | null
  signalStatus: "idle" | "missing" | "stale" | "live"
  signalAgeMinutes: number | null
  delayStatus: "unknown" | "on_time" | "risk" | "delayed"
  delayMinutes: number | null
  isDelayed: boolean
  driver: { name?: string } | null
}

const statusMeta: Record<string, { label: string; color: string }> = {
  accepted: { label: "Accepted", color: "text-sky-300" },
  preparing: { label: "Packing", color: "text-violet-300" },
  out_for_delivery: { label: "On the way", color: "text-emerald-300" },
}

const buildRiskLabel = (entry: TrackingPreview) => {
  if (entry.signalStatus === "missing") return "Courier signal not available yet"
  if (entry.signalStatus === "stale") return `Signal stale for ${entry.signalAgeMinutes ?? 0} min`
  if (entry.isDelayed || entry.delayStatus === "delayed") return `Running ${entry.delayMinutes ?? 0} min late`
  if (entry.delayStatus === "risk") return "ETA slipping slightly"
  return null
}

const getPollDelay = () => (document.visibilityState === "visible" ? 30000 : 90000)

export default function DeliveryRadar() {
  const { user, authReady } = useAuth()
  const [tracking, setTracking] = useState<TrackingPreview[]>([])
  const [loading, setLoading] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied"
    return window.Notification.permission
  })
  const timeoutRef = useRef<number | null>(null)
  const previousStatusesRef = useRef<Record<string, string>>({})
  const previousRiskRef = useRef<Record<string, string>>({})

  const activeCount = tracking.length
  const spotlight = tracking[0] || null

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser notifications are not available here")
      return
    }

    const permission = await window.Notification.requestPermission()
    setNotificationPermission(permission)

    if (permission === "granted") {
      toast.success("Live delivery radar alerts enabled")
    }
  }

  const notifyStatus = (entry: TrackingPreview) => {
    if (!("Notification" in window) || window.Notification.permission !== "granted") return

    const notification = new window.Notification(`Delivery update: ${statusMeta[entry.status]?.label || entry.status}`, {
      body: `${entry.driver?.name || "Courier"} · ${entry.estimatedDeliveryTime ? `${entry.estimatedDeliveryTime} min away` : "Live tracking active"}`,
      tag: `delivery-radar-${entry.orderId}`,
    })

    notification.onclick = () => window.focus()
  }

  const notifyRisk = (entry: TrackingPreview, riskLabel: string) => {
    if (!("Notification" in window) || window.Notification.permission !== "granted") return

    const notification = new window.Notification("Delivery attention needed", {
      body: `${entry.driver?.name || "Courier"} · ${riskLabel}`,
      tag: `delivery-radar-risk-${entry.orderId}`,
    })

    notification.onclick = () => window.focus()
  }

  useEffect(() => {
    if (!authReady || !user?._id) {
      setTracking([])
      return
    }

    let disposed = false

    const load = async () => {
      setLoading(true)

      try {
        const ordersRes = await API.get(`/orders/customer/${user._id}`)
        const activeOrders: ActiveOrder[] = ordersRes.data.filter((order: ActiveOrder) =>
          ["accepted", "preparing", "out_for_delivery"].includes(order.status)
        )

        const trackingResults = await Promise.all(
          activeOrders.slice(0, 3).map(async (order) => {
            const res = await API.get(`/orders/${order._id}/tracking`)
            return res.data as TrackingPreview
          })
        )

        if (disposed) return

        trackingResults.forEach((entry) => {
          const previousStatus = previousStatusesRef.current[entry.orderId]
          const riskLabel = buildRiskLabel(entry)
          const previousRisk = previousRiskRef.current[entry.orderId]

          if (previousStatus && previousStatus !== entry.status) {
            toast.info(`Order ${statusMeta[entry.status]?.label || entry.status}`, {
              description: entry.driver?.name || "Delivery status changed",
            })
            notifyStatus(entry)
          }

          if (riskLabel && previousRisk !== riskLabel) {
            toast.warning("Delivery attention needed", {
              description: riskLabel,
            })
            notifyRisk(entry, riskLabel)
          }

          previousStatusesRef.current[entry.orderId] = entry.status
          previousRiskRef.current[entry.orderId] = riskLabel || ""
        })

        setTracking(trackingResults)
      } catch {
        if (!disposed) {
          setTracking([])
        }
      } finally {
        if (!disposed) {
          setLoading(false)
          timeoutRef.current = window.setTimeout(load, getPollDelay())
        }
      }
    }

    load()

    const onVisibilityChange = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(load, 1000)
    }

    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", onVisibilityChange)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [authReady, user?._id])

  const statusBadge = useMemo(() => {
    if (!spotlight) return null
    return statusMeta[spotlight.status] || { label: spotlight.status.replaceAll("_", " "), color: "text-slate-300" }
  }, [spotlight])
  const spotlightRisk = spotlight ? buildRiskLabel(spotlight) : null

  if (!authReady || !user || activeCount === 0) {
    return null
  }

  return (
    <div className="sticky top-15 z-40 border-b border-violet-200/70 bg-linear-to-r from-slate-950 via-violet-950 to-slate-950 px-4 py-3 text-white shadow-lg shadow-violet-950/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            Delivery Radar
            {loading && <span className="text-violet-300/70">syncing</span>}
          </div>
          {spotlight && statusBadge && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="truncate text-sm font-black">{spotlight.driver?.name || "Courier assigned"}</p>
              <span className={`text-xs font-bold ${statusBadge.color}`}>{statusBadge.label}</span>
              <span className="text-xs text-violet-100/80">{spotlight.estimatedDeliveryTime !== null ? `${spotlight.estimatedDeliveryTime} min` : "Live ETA loading"}</span>
              <span className="text-xs text-violet-100/60">{spotlight.distanceKm !== null ? `${spotlight.distanceKm} km` : "distance updating"}</span>
              {spotlightRisk && (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${spotlight.signalStatus === "stale" || spotlight.signalStatus === "missing" || spotlight.isDelayed ? "bg-amber-300/18 text-amber-100" : "bg-cyan-300/18 text-cyan-100"}`}>
                  {spotlightRisk}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {notificationPermission !== "granted" && (
            <button
              onClick={requestNotifications}
              className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-100 transition hover:bg-violet-400/15"
            >
              Enable Alerts
            </button>
          )}
          <Link
            to="/orders"
            className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/12"
          >
            {activeCount} Active {activeCount === 1 ? "Order" : "Orders"}
          </Link>
          {spotlight && (
            <Link
              to={`/track/${spotlight.orderId}`}
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90"
            >
              Open Live Map
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}