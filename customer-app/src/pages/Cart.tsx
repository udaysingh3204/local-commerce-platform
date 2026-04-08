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

  const total = cart.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0
  )

  return (
    <div className="p-8 bg-linear-to-br from-gray-100 to-gray-200 min-h-screen">

      <h1 className="text-3xl font-bold mb-6">🛒 Your Cart</h1>

      {cart.length === 0 ? (
        <p className="text-gray-600">No items in cart</p>
      ) : (
        <div className="space-y-4">

          {cart.map((item: CartItem) => (

            <div
              key={item._id}
              className="bg-white p-4 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
            >

              <div>
                <h2 className="font-semibold text-lg">{item.name}</h2>
                <p className="text-gray-600">₹{item.price}</p>

                <div className="flex gap-3 mt-2 items-center">
                  <button
                    onClick={() => updateQuantity(item._id, "dec")}
                    className="bg-gray-200 px-2 rounded"
                  >
                    ➖
                  </button>

                  <span className="font-semibold">{item.quantity}</span>

                  <button
                    onClick={() => updateQuantity(item._id, "inc")}
                    className="bg-gray-200 px-2 rounded"
                  >
                    ➕
                  </button>
                </div>
              </div>

              <button
                onClick={() => removeFromCart(item._id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>

            </div>

          ))}

          <div className="mt-6 text-xl font-bold text-green-700">
            Total: ₹{total}
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="mt-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-md 
                       hover:bg-green-700 hover:scale-105 
                       active:scale-95 transition-all"
          >
            🚀 Proceed to Checkout
          </button>

        </div>
      )}

    </div>
  )
}