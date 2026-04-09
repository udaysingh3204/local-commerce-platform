import { useEffect, useState } from "react"
import API from "../api/api"
import LocationSender from "./LocationSender"
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "https://local-commerce-platform-production.up.railway.app"
const socket = io(SOCKET_URL)

export default function Deliveries() {

  const [orders, setOrders] = useState<any[]>([])
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [totalEarnings, setTotalEarnings] = useState(0)

  const navigate = useNavigate()

  // 🔐 AUTH CHECK
  useEffect(() => {
    const driver = localStorage.getItem("driver")
    if (!driver) navigate("/login")
  }, [])

  // 📦 FETCH ORDERS
  const fetchOrders = async () => {
    try {
      const driver = JSON.parse(localStorage.getItem("driver") || "{}")

      const res = driver?._id
        ? await API.get(`/orders?driverId=${driver._id}`)
        : await API.get("/orders")

      setOrders(res.data)

    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // ✅ ACCEPT ORDER
  const acceptOrder = async (orderId: string) => {
    try {
      const driver = JSON.parse(localStorage.getItem("driver") || "{}")

      await API.patch(`/orders/${orderId}/status`, {
        status: "accepted",
        driverId: driver._id
      })

      const selected = orders.find(o => o._id === orderId)

      setActiveOrder(selected)
      setOrders(prev => prev.filter(o => o._id !== orderId))

      navigate(`/track/${orderId}`)

    } catch (err) {
      console.error(err)
    }
  }

  // 🔄 UPDATE STATUS
  const updateStatus = async (orderId: string, status: string) => {
    try {
      await API.patch(`/orders/${orderId}/status`, { status })

      if (status === "delivered") {
        const order = activeOrder

        if (order) {
          setTotalEarnings(prev => prev + order.totalAmount)
        }

        setActiveOrder(null)
        fetchOrders()
      }

    } catch (err) {
      console.error(err)
    }
  }

  // 🔥 NEW ORDER (REALTIME)
  useEffect(() => {
    socket.on("newOrder", (order) => {
      setOrders(prev => [order, ...prev])
    })

    return () => {
      socket.off("newOrder")
    }
  }, [])

  // 🚚 AUTO ASSIGN HANDLER (IMPORTANT)
  useEffect(() => {
    socket.on("deliveryAssigned", (data: any) => {

      const driver = JSON.parse(localStorage.getItem("driver") || "{}")

      if (data.driverId === driver._id) {

        alert("🚚 New Order Assigned!")

        // Fetch latest order
        API.get(`/orders?driverId=${driver._id}`)
          .then(res => {
            const latest = res.data.find((o: any) => o._id === data.orderId)

            if (latest) {
              setActiveOrder(latest)
              navigate(`/track/${data.orderId}`)
            }
          })

      }

    })

    return () => {
      socket.off("deliveryAssigned")
    }

  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🚚 Driver Dashboard</h1>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/earnings")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            💰 Earnings
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("driver")
              navigate("/login")
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>

      {/* EARNINGS */}
      <div className="bg-white shadow-md rounded-xl p-4 mb-6">
        <h2 className="text-lg font-semibold">💰 Today Earnings</h2>
        <p className="text-2xl font-bold text-green-600">
          ₹{totalEarnings}
        </p>
      </div>

      {/* AVAILABLE ORDERS */}
      {!activeOrder && (
        <div className="grid md:grid-cols-2 gap-4">

          {orders.map(order => (
            <div
              key={order._id}
              className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition"
            >
              <p className="font-semibold">🧾 {order._id.slice(-6)}</p>
              <p className="text-gray-600">₹{order.totalAmount}</p>

              <button
                onClick={() => acceptOrder(order._id)}
                className="bg-blue-600 text-white px-3 py-1 rounded mt-2"
              >
                Accept
              </button>
            </div>
          ))}

        </div>
      )}

      {/* ACTIVE ORDER */}
      {activeOrder && (
        <div className="bg-white p-6 rounded-xl shadow-lg">

          <h2 className="text-xl font-bold mb-3">
            🚚 Active Order
          </h2>

          <p>Order ID: {activeOrder._id}</p>

          {/* 📍 LOCATION */}
          <LocationSender orderId={activeOrder._id} />

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => updateStatus(activeOrder._id, "picked")}
              className="bg-yellow-500 text-white px-4 py-2 rounded"
            >
              📦 Picked
            </button>

            <button
              onClick={() => updateStatus(activeOrder._id, "delivered")}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              ✅ Delivered
            </button>
          </div>

        </div>
      )}

    </div>
  )
}