import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { useCart } from "../context/CartContext"
import { useEffect, useRef, useState } from "react"

export default function Navbar() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const total = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
  const count = cart.reduce((s: number, i: any) => s + i.quantity, 0)

  const prevCount = useRef(count)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (count > prevCount.current) {
      setPulse(true)
      setTimeout(() => setPulse(false), 500)
    }
    prevCount.current = count
  }, [count])

  const isHome = location.pathname === "/"

  return (
    <nav className={`sticky top-0 z-50 ${isHome ? "bg-white/90" : "bg-white/95"} backdrop-blur-xl border-b border-gray-100/80 shadow-sm`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4 py-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-600 to-pink-500 flex items-center justify-center text-lg shadow-md shadow-violet-200 group-hover:shadow-violet-300 transition-shadow">
            🛍️
          </div>
          <span className="text-xl font-black bg-linear-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent hidden sm:block">
            LocalMart
          </span>
        </Link>

        {/* Center: location badge */}
        <div className="hidden md:flex items-center gap-1.5 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="ca-ping-slow-dot w-1.5 h-1.5 bg-violet-500 rounded-full" />
          📍 Noida, UP
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {user && (
            <Link
              to="/orders"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-violet-600 bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-200 px-3 py-2 rounded-xl transition-all"
            >
              📦 Orders
            </Link>
          )}

          {/* Cart */}
          <button
            onClick={() => navigate("/cart")}
            className={`relative flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all ${
              count > 0
                ? "bg-linear-to-r from-violet-600 to-pink-500 shadow-lg shadow-violet-200 hover:shadow-violet-300"
                : "bg-gray-900 hover:bg-violet-600"
            } ${pulse ? "scale-105" : ""}`}
            style={{ transition: "transform 0.2s, background 0.2s, box-shadow 0.2s" }}
          >
            <span className={pulse ? "ca-wiggle inline-block" : "inline-block"}>🛒</span>
            {count > 0 ? (
              <span>₹{total} · {count}</span>
            ) : (
              <span className="hidden sm:inline">Cart</span>
            )}
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 text-gray-900 text-xs font-black rounded-full flex items-center justify-center leading-none">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {/* User */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-pink-400 flex items-center justify-center text-white text-sm font-black shadow-md shadow-violet-200 shrink-0">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <button
                onClick={logout}
                className="hidden sm:block text-xs text-gray-500 hover:text-red-500 transition font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:block text-sm font-semibold text-gray-700 hover:text-violet-600 transition">
                Login
              </Link>
              <Link
                to="/signup"
                className="text-sm font-bold bg-linear-to-r from-violet-600 to-pink-500 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

