import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import API from "../api/api"
import { useAuth } from "../context/useAuth"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; step: number }> = {
  pending:          { label: "Order Placed",   color: "bg-yellow-100 text-yellow-700",  icon: "⏳", step: 1 },
  accepted:         { label: "Accepted",        color: "bg-blue-100 text-blue-700",     icon: "✅", step: 2 },
  out_for_delivery: { label: "On the Way",      color: "bg-orange-100 text-orange-700", icon: "🚚", step: 3 },
  delivered:        { label: "Delivered",       color: "bg-green-100 text-green-700",   icon: "🎉", step: 4 },
  cancelled:        { label: "Cancelled",       color: "bg-red-100 text-red-700",       icon: "❌", step: 0 },
}

const STEPS = ["pending", "accepted", "out_for_delivery", "delivered"]

export default function Orders() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate("/login"); return }
    const fetch = async () => {
      try {
        const storedToken = localStorage.getItem("token")
        const res = await API.get(`/orders/customer/${user._id}`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
        setOrders(res.data)
      } catch { /* silent */ } finally { setLoading(false) }
    }
    fetch()
  }, [user])

  if (!user) return null

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
        <div className="mb-4" />

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
                  {isActive && (
                    <div className="border-t border-gray-50 px-5 py-3 bg-violet-50">
                      <button
                        onClick={() => navigate(`/track/${order._id}`)}
                        className="flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-800 transition"
                      >
                        🗺️ Track Live Location →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
