import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"

interface Store {
  _id: string
  storeName: string
  category: string
}

const CATEGORY_ICONS: Record<string, string> = {
  grocery: "🥦", food: "🍔", bakery: "🥐", pharmacy: "💊",
  electronics: "⚡", fashion: "👗", stationery: "📚", default: "🏪"
}

const CATEGORY_COLORS: Record<string, string> = {
  grocery:     "from-emerald-400 to-teal-500",
  food:        "from-orange-400 to-rose-500",
  bakery:      "from-amber-400 to-yellow-500",
  pharmacy:    "from-blue-400 to-cyan-500",
  electronics: "from-violet-500 to-indigo-600",
  fashion:     "from-pink-400 to-rose-500",
  stationery:  "from-sky-400 to-blue-500",
  default:     "from-violet-400 to-pink-500",
}

const STORE_GRADIENTS = [
  "from-violet-500 to-pink-500",
  "from-orange-400 to-rose-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-yellow-400 to-orange-500",
  "from-purple-400 to-indigo-500",
  "from-pink-400 to-fuchsia-500",
  "from-sky-400 to-cyan-500",
]

const CAT_HIGHLIGHTS = [
  { key: "grocery", label: "Grocery", icon: "🥦", bg: "bg-emerald-50 border-emerald-100 hover:border-emerald-300" },
  { key: "food", label: "Food", icon: "🍔", bg: "bg-orange-50 border-orange-100 hover:border-orange-300" },
  { key: "bakery", label: "Bakery", icon: "🥐", bg: "bg-amber-50 border-amber-100 hover:border-amber-300" },
  { key: "pharmacy", label: "Pharmacy", icon: "💊", bg: "bg-blue-50 border-blue-100 hover:border-blue-300" },
  { key: "electronics", label: "Electronics", icon: "⚡", bg: "bg-violet-50 border-violet-100 hover:border-violet-300" },
  { key: "fashion", label: "Fashion", icon: "👗", bg: "bg-pink-50 border-pink-100 hover:border-pink-300" },
]

const TICKER = ["🥦 Fresh Groceries", "⚡ 30 min delivery", "🏪 500+ Stores", "🥐 Bakers near you", "💊 Medicine delivery", "👗 Local Fashion", "🍔 Hot Food"]

export default function Home() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<Store[]>([])
  const [filtered, setFiltered] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  useEffect(() => {
    API.get(`/stores/nearby?lat=28.5355&lng=77.391`)
      .then(res => { setStores(res.data); setFiltered(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const categories = ["All", ...Array.from(new Set(stores.map(s => s.category).filter(Boolean)))]

  useEffect(() => {
    let result = stores
    if (activeCategory !== "All") result = result.filter(s => s.category === activeCategory)
    if (search.trim()) result = result.filter(s => s.storeName.toLowerCase().includes(search.toLowerCase()))
    setFiltered(result)
  }, [search, activeCategory, stores])

  const tickerDouble = [...TICKER, ...TICKER]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ── */}
      <div className="relative bg-[#1a0533] overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-violet-700/30 rounded-full blur-3xl ca-blob" />
        <div className="absolute top-10 right-0 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl ca-blob ca-d7" />
        <div className="absolute bottom-0 left-1/3 w-72 h-48 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 ca-dot-grid opacity-30" />

        <div className="relative max-w-5xl mx-auto px-6 py-16 pb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 ca-slide-up">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full ca-ping-slow" />
            📍 Noida, UP · Delivering now
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.04] mb-5 ca-slide-up ca-d1" style={{ opacity: 0 }}>
            Local stores,<br />
            <span className="ca-shimmer-text">delivered fast.</span>
          </h1>

          <p className="text-violet-300 text-lg mb-10 max-w-md ca-slide-up ca-d2" style={{ opacity: 0 }}>
            Fresh groceries, hot food & more — from neighbourhood stores you love, in 30 minutes. ⚡
          </p>

          {/* Search */}
          <div className="relative max-w-lg ca-slide-up ca-d3" style={{ opacity: 0 }}>
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">🔍</span>
            <input
              className="w-full pl-12 pr-14 py-4 rounded-2xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-xl shadow-violet-900/30 bg-white"
              placeholder="Search stores, groceries, food..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 mt-8 ca-slide-up ca-d4" style={{ opacity: 0 }}>
            {[
              { v: stores.length > 0 ? `${stores.length}+` : "8+", l: "Stores" },
              { v: "~28 min", l: "Avg delivery" },
              { v: "FREE", l: "Delivery fee" },
            ].map(s => (
              <div key={s.l} className="flex items-center gap-1.5">
                <p className="text-white font-black text-lg leading-none">{s.v}</p>
                <p className="text-violet-400 text-xs font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-50" style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }} />
      </div>

      {/* ── TICKER ── */}
      <div className="border-b border-gray-100 bg-white overflow-hidden py-3">
        <div className="flex ca-marquee whitespace-nowrap">
          {tickerDouble.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3 text-xs font-semibold text-gray-400 px-5">
              <span className="w-1 h-1 bg-violet-400 rounded-full shrink-0" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── CATEGORY TILES ── */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <h2 className="text-lg font-black text-gray-900 mb-4">Shop by Category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CAT_HIGHLIGHTS.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? "All" : cat.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${cat.bg} ${activeCategory === cat.key ? "scale-95 border-violet-400 shadow-lg shadow-violet-100" : ""}`}
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-xs font-bold text-gray-700">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeCategory === cat
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                  : "bg-white text-gray-600 hover:bg-violet-50 border border-gray-200 hover:border-violet-200"
              }`}
            >
              {CATEGORY_ICONS[cat.toLowerCase()] ?? "🏪"} {cat === "All" ? "All Stores" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── STORES GRID ── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-900">
            {loading ? "Finding stores..." : `${filtered.length} store${filtered.length !== 1 ? "s" : ""} nearby`}
          </h2>
          {activeCategory !== "All" && (
            <button onClick={() => setActiveCategory("All")} className="text-xs text-violet-600 font-bold">
              Clear filter ×
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-44 bg-linear-to-br from-gray-100 to-gray-200 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-7xl mb-4">🏜️</div>
            <h3 className="text-xl font-bold text-gray-700">No stores found</h3>
            <p className="text-gray-400 mt-2 mb-6">Try clearing the filter or searching differently</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All") }}
              className="bg-linear-to-r from-violet-600 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all"
            >
              Show all stores
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((store, idx) => {
              const icon  = CATEGORY_ICONS[store.category?.toLowerCase()]  ?? "🏪"
              const grad  = STORE_GRADIENTS[idx % STORE_GRADIENTS.length]
              const cGrad = CATEGORY_COLORS[store.category?.toLowerCase()] ?? CATEGORY_COLORS.default
              return (
                <div
                  key={store._id}
                  onClick={() => navigate(`/store/${store._id}`)}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer ca-card"
                >
                  {/* Banner */}
                  <div className={`h-44 bg-linear-to-br ${grad} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_70%_30%,white_0%,transparent_60%)]" />
                    <span className="text-7xl drop-shadow-xl group-hover:scale-110 transition-transform duration-300 select-none relative z-10">
                      {icon}
                    </span>
                    {/* Open badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Open
                    </div>
                    {/* Category gradient bottom */}
                    <div className={`absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-black/20 to-transparent`} />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h2 className="font-black text-gray-900 text-base leading-tight">{store.storeName}</h2>
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-linear-to-r ${cGrad} text-white`}>
                        {store.category || "General"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-lg">⭐ 4.5</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-lg">⚡ 25-35 min</span>
                      </div>
                      <span className="text-violet-600 font-bold text-xs group-hover:translate-x-1 transition-transform inline-block">
                        View →
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
