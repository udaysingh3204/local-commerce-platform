import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { io, type Socket } from "socket.io-client"
import API, { BACKEND_ORIGIN } from "../api/api"
import DispatchMap from "../components/DispatchMap"

type LiveLocation = {
  lat: number
  lng: number
  updatedAt: number
}

type DriverScorecard = {
  _id: string
  name: string
  email: string
  isAvailable: boolean
  activeOrders: number
  deliveredOrders: number
  revenueHandled: number
  lastSeenLabel: string
  score: number
}

type DeliveryRisk = {
  id: string
  tone: "critical" | "warning" | "info"
  title: string
  detail: string
  cta: string
  action: () => void
}

const SOCKET_URL = BACKEND_ORIGIN

export default function Delivery() {
  const [searchParams] = useSearchParams()
  const [drivers, setDrivers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null)
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [actionMessage, setActionMessage] = useState<string>("")
  const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({})
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null)
  const [visibleDriverMode, setVisibleDriverMode] = useState<"all" | "available" | "unavailable">("all")
  const [liveOrderLocations, setLiveOrderLocations] = useState<Record<string, LiveLocation>>({})
  const socketRef = useRef<Socket | null>(null)

  const loadDeliveryData = async () => {
    const [driversRes, ordersRes, recommendationsRes] = await Promise.all([
      API.get("/driver/all"),
      API.get("/orders/all"),
      API.get("/orders/dispatch/recommendations?limit=6"),
    ])

    setDrivers(driversRes.data)
    setOrders(ordersRes.data)
    setRecommendations(recommendationsRes.data)
    setLiveOrderLocations((current) => {
      const next: Record<string, LiveLocation> = {}

      ordersRes.data.forEach((order: any) => {
        const liveLocation = order.deliveryLocation
        if (
          order.status === "out_for_delivery" &&
          typeof liveLocation?.lat === "number" &&
          typeof liveLocation?.lng === "number"
        ) {
          next[order._id] = current[order._id] ?? {
            lat: liveLocation.lat,
            lng: liveLocation.lng,
            updatedAt: order.updatedAt ? new Date(order.updatedAt).getTime() : Date.now(),
          }
        }
      })

      return { ...current, ...next }
    })
  }

  useEffect(() => {
    loadDeliveryData()
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const socket = io(SOCKET_URL)
    socketRef.current = socket

    const refreshDeliveryState = () => {
      loadDeliveryData().catch(console.error)
    }

    socket.on("deliveryLocationUpdate", (data: any) => {
      if (!data?.orderId || typeof data?.location?.lat !== "number" || typeof data?.location?.lng !== "number") return

      setLiveOrderLocations((current) => ({
        ...current,
        [data.orderId]: {
          lat: data.location.lat,
          lng: data.location.lng,
          updatedAt: Date.now(),
        },
      }))
    })

    socket.on("driverLocationUpdate", (data: any) => {
      if (!data?.driverId || typeof data?.location?.lat !== "number" || typeof data?.location?.lng !== "number") return

      setDrivers((current) => current.map((driver) => {
        if (driver._id !== data.driverId) return driver

        return {
          ...driver,
          location: {
            type: "Point",
            coordinates: [data.location.lng, data.location.lat],
          },
        }
      }))
    })

    socket.on("deliveryAssigned", refreshDeliveryState)
    socket.on("orderStatusUpdated", refreshDeliveryState)
    socket.on("newOrder", refreshDeliveryState)

    return () => {
      socket.off("deliveryLocationUpdate")
      socket.off("driverLocationUpdate")
      socket.off("deliveryAssigned", refreshDeliveryState)
      socket.off("orderStatusUpdated", refreshDeliveryState)
      socket.off("newOrder", refreshDeliveryState)
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!socketRef.current) return

    orders
      .filter((order) => order.status === "out_for_delivery")
      .forEach((order) => {
        socketRef.current?.emit("joinOrderRoom", order._id)
      })
  }, [orders])

  const activeDeliveries = orders.filter(o => o.status === "out_for_delivery")
  const deliveredOrders  = orders.filter(o => o.status === "delivered")
  const availableDrivers = drivers.filter(d => d.isAvailable)
  const unavailableDrivers = drivers.filter(d => !d.isAvailable)
  const capacityFocus = searchParams.get("focus") === "capacity"
  const activeBacklog = orders.filter(o => ["pending", "accepted", "preparing", "out_for_delivery"].includes(o.status))
  const unassignedOrders = orders.filter(o => ["accepted", "preparing"].includes(o.status) && !o.deliveryPartnerId)
  const pressurePerDriver = useMemo(() => {
    if (!drivers.length) return activeBacklog.length
    return activeBacklog.length / drivers.length
  }, [activeBacklog.length, drivers.length])

  const recommendationOrderIds = useMemo(
    () => new Set(recommendations.map((recommendation) => recommendation.orderId)),
    [recommendations]
  )

  const fallbackOrders = useMemo(
    () => unassignedOrders.filter((order) => !recommendationOrderIds.has(order._id)).slice(0, 6),
    [recommendationOrderIds, unassignedOrders]
  )

  const staleSignalOrders = useMemo(() => {
    const staleCutoff = Date.now() - 5 * 60 * 1000

    return activeDeliveries.filter((order) => {
      const liveSignal = liveOrderLocations[order._id]
      if (!liveSignal) return true
      return liveSignal.updatedAt < staleCutoff
    })
  }, [activeDeliveries, liveOrderLocations])

  const overdueOrders = useMemo(() => {
    const now = Date.now()

    return activeDeliveries.filter((order) => {
      if (!order.deliveryStartTime || !order.estimatedDeliveryTime) return false

      const start = new Date(order.deliveryStartTime).getTime()
      const dueAt = start + (order.estimatedDeliveryTime + 10) * 60 * 1000

      return dueAt < now
    })
  }, [activeDeliveries])

  const preparingUnassignedOrders = useMemo(
    () => unassignedOrders.filter((order) => order.status === "preparing"),
    [unassignedOrders]
  )

  const dispatchRisks = useMemo<DeliveryRisk[]>(() => {
    const risks: DeliveryRisk[] = []

    if (preparingUnassignedOrders.length > 0) {
      const nextOrder = preparingUnassignedOrders[0]
      risks.push({
        id: "ready-unassigned",
        tone: "critical",
        title: "Ready orders are waiting for assignment",
        detail: `${preparingUnassignedOrders.length} preparing orders have no driver attached. These should leave the store first.`,
        cta: "Open queue",
        action: () => setFocusedOrderId(nextOrder._id),
      })
    }

    if (overdueOrders.length > 0) {
      const nextOrder = overdueOrders[0]
      risks.push({
        id: "overdue-deliveries",
        tone: "critical",
        title: "Deliveries are running past ETA",
        detail: `${overdueOrders.length} live deliveries have exceeded their ETA window by more than 10 minutes.`,
        cta: "Review live run",
        action: () => setFocusedOrderId(nextOrder._id),
      })
    }

    if (staleSignalOrders.length > 0) {
      const nextOrder = staleSignalOrders[0]
      risks.push({
        id: "stale-gps",
        tone: "warning",
        title: "Courier GPS needs attention",
        detail: `${staleSignalOrders.length} active deliveries are missing a recent courier beacon from the delivery app.`,
        cta: "Focus map",
        action: () => setFocusedOrderId(nextOrder._id),
      })
    }

    if (availableDrivers.length === 0 && activeBacklog.length > 0) {
      risks.push({
        id: "driver-capacity",
        tone: "warning",
        title: "No drivers are currently free",
        detail: `${activeBacklog.length} active orders are in flight or waiting while every driver is busy or offline.`,
        cta: "Show unavailable",
        action: () => setVisibleDriverMode("unavailable"),
      })
    }

    if (pressurePerDriver >= 2 && drivers.length > 0) {
      risks.push({
        id: "load-pressure",
        tone: "info",
        title: "Fleet pressure is rising",
        detail: `The desk is carrying ${pressurePerDriver.toFixed(1)} active orders per driver. Consider prioritising the closest recommendations.`,
        cta: "View matches",
        action: () => setVisibleDriverMode("available"),
      })
    }

    return risks.slice(0, 4)
  }, [activeBacklog.length, availableDrivers.length, drivers.length, overdueOrders, preparingUnassignedOrders, pressurePerDriver, staleSignalOrders])

  const fleetSnapshot = useMemo(() => {
    const utilization = drivers.length ? Math.round((unavailableDrivers.length / drivers.length) * 100) : 0

    return {
      utilization,
      staleSignals: staleSignalOrders.length,
      overdueRuns: overdueOrders.length,
      readyToDispatch: preparingUnassignedOrders.length,
    }
  }, [drivers.length, overdueOrders.length, preparingUnassignedOrders.length, staleSignalOrders.length, unavailableDrivers.length])

  const displayedDrivers = useMemo(() => {
    if (visibleDriverMode === "available") return availableDrivers
    if (visibleDriverMode === "unavailable") return unavailableDrivers
    return drivers
  }, [availableDrivers, drivers, unavailableDrivers, visibleDriverMode])

  const focusOrder = useMemo(() => (
    orders.find((order) => order._id === focusedOrderId) || null
  ), [focusedOrderId, orders])

  const heroSignals = [
    {
      label: "Dispatch pressure",
      value: drivers.length ? `${pressurePerDriver.toFixed(1)} / driver` : `${activeBacklog.length} waiting`,
      detail: `${activeBacklog.length} orders are active across the delivery funnel.`,
      tone: pressurePerDriver >= 2 ? "text-amber-300" : "text-cyan-300",
    },
    {
      label: "Ready to assign",
      value: preparingUnassignedOrders.length,
      detail: "Preparing orders without a driver should leave the store first.",
      tone: preparingUnassignedOrders.length > 0 ? "text-rose-300" : "text-emerald-300",
    },
    {
      label: "Live map focus",
      value: focusOrder ? `#${focusOrder._id.slice(-8).toUpperCase()}` : "Auto",
      detail: focusOrder ? `${focusOrder.status.replaceAll("_", " ")} · ₹${focusOrder.totalAmount}` : "Workspace will auto-focus the next priority order.",
      tone: "text-violet-300",
    },
  ]

  useEffect(() => {
    if (!focusedOrderId) {
      const nextFocus = activeDeliveries[0]?._id || recommendations[0]?.orderId || unassignedOrders[0]?._id || null
      if (nextFocus) setFocusedOrderId(nextFocus)
    }
  }, [activeDeliveries, focusedOrderId, recommendations, unassignedOrders])

  const buildAssignmentStatus = (currentStatus: string) => {
    if (currentStatus === "preparing") return "preparing"
    return "accepted"
  }

  const assignOrderToDriver = async ({ orderId, status, driverId, estimatedDeliveryTime }: { orderId: string; status: string; driverId: string; estimatedDeliveryTime?: number }) => {
    await API.patch(`/orders/${orderId}/status`, {
      status: buildAssignmentStatus(status),
      driverId,
      ...(typeof estimatedDeliveryTime === "number" ? { estimatedDeliveryTime } : {}),
    })
  }

  const assignTopMatch = async (recommendation: any) => {
    const topCandidate = recommendation.candidates?.[0]
    if (!topCandidate) return

    setAssigningOrderId(recommendation.orderId)
    setActionMessage("")

    try {
      await assignOrderToDriver({
        orderId: recommendation.orderId,
        status: recommendation.status,
        driverId: topCandidate.driverId,
        estimatedDeliveryTime: topCandidate.eta,
      })

      setActionMessage(`Assigned ${topCandidate.driverName} to order #${recommendation.orderId.slice(-6).toUpperCase()}.`)
      setFocusedOrderId(recommendation.orderId)
      await loadDeliveryData()
    } catch (error: any) {
      setActionMessage(error?.response?.data?.message || "Unable to assign the suggested driver right now.")
    } finally {
      setAssigningOrderId(null)
    }
  }

  const assignManualDriver = async (order: any) => {
    const driverId = manualAssignments[order._id] || availableDrivers[0]?._id

    if (!driverId) {
      setActionMessage("No available driver is currently online for manual assignment.")
      return
    }

    const selectedDriver = availableDrivers.find((driver) => driver._id === driverId)

    setAssigningOrderId(order._id)
    setActionMessage("")

    try {
      await assignOrderToDriver({
        orderId: order._id,
        status: order.status,
        driverId,
      })

      setActionMessage(`Assigned ${selectedDriver?.name || "driver"} to order #${order._id.slice(-6).toUpperCase()}.`)
      setFocusedOrderId(order._id)
      await loadDeliveryData()
    } catch (error: any) {
      setActionMessage(error?.response?.data?.message || "Unable to assign the selected driver right now.")
    } finally {
      setAssigningOrderId(null)
    }
  }

  const batchAssignments = useMemo(() => {
    const usedDrivers = new Set<string>()

    return recommendations.reduce<Array<{ orderId: string; status: string; driverId: string; driverName: string; eta?: number }>>((acc, recommendation) => {
      const candidate = recommendation.candidates?.find((entry: any) => !usedDrivers.has(entry.driverId))
      if (!candidate) return acc

      usedDrivers.add(candidate.driverId)
      acc.push({
        orderId: recommendation.orderId,
        status: recommendation.status,
        driverId: candidate.driverId,
        driverName: candidate.driverName,
        eta: candidate.eta,
      })
      return acc
    }, [])
  }, [recommendations])

  const commandActions = [
    {
      label: "Top-match batch",
      title: batchAssignments.length > 0 ? `Assign ${batchAssignments.length} ranked matches` : "No safe batch right now",
      detail: batchAssignments.length > 0 ? "Apply the non-conflicting dispatch recommendations in one pass." : "Recommendations currently overlap on the same drivers or no ranked queue is available.",
      action: () => void assignRecommendedBatch(),
      disabled: bulkAssigning || batchAssignments.length === 0,
      style: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    },
    {
      label: "Fleet filter",
      title: visibleDriverMode === "all" ? "Viewing full fleet" : visibleDriverMode === "available" ? "Viewing available drivers" : "Viewing busy or offline drivers",
      detail: `${displayedDrivers.length} driver${displayedDrivers.length === 1 ? "" : "s"} match the current workspace filter.`,
      action: () => setVisibleDriverMode(visibleDriverMode === "all" ? "available" : visibleDriverMode === "available" ? "unavailable" : "all"),
      disabled: false,
      style: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
    },
  ]

  const assignRecommendedBatch = async () => {
    if (batchAssignments.length === 0) {
      setActionMessage("No non-conflicting recommended driver assignments are available right now.")
      return
    }

    setBulkAssigning(true)
    setActionMessage("")

    let completed = 0

    try {
      for (const assignment of batchAssignments) {
        await assignOrderToDriver({
          orderId: assignment.orderId,
          status: assignment.status,
          driverId: assignment.driverId,
          estimatedDeliveryTime: assignment.eta,
        })
        completed += 1
      }

      setFocusedOrderId(batchAssignments[0]?.orderId || null)
      setActionMessage(`Assigned ${completed} orders using the current top-match queue.`)
      await loadDeliveryData()
    } catch (error: any) {
      setActionMessage(error?.response?.data?.message || `Bulk dispatch stopped after ${completed} successful assignments.`)
      await loadDeliveryData()
    } finally {
      setBulkAssigning(false)
    }
  }

  const driverLeaderboard = useMemo<DriverScorecard[]>(() => {
    return drivers
      .map((driver) => {
        const driverOrders = orders.filter((order) => order.deliveryPartnerId === driver._id)
        const activeDriverOrders = driverOrders.filter((order) => ["accepted", "preparing", "out_for_delivery"].includes(order.status))
        const deliveredDriverOrders = driverOrders.filter((order) => order.status === "delivered")
        const liveDriverOrder = activeDriverOrders.find((order) => liveOrderLocations[order._id])
        const lastSeenTimestamp = liveDriverOrder ? liveOrderLocations[liveDriverOrder._id]?.updatedAt : null
        const revenueHandled = deliveredDriverOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
        const score = (deliveredDriverOrders.length * 12) + (revenueHandled / 100) - (activeDriverOrders.length * 2) + (driver.isAvailable ? 6 : 0)

        return {
          _id: driver._id,
          name: driver.name || "Driver",
          email: driver.email || "",
          isAvailable: Boolean(driver.isAvailable),
          activeOrders: activeDriverOrders.length,
          deliveredOrders: deliveredDriverOrders.length,
          revenueHandled,
          lastSeenLabel: lastSeenTimestamp
            ? new Date(lastSeenTimestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "No live trip",
          score: Math.round(score),
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [drivers, liveOrderLocations, orders])

  const STAT_CARDS = [
    { label: "Total Drivers",     value: drivers.length,          icon: "🚚", color: "text-violet-400",  grad: "from-violet-600 to-purple-700"  },
    { label: "Available",         value: availableDrivers.length, icon: "✅", color: "text-emerald-400", grad: "from-emerald-500 to-teal-600"   },
    { label: "Active Deliveries", value: activeDeliveries.length, icon: "🌀", color: "text-orange-400",  grad: "from-orange-500 to-amber-500"   },
    { label: "Completed",         value: deliveredOrders.length,  icon: "🏁", color: "text-sky-400",     grad: "from-sky-500 to-cyan-500"       },
  ]

  return (
    <div className="p-6 xl:p-8">
      <section className="mb-6 rounded-[32px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(135deg,#08111f_0%,#0b1324_55%,#0d1120_100%)] p-6 shadow-2xl shadow-cyan-950/20 ad-fade-in">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">
              Dispatch command center
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Delivery Management</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Live courier tracking, risk triage, manual override, and ranked dispatch now sit in one operational lane. The page should help the operator decide faster, not just observe more cards.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
            {heroSignals.map((signal) => (
              <div key={signal.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{signal.label}</p>
                <p className={`mt-3 text-3xl font-black ${signal.tone}`}>{signal.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{signal.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 xl:grid-cols-2">
          {commandActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.action}
              disabled={action.disabled}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 ${action.style}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{action.label}</p>
              <p className="mt-2 text-lg font-black text-white">{action.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{action.detail}</p>
            </button>
          ))}
        </div>
      </section>

      {capacityFocus && (
        <div className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">Capacity Focus</p>
          <h2 className="mt-2 text-xl font-black text-white">Driver load needs attention</h2>
          <p className="mt-2 text-sm text-slate-300">
            {activeBacklog.length} active orders across {drivers.length} drivers. Current pressure is {typeof pressurePerDriver === "number" ? pressurePerDriver.toFixed(1) : pressurePerDriver} orders per driver, with {unassignedOrders.length} orders waiting for assignment.
          </p>
        </div>
      )}

      {!!actionMessage && (
        <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {actionMessage}
        </div>
      )}

      {!loading && dispatchRisks.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-rose-400/15 bg-[#0d1120] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-300">Ops Watchlist</p>
                <h2 className="mt-1 text-xl font-black text-white">Delivery issues needing attention now</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">{dispatchRisks.length} live signals</span>
            </div>

            <div className="space-y-3">
              {dispatchRisks.map((risk) => (
                <div key={risk.id} className={`rounded-2xl border px-4 py-4 ${risk.tone === "critical" ? "border-rose-400/20 bg-rose-400/10" : risk.tone === "warning" ? "border-amber-400/20 bg-amber-400/10" : "border-cyan-400/20 bg-cyan-400/10"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-white">{risk.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{risk.detail}</p>
                    </div>
                    <button
                      onClick={risk.action}
                      className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${risk.tone === "critical" ? "bg-rose-500 text-white hover:bg-rose-400" : risk.tone === "warning" ? "bg-amber-400 text-slate-950 hover:bg-amber-300" : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"}`}
                    >
                      {risk.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-[#0d1120] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">Fleet Snapshot</p>
            <h2 className="mt-1 text-xl font-black text-white">Pressure, coverage, and dispatch readiness</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Utilization", value: `${fleetSnapshot.utilization}%`, tone: "text-orange-300" },
                { label: "Stale GPS", value: fleetSnapshot.staleSignals, tone: "text-amber-300" },
                { label: "Overdue Runs", value: fleetSnapshot.overdueRuns, tone: "text-rose-300" },
                { label: "Ready Queue", value: fleetSnapshot.readyToDispatch, tone: "text-emerald-300" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                  <p className={`mt-2 text-2xl font-black ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm text-slate-300">
              {availableDrivers.length} drivers are free, {unavailableDrivers.length} are busy or offline, and {activeBacklog.length} orders are currently inside the delivery funnel.
            </div>
          </div>
        </div>
      )}

      {!loading && (activeDeliveries.length > 0 || recommendations.length > 0 || fallbackOrders.length > 0 || availableDrivers.length > 0) && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-end gap-2">
            {[
              { key: "all", label: "All Drivers" },
              { key: "available", label: "Available" },
              { key: "unavailable", label: "Offline / Busy" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setVisibleDriverMode(option.key as "all" | "available" | "unavailable")}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition ${visibleDriverMode === option.key ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300" : "border-white/10 bg-white/4 text-slate-400 hover:bg-white/6"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <DispatchMap
            activeOrders={activeDeliveries}
            drivers={drivers}
            focusOrderId={focusedOrderId}
            liveOrderLocations={liveOrderLocations}
            orders={unassignedOrders}
            recommendations={recommendations}
            visibleDriverMode={visibleDriverMode}
          />
        </div>
      )}

      {!loading && activeDeliveries.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">Active Tracking</p>
              <h2 className="mt-1 text-xl font-black text-white">Deliveries currently on the road</h2>
            </div>
            <p className="text-xs text-slate-500">Live courier beacons update as drivers share GPS from the delivery app</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {activeDeliveries.map((order) => {
              const liveLocation = liveOrderLocations[order._id]
              const assignedDriver = drivers.find((driver) => driver._id === order.deliveryPartnerId)
              const lastSeenLabel = liveLocation
                ? new Date(liveLocation.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                : "Waiting for GPS"

              return (
                <button
                  key={order._id}
                  type="button"
                  onClick={() => setFocusedOrderId(order._id)}
                  className={`rounded-3xl border bg-[#0d1120] p-5 text-left transition ${focusedOrderId === order._id ? "border-emerald-400/35 ring-1 ring-emerald-400/25" : "border-emerald-400/15 hover:border-emerald-400/25"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                        Live Delivery
                      </div>
                      <h3 className="mt-3 text-lg font-black text-white">Order #{order._id.slice(-8).toUpperCase()}</h3>
                      <p className="mt-1 text-sm text-slate-400">₹{order.totalAmount} · {order.items?.length || 0} items</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">ETA</p>
                      <p className="mt-1 text-sm font-black text-white">{order.estimatedDeliveryTime ? `${order.estimatedDeliveryTime} min` : "Tracking"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Driver</p>
                      <p className="mt-1 font-black text-white">{assignedDriver?.name || "Assigned driver"}</p>
                      <p className="mt-1 text-xs text-slate-400">{assignedDriver?.email || "Driver account"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Last Sync</p>
                      <p className="mt-1 font-black text-white">{lastSeenLabel}</p>
                      <p className="mt-1 text-xs text-slate-400">{liveLocation ? `${liveLocation.lat.toFixed(4)}, ${liveLocation.lng.toFixed(4)}` : "No courier beacon yet"}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">Priority Dispatch</p>
              <h2 className="mt-1 text-xl font-black text-white">Suggested driver matches</h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-500">Ranked by distance and current driver workload</p>
              <button
                onClick={assignRecommendedBatch}
                disabled={bulkAssigning || batchAssignments.length === 0}
                className="rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkAssigning ? "Assigning batch..." : `Assign ${batchAssignments.length} top matches`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {recommendations.map((recommendation) => {
              const topCandidate = recommendation.candidates?.[0]
              return (
                <div key={recommendation.orderId} className={`rounded-3xl border bg-[#0d1120] p-5 cursor-pointer transition ${focusedOrderId === recommendation.orderId ? "border-cyan-400/35 ring-1 ring-cyan-400/25" : "border-cyan-400/15 hover:border-cyan-400/25"}`} onClick={() => setFocusedOrderId(recommendation.orderId)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                        {recommendation.status.replaceAll("_", " ")}
                      </div>
                      <h3 className="mt-3 text-lg font-black text-white">Order #{recommendation.orderId.slice(-8).toUpperCase()}</h3>
                      <p className="mt-1 text-sm text-slate-400">{recommendation.itemCount} items · ₹{recommendation.totalAmount} · {new Date(recommendation.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    {topCandidate && (
                      <button
                        onClick={() => assignTopMatch(recommendation)}
                        disabled={assigningOrderId === recommendation.orderId}
                        className="rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {assigningOrderId === recommendation.orderId ? "Assigning..." : "Assign Top Match"}
                      </button>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {recommendation.candidates.map((candidate: any, index: number) => (
                      <div key={candidate.driverId} className={`rounded-2xl border px-4 py-3 ${index === 0 ? "border-cyan-400/25 bg-cyan-400/10" : "border-white/8 bg-white/4"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-white">{candidate.driverName}</p>
                            <p className="mt-1 text-xs text-slate-400">{candidate.driverEmail || "Driver account"}</p>
                          </div>
                          {index === 0 && (
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                              Best Match
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-xl bg-black/20 px-3 py-2">
                            <p className="text-slate-500">Distance</p>
                            <p className="mt-1 font-black text-white">{candidate.distanceKm} km</p>
                          </div>
                          <div className="rounded-xl bg-black/20 px-3 py-2">
                            <p className="text-slate-500">ETA</p>
                            <p className="mt-1 font-black text-white">{candidate.eta} min</p>
                          </div>
                          <div className="rounded-xl bg-black/20 px-3 py-2">
                            <p className="text-slate-500">Load</p>
                            <p className="mt-1 font-black text-white">{candidate.activeOrders} active</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && fallbackOrders.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">Fallback Dispatch</p>
              <h2 className="mt-1 text-xl font-black text-white">Manual assignment queue</h2>
            </div>
            <p className="text-xs text-slate-500">Use when there is no ranked match or you need to override it</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {fallbackOrders.map((order) => (
              <div key={order._id} className={`rounded-3xl border bg-[#0d1120] p-5 cursor-pointer transition ${focusedOrderId === order._id ? "border-amber-400/35 ring-1 ring-amber-400/25" : "border-amber-400/15 hover:border-amber-400/25"}`} onClick={() => setFocusedOrderId(order._id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                      {order.status.replaceAll("_", " ")}
                    </div>
                    <h3 className="mt-3 text-lg font-black text-white">Order #{order._id.slice(-8).toUpperCase()}</h3>
                    <p className="mt-1 text-sm text-slate-400">{order.items?.length || 0} items · ₹{order.totalAmount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Created</p>
                    <p className="mt-1 text-xs font-semibold text-white">{new Date(order.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <select
                    value={manualAssignments[order._id] || availableDrivers[0]?._id || ""}
                    onChange={(event) => setManualAssignments((current) => ({ ...current, [order._id]: event.target.value }))}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400/40"
                  >
                    {availableDrivers.length === 0 ? (
                      <option value="">No drivers online</option>
                    ) : (
                      availableDrivers.map((driver) => (
                        <option key={driver._id} value={driver._id}>
                          {driver.name} · {driver.email}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    onClick={() => assignManualDriver(order)}
                    disabled={assigningOrderId === order._id || availableDrivers.length === 0}
                    className="rounded-2xl bg-linear-to-r from-amber-400 to-orange-500 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {assigningOrderId === order._id ? "Assigning..." : "Assign Driver"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((s, i) => (
          <div
            key={s.label}
            className="bg-[linear-gradient(180deg,rgba(13,17,32,0.96)_0%,rgba(13,17,32,0.8)_100%)] border border-white/5 rounded-[24px] p-5 ad-count-up ad-card shadow-xl"
            style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
          >
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${s.grad} flex items-center justify-center text-lg mb-4 shadow-lg`}>
              {s.icon}
            </div>
            <p className="text-slate-500 text-xs font-semibold mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Driver Fleet */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-white font-black text-base">Delivery Fleet</h2>
              <p className="mt-1 text-xs text-slate-500">{displayedDrivers.length} of {drivers.length} drivers shown in the current workspace filter.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
              {visibleDriverMode === "all" ? "All drivers" : visibleDriverMode === "available" ? "Available only" : "Busy / offline"}
            </span>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#0d1120] border border-white/5 rounded-2xl p-5 animate-pulse">
                  <div className="w-10 h-10 bg-white/4 rounded-xl mb-3" />
                  <div className="h-3 bg-white/4 rounded-full w-2/3 mb-2" />
                  <div className="h-3 bg-white/4 rounded-full w-1/2" />
                </div>
              ))}
            </div>
          ) : displayedDrivers.length === 0 ? (
            <div className="bg-[#0d1120] border border-white/5 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">🚚</div>
              <p className="text-slate-500">No drivers match the current filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedDrivers.map(d => (
                <div key={d._id} className="bg-[#0d1120] border border-white/5 rounded-2xl p-5 ad-card">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 ${d.isAvailable ? "bg-emerald-700" : "bg-slate-700"}`}>
                      {d.name?.[0]?.toUpperCase() ?? "D"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-sm truncate">{d.name}</p>
                      <p className="text-slate-500 text-xs truncate">{d.email}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0
                      ${d.isAvailable
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-slate-500 bg-white/3 border-white/5"
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${d.isAvailable ? "bg-emerald-400" : "bg-slate-600"}`} />
                      {d.isAvailable ? "Free" : "Busy"}
                    </div>
                  </div>
                  <p className="text-slate-600 text-xs mt-3">
                    Joined {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-fuchsia-300">Driver Leaderboard</p>
              <h2 className="mt-1 text-xl font-black text-white">Who is carrying the delivery network</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">Top {Math.min(driverLeaderboard.length, 6)} drivers</span>
          </div>

          <div className="space-y-3">
            {driverLeaderboard.map((driver, index) => (
              <div key={driver._id} className="rounded-3xl border border-white/8 bg-[#0d1120] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${index === 0 ? "bg-linear-to-br from-fuchsia-500 to-pink-500 text-white" : "bg-white/8 text-slate-200"}`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{driver.name}</p>
                      <p className="truncate text-xs text-slate-500">{driver.email}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${driver.isAvailable ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                    {driver.isAvailable ? "Available" : "Busy"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs xl:grid-cols-4">
                  <div className="rounded-2xl bg-black/20 px-3 py-2">
                    <p className="text-slate-500">Score</p>
                    <p className="mt-1 font-black text-fuchsia-300">{driver.score}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 px-3 py-2">
                    <p className="text-slate-500">Delivered</p>
                    <p className="mt-1 font-black text-white">{driver.deliveredOrders}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 px-3 py-2">
                    <p className="text-slate-500">Active</p>
                    <p className="mt-1 font-black text-white">{driver.activeOrders}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 px-3 py-2">
                    <p className="text-slate-500">Handled</p>
                    <p className="mt-1 font-black text-white">₹{driver.revenueHandled}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">Last live trip signal: {driver.lastSeenLabel}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Deliveries */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-white font-black text-base">Active Deliveries</h2>
          {activeDeliveries.length > 0 && (
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold px-2 py-0.5 rounded-full">
              {activeDeliveries.length} live
            </span>
          )}
        </div>
        <div className="bg-[#0d1120] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["Order ID", "Status", "Amount", "Started"].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDeliveries.map(o => (
                <tr key={o._id} className="border-b border-white/3 ad-table-row">
                  <td className="px-5 py-4 font-mono text-violet-400 text-xs font-bold">#{o._id.slice(-8).toUpperCase()}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border text-orange-400 bg-orange-500/10 border-orange-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      Out for Delivery
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white font-black">₹{o.totalAmount}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {o.deliveryStartTime
                      ? new Date(o.deliveryStartTime).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                </tr>
              ))}
              {activeDeliveries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center">
                    <div className="text-4xl mb-3">🏁</div>
                    <p className="text-slate-500">No active deliveries right now</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
