import { useEffect, useState, useRef, useCallback } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import API from "../api/api"
import { useCart } from "../context/CartContext"
import { toast } from "sonner"

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

const CATEGORY_ICONS: Record<string, string> = {
  grocery: "🥦", food: "🍔", bakery: "🥐", pharmacy: "💊",
  home: "🧼", fruits: "🍎", dairy: "🥛", beverages: "🥤",
  "personal-care": "🧴", snacks: "🍿", default: "🏪",
}

const QUICK_SEARCHES = [
  "milk", "bread", "eggs", "rice", "chips", "cold drink",
  "detergent", "shampoo", "biscuits", "chocolate", "maggi", "noodles"
]

const TRENDING = [
  { icon: "🥦", label: "Vegetables" },
  { icon: "🍔", label: "Burgers" },
  { icon: "🥛", label: "Dairy" },
  { icon: "💊", label: "Medicine" },
  { icon: "🥐", label: "Bakery" },
  { icon: "🧴", label: "Skincare" },
  { icon: "🍿", label: "Snacks" },
  { icon: "🥤", label: "Drinks" },
]

interface Product {
  _id: string
  name: string
  price: number
  originalPrice?: number
  category?: string
  imageUrl?: string
  storeId: string
  storeName?: string
  unit?: string
  description?: string
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToCart, removeFromCart, updateQuantity, cart } = useCart()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cartCount = (id: string) => cart.find((c: any) => c._id === id)?.quantity ?? 0

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await API.get(`/search?q=${encodeURIComponent(q)}&limit=40`)
      setResults(res.data?.results ?? res.data ?? [])
    } catch {
      // fallback: search products directly
      try {
        const res = await API.get(`/products?search=${encodeURIComponent(q)}`)
        setResults(res.data ?? [])
      } catch { setResults([]) }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const q = searchParams.get("q") || ""
    setQuery(q)
    doSearch(q)
  }, [searchParams, doSearch])

  const handleChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchParams(val ? { q: val } : {})
    }, 300)
  }

  const handleQuick = (term: string) => {
    setQuery(term)
    setSearchParams({ q: term })
  }

  const handleAdd = async (product: Product) => {
    setAddingId(product._id)
    try {
      addToCart({ ...product, quantity: 1 })
      toast.success(`${product.name} added to cart`)
    } finally {
      setTimeout(() => setAddingId(null), 500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-800 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleChange(e.target.value)}
              placeholder='Search "milk", "chips", "medicine"...'
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
            />
            {query && (
              <button onClick={() => handleChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Empty state — show trending + quick searches */}
        {!query && (
          <>
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Trending near you</p>
              <div className="grid grid-cols-4 gap-2">
                {TRENDING.map(t => (
                  <button
                    key={t.label}
                    onClick={() => handleQuick(t.label)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all"
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-xs font-medium text-gray-600">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SEARCHES.map(q => (
                  <button
                    key={q}
                    onClick={() => handleQuick(q)}
                    className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-all capitalize"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Searching across all stores...</p>
          </div>
        )}

        {/* Results */}
        {!loading && query && results.length > 0 && (
          <>
            <p className="text-xs text-gray-400 mb-3">{results.length} results for "<span className="text-gray-600 font-medium">{query}</span>"</p>
            <div className="space-y-2">
              {results.map(p => {
                const qty = cartCount(p._id)
                const discount = p.originalPrice && p.originalPrice > p.price
                  ? Math.round((1 - p.price / p.originalPrice) * 100)
                  : 0
                return (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:border-violet-200 hover:shadow-sm transition-all"
                  >
                    {/* Product image / icon */}
                    <Link to={`/store/${p.storeId}`} className="shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-linear-to-br from-violet-100 to-pink-100 flex items-center justify-center text-2xl">
                          {CATEGORY_ICONS[p.category || "default"] ?? "🏪"}
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/store/${p.storeId}`}>
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      </Link>
                      <p className="text-xs text-gray-400 truncate">{p.storeName ?? "Local store"} · {p.unit ?? "1 unit"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-gray-900">{fmt(p.price)}</span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-xs text-gray-400 line-through">{fmt(p.originalPrice)}</span>
                        )}
                        {discount > 0 && (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{discount}% off</span>
                        )}
                      </div>
                    </div>

                    {/* Add / qty control */}
                    <div className="shrink-0">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAdd(p)}
                          disabled={addingId === p._id}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all disabled:opacity-60"
                        >
                          {addingId === p._id ? "..." : "ADD"}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            className="w-7 h-7 rounded-lg border border-violet-300 text-violet-700 font-bold text-sm hover:bg-violet-50 flex items-center justify-center"
                            onClick={() => {
                              const item = cart.find((c: any) => c._id === p._id)
                              if (item) {
                                if (item.quantity > 1) updateQuantity(p._id, "dec")
                                else removeFromCart(p._id)
                              }
                            }}
                          >−</button>
                          <span className="w-6 text-center text-sm font-bold text-violet-700">{qty}</span>
                          <button
                            onClick={() => handleAdd(p)}
                            className="w-7 h-7 rounded-lg bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 flex items-center justify-center"
                          >+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* No results */}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-5xl">🔍</span>
            <p className="text-lg font-semibold text-gray-700">No results for "{query}"</p>
            <p className="text-sm text-gray-400">Try a different search term or browse stores</p>
            <button onClick={() => handleChange("")} className="mt-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold">
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
