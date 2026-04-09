import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { useCart } from "../context/CartContext"
import { toast } from "sonner"

export default function StorePage() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState<string | null>(null)
  const { addToCart, cart } = useCart()

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pRes] = await Promise.all([
          API.get(`/products/store/${storeId}`),
        ])
        setProducts(pRes.data)
      } catch { /* silent */ } finally { setLoading(false) }
    }
    fetch()
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-pink-50">
      {/* STORE HEADER */}
      <div className="bg-gradient-to-r from-gray-900 to-slate-800 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← All Stores
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg">
              🏪
            </div>
            <div>
              <h1 className="text-2xl font-black">Store Products</h1>
              <p className="text-gray-400 text-sm mt-0.5">{products.length} products available</p>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH + FLOATING CART */}
      <div className="max-w-5xl mx-auto px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => navigate("/cart")}
              className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-pink-500 text-white px-5 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all"
            >
              🛒 {cart.length} — ₹{cartTotal}
            </button>
          )}
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-gray-500 font-medium">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(product => {
              const inCart = cart.find((i: any) => i._id === product._id)
              const isAdding = adding === product._id
              return (
                <div
                  key={product._id}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
              <div className={`h-36 bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center relative overflow-hidden`}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl">📦</span>
                    )}
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Only {product.stock} left
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{product.name}</h3>
                    <p className="text-violet-600 font-black text-sm mt-1">₹{product.price}</p>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition-all
                        ${ isAdding
                          ? "bg-green-500 text-white scale-95"
                          : inCart
                          ? "bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white"
                          : "bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:shadow-lg hover:shadow-violet-200"
                        }`}
                    >
                      {isAdding ? "✓ Added!" : inCart ? `In Cart (${inCart.quantity})` : "Add to Cart"}
                    </button>
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