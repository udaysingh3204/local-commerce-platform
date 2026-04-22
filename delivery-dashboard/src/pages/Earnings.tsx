import { useEffect, useState } from "react"
import API from "../api/api"
import { useNavigate } from "react-router-dom"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

type EarningsTrendPoint = {
  date: string
  amount: number
  deliveries: number
}

type RecentDelivery = {
  _id: string
  totalAmount: number
  updatedAt: string
  durationMinutes: number | null
  estimatedDeliveryTime: number | null
  itemCount: number
  paymentMethod: string
  paymentStatus: string
}

type ActiveDelivery = {
  _id: string
  status: string
  totalAmount: number
  estimatedDeliveryTime: number | null
  deliveryStartTime: string | null
  itemCount: number
  paymentMethod: string
  paymentStatus: string
  updatedAt: string
}

type DriverInsightsResponse = {
  insights: {
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
    trend: EarningsTrendPoint[]
    activeOrders: ActiveDelivery[]
    recentDeliveries: RecentDelivery[]
  }
}

export default function Earnings() {
  const [insights, setInsights] = useState<DriverInsightsResponse["insights"] | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const driver = JSON.parse(localStorage.getItem("driver") || "{}") as { _id?: string }

  useEffect(() => {
    if (!driver._id) { navigate("/login"); return }
    API.get<DriverInsightsResponse>("/driver/me/insights")
      .then(res => setInsights(res.data.insights))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driver._id, navigate])

  const summary = insights?.summary
  const chartData = insights?.trend || []
  const activeOrders = insights?.activeOrders || []
  const recentDeliveries = insights?.recentDeliveries || []
  const strongestDay = chartData.reduce<EarningsTrendPoint | null>((best, point) => {
    if (!best || point.amount > best.amount) return point
    return best
  }, null)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
        >
          ← Back to Orders
        </button>
        <h1 className="font-black text-white">💰 Earnings</h1>
        <div />
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6 rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_28%),linear-gradient(135deg,#111827_0%,#0f172a_55%,#1f2937_100%)] p-6 shadow-2xl shadow-yellow-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-300">Driver Insights</p>
              <h1 className="mt-2 text-3xl font-black text-white">Track earnings, pace, and delivery reliability</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">This panel is backed by closed delivery records, not just the current order list, so your earnings and timing metrics survive refreshes and reflect actual completed work.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Today", value: `₹${summary?.todayEarnings ?? 0}`, tone: "text-yellow-300" },
                { label: "This Week", value: `₹${summary?.weekEarnings ?? 0}`, tone: "text-cyan-300" },
                { label: "Completed", value: summary?.deliveredCount ?? 0, tone: "text-emerald-300" },
                { label: "On-Time", value: summary?.onTimeRate !== null && summary?.onTimeRate !== undefined ? `${summary.onTimeRate}%` : "--", tone: "text-fuchsia-300" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                  <p className={`mt-2 text-2xl font-black ${stat.tone}`}>{loading ? "--" : stat.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Best day</p>
              <p className="mt-2 text-2xl font-black text-yellow-300">{strongestDay ? `₹${strongestDay.amount}` : "--"}</p>
              <p className="mt-1 text-sm text-slate-400">{strongestDay ? `${strongestDay.deliveries} deliveries on ${strongestDay.date}` : "No trend data yet"}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Active payout lane</p>
              <p className="mt-2 text-2xl font-black text-cyan-300">{activeOrders.length}</p>
              <p className="mt-1 text-sm text-slate-400">Live jobs currently contributing to your next payout cycle.</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Reliability note</p>
              <p className="mt-2 text-2xl font-black text-fuchsia-300">{summary?.onTimeRate != null ? `${summary.onTimeRate}%` : "--"}</p>
              <p className="mt-1 text-sm text-slate-400">On-time score grounded in completed deliveries with real start and completion timestamps.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-5">
          {[
            { label: "Today Deliveries", value: `${summary?.todayDeliveredCount ?? 0}`, color: "text-yellow-400" },
            { label: "Week Deliveries", value: `${summary?.weekDeliveredCount ?? 0}`, color: "text-white" },
            { label: "Avg/Order", value: `₹${summary?.avgOrderValue ?? 0}`, color: "text-green-400" },
            { label: "Avg Delivery", value: summary?.avgDeliveryMinutes ? `${summary.avgDeliveryMinutes} min` : "--", color: "text-cyan-400" },
            { label: "Active Jobs", value: `${summary?.activeCount ?? 0}`, color: "text-orange-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-black mt-1 ${color}`}>{loading ? "—" : value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Earnings Trend (Last 7 days)</h2>
            {chartData.length === 0 ? (
              <div className="text-center py-10 text-gray-600">No delivery data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="28%">
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 12, color: "#fff" }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === chartData.length - 1 ? "#f59e0b" : "#374151"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Active Workload</h2>
            {loading ? (
              <div className="py-10 text-center text-gray-600">Loading...</div>
            ) : activeOrders.length === 0 ? (
              <div className="py-10 text-center text-gray-600">No active deliveries right now</div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <div key={order._id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500 font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                        <p className="mt-1 text-sm font-black text-white">₹{order.totalAmount} · {order.itemCount} items</p>
                      </div>
                      <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {order.estimatedDeliveryTime ? `${order.estimatedDeliveryTime} min ETA` : "ETA pending"}
                      {order.deliveryStartTime ? ` · started ${new Date(order.deliveryStartTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Recent Deliveries</h2>
            <span className="text-xs text-slate-500">Closed deliveries only</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading...</div>
          ) : recentDeliveries.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-gray-500">No deliveries yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {recentDeliveries.map((order) => (
                <div key={order._id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                    <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-semibold text-slate-300">{order.itemCount} items</span>
                    <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-semibold text-slate-300">{order.paymentMethod.toUpperCase()} · {order.paymentStatus}</span>
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">{order.durationMinutes ? `${order.durationMinutes} min actual` : "Duration pending"}</span>
                    <span className="text-yellow-400 font-black">+₹{order.totalAmount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}