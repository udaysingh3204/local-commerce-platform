import { useEffect, useState } from "react"
import API from "../api/api"

const CAT_ICON: Record<string, string>  = { grocery:"🥦", food:"🍔", bakery:"🥐", pharmacy:"💊", electronics:"⚡", fashion:"👗", stationery:"📚" }
const CAT_GRAD: Record<string, string>  = {
  grocery:     "from-emerald-500 to-teal-600",
  food:        "from-orange-500 to-rose-500",
  bakery:      "from-amber-500 to-yellow-400",
  pharmacy:    "from-blue-500 to-cyan-500",
  electronics: "from-violet-600 to-indigo-600",
  fashion:     "from-pink-500 to-rose-500",
  stationery:  "from-sky-500 to-blue-500",
}

export default function Stores() {
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    API.get("/stores")
      .then(res => setStores(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const categories = new Set(stores.map(s => s.category).filter(Boolean))
  const filtered = stores.filter(s =>
    !search || s.storeName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 xl:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 ad-fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Stores</h1>
          <p className="text-slate-500 text-sm mt-1">{stores.length} stores on platform</p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            placeholder="Search stores..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/60 w-52 transition"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: "Total Stores",   value: stores.length,                                           icon: "🏪", color: "text-violet-400" },
          { label: "Categories",     value: categories.size,                                         icon: "📂", color: "text-emerald-400" },
          { label: "With Location",  value: stores.filter(s => s.location?.coordinates).length,      icon: "📍", color: "text-amber-400"   },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="text-slate-500 text-xs font-semibold">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#0d1120] border border-white/[0.05] rounded-2xl overflow-hidden">
              <div className="h-24 bg-white/[0.04] animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-white/[0.04] rounded-full w-2/3 animate-pulse" />
                <div className="h-3 bg-white/[0.04] rounded-full w-1/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(store => {
            const cat  = store.category?.toLowerCase() ?? ""
            const icon = CAT_ICON[cat] ?? "🏪"
            const grad = CAT_GRAD[cat] ?? "from-violet-500 to-purple-600"
            return (
              <div key={store._id} className="bg-[#0d1120] border border-white/[0.05] rounded-2xl overflow-hidden ad-card">
                {/* Banner */}
                <div className={`h-20 bg-linear-to-br ${grad} flex items-center justify-center relative`}>
                  <span className="text-5xl">{icon}</span>
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Active
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-black text-sm leading-tight">{store.storeName}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-linear-to-r ${grad} text-white shrink-0 capitalize`}>
                      {store.category || "General"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span>📍 {store.deliveryRadius || 5} km</span>
                    <span>·</span>
                    <span>{new Date(store.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                  </div>
                  {store.address && (
                    <p className="text-slate-600 text-xs mt-1.5 truncate">{store.address}</p>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 py-20 text-center">
              <div className="text-5xl mb-3">🏪</div>
              <p className="text-slate-500">No stores found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
