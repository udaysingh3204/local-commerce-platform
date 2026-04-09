import { Link, useLocation, useNavigate } from "react-router-dom"

const NAV = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/orders", label: "Orders", icon: "📦" },
  { path: "/stores", label: "Stores", icon: "🏪" },
  { path: "/users", label: "Users", icon: "👥" },
  { path: "/delivery", label: "Delivery", icon: "🚚" },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem("adminAuth")
    navigate("/login")
  }

  return (
    <div className="w-60 h-screen bg-gray-950 text-white flex flex-col sticky top-0">
      {/* LOGO */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛍️</span>
          <div>
            <p className="font-black text-sm text-white">LocalMart</p>
            <p className="text-xs text-violet-400 font-semibold">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ path, label, icon }) => {
          const active = pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${active
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* LOGOUT */}
      <div className="px-3 pb-5 border-t border-gray-800 pt-3">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  )
}