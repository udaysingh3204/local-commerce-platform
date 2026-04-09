import { useEffect, useState } from "react"
import API from "../api/api"
import { useVendor } from "../context/VendorContext"
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area
} from "recharts"

const DONUT_COLORS = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6"]
const BAR_COLORS = ["#10B981", "#6366F1", "#F59E0B", "#EF4444", "#8B5CF6"]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 shadow-xl">
      {label && <p className="text-xs text-gray-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {p.name?.toLowerCase().includes("revenue") ? "\u20B9" : ""}{p.value}
        </p>
      ))}
    </div>
  )
}

function StatCard({ label, value, icon, sub, color }: { label: string; value: string | number; icon: string; sub?: string; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-gray-800 rounded-2xl p-5 space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

export default function Analytics() {
  const { store } = useVendor()
  const storeId = store?._id ?? ""
  const [data, setData] = useState<any>(null)
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d")

  useEffect(() => {
    if (!storeId) return
    API.get(`/analytics/store/${storeId}`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
  }, [storeId])

  if (!data) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-28 animate-pulse" />)}
      </div>
      <div className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl h-72 animate-pulse" />
        <div className="bg-gray-900 border border-gray-800 rounded-2xl h-72 animate-pulse" />
      </div>
    </div>
  )

  const orderStatusData = [
    { name: "Delivered", value: data.deliveredOrders ?? 0 },
    { name: "Preparing", value: data.preparingOrders ?? 0 },
    { name: "Pending",   value: data.pendingOrders   ?? 0 },
    { name: "Cancelled", value: data.cancelledOrders ?? 0 },
  ].filter(d => d.value > 0)

  const dailySales = data.dailySales ?? []
  const productDemand = (data.productDemand ?? []).slice(0, 8)
  const totalRevenue = data.revenue ?? data.totalRevenue ?? 0
  const avgOrder = data.totalOrders ? Math.round(totalRevenue / data.totalOrders) : 0

  const axisStyle = { fill: "#6B7280", fontSize: 11 }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Analytics</h2>
          <p className="text-gray-500 text-sm mt-0.5">Store performance overview</p>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                period === p ? "bg-emerald-600 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`\u20B9${totalRevenue.toLocaleString("en-IN")}`} icon="💰" color="from-emerald-500/15 to-transparent" sub={`${data.totalOrders ?? 0} orders`} />
        <StatCard label="Total Orders"  value={data.totalOrders ?? 0} icon="📦" color="from-blue-500/15 to-transparent" sub="All time" />
        <StatCard label="Avg Order"     value={`\u20B9${avgOrder.toLocaleString("en-IN")}`} icon="🛒" color="from-purple-500/15 to-transparent" sub="per order" />
        <StatCard label="Delivered"     value={data.deliveredOrders ?? 0} icon="✅" color="from-orange-500/15 to-transparent" sub="successfully delivered" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid xl:grid-cols-3 gap-5">
        {/* Revenue Trend */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold text-white text-sm mb-4">Daily Revenue</h3>
          {dailySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailySales} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `\u20B9${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2.5} fill="url(#revenueGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-600 text-sm">
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <p>No sales data available yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Order Status Donut */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold text-white text-sm mb-4">Order Status</h3>
          {orderStatusData.length > 0 ? (
            <div className="flex flex-col items-center">
              <PieChart width={200} height={200}>
                <Pie
                  data={orderStatusData}
                  cx={100} cy={100}
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {orderStatusData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 w-full">
                {orderStatusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-xs text-gray-400 truncate">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-600 text-sm">
              <div className="text-center">
                <div className="text-3xl mb-2">🥧</div>
                <p>No order data yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-bold text-white text-sm mb-4">Top Selling Products</h3>
        {productDemand.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={productDemand} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" name="Sales" radius={[6, 6, 0, 0]}>
                {productDemand.map((_: any, i: number) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-gray-600 text-sm">
            <div className="text-center">
              <div className="text-3xl mb-2">📦</div>
              <p>No product sales data yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
