import { useCart } from "../context/CartContext"
import API from "../api/api"
import { useNavigate } from "react-router-dom"

export default function Checkout(){

  const { cart, setCart } = useCart()
  const navigate = useNavigate()

  const placeOrder = async () => {

    if(cart.length === 0){
      alert("Cart is empty")
      return
    }

    const order = {
      customerId: "65f000000000000000000001",
      storeId: cart[0].storeId,
      items: cart.map((p:any)=>({
        productId: p._id,
        quantity: p.quantity
      })),
      totalAmount: cart.reduce(
        (sum:any,p:any)=>sum+p.price*p.quantity,
        0
      )
    }

    const res = await API.post("/orders", order)

    alert("Order placed successfully 🚀")

    setCart([])

    // ✅ FIXED ROUTE
    navigate(`/track/${res.data.order._id}`)
  }

  return(
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Checkout
      </h1>

      <button
        onClick={placeOrder}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Place Order
      </button>

    </div>
  )
}