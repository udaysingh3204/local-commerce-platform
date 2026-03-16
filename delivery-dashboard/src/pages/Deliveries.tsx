import { useEffect, useState } from "react"
import API from "../api/api"
import type { Order } from "../types/order"

export default function Deliveries() {

  const [orders, setOrders] = useState<Order[]>([])

  const partnerId = "69a9ec0110383934be5af02a"

  const fetchOrders = async () => {

    const res = await API.get(`/delivery/orders/${partnerId}`)

    setOrders(res.data)

  }

  useEffect(() => {

    fetchOrders()

  }, [])

  const updateStatus = async (orderId: string, status: string) => {

    await API.patch(`/orders/${orderId}/status`, {
      status
    })

    fetchOrders()

  }

  return (

    <div className="p-10 bg-gray-100 min-h-screen">

      <h1 className="text-3xl font-bold mb-6">
        Delivery Dashboard
      </h1>

      <div className="space-y-4">

        {orders.map(order => (

          <div
            key={order._id}
            className="bg-white p-6 rounded-xl shadow"
          >

            <p className="font-bold">
              Order #{order._id.slice(-6)}
            </p>

            {order.items.map((item, i) => (
              <p key={i}>
                {item.productId.name} x {item.quantity}
              </p>
            ))}

            <p className="mt-2">
              Amount: ₹{order.totalAmount}
            </p>

            <p>Status: {order.status}</p>

            <div className="mt-4 space-x-2">

              <button
                onClick={() => updateStatus(order._id, "picked_up")}
                className="bg-yellow-500 text-white px-4 py-2 rounded"
              >
                Picked Up
              </button>

              <button
                onClick={() => updateStatus(order._id, "delivered")}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Delivered
              </button>

            </div>

          </div>

        ))}

        {orders.length === 0 && (
          <p className="text-gray-500">
            No deliveries assigned
          </p>
        )}

      </div>

    </div>

  )
}