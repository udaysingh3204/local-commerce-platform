import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import API from "../api/api"
import { useVendor } from "../context/VendorContext"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function formatCurrency(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return `${n}`
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  accepted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  preparing: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  out_for_delivery: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
      <div className="h-3 w-20 bg-gray-800 rounded mb-4" />
      <div className="h-8 w-28 bg-gray-800 rounded mb-2" />
      <div className="h-2.5 w-16 bg-gray-800 rounded" />
    </div>
  )
}

export default function Dashboard() {
  const { vendor, store } = useVendor()
  const [analytics, setAnalytics] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!store?._id) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      API.get(`/analytics/store/${store._id}`).catch(() => ({ data: {} })),
      API.get(`/products/store/${store._id}`).catch(() => ({ data: [] })),
      API.get(`/orders/store/${store._id}`).catch(() => ({ data: [] })),
    ]).then(([aRes, pRes, oRes]) => {
      setAnalytics(aRes.data)
      setProducts(Array.isArray(pRes.data) ? pRes.data : [])
      setOrders(Array.isArray(oRes.data) ? oRes.data : [])
    }).finally(() => setLoading(false))
  }, [store?._id])

  const lowStock = products.filter(p => p.stock <= 5)
  const recentOrders = orders.slice(0, 6)
  const totalProducts = products.length
  const avgOrderValue = analytics?.totalOrders ? Math.round((analytics.revenue ?? 0) / analytics.totalOrders) : 0
  const deliveryRate = analytics?.totalOrders && analytics?.deliveredOrders
    ? Math.round((analytics.deliveredOrders / analytics.totalOrders) * 100) : 0

  const kpis = [
    { label: "Total Revenue", value: formatCurrency(analytics?.revenue ?? 0), icon: "💰",
      gradient: "from-emerald-500/20 to-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-400",
      badge: "bg-emerald-500/20 text-emerald-400", extra: analytics?.totalOrders ? `${analytics.totalOrders} orders total` : "No orders yet" },
    { label: "Today's Orders", value: analytics?.todayOrders ?? 0, icon: "⚡",
      gradient: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20", text: "text-blue-400",
      badge: "bg-blue-500/20 text-blue-400", extra: analytics?.pendingOrders ? `${analytics.pendingOrders} pending` : "All clear" },
    { label: "Avg Order Value", value: formatCurrency(avgOrderValue), icon: "🛒",
      gradient: "from-purple-500/20 to-purple-600/5", border: "border-purple-500/20", text: "text-purple-400",
      badge: "bg-purple-500/20 text-purple-400", extra: `${totalProducts} products listed` },
    { label: "Delivery Rate", value: `${deliveryRate}%`, icon: "🚀",
      gradient: "from-orange-500/20 to-orange-600/5", border: "border-orange-500/20", text: "text-orange-400",
      badge: "bg-orange-500/20 text-orange-400", extra: analytics?.deliveredOrders ? `${analytics.deliveredOrders} delivered` : "No deliveries yet" },
  ]

  if (!store?._id && !loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-24 space-y-4">
        <div className="text-6xl">🏪</div>
        <h2 className="text-xl font-black text-white">No Store Found</h2>
        <p className="text-gray-400 text-sm max-w-sm">You haven't created a store yet. Get started by setting up your first storefront.</p>
        <Link to="/create-store" className="mt-2 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
          Create Your Store
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">{getGreeting()}, {vendor?.name?.split(" ")[0] ?? "Vendor"} 👋</h2>
          <p className="text-gray-500 text-sm mt-0.5">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Link to="/orders" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-900/40">
          <span>🧾</span> Manage Orders
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />) : kpis.map(kpi => (
          <div key={kpi.label} className={`bg-gradient-to-br ${kpi.gradient} border ${kpi.border} rounded-2xl p-5 space-y-3 hover:scale-[1.02] transition-transform duration-200`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-widest ${kpi.text}`}>{kpi.label}</span>
              <span className="text-xl">{kpi.icon}</span>
            </div>
            <div className={`text-3xl font-black ${kpi.text}`}>{kpi.value}</div>
            <div className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg ${kpi.badge}`}>{kpi.extra}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Recent Orders</h3>
              <p className="text-xs text-gray-500 mt-0.5">Latest {recentOrders.length} orders</p>
            </div>
            <Link to="/orders" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">View all →</Link>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-800">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 bg-gray-800 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5"><div className="h-2.5 w-24 bg-gray-800 rounded" /><div className="h-2 w-16 bg-gray-800 rounded" /></div>
                  <div className="h-5 w-16 bg-gray-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500 text-sm font-medium">No orders received yet</p>
              <p className="text-gray-600 text-xs mt-1">Orders will appear here in real-time</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {recentOrders.map((order: any) => (
                <div key={order._id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-800/30 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 text-xs font-black text-gray-400">#{order._id?.slice(-2)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Order #{order._id?.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-gray-500 truncate">{order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""} · {new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-white">{order.totalAmount}</p>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${STATUS_STYLE[order.status] ?? STATUS_STYLE.pending}`}>{order.status?.replace(/_/g, " ")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Stock Alerts</h3>
              <p className="text-xs text-gray-500 mt-0.5">{totalProducts} products total</p>
            </div>
            {lowStock.length > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2.5 py-1 rounded-full">{lowStock.length} low</span>
            )}
          </div>
          <div className="flex-1">
            {loading ? (
              <div className="p-5 space-y-3">{Array(4).fill(0).map((_, i) => (<div key={i} className="flex items-center justify-between animate-pulse"><div className="h-2.5 w-24 bg-gray-800 rounded" /><div className="h-5 w-14 bg-gray-800 rounded-full" /></div>))}</div>
            ) : lowStock.length === 0 ? (
              <div className="py-10 text-center px-5">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-gray-400 text-sm font-semibold">All stocked up!</p>
                <p className="text-gray-600 text-xs mt-0.5">No products are running low</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50 max-h-64 overflow-y-auto">
                {lowStock.map((p: any) => (
                  <div key={p._id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.image ? <img src={p.image} alt={p.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" /> : <div className="w-7 h-7 rounded-lg bg-gray-800 flex-shrink-0 flex items-center justify-center text-xs">📦</div>}
                      <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${p.stock === 0 ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-800">
            <Link to="/products" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">Manage inventory →</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "📦", label: "Add Product", to: "/products", color: "hover:border-emerald-500/50 hover:bg-emerald-500/5" },
          { icon: "🧾", label: "View Orders", to: "/orders", color: "hover:border-blue-500/50 hover:bg-blue-500/5" },
          { icon: "📈", label: "Analytics", to: "/analytics", color: "hover:border-purple-500/50 hover:bg-purple-500/5" },
          { icon: "🔮", label: "Demand Forecast", to: "/demand-prediction", color: "hover:border-orange-500/50 hover:bg-orange-500/5" },
        ].map(action => (
          <Link key={action.to} to={action.to} className={`bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 group ${action.color}`}>
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
