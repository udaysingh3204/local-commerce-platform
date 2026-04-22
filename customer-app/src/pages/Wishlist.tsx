import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import API from "../api/api"
import { useAuth } from "../context/useAuth"
import { useCart } from "../context/CartContext"
import { toast } from "sonner"

type WishlistItem = {
  wishlistItemId: string
  productId: string
  name: string
  description: string
  price: number
  priceWhenAdded: number
  priceDrop: number
  priceDropPercent: number
  discount: number
  rating: number
  category: string
  image: string
  addedAt: string
  notes: string
  tags: string[]
  shouldNotify: boolean
  isTrendingUp: boolean
  notifyOnPriceDrop?: number
}

type Recommendation = {
  _id: string
  name: string
  price: number
  rating?: number
  category?: string
  image?: string
  discount?: number
}

export default function Wishlist() {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  const load = async () => {
    if (!user) return

    try {
      const [{ data: wishlistData }, { data: recommendationData }] = await Promise.all([
        API.get<{ wishlist: WishlistItem[] }>("/wishlist?sortBy=priceDrop&limit=50"),
        API.get<{ recommendations: Recommendation[] }>("/wishlist/recommendations?limit=6"),
      ])
      setItems(wishlistData.wishlist || [])
      setRecommendations(recommendationData.recommendations || [])
    } catch {
      toast.error("Could not load your wishlist")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    void load()
  }, [user])

  const totalCurrentValue = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items])
  const totalSavedDelta = useMemo(() => items.reduce((sum, item) => sum + Math.max(item.priceDrop, 0), 0), [items])
  const priceDropCount = useMemo(() => items.filter((item) => item.priceDropPercent > 0).length, [items])
  const trendingCount = useMemo(() => items.filter((item) => item.isTrendingUp).length, [items])
  const hottestItem = useMemo(() => [...items].sort((left, right) => right.priceDropPercent - left.priceDropPercent)[0], [items])

  const handleRemove = async (productId: string) => {
    setRemoving(prev => ({ ...prev, [productId]: true }))
    try {
      await API.delete(`/wishlist/${productId}`)
      setItems(prev => prev.filter(i => i.productId !== productId))
      toast.success("Removed from wishlist")
    } catch {
      toast.error("Could not remove item")
    } finally {
      setRemoving(prev => ({ ...prev, [productId]: false }))
    }
  }

  const handleAddToCart = (item: WishlistItem) => {
    addToCart({
      _id: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      discount: item.discount,
    })
    toast.success(`${item.name} added to cart`)
  }

  const handleShareWishlist = async () => {
    setSharing(true)
    try {
      const { data } = await API.post<{ shareUrl?: string }>("/wishlist/share", {
        name: `${user?.name || "My"} Wishlist`,
        isPublic: true,
      })
      if (data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl)
        toast.success("Wishlist link copied")
      } else {
        toast.success("Wishlist share link created")
      }
    } catch {
      toast.error("Could not share wishlist")
    } finally {
      setSharing(false)
    }
  }

  const handleClearWishlist = async () => {
    if (!items.length) return
    setClearing(true)
    try {
      await API.post("/wishlist/bulk-action", { action: "clear" })
      setItems([])
      toast.success("Wishlist cleared")
    } catch {
      toast.error("Could not clear wishlist")
    } finally {
      setClearing(false)
    }
  }

  const handleAddRecommendation = async (productId: string) => {
    try {
      await API.post(`/wishlist/${productId}`)
      toast.success("Added to wishlist")
      setLoading(true)
      await load()
    } catch {
      toast.error("Could not save recommendation")
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d0520] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-violet-200 font-semibold mb-4">Please log in to view your wishlist</p>
          <Link
            to="/login"
            className="inline-block px-5 py-2 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative overflow-hidden bg-linear-to-br from-slate-950 via-violet-950 to-fuchsia-900 px-4 py-10 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.16),transparent_30%)]" />
        <div className="relative max-w-6xl mx-auto px-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white transition">← Home</Link>
          <div className="mt-5 flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-200">Saved-item studio</p>
              <h1 className="mt-2 text-4xl font-black leading-tight">Wishlist energy now matches the rest of the product.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100/80">
                Price drops, trend spikes, shareable picks, and recommendation loops now live in one intentional space instead of a plain storage list.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => void handleShareWishlist()}
                disabled={sharing || !items.length}
                className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sharing ? "Sharing..." : "Copy share link"}
              </button>
              <button
                onClick={() => void handleClearWishlist()}
                disabled={clearing || !items.length}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Clear saved items"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Saved items</p>
              <p className="mt-2 text-2xl font-black text-white">{items.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Current value</p>
              <p className="mt-2 text-2xl font-black text-white">₹{totalCurrentValue.toFixed(0)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Drop alerts</p>
              <p className="mt-2 text-2xl font-black text-white">{priceDropCount}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Trending picks</p>
              <p className="mt-2 text-2xl font-black text-white">{trendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {hottestItem && !loading && (
          <section className="mb-8 rounded-[32px] border border-emerald-200 bg-linear-to-r from-emerald-50 via-white to-cyan-50 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="max-w-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">Best buy signal</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{hottestItem.name} is your loudest wishlist opportunity right now.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Price is down by {hottestItem.priceDropPercent.toFixed(0)}% since you saved it. That is ₹{Math.max(hottestItem.priceDrop, 0).toFixed(0)} back in your pocket without doing anything extra.
                </p>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-white px-5 py-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Tracked savings</p>
                <p className="mt-1 text-3xl font-black text-emerald-700">₹{totalSavedDelta.toFixed(0)}</p>
              </div>
            </div>
          </section>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-violet-300/40 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-[32px] border border-dashed border-violet-200 bg-white text-center py-20 shadow-sm">
            <div className="text-5xl mb-4">🤍</div>
            <p className="text-slate-900 font-semibold text-lg mb-2">Your wishlist is empty</p>
            <p className="text-slate-500 text-sm mb-6">Browse stores and save items you love</p>
            <Link
              to="/"
              className="inline-block px-5 py-2 rounded-full bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
            >
              Explore stores
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="grid gap-4 sm:grid-cols-2 content-start">
            {items.map(item => (
              <div
                key={item.wishlistItemId}
                className="group overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48 bg-linear-to-br from-slate-100 via-violet-50 to-fuchsia-100 flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-5xl">📦</span>
                  )}
                  {item.priceDropPercent > 0 && (
                    <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg shadow-emerald-200">
                      ↓ {item.priceDropPercent.toFixed(0)}% drop
                    </span>
                  )}
                  {item.isTrendingUp && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg shadow-amber-200">
                      🔥 Trending
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-slate-950 font-black leading-snug">{item.name}</h2>
                    {item.category && (
                      <span className="shrink-0 text-xs text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full font-bold">
                        {item.category}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-slate-500 text-xs line-clamp-2 leading-5">{item.description}</p>
                  )}

                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500 leading-5">
                      {item.notes}
                    </div>
                  )}

                  <div className="flex items-baseline gap-2 mt-auto pt-1">
                    <span className="text-slate-950 font-black text-lg">
                      ₹{item.price.toFixed(2)}
                    </span>
                    {item.priceDropPercent > 0 && (
                      <span className="text-slate-400 text-sm line-through">
                        ₹{item.priceWhenAdded.toFixed(2)}
                      </span>
                    )}
                    {item.rating != null && (
                      <span className="ml-auto text-amber-500 text-xs font-semibold">
                        ★ {item.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Tracked since</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{new Date(item.addedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Alert threshold</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{item.notifyOnPriceDrop ?? 10}%</p>
                    </div>
                  </div>

                  <p className={`text-xs font-semibold ${item.shouldNotify ? "text-emerald-600" : "text-slate-400"}`}>
                    {item.shouldNotify ? "🔔 Price dropped — this is a legit buy window." : item.isTrendingUp ? "Momentum is climbing on this item." : "Saved and quietly monitored for the right moment."}
                  </p>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 rounded-full bg-linear-to-r from-violet-600 to-pink-500 hover:opacity-95 text-white text-sm font-black py-2.5 transition-colors shadow-lg shadow-violet-100"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => handleRemove(item.productId)}
                      disabled={removing[item.productId]}
                      className="px-4 py-2.5 rounded-full border border-rose-200 text-rose-500 hover:bg-rose-50 text-sm font-black transition-colors disabled:opacity-50"
                    >
                      {removing[item.productId] ? "…" : "Remove"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-violet-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-500">Saved-item pulse</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">This list can actually move revenue now.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  You already have ₹{totalCurrentValue.toFixed(0)} worth of intent stored here. With ₹{totalSavedDelta.toFixed(0)} in tracked price drops, this is more than a passive bookmark page.
                </p>
                <button
                  onClick={() => navigate("/notifications")}
                  className="mt-4 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-700 transition hover:bg-violet-100"
                >
                  Open alerts
                </button>
              </div>

              <div className="rounded-[28px] border border-amber-100 bg-linear-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">Recommendation lane</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Products adjacent to what your user already wants.</h2>
                <div className="mt-4 space-y-3">
                  {recommendations.length === 0 && (
                    <p className="text-sm text-slate-500">Recommendations warm up once the wishlist has stronger category or tag history.</p>
                  )}
                  {recommendations.map((product) => (
                    <div key={product._id} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center">
                          {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <span>📦</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-950 line-clamp-1">{product.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{product.category || "Recommended"}{product.rating ? ` · ★ ${product.rating.toFixed(1)}` : ""}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-slate-900">₹{product.price.toFixed(0)}</span>
                            <button
                              onClick={() => void handleAddRecommendation(product._id)}
                              className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:opacity-90"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
