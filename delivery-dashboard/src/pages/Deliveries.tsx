import { useEffect, useState } from "react"
import API from "../api/api"
import LocationSender from "./LocationSender"
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client"
import { toast } from "sonner"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "https://local-commerce-platform-production.up.railway.app"
const socket = io(SOCKET_URL)

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  accepted: "bg-blue-900/40 text-blue-400 border-blue-800",
  out_for_delivery: "bg-orange-900/40 text-orange-400 border-orange-800",
  delivered: "bg-green-900/40 text-green-400 border-green-800",
}

export default function Deliveries() {
  const [orders, setOrders] = useState<any[]>([])
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem("driver")) navigate("/login")
  }, [])

  const fetchOrders = async () => {
    try {
      const driver = JSON.parse(localStorage.getItem("driver") || "{}")
      const res = driver?._id
        ? await API.get(`/orders?driverId=${driver._id}`)
        : await API.get("/orders")
      setOrders(res.data)
    } catch { /* silent */ }
  }

  useEffect(() => { fetchOrders() }, [])

  const acceptOrder = async (orderId: string) => {
    try {
      const driver = JSON.parse(localStorage.getItem("driver") || "{}")
      await API.patch(`/orders/${orderId}/status`, { status: "accepted", driverId: driver._id })
      const selected = orders.find(o => o._id === orderId)
      setActiveOrder(selected ? { ...selected, status: "accepted", deliveryPartnerId: driver._id } : null)
      setOrders(prev => prev.filter(o => o._id !== orderId))
      toast.success("Order accepted! ??")
      navigate(`/track/${orderId}`)
    } catch { toast.error("Failed to accept order") }
  }

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await API.patch(`/orders/${orderId}/status`, { status })
      if (status === "delivered") {
        if (activeOrder) setTotalEarnings(prev => prev + activeOrder.totalAmount)
        setActiveOrder(null)
        fetchOrders()
        toast.success("Delivery complete! ??")
      } else {
        toast.success("Status updated!")
        setActiveOrder((prev: any) => prev ? { ...prev, status } : null)
      }
    } catch { toast.error("Failed to update status") }
  }

  useEffect(() => {
    socket.on("newOrder", (order) => {
      if (!order.deliveryPartnerId) setOrders(prev => [order, ...prev])
    })
    return () => { socket.off("newOrder") }
  }, [])

  useEffect(() => {
    socket.on("deliveryAssigned", (data: any) => {
      const driver = JSON.parse(localStorage.getItem("driver") || "{}")
      if (data.driverId === driver._id) {
        toast("?? New Order Assigned!", { description: `Order #${data.orderId.slice(-6)}` })
        API.get(`/orders?driverId=${driver._id}`).then(res => {
          const latest = res.data.find((o: any) => o._id === data.orderId)
          if (latest) { setActiveOrder(latest); navigate(`/track/${data.orderId}`) }
        })
      }
    })
    return () => { socket.off("deliveryAssigned") }
  }, [])

  const driver = JSON.parse(localStorage.getItem("driver") || "{}")

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* TOPBAR */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-lg">
            ???
          </div>
          <div>
            <p className="font-black text-white text-sm">{driver.name ?? "Driver"}</p>
            <p className="text-gray-500 text-xs">{driver.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/earnings")}
            className="bg-gray-800 hover:bg-gray-700 text-yellow-400 px-3 py-2 rounded-xl text-xs font-bold transition border border-gray-700"
          >
            ?? Earnings
          </button>
          <button
            onClick={() => { localStorage.removeItem("driver"); localStorage.removeItem("driverToken"); navigate("/login") }}
            className="bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 px-3 py-2 rounded-xl text-xs font-bold transition border border-gray-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* EARNINGS PILL */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Session Earnings</p>
            <p className="text-2xl font-black text-yellow-400 mt-1">{totalEarnings}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Available Orders</p>
            <p className="text-2xl font-black text-white mt-1">{orders.length}</p>
          </div>
        </div>

        {/* ACTIVE ORDER */}
        {activeOrder && (
          <div className="bg-gray-900 border-2 border-orange-500/50 rounded-2xl p-5 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-transparent" />
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-orange-400 font-bold text-sm uppercase tracking-wide">Active Delivery</p>
            </div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 font-mono">#{activeOrder._id.slice(-8).toUpperCase()}</p>
                <p className="text-2xl font-black text-white mt-0.5">{activeOrder.totalAmount}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${STATUS_COLORS[activeOrder.status] ?? STATUS_COLORS.accepted}`}>
                {activeOrder.status?.replace(/_/g, " ")}
              </span>
            </div>

            {/* LOCATION SENDER */}
            <div className="bg-gray-800 rounded-xl p-3 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <LocationSender orderId={activeOrder._id} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => updateStatus(activeOrder._id, "out_for_delivery")}
                className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-3 rounded-xl font-bold text-sm transition"
              >
                ?? Start Delivery
              </button>
              <button
                onClick={() => updateStatus(activeOrder._id, "delivered")}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-sm transition"
              >
                ? Mark Delivered
              </button>
            </div>
          </div>
        )}

        {/* AVAILABLE ORDERS */}
        {!activeOrder && (
          <>
            <h2 className="text-gray-400 text-sm font-bold uppercase tracking-wide mb-3">
              {orders.length === 0 ? "No orders available" : "Available Orders"}
            </h2>
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">??</div>
                <p className="text-gray-500">Waiting for new orders...</p>
                <p className="text-gray-600 text-xs mt-1">New orders will appear here in real-time</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order._id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-xl font-black text-white mt-0.5">{order.totalAmount}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                        {order.status?.replace(/_/g, " ") ?? "pending"}
                      </span>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {order.items.slice(0, 3).map((item: any, i: number) => (
                          <span key={i} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-lg">
                            {item.name} ×{item.quantity}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => acceptOrder(order._id)}
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 py-2.5 rounded-xl font-black text-sm hover:shadow-lg hover:shadow-orange-900 transition-all"
                    >
                      Accept Order
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
