import { useCart } from "../context/CartContext"
import API from "../api/api"
import { useAuth } from "../context/useAuth"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

type CartItem = {
  _id: string
  price: number
  quantity: number
  storeId?: string
}

export default function Checkout() {

  const { cart, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const placeOrder = async () => {
    try {

      if (!cart.length) {
        toast.error("Cart is empty ❌")
        return
      }

      if (!user?._id) {
        toast.error("Please log in to place an order")
        navigate("/login")
        return
      }

      const orderData = {
        customerId: user._id,
        storeId: (cart[0] as CartItem)?.storeId,
        items: cart.map((item: CartItem) => ({
          productId: item._id,
          quantity: item.quantity
        })),
        totalAmount: cart.reduce(
          (sum: number, item: CartItem) =>
            sum + item.price * item.quantity,
          0
        )
      }

      const response = await API.post("/orders", orderData)

      toast.success("🎉 Order placed successfully!")

      clearCart()

      // 🔥 redirect to tracking
      navigate(`/track/${response.data.order._id}`)

    } catch (err) {
      console.error(err)
      toast.error("❌ Order failed")
    }
  }

  return (
    <div className="p-8 min-h-screen bg-linear-to-br from-blue-50 to-white">

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="bg-white p-6 rounded-xl shadow-lg max-w-md">

        <p className="text-gray-600 mb-4">
          Confirm your order and proceed 🚀
        </p>

        <button
          onClick={placeOrder}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md 
                     hover:bg-blue-700 hover:scale-105 
                     active:scale-95 
                     transition-all duration-200 ease-in-out"
        >
          🚀 Place Order
        </button>

      </div>

    </div>
  )
}