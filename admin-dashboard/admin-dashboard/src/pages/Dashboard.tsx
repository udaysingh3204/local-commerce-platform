import { useEffect, useState } from "react"
import API from "../api/api"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function Dashboard() {

  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get("/analytics/dashboard")
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-10 text-gray-500">Loading dashboard...</div>

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Platform Overview
      </h1>

      <div className="grid grid-cols-4 gap-6 mb-8">

        <div className="bg-white p-6 shadow rounded-xl">
          <p className="text-gray-500 text-sm">Users</p>
          <h2 className="text-2xl font-bold">{stats.users || 0}</h2>
        </div>

        <div className="bg-white p-6 shadow rounded-xl">
          <p className="text-gray-500 text-sm">Stores</p>
          <h2 className="text-2xl font-bold">{stats.stores || 0}</h2>
        </div>

        <div className="bg-white p-6 shadow rounded-xl">
          <p className="text-gray-500 text-sm">Orders</p>
          <h2 className="text-2xl font-bold">{stats.orders || 0}</h2>
        </div>

        <div className="bg-white p-6 shadow rounded-xl">
          <p className="text-gray-500 text-sm">Revenue</p>
          <h2 className="text-2xl font-bold">₹{stats.revenue || 0}</h2>
        </div>

      </div>

      {/* Order Status Breakdown */}
      {stats.statusCounts && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          {Object.entries(stats.statusCounts).map(([status, count]: any) => (
            <div key={status} className="bg-white p-4 shadow rounded-xl text-center">
              <p className="text-gray-500 text-xs capitalize">{status.replace(/_/g, " ")}</p>
              <h3 className="text-xl font-bold">{count}</h3>
            </div>
          ))}
        </div>
      )}

      {/* Daily Sales Chart */}
      {stats.dailySales?.length > 0 && (
        <div className="bg-white p-6 shadow rounded-xl mb-8">
          <h2 className="font-bold mb-4">Daily Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Orders */}
      {stats.recentOrders?.length > 0 && (
        <div className="bg-white p-6 shadow rounded-xl">
          <h2 className="font-bold mb-4">Recent Orders</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="text-left p-2">Order ID</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order: any) => (
                <tr key={order._id} className="border-b">
                  <td className="p-2 font-mono text-xs">#{order._id.slice(-6)}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === "delivered" ? "bg-green-100 text-green-700" :
                      order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-2">₹{order.totalAmount}</td>
                  <td className="p-2 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>

  )

}