import { useState } from "react"
import { useCart } from "../context/CartContext"
import API from "../api/api"
import { useAuth } from "../context/useAuth"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "sonner"

type CartItem = {
  _id: string
  name?: string
  price: number
  quantity: number
  storeId?: string
  image?: string
}

const PAYMENT_OPTIONS = [
  { id: "cod", icon: "💵", label: "Cash on Delivery", sub: "Pay when you receive" },
  { id: "upi", icon: "📱", label: "UPI / PhonePe", sub: "Pay instantly with UPI" },
]

export default function Checkout() {
  const { cart, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [payMethod, setPayMethod] = useState("cod")
  const [address, setAddress] = useState({ line: "", city: "Noida", pincode: "" })
  const [loading, setLoading] = useState(false)
  const [placed, setPlaced] = useState(false)

  const subtotal = cart.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0)
  const deliveryFee = 0

  const setAddr = (k: keyof typeof address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress(a => ({ ...a, [k]: e.target.value }))

  const placeOrder = async () => {
    if (!cart.length) return toast.error("Your cart is empty")
    if (!user?._id) { toast.error("Please log in"); navigate("/login"); return }
    setLoading(true)
    try {
      const res = await API.post("/orders", {
        customerId: user._id,
        storeId: (cart[0] as CartItem)?.storeId,
        items: cart.map((i: CartItem) => ({ productId: i._id, quantity: i.quantity })),
        totalAmount: subtotal,
      })
      setPlaced(true)
      clearCart()
      toast.success("🎉 Order placed successfully!")
      setTimeout(() => navigate(`/track/${res.data.order._id}`), 1600)
    } catch {
      toast.error("Order failed — please try again")
    } finally {
      setLoading(false)
    }
  }

  /* ── Success State ── */
  if (placed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-sm w-full p-10 text-center ca-bounce-in">
          <div className="text-7xl mb-5">🎉</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-500 text-sm">Redirecting you to live tracking...</p>
          <div className="mt-6 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-violet-600 to-pink-500 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    )
  }

  /* ── Login Guard ── */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-sm w-full p-10 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Login required</h2>
          <p className="text-gray-500 text-sm mb-6">Please sign in to place your order.</p>
          <Link to="/login" className="inline-block bg-linear-to-r from-violet-600 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all">
            Sign In →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-linear-to-r from-violet-900 via-violet-800 to-fuchsia-900 text-white px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/cart" className="text-violet-300 hover:text-white text-sm font-medium transition">← Back to cart</Link>
            <span className="text-violet-600">·</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="text-base">🔒</span> 100% Secure Checkout
            </span>
          </div>
          <h1 className="text-3xl font-black">Checkout</h1>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            {["Cart", "Review", "Track"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${i === 1 ? "bg-white text-violet-700" : "bg-white/10 text-white/50"}`}>
                  <span>{i === 0 ? "✓" : i + 1}</span> {s}
                </div>
                {i < 2 && <div className="w-4 h-0.5 bg-white/20 rounded-full" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="text-7xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Your cart is empty</h2>
          <Link to="/" className="inline-block bg-linear-to-r from-violet-600 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all">
            Browse Stores →
          </Link>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-5 gap-8">

          {/* ── LEFT: ORDER SUMMARY ── */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-lg font-black text-gray-900">Order Summary</h2>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {cart.map((item: CartItem) => (
                <div key={item._id} className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-xl bg-linear-to-br from-violet-100 to-pink-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl" /> : "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">{item.name ?? "Item"}</h4>
                    <p className="text-gray-500 text-xs mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-black text-violet-700 text-sm shrink-0">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            {/* Delivery address (UI) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
                <span>📍</span> Delivery Address
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Street / Flat / Area</label>
                  <input
                    type="text"
                    value={address.line}
                    onChange={setAddr("line")}
                    placeholder="e.g. Block A, Sector 18, Flat 204"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={setAddr("city")}
                      className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pincode</label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={setAddr("pincode")}
                      placeholder="201301"
                      className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
                <span>💳</span> Payment Method
              </h3>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPayMethod(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      payMethod === opt.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${payMethod === opt.id ? "text-violet-700" : "text-gray-900"}`}>{opt.label}</p>
                      <p className="text-gray-500 text-xs">{opt.sub}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${payMethod === opt.id ? "border-violet-500" : "border-gray-300"}`}>
                      {payMethod === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: PRICE + CTA ── */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-black text-gray-900">Price Breakdown</h2>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20">
              {/* Account row */}
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl mb-5">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-pink-400 flex items-center justify-center text-white text-base font-black shrink-0">
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                  <p className="text-gray-500 text-xs truncate">{user.email}</p>
                </div>
              </div>

              {/* Price rows */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.length} item{cart.length > 1 ? "s" : ""})</span>
                  <span className="font-semibold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform fee</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between font-black text-gray-900 text-base">
                  <span>Total</span>
                  <span className="text-violet-700">₹{subtotal + deliveryFee}</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={placeOrder}
                disabled={loading || !cart.length}
                className="mt-5 w-full bg-linear-to-r from-violet-600 to-pink-500 text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full ca-spin-slow" />
                    Placing order...
                  </span>
                ) : (
                  `🚀 Place Order — ₹${subtotal}`
                )}
              </button>

              {/* Trust badges */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {["🔒 Secure", "⚡ Fast", "🎉 Easy returns"].map(b => (
                  <div key={b} className="bg-gray-50 rounded-xl py-2 text-xs font-semibold text-gray-500">{b}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
