import { useEffect, useState } from "react"
import API from "../api/api"

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    API.get("/orders")
      .then(res => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = filter === "all"
    ? orders
    : orders.filter(o => o.status === filter)

  if (loading) return <div className="p-10 text-gray-500">Loading orders...</div>

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">All Orders</h1>

      <div className="flex gap-2 mb-6">
        {["all", "pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="text-left p-3">Order ID</th>
              <th className="text-left p-3">Items</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order._id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">#{order._id.slice(-6)}</td>
                <td className="p-3">{order.items?.length || 0} items</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs capitalize ${
                    order.status === "delivered" ? "bg-green-100 text-green-700" :
                    order.status === "cancelled" ? "bg-red-100 text-red-700" :
                    order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {order.status?.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-3">₹{order.totalAmount}</td>
                <td className="p-3 text-gray-500">{new Date(order.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
