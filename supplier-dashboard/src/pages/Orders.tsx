import { useEffect, useMemo, useState } from "react"
import API from "../api/api"
import { useSupplier } from "../context/SupplierContext"

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Pending", bg: "bg-yellow-500/10 border-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-400" },
  confirmed: { label: "Confirmed", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
  shipped: { label: "Shipped", bg: "bg-violet-500/10 border-violet-500/20", text: "text-violet-400", dot: "bg-violet-400" },
  delivered: { label: "Delivered", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  cancelled: { label: "Cancelled", bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-400", dot: "bg-rose-400" },
}

const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

const fmtDateTime = (value?: string | Date | null) => {
  if (!value) return "--"
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [savingDetailsOrderId, setSavingDetailsOrderId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string>("")
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [cancelReasonDrafts, setCancelReasonDrafts] = useState<Record<string, string>>({})
  const [fulfillmentDrafts, setFulfillmentDrafts] = useState<Record<string, Record<string, number>>>({})
  const { supplier } = useSupplier()

  const load = async () => {
    if (!supplier) return
    setLoading(true)
    try {
      const res = await API.get(`/wholesale/orders/${supplier._id}`)
      setOrders(Array.isArray(res.data) ? res.data : [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [supplier?._id])

  const statuses = ["all", ...Object.keys(STATUS_CFG)]
  const counts: Record<string, number> = {}
  orders.forEach((order) => {
    counts[order.status] = (counts[order.status] || 0) + 1
  })

  const filtered = orders.filter((order) => {
    const matchStatus = filter === "all" || order.status === filter
    const matchSearch = !search || order._id.slice(-6).toUpperCase().includes(search.toUpperCase())
    return matchStatus && matchSearch
  })

  const totalRevenue = orders.filter((order) => order.status === "delivered").reduce((sum: number, order: any) => sum + (order.totalAmount ?? 0), 0)
  const pendingCount = counts.pending ?? 0
  const deliveredCount = counts.delivered ?? 0
  const avgOrderValue = deliveredCount ? Math.round(totalRevenue / deliveredCount) : 0

  const largestOrder = useMemo(() => orders.reduce<any | null>((best, order) => {
    if (!best || Number(order.totalAmount || 0) > Number(best.totalAmount || 0)) return order
    return best
  }, null), [orders])

  const newestOrder = useMemo(() => orders.reduce<any | null>((latest, order) => {
    if (!latest || new Date(order.createdAt || 0).getTime() > new Date(latest.createdAt || 0).getTime()) return order
    return latest
  }, null), [orders])

  const actionableCount = orders.filter((order) => (NEXT_STATUS[order.status] || []).length > 0).length

  const patchOrderInState = (orderId: string, updatedOrder: any, fallbackStatus?: string) => {
    setOrders((current) => current.map((order) => (
      order._id === orderId ? { ...order, ...(updatedOrder || {}), ...(fallbackStatus ? { status: updatedOrder?.status || fallbackStatus } : {}) } : order
    )))
  }

  const saveOrderDetails = async (orderId: string) => {
    setSavingDetailsOrderId(orderId)
    setActionMessage("")

    try {
      const res = await API.patch(`/wholesale/order/${orderId}/details`, {
        supplierNotes: noteDrafts[orderId] ?? "",
        cancellationReason: cancelReasonDrafts[orderId] ?? "",
      })
      const updatedOrder = res.data?.order
      patchOrderInState(orderId, updatedOrder)
      setActionMessage(`Notes saved for order #${orderId.slice(-8).toUpperCase()}.`)
    } catch (error: any) {
      setActionMessage(error?.response?.data?.error || "Unable to save wholesale order details right now.")
    } finally {
      setSavingDetailsOrderId(null)
    }
  }

  const saveFulfillment = async (orderId: string) => {
    setSavingDetailsOrderId(orderId)
    setActionMessage("")

    try {
      const draft = fulfillmentDrafts[orderId] || {}
      const fulfilledItems = Object.keys(draft).map((productId) => ({ productId, quantityFulfilled: Number(draft[productId] || 0) }))

      const res = await API.patch(`/wholesale/order/${orderId}/fulfillment`, {
        fulfilledItems,
      })

      const updatedOrder = res.data?.order || res.data || {}
      patchOrderInState(orderId, updatedOrder)
      setActionMessage(`Fulfillment updated (${updatedOrder.fulfillmentProgress ?? res.data?.fulfillmentProgress}%)`)
    } catch (error: any) {
      setActionMessage(error?.response?.data?.error || "Unable to update fulfillment right now.")
    } finally {
      setSavingDetailsOrderId(null)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId)
    setActionMessage("")

    const cancellationReason = (cancelReasonDrafts[orderId] ?? "").trim()
    if (status === "cancelled" && !cancellationReason) {
      setActionMessage("Add a cancellation reason before cancelling this wholesale order.")
      setUpdatingOrderId(null)
      return
    }

    try {
      const res = await API.patch(`/wholesale/order/${orderId}/status`, {
        status,
        supplierNotes: noteDrafts[orderId] ?? "",
        cancellationReason,
      })
      const updatedOrder = res.data?.order

      patchOrderInState(orderId, updatedOrder, status)

      setActionMessage(`Order #${orderId.slice(-8).toUpperCase()} moved to ${STATUS_CFG[status]?.label || status}.`)
    } catch (error: any) {
      setActionMessage(error?.response?.data?.error || "Unable to update wholesale order right now.")
    } finally {
      setUpdatingOrderId(null)
    }
  }

  return (
    <div className="p-6 xl:p-8 min-h-screen">
      <section className="mb-8 rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_28%),linear-gradient(135deg,#111827_0%,#0f172a_55%,#1e293b_100%)] p-6 shadow-2xl shadow-indigo-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-300">Supplier ops deck</p>
            <h1 className="mt-2 text-3xl font-black text-white">Wholesale order flow with better scan speed and stronger signal.</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">You can now judge pipeline health, delivered revenue, and high-value orders faster instead of working from a plain table and scattered pills.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Orders", value: orders.length, icon: "📦", text: "text-violet-300" },
              { label: "Pending", value: pendingCount, icon: "⏳", text: "text-yellow-300" },
              { label: "Delivered", value: deliveredCount, icon: "✅", text: "text-emerald-300" },
              { label: "Delivered Revenue", value: fmt(totalRevenue), icon: "💰", text: "text-cyan-300" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className={`mt-2 text-2xl font-black ${stat.text}`}>{stat.icon} {stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!!actionMessage && (
        <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {actionMessage}
        </div>
      )}

      <div className="grid gap-4 mb-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-indigo-500/15 bg-indigo-500/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300">Highest value order</p>
          <h2 className="mt-2 text-xl font-black text-white">{largestOrder ? fmt(largestOrder.totalAmount ?? 0) : "--"}</h2>
          <p className="mt-2 text-sm text-slate-300">{largestOrder ? `Order #${largestOrder._id.slice(-8).toUpperCase()} is the current top-ticket wholesale run.` : "No orders yet."}</p>
        </div>
        <div className="rounded-3xl border border-cyan-500/15 bg-cyan-500/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">Newest movement</p>
          <h2 className="mt-2 text-xl font-black text-white">{newestOrder ? `#${newestOrder._id.slice(-8).toUpperCase()}` : "--"}</h2>
          <p className="mt-2 text-sm text-slate-300">{newestOrder?.createdAt ? new Date(newestOrder.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Waiting for the first order signal."}</p>
        </div>
        <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Avg delivered order</p>
          <h2 className="mt-2 text-xl font-black text-white">{deliveredCount ? fmt(avgOrderValue) : "--"}</h2>
          <p className="mt-2 text-sm text-slate-300">Delivered revenue is now easy to compare against order count at a glance.</p>
        </div>
        <div className="rounded-3xl border border-amber-500/15 bg-amber-500/10 p-5 lg:col-span-3 xl:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">Action queue</p>
          <h2 className="mt-2 text-xl font-black text-white">{actionableCount} orders can move right now</h2>
          <p className="mt-2 text-sm text-slate-300">Pending orders can be confirmed, confirmed orders can ship, and shipped orders can close the loop as delivered.</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-white">Wholesale Orders</h1>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>
          <input
            placeholder="Search by order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-2xl bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 w-56 transition"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {statuses.map((statusKey) => {
          const cfg = STATUS_CFG[statusKey]
          const active = statusKey === filter
          return (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all whitespace-nowrap
                ${active
                  ? statusKey === "all" ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/30" : `${cfg.bg} ${cfg.text}`
                  : "bg-gray-900/60 text-gray-500 border-gray-800 hover:text-gray-300"}`}
            >
              {cfg && active && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
              <span className="capitalize">{statusKey.replace(/_/g, " ")}</span>
              {statusKey !== "all" && counts[statusKey] ? <span className="opacity-50 ml-1">({counts[statusKey]})</span> : null}
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="bg-gray-900 border border-gray-800 rounded-[28px] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-gray-400 text-lg font-semibold">No orders found</p>
              <p className="text-gray-600 text-sm mt-1">{filter !== "all" ? "Try clearing the filter" : "Orders will appear here"}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/70">
              {filtered.map((order) => {
                const cfg = STATUS_CFG[order.status] ?? { label: order.status, bg: "bg-gray-800", text: "text-gray-400", dot: "bg-gray-400" }
                const isExpanded = expandedId === order._id
                const nextStatuses = NEXT_STATUS[order.status] || []
                const isUpdating = updatingOrderId === order._id
                const isSavingDetails = savingDetailsOrderId === order._id
                const noteValue = noteDrafts[order._id] ?? order.supplierNotes ?? ""
                const cancelReasonValue = cancelReasonDrafts[order._id] ?? order.cancellationReason ?? ""
                return (
                  <div key={order._id} className="px-5 py-5 transition-colors hover:bg-white/[0.02]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-indigo-400 text-xs font-bold">#{order._id.slice(-8).toUpperCase()}</span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-slate-300">
                            {(order.items?.length ?? 0)} line{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Order value</p>
                            <p className="mt-1 text-xl font-black text-white">{fmt(order.totalAmount ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Created</p>
                            <p className="mt-1 text-sm font-bold text-slate-300">{order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Supplier focus</p>
                            <p className="mt-1 text-sm font-bold text-slate-300">{order.status === "pending" ? "Needs confirmation" : order.status === "confirmed" ? "Ready to move" : order.status === "shipped" ? "In transit" : "Closed loop"}</p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Fulfillment</p>
                          <div className="mt-3 space-y-2">
                            {(order.items ?? []).map((item: any) => {
                              const pid = String(item.productId?._id || item.productId)
                              const currentFulfilled = (order.fulfilledItems || []).find((f: any) => String(f.productId) === pid)
                              const draftQty = fulfillmentDrafts[order._id]?.[pid] ?? (currentFulfilled?.quantityFulfilled ?? 0)
                              return (
                                <div key={pid} className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-black/20 px-3 py-2 text-sm">
                                  <div>
                                    <div className="font-bold text-white">{item.productId?.name ?? 'Product'}</div>
                                    <div className="text-slate-400 text-xs">Ordered: {item.quantity}</div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="number"
                                      min={0}
                                      max={item.quantity}
                                      value={draftQty}
                                      onChange={(e) => {
                                        const v = Math.max(0, Math.min(Number(e.target.value || 0), Number(item.quantity || 0)))
                                        setFulfillmentDrafts((cur) => ({ ...cur, [order._id]: { ...(cur[order._id] || {}), [pid]: v } }))
                                      }}
                                      className="w-20 rounded-lg bg-black/10 border border-white/10 px-2 py-1 text-sm text-white"
                                    />
                                    <span className="text-slate-400 text-xs">units fulfilled</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              disabled={savingDetailsOrderId === order._id}
                              onClick={() => void saveFulfillment(order._id)}
                              className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingDetailsOrderId === order._id ? 'Saving...' : 'Save fulfillment'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/[0.08]"
                      >
                        {isExpanded ? "Hide details" : "View details"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 rounded-3xl border border-white/8 bg-black/20 p-4">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Order Lines</p>
                        <div className="space-y-2">
                          {(order.items ?? []).map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-gray-800/40 last:border-none">
                              <span className="text-gray-300">{item.productId?.name ?? "Product"}</span>
                              <div className="flex items-center gap-6">
                                <span className="text-gray-500">× {item.quantity}</span>
                                <span className="text-gray-400">{fmt((item.price ?? 0) * item.quantity)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                          <span className="text-gray-500 text-sm">Order Total</span>
                          <span className="text-white font-black text-lg">{fmt(order.totalAmount ?? 0)}</span>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Lifecycle stamps</p>
                            <div className="mt-3 space-y-2 text-sm text-slate-300">
                              <div className="flex items-center justify-between gap-3">
                                <span>Confirmed</span>
                                <span className="text-right text-slate-400">{fmtDateTime(order.confirmedAt)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>Shipped</span>
                                <span className="text-right text-slate-400">{fmtDateTime(order.shippedAt)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>Delivered</span>
                                <span className="text-right text-slate-400">{fmtDateTime(order.deliveredAt)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>Cancelled</span>
                                <span className="text-right text-slate-400">{fmtDateTime(order.cancelledAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Status history</p>
                            <div className="mt-3 space-y-2">
                              {(order.statusHistory || []).length > 0 ? (order.statusHistory as Array<any>).slice().reverse().map((entry, index) => (
                                <div key={`${entry.status}-${entry.changedAt || index}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-black/20 px-3 py-2 text-sm">
                                  <span className="font-bold text-white">{STATUS_CFG[entry.status]?.label || entry.status}</span>
                                  <span className="text-right text-slate-400">{fmtDateTime(entry.changedAt)}</span>
                                </div>
                              )) : (
                                <p className="text-sm text-slate-400">History will appear as this order moves through the supplier flow.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Supplier notes</p>
                            <textarea
                              value={noteValue}
                              onChange={(event) => setNoteDrafts((current) => ({ ...current, [order._id]: event.target.value }))}
                              placeholder="Add packing notes, coordination context, or handling instructions..."
                              className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-400/40 focus:outline-none"
                            />
                          </div>

                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Cancellation reason</p>
                            <textarea
                              value={cancelReasonValue}
                              onChange={(event) => setCancelReasonDrafts((current) => ({ ...current, [order._id]: event.target.value }))}
                              placeholder="Required when cancelling. Example: stock unavailable, MOQ issue, retailer request..."
                              className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-400/40 focus:outline-none"
                            />
                            {order.cancellationReason && (
                              <p className="mt-3 text-sm text-rose-200">Current reason: {order.cancellationReason}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            disabled={isSavingDetails}
                            onClick={() => void saveOrderDetails(order._id)}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSavingDetails ? "Saving..." : "Save notes"}
                          </button>
                        </div>

                        <div className="mt-5 border-t border-white/8 pt-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Next action</p>
                              <p className="mt-1 text-sm text-slate-300">
                                {nextStatuses.length > 0 ? "Advance this order directly from the supplier workspace." : "This order is already in a terminal state."}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {nextStatuses.length > 0 ? nextStatuses.map((nextStatus) => {
                                const nextCfg = STATUS_CFG[nextStatus]
                                return (
                                  <button
                                    key={nextStatus}
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => void updateOrderStatus(order._id, nextStatus)}
                                    className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${nextCfg.bg} ${nextCfg.text} ${isUpdating ? "cursor-not-allowed opacity-60" : "hover:opacity-80"}`}
                                  >
                                    {isUpdating ? "Updating..." : `Mark ${nextCfg.label}`}
                                  </button>
                                )
                              }) : (
                                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                  No action
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[28px] border border-indigo-500/15 bg-indigo-500/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300">Supplier memo</p>
            <h2 className="mt-2 text-xl font-black text-white">Use this view to triage, not just review.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Pending wholesale orders deserve a fast decision path, delivered revenue deserves visibility, and high-value tickets should never get buried in a table.</p>
          </div>

          <div className="rounded-[28px] border border-emerald-500/15 bg-emerald-500/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Pipeline snapshot</p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Pending queue", value: pendingCount },
                { label: "Delivered runs", value: deliveredCount },
                { label: "Largest order", value: largestOrder ? fmt(largestOrder.totalAmount ?? 0) : "--" },
                { label: "Actionable now", value: actionableCount },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}