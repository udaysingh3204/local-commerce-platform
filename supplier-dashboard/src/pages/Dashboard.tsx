import { useEffect, useState } from "react"
import API from "../api/api"
import { useSupplier } from "../context/SupplierContext"

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className={`rounded-2xl border ${accent} bg-white/[0.03] p-6`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      {sub && <p className="mt-1.5 text-sm text-slate-400">{sub}</p>}
    </div>
  )
}

type Order = {
  _id: string
  status: string
  totalAmount: number
  createdAt: string
  vendorId?: { storeName?: string; name?: string }
  items?: { name: string; quantity: number }[]
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  confirmed: { label: "Confirmed", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  shipped:   { label: "Shipped",   color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
  delivered: { label: "Delivered", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  cancelled: { label: "Cancelled", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
}

export default function Dashboard() {
  const { supplier, startup } = useSupplier()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supplier) return
    API.get<Order[]>(`/wholesale/orders/${supplier._id}`)
      .then(res => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [supplier])

  const revenue = orders
    .filter(o => o.status === "delivered")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  const activeOrders = orders.filter(
    o => !["delivered", "cancelled"].includes(o.status)
  ).length

  const fulfilled = orders.filter(o => o.status === "delivered").length
  const fulfillmentRate =
    orders.length > 0 ? Math.round((fulfilled / orders.length) * 100) : 0

  const recent = orders.slice(0, 6)

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-400">
          Wholesale workspace
        </p>
        <h1 className="mt-1 text-2xl font-black text-white">
          {greeting}, {supplier?.name?.split(" ")[0] ?? "Supplier"} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Here's your wholesale performance at a glance.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Wholesale Revenue"
          value={loading ? "—" : fmt(revenue)}
          sub="from delivered orders"
          accent="border-indigo-500/20"
        />
        <StatCard
          label="Active Orders"
          value={loading ? "—" : String(activeOrders)}
          sub={`${startup.wholesaleOrders} total lifetime`}
          accent="border-cyan-500/20"
        />
        <StatCard
          label="Product Lines"
          value={loading ? "—" : String(startup.productLines)}
          sub="active wholesale SKUs"
          accent="border-fuchsia-500/20"
        />
        <StatCard
          label="Fulfillment Rate"
          value={loading ? "—" : `${fulfillmentRate}%`}
          sub={`${fulfilled} of ${orders.length} orders delivered`}
          accent="border-emerald-500/20"
        />
      </div>

      {/* Status breakdown */}
      {!loading && orders.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-300 mb-4">
            Orders by status
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => {
              const count = orders.filter(o => o.status === key).length
              if (count === 0) return null
              return (
                <div
                  key={key}
                  className={`rounded-xl border px-4 py-2.5 text-center ${cfg.color}`}
                >
                  <p className="text-xl font-black">{count}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5">
                    {cfg.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent wholesale orders */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-300">
            Recent wholesale orders
          </h2>
          <span className="text-xs text-slate-500">{orders.length} total</span>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading orders…</p>
          </div>
        ) : recent.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm font-bold text-slate-400">No wholesale orders yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Orders from vendors will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map(order => {
              const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending
              const store =
                order.vendorId?.storeName ?? order.vendorId?.name ?? "Vendor"
              const itemSummary =
                order.items
                  ?.map(i => `${i.name} ×${i.quantity}`)
                  .join(", ") ?? "—"
              return (
                <div
                  key={order._id}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{store}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{itemSummary}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-white">
                      ₹{order.totalAmount?.toLocaleString("en-IN") ?? 0}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick tips */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: "📋",
            title: "Manage orders",
            body: "Switch to the Orders tab to confirm, ship or update fulfillment quantities.",
            accent: "border-indigo-500/20",
          },
          {
            icon: "📦",
            title: "Track fulfillment",
            body: "Update tracking numbers and shipment details directly in each wholesale order.",
            accent: "border-cyan-500/20",
          },
          {
            icon: "🔔",
            title: "Supplier inbox",
            body: "Platform alerts for new orders and status changes appear at the top of every page.",
            accent: "border-fuchsia-500/20",
          },
        ].map(card => (
          <div
            key={card.title}
            className={`rounded-2xl border ${card.accent} bg-white/[0.02] p-5`}
          >
            <p className="text-2xl mb-2">{card.icon}</p>
            <p className="text-sm font-black text-white">{card.title}</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
