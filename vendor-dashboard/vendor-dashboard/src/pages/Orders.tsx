import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import API from "../api/api"
import socket from "../socket/socket"
import { useVendor } from "../context/VendorContext"

const STATUS_FLOW: Record<string, { next: string; label: string; cls: string } | null> = {
  pending:          { next: "accepted",         label: "Accept Order",      cls: "bg-blue-600 hover:bg-blue-500" },
  accepted:         { next: "preparing",        label: "Start Preparing",   cls: "bg-purple-600 hover:bg-purple-500" },
  preparing:        { next: "out_for_delivery", label: "Out for Delivery",  cls: "bg-orange-600 hover:bg-orange-500" },
  out_for_delivery: { next: "delivered",        label: "Mark Delivered",    cls: "bg-emerald-600 hover:bg-emerald-500" },
  delivered:        null,
  cancelled:        null,
}

const STATUS_BADGE: Record<string, string> = {
  pending:          "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  accepted:         "bg-blue-500/15 text-blue-400 border-blue-500/30",
  preparing:        "bg-purple-500/15 text-purple-400 border-purple-500/30",
  out_for_delivery: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  delivered:        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled:        "bg-red-500/15 text-red-400 border-red-500/30",
}

const PAYMENT_BADGE: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
}

const TABS = ["All", "Pending", "Accepted", "Preparing", "Out for Delivery", "Delivered"]
const TAB_FILTER: Record<string, string | null> = {
  All: null, Pending: "pending", Accepted: "accepted",
  Preparing: "preparing", "Out for Delivery": "out_for_delivery", Delivered: "delivered",
}

export default function Orders() {
  const { store } = useVendor()
  const storeId = store?._id ?? ""
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("All")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!storeId) return
    try {
      const res = await API.get(`/orders/store/${storeId}`)
      setOrders(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchOrders()
    socket.connect()
    const onNew = (order: any) => {
      setOrders(prev => [order, ...prev])
      toast.success("New order received!", { description: `Order #${order._id?.slice(-6).toUpperCase()}` })
    }
    const onUpdate = (updated: any) => {
      setOrders(prev => prev.map(o => o._id === updated._id ? updated : o))
    }
    socket.on("newOrder", onNew)
    socket.on("orderStatusUpdated", onUpdate)
    return () => {
      socket.off("newOrder", onNew)
      socket.off("orderStatusUpdated", onUpdate)
      socket.disconnect()
    }
  }, [fetchOrders])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      await API.patch(`/orders/${id}/status`, { status })
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o))
      toast.success(`Order marked as ${status.replace(/_/g, " ")}`)
    } catch {
      toast.error("Failed to update order status")
    } finally {
      setUpdating(null)
    }
  }

  const filtered = orders.filter(o => {
    const f = TAB_FILTER[activeTab]
    return f ? o.status === f : true
  })

  const tabCount = (tab: string) => {
    const f = TAB_FILTER[tab]
    return f ? orders.filter(o => o.status === f).length : orders.length
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Orders</h2>
          <p className="text-gray-500 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-gray-400">Live updates on</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
            }`}
          >
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-white/20" : "bg-gray-800 text-gray-500"}`}>
              {tabCount(tab)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
              <div className="flex justify-between gap-4">
                <div className="h-4 w-28 bg-gray-800 rounded" />
                <div className="h-4 w-20 bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl py-20 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400 font-semibold">No orders here</p>
          <p className="text-gray-600 text-sm mt-1">Orders will appear here when customers place them</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order: any) => {
            const isOpen = expanded === order._id
            const action = STATUS_FLOW[order.status]
            return (
              <div key={order._id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
                {/* Header Row */}
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer select-none"
                  onClick={() => setExpanded(isOpen ? null : order._id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 text-xs font-black text-gray-300">
                    #{order._id?.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">Order #{order._id?.slice(-6).toUpperCase()}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[order.status] ?? STATUS_BADGE.pending}`}>
                        {order.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""} &middot; {new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <p className="text-base font-black text-white">&#8377;{order.totalAmount}</p>
                    <span className={`text-gray-600 text-xs transition-transform duration-200 inline-block ${isOpen ? "-rotate-180" : ""}`}>▼</span>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isOpen && (
                  <div className="border-t border-gray-800">
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PAYMENT_BADGE[order.paymentStatus] ?? PAYMENT_BADGE.pending}`}>
                          Payment: {order.paymentStatus || "pending"}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          Method: {order.paymentMethod || "cod"}
                        </span>
                      </div>
                      {order.paymentFailureReason && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                          {order.paymentFailureReason}
                        </div>
                      )}
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Order Items</p>
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-800 shrink-0 flex items-center justify-center text-sm">📦</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{item.name ?? item.productId?.name ?? "Product"}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} &times; &#8377;{item.price}</p>
                          </div>
                          <p className="text-sm font-bold text-white">&#8377;{item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>

                    <div className="px-5 py-4 bg-gray-800/40 flex items-center justify-between border-t border-gray-800 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Order Total</p>
                        <p className="text-xl font-black text-white">&#8377;{order.totalAmount}</p>
                      </div>
                      <div className="flex gap-2">
                        {action ? (
                          <button
                            onClick={() => updateStatus(order._id, action.next)}
                            disabled={updating === order._id}
                            className={`${action.cls} disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg`}
                          >
                            {updating === order._id ? "Updating..." : action.label}
                          </button>
                        ) : (
                          <span className={`text-sm font-bold px-4 py-2 rounded-xl ${order.status === "delivered" ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-red-400 bg-red-500/10 border border-red-500/20"}`}>
                            {order.status === "delivered" ? "Completed ✓" : "Cancelled"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
