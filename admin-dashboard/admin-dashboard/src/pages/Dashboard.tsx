import { useEffect, useState } from "react"
import API from "../api/api"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts"

const STAT_CARDS = [
  { key: "users",   label: "Total Users",    icon: "👥", grad: "from-violet-600 to-purple-700",  glow: "shadow-violet-900/50", border: "border-violet-500/20", trend: "+12%", trendUp: true },
  { key: "stores",  label: "Active Stores",  icon: "🏪", grad: "from-emerald-500 to-teal-600",   glow: "shadow-emerald-900/50",border: "border-emerald-500/20",trend: "+3%",  trendUp: true },
  { key: "orders",  label: "Total Orders",   icon: "📦", grad: "from-orange-500 to-amber-500",   glow: "shadow-orange-900/50", border: "border-orange-500/20", trend: "+28%", trendUp: true },
  { key: "revenue", label: "Total Revenue",  icon: "💰", grad: "from-sky-500 to-cyan-500",       glow: "shadow-sky-900/50",    border: "border-sky-500/20",    trend: "+18%", trendUp: true, prefix: "₹" },
]

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: "Pending",      color: "text-yellow-400",  bg: "bg-yellow-500/10"  },
  accepted:         { label: "Accepted",     color: "text-blue-400",    bg: "bg-blue-500/10"    },
  preparing:        { label: "Preparing",    color: "text-purple-400",  bg: "bg-purple-500/10"  },
  out_for_delivery: { label: "On the Way",   color: "text-orange-400",  bg: "bg-orange-500/10"  },
  delivered:        { label: "Delivered",    color: "text-emerald-400", bg: "bg-emerald-500/10" },
  cancelled:        { label: "Cancelled",    color: "text-rose-400",    bg: "bg-rose-500/10"    },
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1120] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white font-black text-sm">₹{(payload[0]?.value ?? 0).toLocaleString()}</p>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get("/analytics/dashboard")
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full ad-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 xl:p-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 ad-fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Platform Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
          <span className="text-slate-400 text-xs font-semibold">Live</span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((card, i) => {
          const raw = stats[card.key] ?? 0
          const display = card.key === "revenue" ? Number(raw).toLocaleString() : raw
          return (
            <div
              key={card.key}
              className={`bg-[#0d1120] border ${card.border} rounded-2xl p-5 ad-count-up ad-card`}
              style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${card.grad} flex items-center justify-center text-lg shadow-lg ${card.glow}`}>
                  {card.icon}
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                  {card.trend}
                </span>
              </div>
              <p className="text-slate-400 text-xs font-semibold mb-1">{card.label}</p>
              <p className="text-white font-black text-3xl">{card.prefix ?? ""}{display}</p>
            </div>
          )
        })}
      </div>

      {/* ── Status Breakdown ── */}
      {stats.statusCounts && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Object.entries(stats.statusCounts).map(([status, count]: any) => {
            const cfg = STATUS_CFG[status] ?? { label: status, color: "text-slate-400", bg: "bg-white/[0.04]" }
            return (
              <div key={status} className={`${cfg.bg} border border-white/[0.05] rounded-xl p-3 text-center`}>
                <p className={`text-[11px] font-bold mb-1 ${cfg.color}`}>{cfg.label}</p>
                <p className="text-white font-black text-2xl">{count}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Chart + Recent Orders ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Revenue Bar Chart */}
        {stats.dailySales?.length > 0 && (
          <div className="xl:col-span-3 bg-[#0d1120] border border-white/[0.05] rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-white font-black text-base">Daily Revenue</h2>
              <p className="text-slate-500 text-xs mt-0.5">Last 30 days</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.dailySales} barSize={8} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="_id" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139,92,246,0.06)" }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {stats.dailySales.map((_: any, idx: number) => (
                    <Cell
                      key={idx}
                      fill={`rgba(139,92,246,${0.35 + (idx / stats.dailySales.length) * 0.65})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Orders */}
        {stats.recentOrders?.length > 0 && (
          <div className="xl:col-span-2 bg-[#0d1120] border border-white/[0.05] rounded-2xl p-6">
            <h2 className="text-white font-black text-base mb-5">Recent Orders</h2>
            <div className="space-y-2.5">
              {stats.recentOrders.slice(0, 6).map((order: any) => {
                const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending
                return (
                  <div key={order._id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.04] transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center text-xs font-black text-violet-400 shrink-0">
                        #{order._id.slice(-3)}
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">{order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-slate-600 text-xs">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-xs font-black">₹{order.totalAmount}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}