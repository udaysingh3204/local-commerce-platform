import { useEffect, useState } from "react"
import API from "../api/api"

export default function Orders() {

  const [orders, setOrders] = useState<any[]>([])

  const supplierId = "69aa0785019e9e19966f1aa2"

  const fetchOrders = async () => {

    const res = await API.get(`/wholesale/orders/${supplierId}`)

    setOrders(res.data)

  }

  useEffect(() => {

    fetchOrders()

  }, [])

  return (

    <div className="p-10 bg-gray-100 min-h-screen">

      <h1 className="text-3xl font-bold mb-6">

        Supplier Orders

      </h1>

      {orders.map(order => (

        <div key={order._id} className="bg-white p-6 rounded-xl shadow mb-4">

          <p className="font-bold">

            Order #{order._id.slice(-6)}

          </p>

          {order.items.map((item:any,i:number)=>(
            <p key={i}>
              {item.productId.name} x {item.quantity}
            </p>
          ))}

          <p className="mt-2">

            Total: ₹{order.totalAmount}

          </p>

          <p>Status: {order.status}</p>

        </div>

      ))}

    </div>

  )

}