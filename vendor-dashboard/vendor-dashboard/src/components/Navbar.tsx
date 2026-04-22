import { useLocation } from "react-router-dom"
import { useVendor } from "../context/VendorContext"

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Your store at a glance" },
  "/products": { title: "Products", subtitle: "Manage your inventory" },
  "/orders": { title: "Orders", subtitle: "Track and fulfill orders" },
  "/analytics": { title: "Analytics", subtitle: "Sales insights & trends" },
  "/demand-prediction": { title: "Demand Forecast", subtitle: "AI-powered restock predictions" },
  "/create-store": { title: "Create Store", subtitle: "Set up a new storefront" },
}

export default function Navbar() {
  const { vendor, store, startup } = useVendor()
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] ?? { title: "Vendor Portal", subtitle: "" }

  const initials = vendor?.name
    ? vendor.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "V"

  return (
    <header className="h-16 bg-gray-950 border-b border-gray-800/60 flex items-center justify-between px-6 shrink-0">
      {/* Page title */}
      <div>
        <h1 className="text-base font-black text-white leading-tight">{meta.title}</h1>
        {meta.subtitle && <p className="text-xs text-gray-500">{meta.subtitle}</p>}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <div className="hidden xl:flex items-center gap-2">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
            {startup.activeOrders} active orders
          </div>
          {startup.pendingPayments > 0 && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300">
              {startup.pendingPayments} pending payments
            </div>
          )}
        </div>

        {/* Store badge */}
        {store && (
          <div className="hidden sm:flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-300 max-w-32 truncate">{store.storeName}</span>
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/50">
            <span className="text-xs font-black text-white">{initials}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-white leading-tight">{vendor?.name ?? "Vendor"}</p>
            <p className="text-xs text-gray-500 leading-tight">Vendor</p>
          </div>
        </div>
      </div>
    </header>
  )
}