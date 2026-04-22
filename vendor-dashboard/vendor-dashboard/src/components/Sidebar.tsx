import { Link, useLocation } from "react-router-dom"
import { useVendor } from "../context/VendorContext"

const NAV = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/products", label: "Products", icon: "📦" },
  { path: "/orders", label: "Orders", icon: "🧾" },
  { path: "/analytics", label: "Analytics", icon: "📈" },
  { path: "/reviews", label: "Reviews", icon: "⭐" },
  { path: "/demand-prediction", label: "Demand Forecast", icon: "🔮" },
  { path: "/create-store", label: "Create Store", icon: "🏪" },
]

export default function Sidebar() {
  const { vendor, store, stores, selectStore, logout } = useVendor()
  const { pathname } = useLocation()

  return (
    <div className="w-60 h-screen bg-gray-950 text-white flex flex-col sticky top-0">
      {/* LOGO */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛍️</span>
          <div>
            <p className="font-black text-sm text-white">LocalMart</p>
            <p className="text-xs text-emerald-400 font-semibold">Vendor Panel</p>
          </div>
        </div>
        {vendor && (
          <p className="text-xs text-gray-500 mt-2 truncate">{vendor.name}</p>
        )}
        {stores.length > 1 && (
          <select
            value={store?._id || ""}
            onChange={e => { const s = stores.find(st => st._id === e.target.value); if (s) selectStore(s) }}
            className="mt-2 w-full bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none"
          >
            {stores.map(s => <option key={s._id} value={s._id}>{s.storeName}</option>)}
          </select>
        )}
        {store && stores.length <= 1 && (
          <p className="text-xs text-gray-600 mt-1 truncate">📍 {store.storeName}</p>
        )}
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
                ${ active
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <span>{icon}</span>{label}
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