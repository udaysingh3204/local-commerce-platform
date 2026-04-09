import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { useCart } from "../context/CartContext"
import { toast } from "sonner"

const CATEGORY_ICONS: Record<string, string> = {
  grocery: "🥦", food: "🍔", bakery: "🥐", pharmacy: "💊",
  electronics: "⚡", fashion: "👗", stationery: "📚", default: "🏪"
}
const PROD_GRADIENTS = [
  "from-violet-100 to-pink-100",
  "from-orange-100 to-rose-100",
  "from-emerald-100 to-teal-100",
  "from-amber-100 to-yellow-100",
  "from-sky-100 to-blue-100",
  "from-purple-100 to-indigo-100",
]

export default function StorePage() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState<string | null>(null)
  const { addToCart, cart } = useCart()

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          API.get(`/products/store/${storeId}`),
          API.get(`/stores/${storeId}`).catch(() => ({ data: null })),
        ])
        setProducts(pRes.data)
        setStore(sRes.data)
      } catch { /* silent */ } finally { setLoading(false) }
    }
    load()
  }, [storeId])

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddToCart = async (product: any) => {
    setAdding(product._id)
    addToCart(product)
    toast.success(`${product.name} added! 🛒`, { duration: 1500 })
    setTimeout(() => setAdding(null), 600)
  }

  const cartTotal = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
  const cartCount = cart.reduce((s: number, i: any) => s + i.quantity, 0)
  const storeIcon = CATEGORY_ICONS[store?.category?.toLowerCase()] ?? "🏪"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* STORE HEADER */}
      <div className="bg-linear-to-r from-violet-900 via-violet-800 to-fuchsia-900 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate("/")} className="text-violet-300 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← All Stores
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shrink-0">
              {storeIcon}
            </div>
            <div>
              <h1 className="text-2xl font-black">{store?.storeName ?? "Store"}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-violet-300 text-sm">{products.length} products</span>
                <span className="w-1 h-1 bg-violet-500 rounded-full" />
                <span className="text-xs bg-violet-700/60 text-violet-200 font-bold px-2 py-0.5 rounded-full">
                  {store?.category ?? "General"}
                </span>
                <span className="w-1 h-1 bg-violet-500 rounded-full" />
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Open
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="max-w-5xl mx-auto px-6 py-5">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
          <input
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 shadow-sm"
            placeholder="Search products in this store..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">×</button>
          )}
        </div>
      </div>

      {/* GRID */}
      <div className={`max-w-5xl mx-auto px-6 ${cart.length > 0 ? "pb-28" : "pb-16"}`}>
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
            <p className="text-gray-400 text-sm mt-1">Try a different search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product, idx) => {
              const inCart = cart.find((i: any) => i._id === product._id)
              const isAdding = adding === product._id
              const gradClass = PROD_GRADIENTS[idx % PROD_GRADIENTS.length]
              return (
                <div
                  key={product._id}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 ca-card"
                >
                  <div className={`h-36 bg-linear-to-br ${gradClass} flex items-center justify-center relative overflow-hidden`}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-300 select-none">📦</span>
                    )}
                    {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Only {product.stock} left
                      </span>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{product.name}</h3>
                    {product.category && (
                      <span className="inline-block text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md mt-0.5">{product.category}</span>
                    )}
                    <p className="text-violet-700 font-black text-base mt-1">₹{product.price}</p>
                    <button
                      onClick={() => product.stock !== 0 && handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className={`mt-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all
                        ${ isAdding
                          ? "bg-green-500 text-white scale-95"
                          : inCart
                          ? "bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white"
                          : product.stock === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-linear-to-r from-violet-600 to-pink-500 text-white hover:shadow-lg hover:shadow-violet-200"
                        }`}
                    >
                      {isAdding ? "✓ Added!" : inCart ? `In Cart (${inCart.quantity})` : product.stock === 0 ? "Out of Stock" : "+ Add"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* STICKY CART BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => navigate("/cart")}
              className="w-full flex items-center justify-between bg-linear-to-r from-violet-700 to-pink-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-violet-400/40 hover:shadow-violet-400/60 hover:-translate-y-0.5 transition-all font-bold"
            >
              <span className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-black w-7 h-7 rounded-xl flex items-center justify-center">
                  {cartCount}
                </span>
                item{cartCount > 1 ? "s" : ""} in cart
              </span>
              <span className="flex items-center gap-2">
                ₹{cartTotal}
                <span className="text-violet-200">→ Checkout</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}