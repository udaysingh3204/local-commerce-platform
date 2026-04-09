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

      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-4">
          <p className="text-yellow-800">Please <a href="/login" className="underline font-bold">log in</a> to place an order.</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-lg max-w-lg">

        {cart.length === 0 ? (
          <p className="text-gray-500">Your cart is empty</p>
        ) : (
          <>
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {cart.map((item: CartItem) => (
                <div key={item._id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{(item as any).name || "Item"}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3 mb-6">
              <span>Total</span>
              <span>₹{cart.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)}</span>
            </div>
          </>
        )}

        <button
          onClick={placeOrder}
          disabled={!cart.length || !user}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md 
                     hover:bg-blue-700 hover:scale-105 
                     active:scale-95 
                     transition-all duration-200 ease-in-out
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          🚀 Place Order
        </button>

      </div>

    </div>
  )
}