import { Link, useLocation, useNavigate } from "react-router-dom"

const NAV = [
  { path: "/",           label: "Dashboard", icon: "📊", activeColor: "text-violet-300" },
  { path: "/orders",     label: "Orders",    icon: "📦", activeColor: "text-orange-300" },
  { path: "/stores",     label: "Stores",    icon: "🏪", activeColor: "text-emerald-300" },
  { path: "/users",      label: "Users",     icon: "👥", activeColor: "text-sky-300" },
  { path: "/growth",     label: "Growth",    icon: "🚀", activeColor: "text-fuchsia-300" },
  { path: "/demo-lab",   label: "Demo Lab",  icon: "🧪", activeColor: "text-cyan-300" },
  { path: "/delivery",   label: "Delivery",  icon: "🚚", activeColor: "text-amber-300" },
  { path: "/suppliers",  label: "Suppliers",  icon: "🏭", activeColor: "text-pink-300" },
  { path: "/promotions", label: "Promotions",  icon: "🎟", activeColor: "text-rose-300" },
  { path: "/loyalty",    label: "Loyalty",     icon: "⭐", activeColor: "text-yellow-300" },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const adminUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("adminUser") || "null")
    } catch {
      return null
    }
  })()
  const adminBootstrap = (() => {
    try {
      return JSON.parse(localStorage.getItem("adminBootstrap") || "null")
    } catch {
      return null
    }
  })()

  const logout = () => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminUser")
    localStorage.removeItem("adminBootstrap")
    navigate("/login")
  }

  return (
    <div className="w-60 h-screen bg-[#050810] text-white flex flex-col sticky top-0 border-r border-white/4 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-600 to-purple-700 flex items-center justify-center text-base shadow-lg shadow-violet-900/60 shrink-0">
            👑
          </div>
          <div>
            <p className="font-black text-sm text-white leading-none">LocalMart</p>
            <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto ad-scroll">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest px-3 mb-3">Navigation</p>
        {NAV.map(({ path, label, icon, activeColor }) => {
          const active = pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative
                ${active
                  ? "bg-violet-600/15 text-white"
                  : "text-slate-500 hover:bg-white/4 hover:text-slate-300"
                }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 rounded-r-full" />
              )}
              <span className={`text-base shrink-0 ${active ? activeColor : ""}`}>{icon}</span>
              <span className="flex-1">{label}</span>
              {active && <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-white/4 pt-3 space-y-1">
        {adminBootstrap && (
          <div className="mx-2 mb-2 rounded-2xl border border-white/8 bg-white/4 p-3">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Live startup</p>
            <div className="mt-2 space-y-1 text-xs font-semibold text-slate-300">
              <p>{adminBootstrap.activeOrders ?? 0} active orders</p>
              <p>{adminBootstrap.pendingPayments ?? 0} payment issues</p>
              <p>{adminBootstrap.unassignedOrders ?? 0} unassigned dispatch</p>
            </div>
          </div>
        )}
        <div className="px-3 py-2 mb-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-600/30 flex items-center justify-center text-xs font-black text-violet-300">
              A
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Admin</p>
              <p className="text-xs text-slate-400 font-medium truncate">{adminUser?.email || "admin@localmart.com"}</p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
        >
          <span>🚪</span> Sign out
        </button>
      </div>
    </div>
  )
}