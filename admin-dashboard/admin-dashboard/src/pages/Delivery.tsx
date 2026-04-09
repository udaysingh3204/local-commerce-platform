import { useEffect, useState } from "react"
import API from "../api/api"

export default function Delivery() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      API.get("/driver/all").then(res => setDrivers(res.data)),
      API.get("/orders/all").then(res => setOrders(res.data))
    ])
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const activeDeliveries = orders.filter(o => o.status === "out_for_delivery")
  const deliveredOrders = orders.filter(o => o.status === "delivered")
  const availableDrivers = drivers.filter(d => d.isAvailable)

  if (loading) return <div className="p-10 text-gray-500">Loading delivery data...</div>

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Delivery Management</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-gray-500 text-sm">Total Drivers</p>
          <h2 className="text-2xl font-bold">{drivers.length}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-gray-500 text-sm">Available</p>
          <h2 className="text-2xl font-bold text-green-600">{availableDrivers.length}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-gray-500 text-sm">Active Deliveries</p>
          <h2 className="text-2xl font-bold text-blue-600">{activeDeliveries.length}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-gray-500 text-sm">Completed</p>
          <h2 className="text-2xl font-bold text-gray-600">{deliveredOrders.length}</h2>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
        <h2 className="font-bold p-4 border-b">Delivery Drivers</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d._id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{d.name}</td>
                <td className="p-3 text-gray-500">{d.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    d.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {d.isAvailable ? "Available" : "Busy"}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-400">No drivers registered</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Active Deliveries */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <h2 className="font-bold p-4 border-b">Active Deliveries</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="text-left p-3">Order ID</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Started</th>
            </tr>
          </thead>
          <tbody>
            {activeDeliveries.map(o => (
              <tr key={o._id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">#{o._id.slice(-6)}</td>
                <td className="p-3">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    Out for Delivery
                  </span>
                </td>
                <td className="p-3">₹{o.totalAmount}</td>
                <td className="p-3 text-gray-500">
                  {o.deliveryStartTime ? new Date(o.deliveryStartTime).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {activeDeliveries.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-400">No active deliveries</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
