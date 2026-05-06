import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { useCart } from "../context/CartContext"
import { useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "../api/api"

export default function Navbar() {
  const { user, startup, logout, authReady } = useAuth()
  const { cart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const total = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
  const count = cart.reduce((s: number, i: any) => s + i.quantity, 0)

  const prevCount = useRef(count)
  const [pulse, setPulse] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (count > prevCount.current) {
      setPulse(true)
      setTimeout(() => setPulse(false), 500)
    }
    prevCount.current = count
  }, [count])

  useEffect(() => {
    let active = true

    if (!authReady || !user) {
      setUnreadNotifications(0)
      return () => {
        active = false
      }
    }

    const token = localStorage.getItem("token")
    if (!token) {
      setUnreadNotifications(0)
      return () => {
        active = false
      }
    }

    fetch(`${API_BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json()
      })
      .then((data) => {
        if (!active) return
        setUnreadNotifications(Number(data?.unreadCount || 0))
      })
      .catch(() => {
        if (active) setUnreadNotifications(0)
      })

    return () => {
      active = false
    }
  }, [authReady, user, location.pathname])

  const isHome = location.pathname === "/"
  const showCompactNav = authReady && Boolean(user)

  return (
    <nav className={`sticky top-0 z-50 ${isHome ? "bg-white/90" : "bg-white/95"} backdrop-blur-xl border-b border-gray-100/80 shadow-sm`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div className="h-15 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-600 to-pink-500 flex items-center justify-center text-lg shadow-md shadow-violet-200 group-hover:shadow-violet-300 transition-shadow">
            🛍️
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-black bg-linear-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent block">
              LocalMart
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">Fast local mode</span>
          </div>
        </Link>

        {/* Center: search bar */}
        <button
          onClick={() => navigate('/search')}
          className="flex-1 max-w-xs hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-400 hover:border-violet-300 hover:bg-violet-50 transition-all cursor-text"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search products across stores...</span>
        </button>

        {/* Right */}
        <div className="flex items-center gap-2">
          {authReady && user && (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                to="/orders"
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-violet-600 bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-200 px-3 py-2 rounded-xl transition-all"
              >
                📦 {startup.activeOrders > 0 ? `${startup.activeOrders} active` : "Orders"}
              </Link>
              <Link
                to="/wishlist"
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-violet-600 bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-200 px-3 py-2 rounded-xl transition-all"
              >
                🤍 Wishlist
              </Link>
              <Link
                to="/notifications"
                className="relative flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-violet-600 bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-200 px-3 py-2 rounded-xl transition-all"
              >
                🔔 Alerts
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-pink-500 text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              {startup.pendingPayments > 0 && (
                <Link
                  to="/orders"
                  className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-100"
                >
                  💳 {startup.pendingPayments} payment{startup.pendingPayments > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          )}

          {/* Mobile search icon */}
          <button
            onClick={() => navigate('/search')}
            className="sm:hidden p-2 rounded-xl text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-all"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

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
          {!authReady ? (
            <div className="w-24 h-10 rounded-xl bg-gray-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name || "User"} className="w-9 h-9 rounded-xl object-cover shadow-md shadow-violet-200 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-pink-400 flex items-center justify-center text-white text-sm font-black shadow-md shadow-violet-200 shrink-0">
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
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

        {showCompactNav && (
          <div className="lg:hidden mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <Link to="/orders" className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-violet-700">
              {startup.activeOrders > 0 ? `${startup.activeOrders} Active` : "Orders"}
            </Link>
            <Link to="/notifications" className="relative shrink-0 rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-pink-700">
              Alerts
              {unreadNotifications > 0 && (
                <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
            <Link to="/wishlist" className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
              Wishlist
            </Link>
            {startup.pendingPayments > 0 && (
              <Link to="/orders" className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                {startup.pendingPayments} Pending Pay
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

