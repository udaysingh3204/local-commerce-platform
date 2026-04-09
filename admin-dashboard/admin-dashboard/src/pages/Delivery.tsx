import { useEffect, useState } from "react"
import API from "../api/api"

export default function Delivery() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      API.get("/driver/all").then(res => setDrivers(res.data)),
      API.get("/orders/all").then(res => setOrders(res.data)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const activeDeliveries = orders.filter(o => o.status === "out_for_delivery")
  const deliveredOrders  = orders.filter(o => o.status === "delivered")
  const availableDrivers = drivers.filter(d => d.isAvailable)

  const STAT_CARDS = [
    { label: "Total Drivers",     value: drivers.length,          icon: "🚚", color: "text-violet-400",  grad: "from-violet-600 to-purple-700"  },
    { label: "Available",         value: availableDrivers.length, icon: "✅", color: "text-emerald-400", grad: "from-emerald-500 to-teal-600"   },
    { label: "Active Deliveries", value: activeDeliveries.length, icon: "🌀", color: "text-orange-400",  grad: "from-orange-500 to-amber-500"   },
    { label: "Completed",         value: deliveredOrders.length,  icon: "🏁", color: "text-sky-400",     grad: "from-sky-500 to-cyan-500"       },
  ]

  return (
    <div className="p-6 xl:p-8">
      {/* Header */}
      <div className="mb-6 ad-fade-in">
        <h1 className="text-2xl font-black text-white">Delivery Management</h1>
        <p className="text-slate-500 text-sm mt-1">Driver fleet and live delivery tracking</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((s, i) => (
          <div
            key={s.label}
            className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-5 ad-count-up ad-card"
            style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
          >
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${s.grad} flex items-center justify-center text-lg mb-4 shadow-lg`}>
              {s.icon}
            </div>
            <p className="text-slate-500 text-xs font-semibold mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Driver Fleet */}
      <div className="mb-8">
        <h2 className="text-white font-black text-base mb-4">Delivery Fleet</h2>
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-5 animate-pulse">
                <div className="w-10 h-10 bg-white/[0.04] rounded-xl mb-3" />
                <div className="h-3 bg-white/[0.04] rounded-full w-2/3 mb-2" />
                <div className="h-3 bg-white/[0.04] rounded-full w-1/2" />
              </div>
            ))}
          </div>
        ) : drivers.length === 0 ? (
          <div className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🚚</div>
            <p className="text-slate-500">No drivers registered yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {drivers.map(d => (
              <div key={d._id} className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-5 ad-card">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 ${d.isAvailable ? "bg-emerald-700" : "bg-slate-700"}`}>
                    {d.name?.[0]?.toUpperCase() ?? "D"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm truncate">{d.name}</p>
                    <p className="text-slate-500 text-xs truncate">{d.email}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0
                    ${d.isAvailable
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : "text-slate-500 bg-white/[0.03] border-white/[0.05]"
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${d.isAvailable ? "bg-emerald-400" : "bg-slate-600"}`} />
                    {d.isAvailable ? "Free" : "Busy"}
                  </div>
                </div>
                <p className="text-slate-600 text-xs mt-3">
                  Joined {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Deliveries */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-white font-black text-base">Active Deliveries</h2>
          {activeDeliveries.length > 0 && (
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold px-2 py-0.5 rounded-full">
              {activeDeliveries.length} live
            </span>
          )}
        </div>
        <div className="bg-[#0d1120] border border-white/[0.05] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Order ID", "Status", "Amount", "Started"].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDeliveries.map(o => (
                <tr key={o._id} className="border-b border-white/[0.03] ad-table-row">
                  <td className="px-5 py-4 font-mono text-violet-400 text-xs font-bold">#{o._id.slice(-8).toUpperCase()}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border text-orange-400 bg-orange-500/10 border-orange-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      Out for Delivery
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white font-black">₹{o.totalAmount}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {o.deliveryStartTime
                      ? new Date(o.deliveryStartTime).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                </tr>
              ))}
              {activeDeliveries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center">
                    <div className="text-4xl mb-3">🏁</div>
                    <p className="text-slate-500">No active deliveries right now</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
