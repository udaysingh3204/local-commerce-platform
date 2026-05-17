import { useCallback, useEffect, useState } from "react"
import API, { BACKEND_ORIGIN } from "../api/api"
import LocationSender from "./LocationSender"
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client"
import { toast } from "sonner"

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  accepted: "bg-blue-900/40 text-blue-400 border-blue-800",
  preparing: "bg-purple-900/40 text-purple-300 border-purple-800",
  out_for_delivery: "bg-orange-900/40 text-orange-400 border-orange-800",
  delivered: "bg-green-900/40 text-green-400 border-green-800",
}

type OrderItem = {
  name: string
  quantity: number
}

type DeliveryOrder = {
  _id: string
  status: string
  totalAmount: number
  updatedAt: string
  deliveryPartnerId?: string | null
  items?: OrderItem[]
}

type DriverProfile = {
  _id?: string
  name?: string
  email?: string
  isAvailable?: boolean
}

type DriverStartup = {
  activeDeliveries?: number
  completedDeliveries?: number
}

type DriverInsights = {
  summary: {
    activeCount: number
    deliveredCount: number
    todayDeliveredCount: number
    weekDeliveredCount: number
    todayEarnings: number
    weekEarnings: number
    totalEarnings: number
    avgOrderValue: number
    avgDeliveryMinutes: number | null
    onTimeRate: number | null
    statusBreakdown: {
      accepted: number
      preparing: number
      out_for_delivery: number
    }
  }
}

type DeliveryAssignedEvent = {
  driverId: string
  orderId: string
}

export default function Deliveries() {
  const [openOrders, setOpenOrders] = useState<DeliveryOrder[]>([])
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrder[]>([])
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [driver, setDriver] = useState<DriverProfile>(() => {
    try {
      return JSON.parse(localStorage.getItem("driver") || "{}") as DriverProfile
    } catch {
      return {}
    }
  })
  const [driverStartup] = useState<DriverStartup>(() => {
    try {
      return JSON.parse(localStorage.getItem("driverBootstrap") || "{}") as DriverStartup
    } catch {
      return {}
    }
  })
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false)
  const [insights, setInsights] = useState<DriverInsights | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem("driver")) navigate("/login")
  }, [navigate])

  const syncDriver = (nextDriver: DriverProfile) => {
    setDriver(nextDriver)
    localStorage.setItem("driver", JSON.stringify(nextDriver))
  }

  const fetchWorkspace = useCallback(async () => {
    try {
      const currentDriver = JSON.parse(localStorage.getItem("driver") || "{}") as DriverProfile
      const [assignedRes, availableRes, insightsRes] = await Promise.all([
        currentDriver?._id ? API.get(`/orders?driverId=${currentDriver._id}&includeCompleted=true`) : Promise.resolve({ data: [] }),
        API.get("/orders"),
        currentDriver?._id ? API.get("/driver/me/insights") : Promise.resolve({ data: null }),
      ])

      const assignedOrders: DeliveryOrder[] = Array.isArray(assignedRes.data) ? assignedRes.data : []
      const availableOrders: DeliveryOrder[] = Array.isArray(availableRes.data) ? availableRes.data : []
      const liveOrder = assignedOrders.find((order) => ["pending", "accepted", "preparing", "out_for_delivery"].includes(order.status)) || null
      const deliveredOrders = assignedOrders.filter((order) => order.status === "delivered")

      setActiveOrder(liveOrder)
      setCompletedOrders(deliveredOrders)
      setOpenOrders(availableOrders.filter((order) => order._id !== liveOrder?._id))
      setInsights(insightsRes.data?.insights || null)

      if (currentDriver?._id) {
        syncDriver({
          ...currentDriver,
          isAvailable: liveOrder ? false : Boolean(currentDriver.isAvailable ?? true),
        })
      }
    } catch {
      // keep the current UI state when the backend is temporarily unavailable
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkspace()
  }, [fetchWorkspace])

  const today = new Date().toDateString()
  const todayDeliveries = completedOrders.filter((order) => new Date(order.updatedAt).toDateString() === today)
  const todayEarnings = todayDeliveries.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalEarnings = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const averageOrderValue = completedOrders.length ? Math.round(totalEarnings / completedOrders.length) : 0
  const liveSummary = insights?.summary
  const queuePressure = openOrders.length >= 6 ? "Heavy" : openOrders.length >= 3 ? "Warm" : "Calm"
  const heroSignals = [
    { label: "Queue pressure", value: queuePressure, tone: queuePressure === "Heavy" ? "text-amber-300" : queuePressure === "Warm" ? "text-cyan-300" : "text-emerald-300" },
    { label: "Road pace", value: liveSummary?.avgDeliveryMinutes ? `${liveSummary.avgDeliveryMinutes} min` : "Learning", tone: "text-orange-300" },
    { label: "On-time score", value: `${liveSummary?.onTimeRate ?? 0}%`, tone: "text-fuchsia-300" },
  ]

  const acceptOrder = async (orderId: string) => {
    try {
      const currentDriver = JSON.parse(localStorage.getItem("driver") || "{}") as DriverProfile
      await API.patch(`/orders/${orderId}/status`, { status: "accepted", driverId: currentDriver._id })
      const selected = openOrders.find((order) => order._id === orderId)
      syncDriver({ ...currentDriver, isAvailable: false })
      setActiveOrder(selected ? { ...selected, status: "accepted", deliveryPartnerId: currentDriver._id } : null)
      setOpenOrders((prev) => prev.filter((order) => order._id !== orderId))
      toast.success("Order accepted and moved to your active lane")
    } catch {
      toast.error("Failed to accept order")
    }
  }

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await API.patch(`/orders/${orderId}/status`, { status })
      if (status === "delivered") {
        syncDriver({ ...driver, isAvailable: true })
        setActiveOrder(null)
        void fetchWorkspace()
        toast.success("Delivery complete and earnings updated")
      } else {
        toast.success("Status updated")
        setActiveOrder((prev) => (prev ? { ...prev, status } : null))
      }
    } catch {
      toast.error("Failed to update status")
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("driverToken")
    const socket = io(BACKEND_ORIGIN, { auth: { token }, autoConnect: false })
    socket.connect()

    socket.on("newOrder", (order) => {
      if (!order.deliveryPartnerId) {
        setOpenOrders((prev) => [order, ...prev.filter((existing) => existing._id !== order._id)])
      }
    })

    socket.on("deliveryAssigned", (data: DeliveryAssignedEvent) => {
      const currentDriver = JSON.parse(localStorage.getItem("driver") || "{}") as DriverProfile
      if (data.driverId === currentDriver._id) {
        toast("New order assigned", { description: `Order #${data.orderId.slice(-6)}` })
        syncDriver({ ...currentDriver, isAvailable: false })
        void fetchWorkspace()
      }
    })

    return () => {
      socket.off("newOrder")
      socket.off("deliveryAssigned")
      socket.disconnect()
    }
  }, [fetchWorkspace])

  const toggleAvailability = async () => {
    if (!driver?._id || activeOrder) return

    setAvailabilityUpdating(true)
    try {
      const res = await API.patch("/driver/me/availability", {
        isAvailable: !driver.isAvailable,
      })

      syncDriver(res.data.driver)
      toast.success(res.data.driver.isAvailable ? "You are live for new orders" : "You are offline for new orders")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to update availability"
      toast.error(message)
    } finally {
      setAvailabilityUpdating(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("driver")
    localStorage.removeItem("driverToken")
    localStorage.removeItem("driverBootstrap")
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-lg font-black text-gray-950">
            LM
          </div>
          <div>
            <p className="font-black text-white text-sm">{driver.name ?? "Driver"}</p>
            <p className="text-gray-500 text-xs">{driver.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAvailability}
            disabled={availabilityUpdating || Boolean(activeOrder)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${driver.isAvailable ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {availabilityUpdating ? "Updating..." : activeOrder ? "On Delivery" : driver.isAvailable ? "Online" : "Offline"}
          </button>
          <button
            onClick={() => navigate("/earnings")}
            className="bg-gray-800 hover:bg-gray-700 text-yellow-400 px-3 py-2 rounded-xl text-xs font-bold transition border border-gray-700"
          >
            Earnings
          </button>
          <button
            onClick={logout}
            className="bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 px-3 py-2 rounded-xl text-xs font-bold transition border border-gray-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6 rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_30%),linear-gradient(135deg,#111827_0%,#0f172a_55%,#1f2937_100%)] p-6 shadow-2xl shadow-orange-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-300">Driver Workspace</p>
              <h1 className="mt-2 text-3xl font-black text-white">Stay on top of open dispatch and live deliveries</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">This workspace keeps active work, open queue, completed jobs, and GPS sync in one place so you can move through the delivery loop without losing context.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Today", value: `₹${liveSummary?.todayEarnings ?? todayEarnings}`, tone: "text-yellow-300" },
                { label: "Open Queue", value: openOrders.length, tone: "text-white" },
                { label: "Completed", value: liveSummary?.deliveredCount ?? completedOrders.length, tone: "text-emerald-300" },
                { label: "Avg Ticket", value: `₹${liveSummary?.avgOrderValue ?? averageOrderValue}`, tone: "text-cyan-300" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                  <p className={`mt-2 text-2xl font-black ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {heroSignals.map((signal) => (
              <div key={signal.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{signal.label}</p>
                <p className={`mt-2 text-2xl font-black ${signal.tone}`}>{signal.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Lifetime Delivered</p>
            <p className="text-2xl font-black text-yellow-400 mt-1">₹{totalEarnings}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Available Orders</p>
            <p className="text-2xl font-black text-white mt-1">{openOrders.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Active Delivery</p>
            <p className="text-2xl font-black text-orange-400 mt-1">{activeOrder ? 1 : 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Driver Status</p>
            <p className={`text-2xl font-black mt-1 ${driver.isAvailable ? "text-emerald-300" : "text-slate-300"}`}>{driver.isAvailable ? "Online" : "Busy"}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <span className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-300">
            {liveSummary?.activeCount ?? driverStartup.activeDeliveries ?? 0} active deliveries
          </span>
          <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
            {liveSummary?.deliveredCount ?? driverStartup.completedDeliveries ?? 0} completed deliveries
          </span>
          <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300">
            ₹{liveSummary?.weekEarnings ?? 0} earned this week
          </span>
          <span className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-bold text-fuchsia-300">
            {liveSummary?.onTimeRate ?? 0}% on-time performance
          </span>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-cyan-500/15 bg-cyan-500/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">Focus lane</p>
            <h3 className="mt-2 text-xl font-black text-white">{activeOrder ? `Order #${activeOrder._id.slice(-8).toUpperCase()} is your live priority.` : "No active run is blocking you right now."}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{activeOrder ? "Use the status buttons below to move this order cleanly from pickup to doorstep without leaving the workspace." : "Stay online and keep the queue open. The next high-signal assignment will land here or through live dispatch."}</p>
          </div>
          <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Today’s output</p>
            <h3 className="mt-2 text-xl font-black text-white">{todayDeliveries.length} completed drop{todayDeliveries.length === 1 ? "" : "s"}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">You have already moved ₹{todayEarnings} through the delivery lane today. Keep the active queue healthy and the payout curve will follow.</p>
          </div>
          <div className="rounded-3xl border border-fuchsia-500/15 bg-fuchsia-500/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">Ops note</p>
            <h3 className="mt-2 text-xl font-black text-white">{driver.isAvailable ? "You are visible for new dispatch." : activeOrder ? "Availability is locked to your current run." : "You are offline to dispatch."}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">The system now reflects queue mix, availability, and earnings together so you can judge shift quality instead of just watching a list update.</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 mb-6 flex items-center gap-2 text-sm text-gray-300">
          <div className={`w-2 h-2 rounded-full ${driver.isAvailable ? "bg-green-500 animate-pulse" : "bg-slate-500"}`} />
          <LocationSender orderId={activeOrder?._id} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-0.5 bg-linear-to-r from-yellow-400 via-orange-500 to-transparent" />
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-300">My Current Run</p>
                  <h2 className="mt-1 text-xl font-black text-white">{activeOrder ? `Order #${activeOrder._id.slice(-8).toUpperCase()}` : "No active delivery yet"}</h2>
                </div>
                {activeOrder && (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${STATUS_COLORS[activeOrder.status] ?? STATUS_COLORS.accepted}`}>
                    {activeOrder.status?.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {activeOrder ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Amount</p>
                      <p className="mt-2 text-2xl font-black text-white">₹{activeOrder.totalAmount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Items</p>
                      <p className="mt-2 text-2xl font-black text-white">{activeOrder.items?.length || 0}</p>
                    </div>
                  </div>

                  {activeOrder.items && activeOrder.items.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {activeOrder.items.slice(0, 4).map((item: OrderItem, index: number) => (
                        <span key={index} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-slate-300">
                          {item.name} x{item.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(activeOrder._id, "out_for_delivery")}
                      className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-3 rounded-xl font-bold text-sm transition"
                    >
                      Start delivery
                    </button>
                    <button
                      onClick={() => updateStatus(activeOrder._id, "delivered")}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-sm transition"
                    >
                      Mark delivered
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-xl font-black text-orange-300">GO</div>
                  <p className="text-lg font-black text-white">You are ready for the next dispatch</p>
                  <p className="mt-2 text-sm text-slate-400">Accept an order from the open queue below or stay online for live assignments from the admin desk.</p>
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">Open Dispatch Pool</p>
                  <h2 className="mt-1 text-xl font-black text-white">Orders waiting for a rider</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">{openOrders.length} open</span>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-slate-500">Loading dispatch queue...</div>
              ) : openOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-10 text-center">
                  <p className="text-lg font-black text-white">No open orders right now</p>
                  <p className="mt-2 text-sm text-slate-400">Stay online. New orders will appear here in real time as soon as they enter the queue.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openOrders.map((order) => (
                    <div key={order._id} className="bg-black/20 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition-all">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                          <p className="text-xl font-black text-white mt-0.5">₹{order.totalAmount}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                          {order.status?.replace(/_/g, " ") ?? "pending"}
                        </span>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {order.items.slice(0, 3).map((item: OrderItem, i: number) => (
                            <span key={i} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-lg">
                              {item.name} x{item.quantity}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => acceptOrder(order._id)}
                        className="w-full bg-linear-to-r from-yellow-400 to-orange-500 text-gray-900 py-2.5 rounded-xl font-black text-sm hover:shadow-lg hover:shadow-orange-900 transition-all"
                      >
                        Accept order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">Completed Today</p>
                  <h2 className="mt-1 text-xl font-black text-white">Delivered jobs and payout momentum</h2>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">₹{todayEarnings}</span>
              </div>

              {todayDeliveries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-10 text-center text-slate-400">
                  No completed deliveries yet today.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayDeliveries.slice().reverse().slice(0, 5).map((order) => (
                    <div key={order._id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500 font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                          <p className="mt-1 text-xs text-slate-400">{new Date(order.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <span className="text-sm font-black text-emerald-300">+₹{order.totalAmount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Performance Pulse</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">This Week</p>
                  <p className="mt-2 text-lg font-black text-white">{liveSummary?.weekDeliveredCount ?? 0} deliveries completed</p>
                  <p className="mt-1 text-sm text-slate-400">Weekly earnings are at ₹{liveSummary?.weekEarnings ?? 0} based on closed orders.</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Delivery Pace</p>
                  <p className="mt-2 text-lg font-black text-white">{liveSummary?.avgDeliveryMinutes ?? "--"} min average handoff</p>
                  <p className="mt-1 text-sm text-slate-400">This uses orders with both start and completion timestamps so the estimate is grounded in actual runs.</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Queue Mix</p>
                  <p className="mt-2 text-lg font-black text-white">{liveSummary?.statusBreakdown.accepted ?? 0} accepted, {liveSummary?.statusBreakdown.preparing ?? 0} preparing</p>
                  <p className="mt-1 text-sm text-slate-400">Use this to spot whether your workload is still in-store or already moving on the road.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
