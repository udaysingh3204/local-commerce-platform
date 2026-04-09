import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { useCart } from "../context/CartContext"

export default function Navbar() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const navigate = useNavigate()
  const total = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0)

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <Link to="/" className="flex items-center gap-2 group">
        <span className="text-2xl">🛍️</span>
        <span className="text-xl font-black bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
          LocalMart
        </span>
      </Link>

      <div className="flex items-center gap-3">
        {user && (
          <Link
            to="/orders"
            className="hidden sm:flex items-center gap-1 text-sm text-gray-600 hover:text-violet-600 transition font-medium"
          >
            📦 My Orders
          </Link>
        )}

        <button
          onClick={() => navigate("/cart")}
          className="relative flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-violet-600 transition-all"
        >
          <span>🛒</span>
          {cart.length > 0 ? (
            <span>₹{total} · {cart.length}</span>
          ) : (
            <span>Cart</span>
          )}
        </button>

        {user ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-500 transition font-medium"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm text-gray-700 hover:text-violet-600 font-medium transition">
              Login
            </Link>
            <Link
              to="/signup"
              className="text-sm bg-gradient-to-r from-violet-600 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-200 transition-all"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
