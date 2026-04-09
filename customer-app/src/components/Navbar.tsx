import { Link } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { useCart } from "../context/CartContext"

export default function Navbar() {
  const { user, logout } = useAuth()
  const { cart } = useCart()

  return (
    <nav className="bg-white shadow-sm px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="text-xl font-bold text-blue-600">
        LocalMart
      </Link>

      <div className="flex items-center gap-4">
        <Link to="/cart" className="relative text-gray-700 hover:text-blue-600">
          🛒
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.name}</span>
            <button
              onClick={logout}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800">
              Login
            </Link>
            <Link to="/signup" className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
