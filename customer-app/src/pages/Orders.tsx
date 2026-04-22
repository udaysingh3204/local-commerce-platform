import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import API from "../api/api"
import { useAuth } from "../context/useAuth"
import { toast } from "sonner"
import { runPaymentFlow } from "../lib/paymentFlow"

type TrackingPreview = {
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

const buildTrackingAlert = (preview: TrackingPreview) => {
  if (preview.signalStatus === "missing") {
    return {
      label: "Signal pending",
      detail: "Courier GPS has not started broadcasting yet.",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    }
  }

  if (preview.signalStatus === "stale") {
    return {
      label: "Signal stale",
      detail: `Last courier update was ${preview.signalAgeMinutes ?? 0} minutes ago.`,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    }
  }

  if (preview.isDelayed || preview.delayStatus === "delayed") {
    return {
      label: "Running late",
      detail: `This order is about ${preview.delayMinutes ?? 0} minutes behind ETA.`,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    }
  }

  if (preview.delayStatus === "risk") {
    return {
      label: "ETA at risk",
      detail: "Courier progress has started slipping against the planned ETA.",
      className: "border-cyan-200 bg-cyan-50 text-cyan-700",
    }
  }

  return null
}

type DeliveryInsights = {
  deliveredCount: number
  avgTripMinutes: number | null
  onTimeRate: number | null
  fastestTripMinutes: number | null
  reliabilityLabel: string
}

type PromotionHighlights = {
  totalSavings: number
  promoOrders: number
  latestCampaignName: string | null
  latestCode: string | null
  latestPrompt: string | null
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pending payment", className: "bg-amber-100 text-amber-700" },
  failed: { label: "Payment failed", className: "bg-rose-100 text-rose-700" },
}

const buildDeliveryInsights = (orders: any[]): DeliveryInsights => {
  const deliveredOrders = orders.filter((order) => order.status === "delivered")
  const actualTripMinutes = deliveredOrders
    .map((order) => {
      if (!order.deliveryStartTime || !order.deliveryEndTime) return null

      const start = new Date(order.deliveryStartTime).getTime()
      const end = new Date(order.deliveryEndTime).getTime()
      const diffMinutes = Math.round((end - start) / 60000)

      return Number.isFinite(diffMinutes) && diffMinutes > 0 ? diffMinutes : null
    })
    .filter((value): value is number => typeof value === "number")

  const onTimeEligible = deliveredOrders.filter((order) => typeof order.estimatedDeliveryTime === "number" && order.deliveryStartTime && order.deliveryEndTime)
  const onTimeCount = onTimeEligible.filter((order) => {
    const actual = Math.round((new Date(order.deliveryEndTime).getTime() - new Date(order.deliveryStartTime).getTime()) / 60000)
    return actual <= order.estimatedDeliveryTime + 5
  }).length

  const avgTripMinutes = actualTripMinutes.length
    ? Math.round(actualTripMinutes.reduce((sum, value) => sum + value, 0) / actualTripMinutes.length)
    : null

  const onTimeRate = onTimeEligible.length
    ? Math.round((onTimeCount / onTimeEligible.length) * 100)
    : null

  const fastestTripMinutes = actualTripMinutes.length
    ? Math.min(...actualTripMinutes)
    : null

  const reliabilityLabel = onTimeRate === null
    ? "Building delivery memory"
    : onTimeRate >= 85
      ? "Highly reliable"
      : onTimeRate >= 65
        ? "Usually on time"
        : "Needs closer tracking"

  return {
    deliveredCount: deliveredOrders.length,
    avgTripMinutes,
    onTimeRate,
    fastestTripMinutes,
    reliabilityLabel,
  }
}

const buildPromotionHighlights = (orders: any[]): PromotionHighlights => {
  const promoOrders = orders.filter((order) => order.promotionAudit?.campaignId || order.promotionAudit?.couponCode || Number(order.promotionAudit?.discountAmount || 0) > 0)
  const totalSavings = promoOrders.reduce((sum, order) => sum + Number(order.promotionAudit?.discountAmount || order.pricingBreakdown?.discountAmount || 0), 0)
  const latestPromoOrder = [...promoOrders]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]

  return {
    totalSavings,
    promoOrders: promoOrders.length,
    latestCampaignName: latestPromoOrder?.promotionAudit?.campaignName || null,
    latestCode: latestPromoOrder?.promotionAudit?.couponCode || null,
    latestPrompt: latestPromoOrder?.promotionAudit?.metadata?.quiz?.prompt || latestPromoOrder?.promotionAudit?.metadata?.vibe || null,
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; step: number }> = {
  pending:          { label: "Order Placed",   color: "bg-yellow-100 text-yellow-700",  icon: "⏳", step: 1 },
  accepted:         { label: "Accepted",        color: "bg-blue-100 text-blue-700",     icon: "✅", step: 2 },
  out_for_delivery: { label: "On the Way",      color: "bg-orange-100 text-orange-700", icon: "🚚", step: 3 },
  delivered:        { label: "Delivered",       color: "bg-green-100 text-green-700",   icon: "🎉", step: 4 },
  cancelled:        { label: "Cancelled",       color: "bg-red-100 text-red-700",       icon: "❌", step: 0 },
}

const STEPS = ["pending", "accepted", "out_for_delivery", "delivered"]

export default function Orders() {
  const { user, authReady } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [trackingPreview, setTrackingPreview] = useState<Record<string, TrackingPreview>>({})
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelModal, setCancelModal] = useState<{ orderId: string; orderRef: string } | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const insights = buildDeliveryInsights(orders)
  const promoHighlights = buildPromotionHighlights(orders)

  const CANCEL_REASONS = [
    "Changed my mind",
    "Ordered by mistake",
    "Found a better price elsewhere",
    "Taking too long",
    "Other",
  ]

  const handleCancelOrder = async () => {
    if (!cancelModal) return
    setCancellingId(cancelModal.orderId)
    try {
      await API.patch(`/orders/${cancelModal.orderId}/cancel`, { reason: cancelReason || "Customer cancelled" })
      setOrders(prev => prev.map(o =>
        o._id === cancelModal.orderId ? { ...o, status: "cancelled" } : o
      ))
      toast.success("Order cancelled")
      setCancelModal(null)
      setCancelReason("")
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Could not cancel order")
    } finally {
      setCancellingId(null)
    }
  }


  const updateOrderState = (updatedOrder: any) => {
    if (!updatedOrder?._id) return

    setOrders((current) => current.map((order) => (
      order._id === updatedOrder._id
        ? { ...order, ...updatedOrder }
        : order
    )))
  }

  const retryPayment = async (order: any) => {
    setPaymentLoadingId(order._id)

    try {
      const result = await runPaymentFlow({
        orderId: order._id,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod || "upi",
      })

      if (result.order) {
        updateOrderState(result.order)
      }

      if (result.status === "paid") {
        toast.success(result.message)
      } else {
        toast.info(result.message)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || "Payment retry failed")
      try {
        const refreshed = await API.get(`/orders/customer/${user?._id}`)
        setOrders(refreshed.data)
      } catch {
        // Ignore refresh failures here; the toast already surfaced the retry issue.
      }
    } finally {
      setPaymentLoadingId(null)
    }
  }

  useEffect(() => {
    if (!authReady) return
    if (!user) { navigate("/login"); return }
    const fetch = async () => {
      try {
        const res = await API.get(`/orders/customer/${user._id}`)
        setOrders(res.data)
      } catch { /* silent */ } finally { setLoading(false) }
    }
    fetch()
  }, [authReady, navigate, user])

  useEffect(() => {
    const activeOrders = orders.filter((order) => ["accepted", "preparing", "out_for_delivery"].includes(order.status))

    if (activeOrders.length === 0) return

    let cancelled = false

    Promise.all(
      activeOrders.map(async (order) => {
        try {
          const res = await API.get(`/orders/${order._id}/tracking`)
          return [order._id, {
            estimatedDeliveryTime: res.data.estimatedDeliveryTime ?? null,
            distanceKm: res.data.distanceKm ?? null,
            routeSource: res.data.routeSource ?? null,
            signalStatus: res.data.signalStatus ?? "idle",
            signalAgeMinutes: res.data.signalAgeMinutes ?? null,
            delayStatus: res.data.delayStatus ?? "unknown",
            delayMinutes: res.data.delayMinutes ?? null,
            isDelayed: Boolean(res.data.isDelayed),
            driver: res.data.driver ?? null,
          }] as const
        } catch {
          return null
        }
      })
    ).then((results) => {
      if (cancelled) return

      const next = results.reduce<Record<string, TrackingPreview>>((acc, entry) => {
        if (!entry) return acc
        acc[entry[0]] = entry[1]
        return acc
      }, {})

      setTrackingPreview(next)
    })

    return () => {
      cancelled = true
    }
  }, [orders])

  if (!authReady || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-linear-to-r from-violet-900 via-violet-800 to-fuchsia-900 text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="text-violet-300 hover:text-white text-sm flex items-center gap-1 mb-4 transition">← Home</Link>
          <h1 className="text-3xl font-black">My Orders</h1>
          <p className="text-violet-300 text-sm mt-1">{loading ? "Loading..." : `${orders.length} order${orders.length !== 1 ? "s" : ""} total`}</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 rounded-3xl border border-violet-100 bg-linear-to-r from-violet-50 via-white to-pink-50 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">Delivery Intelligence</p>
              <h2 className="mt-2 text-xl font-black text-gray-900">Your delivery profile is learning</h2>
              <p className="mt-1 text-sm text-gray-500">Based on your completed orders and real courier performance.</p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-white/80 px-4 py-3 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Reliability</p>
              <p className="mt-1 text-sm font-black text-violet-700">{insights.reliabilityLabel}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white px-4 py-3 border border-violet-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Delivered</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{insights.deliveredCount}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 border border-violet-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Avg trip</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{insights.avgTripMinutes !== null ? `${insights.avgTripMinutes}m` : "--"}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 border border-violet-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">On time</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{insights.onTimeRate !== null ? `${insights.onTimeRate}%` : "--"}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 border border-violet-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Fastest</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{insights.fastestTripMinutes !== null ? `${insights.fastestTripMinutes}m` : "--"}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-violet-950 to-fuchsia-900 p-[1px] shadow-xl shadow-violet-200/60">
          <div className="rounded-[calc(1.5rem-1px)] bg-linear-to-br from-slate-950 via-violet-950 to-fuchsia-900 px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="max-w-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-200">Reward replay</p>
                <h2 className="mt-2 text-xl font-black">Your orders now remember the campaign story too.</h2>
                <p className="mt-2 text-sm leading-6 text-violet-100/80">
                  Discounts are no longer invisible after checkout. This rail keeps your savings, latest offer, and campaign energy visible inside order history.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Latest drop</p>
                <p className="mt-1 text-sm font-black text-white">{promoHighlights.latestCampaignName || "No promo story yet"}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Total saved</p>
                <p className="mt-1 text-2xl font-black text-white">₹{promoHighlights.totalSavings}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Promo orders</p>
                <p className="mt-1 text-2xl font-black text-white">{promoHighlights.promoOrders}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Last code</p>
                <p className="mt-1 text-2xl font-black text-white">{promoHighlights.latestCode || "--"}</p>
              </div>
            </div>

            {promoHighlights.latestPrompt && (
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Campaign memory</p>
                <p className="mt-2 leading-6">{promoHighlights.latestPrompt}</p>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded-full w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded-full w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded-full w-1/4" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-7xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No orders yet</h2>
            <p className="text-gray-400 mb-6">Start shopping from local stores!</p>
            <button
              onClick={() => navigate("/")}
              className="bg-linear-to-r from-violet-600 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all"
            >
              Browse Stores
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
              const curStep = cfg.step
              const isActive = order.status === "out_for_delivery" || order.status === "accepted"
              const canRetryPayment = order.paymentMethod !== "cod"
                && ["pending", "failed"].includes(order.paymentStatus || "pending")
                && !["cancelled", "delivered"].includes(order.status)
              const canCancel = ["pending", "accepted"].includes(order.status)
              const preview = trackingPreview[order._id]
              const trackingAlert = preview ? buildTrackingAlert(preview) : null
              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
                >
                  {/* TOP ROW */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-400 font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                        <p className="font-black text-gray-900 text-lg mt-0.5">₹{order.totalAmount}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.color} flex items-center gap-1 whitespace-nowrap`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                      <span className={`rounded-xl px-3 py-1.5 text-xs font-bold ${PAYMENT_STATUS_CONFIG[order.paymentStatus || "pending"]?.className || PAYMENT_STATUS_CONFIG.pending.className}`}>
                        {PAYMENT_STATUS_CONFIG[order.paymentStatus || "pending"]?.label || "Pending payment"}
                      </span>
                      <span className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 capitalize">
                        {order.paymentMethod || "cod"}
                      </span>
                    </div>

                    {order.paymentFailureReason && (
                      <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {order.paymentFailureReason}
                      </div>
                    )}

                    {(order.promotionAudit?.campaignName || order.promotionAudit?.couponCode || Number(order.promotionAudit?.discountAmount || 0) > 0) && (
                      <div className="mb-4 overflow-hidden rounded-2xl bg-linear-to-r from-violet-50 via-fuchsia-50 to-cyan-50 p-[1px]">
                        <div className="rounded-[calc(1rem-1px)] bg-white px-4 py-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-500">Offer receipt</p>
                              <h3 className="mt-2 text-sm font-black text-gray-900">{order.promotionAudit?.campaignName || "Applied promotion"}</h3>
                              <p className="mt-1 text-xs text-gray-500">
                                Saved ₹{Number(order.promotionAudit?.discountAmount || order.pricingBreakdown?.discountAmount || 0)}
                                {order.promotionAudit?.couponCode ? ` using ${order.promotionAudit.couponCode}` : " on this order"}
                              </p>
                            </div>
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">
                              {order.promotionAudit?.couponCode || order.promotionAudit?.discountType || "promo applied"}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {order.promotionAudit?.campaignId && (
                              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-bold text-gray-600">{order.promotionAudit.campaignId}</span>
                            )}
                            {typeof order.promotionAudit?.discountPercent === "number" && order.promotionAudit.discountPercent > 0 && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">{order.promotionAudit.discountPercent}% off</span>
                            )}
                            {order.promotionAudit?.appliedAt && (
                              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold text-cyan-700">
                                Applied {new Date(order.promotionAudit.appliedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ITEMS */}
                    {order.items && order.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {order.items.slice(0, 4).map((item: any, idx: number) => (
                          <span key={idx} className="bg-gray-50 border border-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg font-medium">
                            {item.name} × {item.quantity}
                          </span>
                        ))}
                        {order.items.length > 4 && (
                          <span className="bg-gray-50 text-gray-400 text-xs px-2.5 py-1 rounded-lg">
                            +{order.items.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {preview && (
                      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="rounded-xl bg-violet-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500">ETA</p>
                          <p className="mt-1 text-sm font-black text-violet-700">{preview.estimatedDeliveryTime !== null ? `${preview.estimatedDeliveryTime} min` : "Live"}</p>
                        </div>
                        <div className="rounded-xl bg-sky-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-sky-500">Courier</p>
                          <p className="mt-1 text-sm font-black text-sky-700">{preview.driver?.name || "Assigned"}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-500">Distance</p>
                          <p className="mt-1 text-sm font-black text-emerald-700">{preview.distanceKm !== null ? `${preview.distanceKm} km` : preview.routeSource === "road" ? "Road" : "Updating"}</p>
                        </div>
                      </div>
                    )}

                    {trackingAlert && (
                      <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${trackingAlert.className}`}>
                        <p className="font-black">{trackingAlert.label}</p>
                        <p className="mt-1 text-xs sm:text-sm opacity-90">{trackingAlert.detail}</p>
                      </div>
                    )}

                    {/* STATUS STEPS */}
                    {order.status !== "cancelled" && (
                      <div className="flex items-center gap-0">
                        {STEPS.map((step, idx) => {
                          const s = STATUS_CONFIG[step]
                          const done = s.step <= curStep
                          const current = s.step === curStep
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div className={`flex flex-col items-center gap-0.5 ${idx > 0 ? "" : ""}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all
                                  ${done
                                    ? current
                                      ? "bg-linear-to-br from-violet-600 to-pink-500 text-white shadow-md shadow-violet-200 scale-110"
                                      : "bg-violet-600 text-white"
                                    : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {done ? "✓" : idx + 1}
                                </div>
                                <span className={`text-xs font-medium ${done ? "text-violet-600" : "text-gray-400"} hidden sm:block`}>
                                  {s.label.split(" ")[0]}
                                </span>
                              </div>
                              {idx < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 ${s.step < curStep ? "bg-violet-400" : "bg-gray-200"}`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM ACTION */}
                  {(isActive || canRetryPayment || canCancel) && (
                    <div className="border-t border-gray-50 px-5 py-3 bg-violet-50 flex items-center justify-between gap-3 flex-wrap">
                      {isActive ? (
                        <button
                          onClick={() => navigate(`/track/${order._id}`)}
                          className="flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-800 transition"
                        >
                          🗺️ Track Live Location →
                        </button>
                      ) : <span className="text-sm text-gray-400">Tracking becomes available once the order moves ahead.</span>}

                      <div className="flex items-center gap-2">
                        {canCancel && (
                          <button
                            onClick={() => setCancelModal({ orderId: order._id, orderRef: order._id.slice(-8).toUpperCase() })}
                            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-500 transition hover:bg-red-50"
                          >
                            Cancel order
                          </button>
                        )}

                        {canRetryPayment && (
                          <button
                            onClick={() => retryPayment(order)}
                            disabled={paymentLoadingId === order._id}
                            className="rounded-xl bg-linear-to-r from-emerald-600 to-cyan-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
                          >
                            {paymentLoadingId === order._id ? "Retrying..." : order.paymentStatus === "failed" ? "Retry payment" : "Complete payment"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900 mb-1">Cancel order?</h2>
            <p className="text-sm text-gray-500 mb-5">
              Order <span className="font-semibold text-gray-700">#{cancelModal.orderRef}</span> will be cancelled. This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Reason (optional)</label>
              <div className="mt-2 space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setCancelReason(reason)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition ${
                      cancelReason === reason
                        ? "border-violet-400 bg-violet-50 text-violet-700"
                        : "border-gray-200 text-gray-600 hover:border-violet-200"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setCancelModal(null); setCancelReason("") }}
                className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm hover:border-gray-300 transition"
              >
                Keep order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!!cancellingId}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black text-sm hover:bg-red-600 transition disabled:opacity-60"
              >
                {cancellingId ? "Cancelling..." : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
