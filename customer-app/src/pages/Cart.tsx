import { useCart } from "../context/CartContext"
import { useNavigate } from "react-router-dom"

type CartItem = {
  _id: string
  name: string
  price: number
  quantity: number
  storeId?: string
}

export default function Cart() {
  const { cart, removeFromCart, updateQuantity } = useCart()
  const navigate = useNavigate()
  const total = cart.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0)

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-violet-50 to-pink-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 text-sm mb-3 flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-3xl font-black text-gray-900">🛒 Your Cart</h1>
          <p className="text-gray-500 text-sm mt-1">{cart.length} item{cart.length !== 1 ? "s" : ""}</p>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-8xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-400 mb-6">Add items from a nearby store!</p>
            <button
              onClick={() => navigate("/")}
              className="bg-linear-to-r from-violet-600 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all"
            >
              Browse Stores
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item: CartItem) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-violet-100 to-pink-100 flex items-center justify-center text-2xl shrink-0">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{item.name}</h3>
                  <p className="text-violet-600 font-bold text-sm mt-0.5">₹{item.price}</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                  <button
                    onClick={() => updateQuantity(item._id, "dec")}
                    className="w-7 h-7 rounded-lg bg-white shadow-sm text-gray-600 font-bold hover:bg-red-50 hover:text-red-600 transition-all text-sm flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="font-black text-gray-900 w-5 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item._id, "inc")}
                    className="w-7 h-7 rounded-lg bg-white shadow-sm text-gray-600 font-bold hover:bg-green-50 hover:text-green-600 transition-all text-sm flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item._id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* ORDER SUMMARY */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
              <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{total}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="text-emerald-600 font-semibold">FREE</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-black text-gray-900 text-base">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full bg-linear-to-r from-violet-600 to-pink-500 text-white py-4 rounded-2xl font-black text-base hover:shadow-xl hover:shadow-violet-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Checkout — ₹{total} →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}