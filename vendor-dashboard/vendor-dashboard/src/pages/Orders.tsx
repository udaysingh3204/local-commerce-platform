import { useEffect, useState } from "react"
import API from "../api/api"
import { io } from "socket.io-client"
import { useVendor } from "../context/VendorContext"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "https://local-commerce-platform-production.up.railway.app"
const socket = io(SOCKET_URL)

export default function Orders(){

const { store } = useVendor()
const storeId = store?._id || ""

const [orders,setOrders] = useState<any[]>([])

const fetchOrders = async () => {

  const res = await API.get(`/orders/store/${storeId}`)

  setOrders(res.data)

}

useEffect(()=>{

  fetchOrders()

  socket.on("newOrder",(order)=>{

    setOrders(prev => [order,...prev])

    alert("🔔 New Order Received!")

  })

  socket.on("orderStatusUpdated",(updatedOrder)=>{

    setOrders(prev =>
      prev.map(o =>
        o._id === updatedOrder._id ? updatedOrder : o
      )
    )

  })

},[])


const updateStatus = async (id:string,status:string)=>{

  await API.patch(`/orders/${id}/status`,{status})

}


return(

<div className="p-10 bg-gray-100 min-h-screen">

<h1 className="text-3xl font-bold mb-8">
Order Management
</h1>

<div className="space-y-6">

{orders.map(order => (

<div key={order._id} className="bg-white p-6 rounded-xl shadow">

<div className="flex justify-between mb-4">

<div>

<h2 className="font-bold text-lg">
Order #{order._id.slice(-6)}
</h2>

<p className="text-sm text-gray-500">
{new Date(order.createdAt).toLocaleString()}
</p>

</div>

<span className="bg-blue-100 px-3 py-1 rounded text-sm">
{order.status}
</span>

</div>


{/* ITEMS */}

<div className="space-y-2">

{order.items.map((item:any)=>(

<div key={item.productId} className="flex items-center gap-3 border-b py-2">

<img
src={item.image}
className="w-10 h-10 object-cover rounded"
/>

<div className="flex-1">

<p className="font-medium">{item.name}</p>

<p className="text-sm text-gray-500">
Qty: {item.quantity}
</p>

</div>

<div>

₹{item.price * item.quantity}

</div>

</div>

))}

</div>


{/* TOTAL */}

<div className="flex justify-between mt-4 font-bold">

<span>Total</span>

<span>₹{order.totalAmount}</span>

</div>


{/* STATUS BUTTONS */}

<div className="flex gap-3 mt-4">

<button
onClick={()=>updateStatus(order._id,"accepted")}
className="bg-blue-500 text-white px-3 py-1 rounded"
>
Accept
</button>

<button
onClick={()=>updateStatus(order._id,"preparing")}
className="bg-yellow-500 text-white px-3 py-1 rounded"
>
Preparing
</button>

<button
onClick={()=>updateStatus(order._id,"out_for_delivery")}
className="bg-purple-500 text-white px-3 py-1 rounded"
>
Out for delivery
</button>

<button
onClick={()=>updateStatus(order._id,"delivered")}
className="bg-green-600 text-white px-3 py-1 rounded"
>
Delivered
</button>

</div>

</div>

))}

{orders.length === 0 && (
<p className="text-gray-500">No orders yet</p>
)}

</div>

</div>

)

}