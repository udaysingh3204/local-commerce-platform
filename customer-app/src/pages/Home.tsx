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

const GRADIENTS = [
  "from-violet-500 to-pink-500",
  "from-orange-400 to-rose-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-yellow-400 to-orange-500",
  "from-purple-400 to-indigo-500",
]

export default function Home() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<Store[]>([])
  const [filtered, setFiltered] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await API.get(`/stores/nearby?lat=28.5355&lng=77.391`)
        setStores(res.data)
        setFiltered(res.data)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchStores()
  }, [])

  const categories = ["All", ...Array.from(new Set(stores.map(s => s.category).filter(Boolean)))]

  useEffect(() => {
    let result = stores
    if (activeCategory !== "All") result = result.filter(s => s.category === activeCategory)
    if (search.trim()) result = result.filter(s => s.storeName.toLowerCase().includes(search.toLowerCase()))
    setFiltered(result)
  }, [search, activeCategory, stores])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-pink-50">
      {/* HERO */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white py-14 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white_0%,transparent_60%)]" />
        <div className="max-w-4xl mx-auto relative">
          <p className="text-violet-200 text-sm font-semibold tracking-widest uppercase mb-2">📍 Noida, UP</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-3">
            Local stores,<br/>
            <span className="text-yellow-300">delivered fast.</span>
          </h1>
          <p className="text-violet-100 text-lg mb-8">Fresh from your neighbourhood in 30 min ⚡</p>
          <div className="relative max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-lg"
              placeholder="Search stores, groceries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* CATEGORY PILLS */}
      <div className="px-6 py-5 max-w-6xl mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
                ${activeCategory === cat
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                  : "bg-white text-gray-600 hover:bg-violet-50 border border-gray-200"
                }`}
            >
              <span>{CATEGORY_ICONS[cat.toLowerCase()] ?? "🏪"}</span>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION TITLE */}
      <div className="px-6 max-w-6xl mx-auto mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {loading ? "Finding stores near you..." : `${filtered.length} stores nearby`}
        </h2>
      </div>

      {/* GRID */}
      <div className="px-6 pb-16 max-w-6xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏜️</div>
            <h3 className="text-xl font-bold text-gray-700">No stores found</h3>
            <p className="text-gray-400 mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((store, idx) => {
              const icon = CATEGORY_ICONS[store.category?.toLowerCase()] ?? "🏪"
              const grad = GRADIENTS[idx % GRADIENTS.length]
              return (
                <div
                  key={store._id}
                  onClick={() => navigate(`/store/${store._id}`)}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:-translate-y-1"
                >
                  <div className={`h-40 bg-gradient-to-br ${grad} flex items-center justify-center text-6xl relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_30%,white_0%,transparent_60%)]" />
                    <span className="relative drop-shadow-lg group-hover:scale-110 transition-transform duration-300">{icon}</span>
                  </div>
                  <div className="p-4">
                    <h2 className="font-bold text-gray-900 text-base truncate">{store.storeName}</h2>
                    <p className="text-gray-500 text-xs mt-0.5 capitalize">{store.category || "General"}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg">
                        ⭐ 4.3
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        ⚡ 20-30 min
                      </div>
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