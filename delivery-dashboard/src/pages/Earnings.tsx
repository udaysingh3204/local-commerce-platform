import { useEffect, useState } from "react"
import API from "../api/api"
import { useNavigate } from "react-router-dom"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

export default function Earnings() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const driver = JSON.parse(localStorage.getItem("driver") || "{}")

  useEffect(() => {
    if (!driver._id) { navigate("/login"); return }
    API.get(`/orders?driverId=${driver._id}`)
      .then(res => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const delivered = orders.filter(o => o.status === "delivered")
  const today = new Date().toDateString()
  const todayOrders = delivered.filter(o => new Date(o.updatedAt).toDateString() === today)
  const todayEarnings = todayOrders.reduce((s, o) => s + o.totalAmount, 0)
  const totalEarnings = delivered.reduce((s, o) => s + o.totalAmount, 0)
  const avgOrder = delivered.length ? Math.round(totalEarnings / delivered.length) : 0

  // Group by date for chart
  const byDate: Record<string, number> = {}
  delivered.forEach(o => {
    const d = new Date(o.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    byDate[d] = (byDate[d] ?? 0) + o.totalAmount
  })
  const chartData = Object.entries(byDate).map(([date, amount]) => ({ date, amount })).slice(-7)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* TOPBAR */}
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

      <div className="p-6 max-w-2xl mx-auto">
        {/* STATS */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Today", value: `₹${todayEarnings}`, color: "text-yellow-400" },
            { label: "Total Delivered", value: delivered.length.toString(), color: "text-white" },
            { label: "Avg/Order", value: `₹${avgOrder}`, color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-black mt-1 ${color}`}>{loading ? "—" : value}</p>
            </div>
          ))}
        </div>

        {/* CHART */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Earnings Trend (Last 7 days)</h2>
          {chartData.length === 0 ? (
            <div className="text-center py-10 text-gray-600">No delivery data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 12, color: "#fff" }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
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

        {/* RECENT DELIVERIES */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Recent Deliveries</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading...</div>
          ) : delivered.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-gray-500">No deliveries yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {delivered.slice().reverse().slice(0, 10).map(order => (
                <div key={order._id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-yellow-400 font-black">+₹{order.totalAmount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}