import { useEffect, useState } from "react"
import API from "../api/api"

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:          { label: "Pending",           color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",  dot: "bg-yellow-400"  },
  accepted:         { label: "Accepted",          color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",      dot: "bg-blue-400"    },
  preparing:        { label: "Preparing",         color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20",  dot: "bg-purple-400"  },
  out_for_delivery: { label: "Out for Delivery",  color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",  dot: "bg-orange-400"  },
  delivered:        { label: "Delivered",         color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",dot: "bg-emerald-400" },
  cancelled:        { label: "Cancelled",         color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",      dot: "bg-rose-400"    },
}

const FILTERS = ["all", "pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"]

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    API.get("/orders")
      .then(res => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const counts: Record<string, number> = {}
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })

  const filtered = orders
    .filter(o => filter === "all" || o.status === filter)
    .filter(o => !search || o._id.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 xl:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 ad-fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{orders.length} total orders</p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            placeholder="Search by ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/60 w-52 transition"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(s => {
          const cfg = STATUS_CFG[s]
          const active = filter === s
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap
                ${active
                  ? s === "all"
                    ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                    : `${cfg.bg} ${cfg.color}`
                  : "bg-white/[0.03] text-slate-500 border-white/[0.05] hover:bg-white/[0.06] hover:text-slate-300"
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
      <div className="bg-[#0d1120] border border-white/[0.05] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full ad-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Order ID", "Items", "Status", "Amount", "Date"].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const cfg = STATUS_CFG[order.status] ?? { label: order.status, color: "text-slate-400", bg: "bg-white/5 border-white/10", dot: "bg-slate-400" }
                return (
                  <tr key={order._id} className="border-b border-white/[0.03] ad-table-row">
                    <td className="px-5 py-4">
                      <span className="font-mono text-violet-400 text-xs font-bold">#{order._id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{order.items?.length ?? 0} items</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white font-black">₹{order.totalAmount}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                      {" · "}
                      {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
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
