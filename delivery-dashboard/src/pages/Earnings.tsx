import { useEffect, useState } from "react"
import API from "../api/api"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function Earnings() {

  const [orders, setOrders] = useState<any[]>([])

  const driver = JSON.parse(localStorage.getItem("driver") || "{}")

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await API.get(`/orders?driverId=${driver._id}`)
      setOrders(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  // 📊 FILTERS
  const today = new Date().toDateString()

  const todayOrders = orders.filter(
    o => new Date(o.updatedAt).toDateString() === today && o.status === "delivered"
  )

  const todayEarnings = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)

  const totalOrders = orders.filter(o => o.status === "delivered").length

  const avgOrderValue = totalOrders
    ? Math.round(todayEarnings / totalOrders)
    : 0

  // 📈 GRAPH DATA
  const chartData = orders
    .filter(o => o.status === "delivered")
    .map(o => ({
      date: new Date(o.updatedAt).toLocaleDateString(),
      amount: o.totalAmount
    }))

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <h1 className="text-3xl font-bold mb-6">💰 Earnings Dashboard</h1>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-gray-500">Today Earnings</h3>
          <p className="text-2xl font-bold text-green-600">₹{todayEarnings}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-gray-500">Orders Completed</h3>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-gray-500">Avg per Order</h3>
          <p className="text-2xl font-bold">₹{avgOrderValue}</p>
        </div>

      </div>

      {/* GRAPH */}
      <div className="bg-white p-6 rounded-xl shadow">

        <h2 className="text-lg font-semibold mb-4">
          📈 Earnings Trend
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#2563eb"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>

      </div>

    </div>
  )
}