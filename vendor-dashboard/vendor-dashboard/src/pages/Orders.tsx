import { useEffect, useState } from "react"
import API from "../api/api"
import type { Order } from "../types/order"
import socket from "../socket/socket"
export default function Orders() {

  const [orders, setOrders] = useState<Order[]>([])

  const storeId = "69a9e3da81a8685ca09a5b17"

  const fetchOrders = async () => {
    const res = await API.get(`/orders/store/${storeId}`)
    setOrders(res.data)
  }

  useEffect(() => {

  fetchOrders()

  socket.on("newOrder", (order) => {

    setOrders(prev => [order, ...prev])

    alert("New Order Received 🚀")

  })

  return () => {
    socket.off("newOrder")
  }

}, [])

  const updateStatus = async (orderId: string, status: string) => {

    await API.put("/orders/status", {
      orderId,
      status
    })

    fetchOrders()
  }

  return (
    <div className="p-10 bg-gray-100 min-h-screen">

      <h1 className="text-3xl font-bold mb-6">
        Order Management
      </h1>

      <div className="bg-white p-6 rounded-xl shadow">

        <table className="w-full">

          <thead>
            <tr className="border-b text-left">
              <th>Order ID</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {orders.map(order => (

              <tr key={order._id} className="border-b">

                <td>{order._id.slice(-6)}</td>

                <td>
                  {order.items.map((item, index) => (
                    <div key={index}>
                      {item.productId.name} x {item.quantity}
                    </div>
                  ))}
                </td>

                <td>₹{order.totalAmount}</td>

                <td className="capitalize">
                  {order.status}
                </td>

                <td className="space-x-2">

                  <button
                    onClick={() => updateStatus(order._id, "accepted")}
                    className="bg-green-500 text-white px-3 py-1 rounded"
                  >
                    Accept
                  </button>

                  <button
                    onClick={() => updateStatus(order._id, "out_for_delivery")}
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    Dispatch
                  </button>

                  <button
                    onClick={() => updateStatus(order._id, "delivered")}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    Delivered
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}