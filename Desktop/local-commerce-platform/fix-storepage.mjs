import { writeFileSync } from "fs";

const content = `import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { useCart } from "../context/CartContext"
import { toast } from "sonner"
import ReviewsSection from "../components/ReviewsSection"

const CATEGORY_ICONS: Record<string, string> = {
  grocery: "🥦", food: "🍔", bakery: "🥐", pharmacy: "💊",
  home: "🧼", fruits: "🍎", dairy: "🥛", beverages: "🥤",
  "personal-care": "🧴", snacks: "🍿", default: "🏪",
}

const PROD_GRADIENTS = [
  "from-violet-100 to-pink-100", "from-orange-100 to-rose-100",
  "from-emerald-100 to-teal-100", "from-amber-100 to-yellow-100",
  "from-sky-100 to-blue-100", "from-purple-100 to-indigo-100",
]

const fmt = (n: number) => \`₹\${n.toLocaleString("en-IN")}\`

export default function StorePage() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [storeRating, setStoreRating] = useState(0)
  const [storeReviewCount, setStoreReviewCount] = useState(0)
  const { addToCart, removeFromCart, updateQuantity, cart } = useCart()

  const loadReviewStats = useCallback(async () => {
    if (!storeId) return
    try {
      const res = await API.get(\`/reviews/store/\${storeId}?limit=1\`)
      setStoreRating(res.data.stats?.avgRating ?? 0)
      setStoreReviewCount(res.data.stats?.count ?? 0)
    } catch { /* ignore */ }
  }, [storeId])

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          API.get(\`/products/store/\${storeId}\`),
          API.get(\`/stores/\${storeId}\`).catch(() => ({ data: null })),
        ])
        setProducts(pRes.data)
        setStore(sRes.data)
      } catch { /* silent */ } finally { setLoading(false) }
    }
    load()
    loadReviewStats()
  }, [storeId, loadReviewStats])

  const categories = ["All", ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)))] as string[]

  const filtered = products.filter((p: any) => {
    const matchCat = activeCategory === "All" || p.category === activeCategory
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const cartTotal = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
  const cartCount = cart.reduce((s: number, i: any) => s + i.quantity, 0)
  const storeIcon = CATEGORY_ICONS[store?.category?.toLowerCase()] ?? "🏪"

  const handleAdd = (product: any) => {
    addToCart(product)
    toast.success(\`\${product.name} added! 🛒\`, { duration: 1200 })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* STORE HEADER */}
      <div className="bg-gradient-to-r from-violet-900 via-violet-800 to-fuchsia-900 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate("/")} className="text-violet-300 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← All Stores
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shrink-0">
              {storeIcon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black">{store?.storeName ?? "Store"}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-violet-300 text-sm">{products.length} products</span>
                <span className="w-1 h-1 bg-violet-500 rounded-full" />
                <span className="text-xs bg-violet-700/60 text-violet-200 font-bold px-2 py-0.5 rounded-full capitalize">
                  {store?.category ?? "General"}
                </span>
                <span className="w-1 h-1 bg-violet-500 rounded-full" />
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" /> Open
                </span>
                {storeRating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-yellow-300 font-bold">
                    ⭐ {storeRating.toFixed(1)} ({storeReviewCount})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH + CATEGORY FILTER */}
      <div className="max-w-5xl mx-auto px-6 py-5 space-y-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
          <input
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 shadow-sm"
            placeholder="Search products in this store..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
          )}
        </div>
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={\`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border
                  \${activeCategory === cat
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"}\`}
              >
                {cat === "All" ? "All" : \`\${CATEGORY_ICONS[cat.toLowerCase()] ?? "·"} \${cat}\`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PRODUCT GRID */}
      <div className={\`max-w-5xl mx-auto px-6 \${cart.length > 0 ? "pb-28" : "pb-16"}\`}>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-gray-100">
                <div className="h-36 bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-7 bg-gray-100 rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-3">📦</div>
            <h3 className="text-lg font-bold text-gray-700">No products found</h3>
            <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product: any, idx: number) => {
              const inCart = cart.find((i: any) => i._id === product._id)
              const qty: number = inCart?.quantity ?? 0
              const outOfStock = product.stock === 0
              const gradClass = PROD_GRADIENTS[idx % PROD_GRADIENTS.length]
              return (
                <div key={product._id} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100 transition-all duration-200">
                  {/* Image */}
                  <div className={\`h-36 bg-gradient-to-br \${gradClass} flex items-center justify-center relative overflow-hidden\`}>
                    {product.image
                      ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      : <span className="text-5xl group-hover:scale-110 transition-transform duration-300 select-none">📦</span>
                    }
                    {!outOfStock && product.stock != null && product.stock <= 5 && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Only {product.stock} left
                      </span>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Out of Stock</span>
                      </div>
                    )}
                    {qty > 0 && (
                      <span className="absolute top-2 right-2 w-6 h-6 bg-violet-600 text-white text-xs font-black rounded-full flex items-center justify-center shadow-lg">
                        {qty}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                    {product.category && (
                      <span className="inline-block text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md mt-0.5 capitalize">{product.category}</span>
                    )}
                    <p className="text-violet-700 font-black text-base mt-1">{fmt(product.price)}{product.unit ? <span className="text-xs font-normal text-gray-400"> /{product.unit}</span> : null}</p>

                    {/* Cart controls */}
                    {outOfStock ? (
                      <div className="mt-2 w-full py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-400 text-center">Out of Stock</div>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => handleAdd(product)}
                        className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 transition-all"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="mt-2 flex items-center justify-between bg-violet-50 rounded-xl p-1">
                        <button
                          onClick={() => qty === 1 ? removeFromCart(product._id) : updateQuantity(product._id, "dec")}
                          className="w-8 h-8 rounded-lg bg-white shadow-sm text-violet-700 font-black text-lg flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                          −
                        </button>
                        <span className="font-black text-violet-800 text-sm w-6 text-center">{qty}</span>
                        <button
                          onClick={() => handleAdd(product)}
                          className="w-8 h-8 rounded-lg bg-violet-600 text-white font-black text-lg flex items-center justify-center hover:bg-violet-700 transition-all shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* REVIEWS */}
      {storeId && (
        <div className="max-w-5xl mx-auto px-4 pb-10">
          <ReviewsSection targetType="store" targetId={storeId} />
        </div>
      )}

      {/* STICKY CART BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={() => navigate("/cart")}
              className="w-full flex items-center justify-between bg-gradient-to-r from-violet-700 to-pink-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-violet-400/40 hover:shadow-violet-400/60 hover:-translate-y-0.5 transition-all font-bold"
            >
              <span className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-black w-7 h-7 rounded-xl flex items-center justify-center">
                  {cartCount}
                </span>
                item{cartCount > 1 ? "s" : ""} in cart
              </span>
              <span className="flex items-center gap-2">
                {fmt(cartTotal)}
                <span className="text-violet-200 text-sm">→ View Cart</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
`;

writeFileSync(
  "local-commerce-platform/customer-app/src/pages/StorePage.tsx",
  content,
  "utf8"
);
console.log("Done");
