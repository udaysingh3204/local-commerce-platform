import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import API, { BACKEND_ORIGIN } from "../api/api"
import { toast } from "sonner"
import { io } from "socket.io-client"

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:          { label: "Pending",           color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",  dot: "bg-yellow-400"  },
  accepted:         { label: "Accepted",          color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",      dot: "bg-blue-400"    },
  preparing:        { label: "Preparing",         color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20",  dot: "bg-purple-400"  },
  out_for_delivery: { label: "Out for Delivery",  color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",  dot: "bg-orange-400"  },
  delivered:        { label: "Delivered",         color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",dot: "bg-emerald-400" },
  cancelled:        { label: "Cancelled",         color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",      dot: "bg-rose-400"    },
}

const PAYMENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  paid:    { label: "Paid",    color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  pending: { label: "Pending", color: "text-amber-300",   bg: "bg-amber-500/10 border-amber-500/20" },
  failed:  { label: "Failed",  color: "text-rose-300",    bg: "bg-rose-500/10 border-rose-500/20" },
}

const FILTERS = ["all", "pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"]
const NEXT_STATUSES: Record<string, string[]> = {
  pending:          ["accepted", "cancelled"],
  accepted:         ["preparing", "cancelled"],
  preparing:        ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered:        [],
  cancelled:        [],
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const queryFilter = searchParams.get("status") || "all"
  const querySearch = searchParams.get("q") || ""
  const assignmentFilter = searchParams.get("assignment") || "all"
  const activeFilters = useMemo(() => {
    if (!queryFilter || queryFilter === "all") return ["all"]
    return queryFilter.split(",").map((v) => v.trim()).filter(Boolean)
  }, [queryFilter])

  useEffect(() => {
    API.get("/orders/all")
      .then(res => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false))

    const token = localStorage.getItem("adminToken")
    const socket = io(BACKEND_ORIGIN, { auth: { token }, autoConnect: false })
    socket.connect()

    socket.on("newOrder", (order: any) => {
      setOrders(prev => [order, ...prev])
      toast.info("New order received", { description: `Order #${String(order._id).slice(-6).toUpperCase()}` })
    })

    socket.on("orderStatusUpdated", (updated: any) => {
      setOrders(prev => prev.map(o => o._id === updated.orderId ? { ...o, status: updated.status } : o))
    })

    return () => {
      socket.off("newOrder")
      socket.off("orderStatusUpdated")
      socket.disconnect()
    }
  }, [])

  const counts: Record<string, number> = {}
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })

  const filtered = orders
    .filter(o => activeFilters.includes("all") || activeFilters.includes(o.status))
    .filter(o => assignmentFilter !== "unassigned" || !o.deliveryPartnerId)
    .filter(o => !querySearch || o._id.toLowerCase().includes(querySearch.toLowerCase()) || (o.customerId?.name ?? "").toLowerCase().includes(querySearch.toLowerCase()))

  const setStatusFilter = (status: string) => {
    const next = new URLSearchParams(searchParams)
    if (status === "all") next.delete("status"); else next.set("status", status)
    setSearchParams(next)
  }
  const setSearchValue = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete("q"); else next.set("q", value)
    setSearchParams(next)
  }
  const clearPresetFilters = () => {
    const next = new URLSearchParams(searchParams)
    next.delete("assignment"); next.delete("status")
    setSearchParams(next)
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      await API.patch(`/orders/${orderId}/status`, { status: newStatus })
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
      toast.success(`Order ${orderId.slice(-6).toUpperCase()} → ${STATUS_CFG[newStatus]?.label ?? newStatus}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update status")
    } finally { setUpdatingId(null) }
  }

  const totalRevenue = orders.filter(o => o.status === "delivered").reduce((s: number, o: any) => s + (o.totalAmount ?? 0), 0)
  const COMMISSION_RATE = 0.05
  const totalCommission = Math.round(totalRevenue * COMMISSION_RATE)

  return (
    <div className="p-6 xl:p-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Orders", value: orders.length, icon: "📦", color: "text-violet-400" },
          { label: "Active", value: (counts.accepted ?? 0) + (counts.preparing ?? 0) + (counts.out_for_delivery ?? 0), icon: "⚡", color: "text-orange-400" },
          { label: "Delivered", value: counts.delivered ?? 0, icon: "✅", color: "text-emerald-400" },
          { label: "Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: "💰", color: "text-sky-400" },
          { label: "Platform Commission (5%)", value: `₹${totalCommission.toLocaleString("en-IN")}`, icon: "🏦", color: "text-pink-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0d1120] border border-white/5 rounded-2xl px-5 py-4">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} of {orders.length} orders</p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            placeholder="Search by ID or customer..."
            value={querySearch}
            onChange={e => setSearchValue(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl bg-white/4 border border-white/7 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/60 w-64 transition"
          />
        </div>
      </div>

      {(assignmentFilter !== "all" || !activeFilters.includes("all")) && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-cyan-400/15 bg-cyan-400/10 px-4 py-3">
          <p className="text-sm text-slate-300">
            <span className="text-cyan-300 font-bold">Filter active: </span>
            {assignmentFilter === "unassigned" ? "unassigned · " : ""}{activeFilters.includes("all") ? "all statuses" : activeFilters.join(", ").replaceAll("_", " ")}
          </p>
          <button onClick={clearPresetFilters} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition">Clear</button>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(s => {
          const cfg = STATUS_CFG[s]
          const active = s === "all" ? activeFilters.includes("all") : activeFilters.length === 1 && activeFilters[0] === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap
                ${active
                  ? s === "all" ? "bg-violet-600/20 text-violet-300 border-violet-500/30" : `${cfg.bg} ${cfg.color}`
                  : "bg-white/3 text-slate-500 border-white/5 hover:bg-white/6 hover:text-slate-300"
                }`}
            >
              {cfg && active && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
              <span className="capitalize">{s.replace(/_/g, " ")}</span>
              {s !== "all" && counts[s] ? <span className="opacity-50">({counts[s]})</span> : null}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-[#0d1120] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full ad-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["Order ID", "Customer", "Items", "Status", "Payment", "Amount", "Commission (5%)", "Date", "Actions"].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const cfg = STATUS_CFG[order.status] ?? { label: order.status, color: "text-slate-400", bg: "bg-white/5 border-white/10", dot: "bg-slate-400" }
                const isExpanded = expandedId === order._id
                const nextOptions = NEXT_STATUSES[order.status] ?? []
                const isUpdating = updatingId === order._id
                return (
                  <>
                    <tr
                      key={order._id}
                      onClick={() => setExpandedId(isExpanded ? null : order._id)}
                      className="border-b border-white/3 hover:bg-white/2 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-violet-400 text-xs font-bold">#{order._id.slice(-8).toUpperCase()}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-300 text-xs max-w-[120px] truncate">
                        {order.customerId?.name || order.customerId?.email || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-400">{order.items?.length ?? 0} items</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {(() => {
                          const pc = PAYMENT_CFG[order.paymentStatus] ?? PAYMENT_CFG.pending
                          return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${pc.bg} ${pc.color}`}>{pc.label}</span>
                        })()}
                      </td>
                      <td className="px-5 py-4 text-white font-black">₹{(order.totalAmount ?? 0).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-4 text-pink-400 font-semibold text-xs">₹{Math.round((order.totalAmount ?? 0) * 0.05).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {" · "}
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        {nextOptions.length > 0 ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {nextOptions.map(ns => {
                              const nc = STATUS_CFG[ns]
                              return (
                                <button
                                  key={ns}
                                  disabled={isUpdating}
                                  onClick={() => void updateStatus(order._id, ns)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all
                                    ${isUpdating ? "opacity-40 cursor-not-allowed" : "hover:opacity-80"}
                                    ${nc?.bg ?? "bg-white/5 border-white/10"} ${nc?.color ?? "text-slate-400"}`}
                                >
                                  {isUpdating ? "…" : `→ ${nc?.label ?? ns.replace(/_/g, " ")}`}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 italic">No actions</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order._id}-detail`} className="border-b border-white/3 bg-white/1">
                        <td colSpan={9} className="px-8 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="text-slate-500 font-bold uppercase tracking-wider mb-2">Items</p>
                              {(order.items ?? []).map((item: any, i: number) => (
                                <p key={i} className="text-slate-300 py-0.5">{item.name || item.productId?.name || "Product"} × {item.quantity} — ₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                              ))}
                            </div>
                            <div>
                              <p className="text-slate-500 font-bold uppercase tracking-wider mb-2">Delivery</p>
                              <p className="text-slate-300">{order.deliveryAddress || "—"}</p>
                              <p className="text-slate-500 mt-1">Driver: {order.deliveryPartnerId?.name ?? "Unassigned"}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-bold uppercase tracking-wider mb-2">Pricing</p>
                              <p className="text-slate-300">Total: <span className="text-white font-black">₹{(order.totalAmount ?? 0).toLocaleString("en-IN")}</span></p>
                              {order.promotionAudit?.discountAmount > 0 && (
                                <p className="text-emerald-400 mt-1">Discount: −₹{order.promotionAudit.discountAmount}</p>
                              )}
                              <p className="text-slate-500 mt-1">Method: {order.paymentMethod?.replace(/_/g, " ") ?? "—"}</p>
                              <p className="text-pink-400 mt-2 font-bold">
                                Platform fee (5%): ₹{Math.round((order.totalAmount ?? 0) * 0.05).toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="text-4xl mb-3">📦</div>
                    <p className="text-slate-500">No orders found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
