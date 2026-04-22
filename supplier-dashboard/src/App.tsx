import { SupplierProvider, useSupplier } from "./context/SupplierContext"
import { useEffect, useState } from "react"
import API from "./api/api"
import Orders from "./pages/Orders"
import Login from "./pages/Login"

type SupplierNotification = {
  _id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  data?: {
    status?: string
    scope?: string
  } | null
}

function AppContent() {
  const { supplier, startup, logout, authReady } = useSupplier()
  const [notifications, setNotifications] = useState<SupplierNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!supplier) return

    let disposed = false

    const loadNotifications = async () => {
      try {
        const res = await API.get("/notifications", {
          params: { limit: 4, sort: "-createdAt" },
        })

        if (disposed) return

        const items = Array.isArray(res.data?.notifications) ? res.data.notifications : []
        setNotifications(items)
        setUnreadCount(Number(res.data?.unreadCount || 0))
      } catch {
        if (!disposed) {
          setNotifications([])
          setUnreadCount(0)
        }
      }
    }

    void loadNotifications()
    const intervalId = window.setInterval(() => { void loadNotifications() }, 30000)

    return () => {
      disposed = true
      window.clearInterval(intervalId)
    }
  }, [supplier])

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">Restoring supplier session...</p>
        </div>
      </div>
    )
  }

  if (!supplier) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Topbar */}
      <header className="bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_25%),linear-gradient(135deg,#0f172a_0%,#111827_55%,#1e293b_100%)] border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-lg shadow-lg shadow-indigo-900/50">
            🏭
          </div>
          <div>
            <p className="font-black text-sm text-white leading-none">LocalMart Supplier</p>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Wholesale Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-2">
            <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              {startup.wholesaleOrders} orders
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              {startup.productLines} products
            </span>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              {unreadCount} unread alerts
            </span>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-gray-800">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm font-black text-indigo-300">
              {(supplier.name || "S")[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-300 hidden sm:block">{supplier.name}</span>
            <button
              onClick={logout}
              className="ml-2 text-xs font-bold text-rose-400 hover:text-rose-300 border border-rose-500/20 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <div className="border-b border-white/5 bg-black/20 px-6 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            Wholesale workspace
          </span>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
            {startup.productLines} active product lines
          </span>
          <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
            Supplier flow synced
          </span>
        </div>
      </div>
      <div className="border-b border-white/5 bg-[linear-gradient(180deg,rgba(8,15,28,0.95)_0%,rgba(8,15,28,0.72)_100%)] px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">Supplier inbox</p>
              <h2 className="mt-1 text-lg font-black text-white">Wholesale signals and operational updates</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
              {unreadCount} unread
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
              No supplier alerts yet. Wholesale status updates and operational notifications will appear here.
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-4 md:grid-cols-2">
              {notifications.map((notification) => {
                const isWholesale = notification.type === "wholesale" || notification.data?.scope === "wholesale"
                return (
                  <div key={notification._id} className={`rounded-2xl border px-4 py-4 ${isWholesale ? "border-amber-400/20 bg-amber-400/10" : "border-white/8 bg-white/[0.03]"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isWholesale ? "bg-amber-500/15 text-amber-200" : "bg-cyan-500/15 text-cyan-200"}`}>
                        {isWholesale ? (notification.data?.status || "wholesale") : notification.type}
                      </span>
                      {!notification.isRead && (
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                      )}
                    </div>
                    <p className="mt-3 text-sm font-black text-white">{notification.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{notification.message}</p>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      {new Date(notification.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Orders />
    </div>
  )
}

function App() {
  return (
    <SupplierProvider>
      <AppContent />
    </SupplierProvider>
  )
}

export default App