import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import API from "../api/api"
import { useVendor } from "../context/VendorContext"

const RATING_COLORS: Record<number, string> = {
  5: "text-emerald-400", 4: "text-teal-400", 3: "text-yellow-400",
  2: "text-orange-400", 1: "text-rose-400",
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-px">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: size, lineHeight: 1, color: s <= value ? "#f59e0b" : "#374151" }}>★</span>
      ))}
    </span>
  )
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="w-3 text-right font-bold text-gray-400">{label}</span>
      <span className="text-yellow-500 text-sm">★</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-gray-600">{count}</span>
    </div>
  )
}

export default function Reviews() {
  const { store } = useVendor()
  const storeId = store?._id ?? ""

  const [storeReviews, setStoreReviews] = useState<any[]>([])
  const [productReviews, setProductReviews] = useState<any[]>([])
  const [storeStats, setStoreStats] = useState<any>({ avgRating: 0, count: 0, distribution: {} })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"store" | "products">("store")
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [replying, setReplying] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const res = await API.get(`/reviews/vendor/${storeId}${ratingFilter !== "all" ? `?rating=${ratingFilter}` : ""}`)
      setStoreReviews(res.data.storeReviews || [])
      setProductReviews(res.data.productReviews || [])
      setStoreStats(res.data.storeStats || { avgRating: 0, count: 0, distribution: {} })
    } catch {
      toast.error("Failed to load reviews")
    } finally { setLoading(false) }
  }, [storeId, ratingFilter])

  useEffect(() => { void load() }, [load])

  const submitReply = async (reviewId: string) => {
    const text = replyText[reviewId]?.trim()
    if (!text) { toast.error("Reply cannot be empty"); return }
    setReplying(reviewId)
    try {
      await API.patch(`/reviews/${reviewId}/reply`, { text })
      toast.success("Reply posted")
      setReplyText(prev => ({ ...prev, [reviewId]: "" }))
      await load()
    } catch {
      toast.error("Failed to post reply")
    } finally { setReplying(null) }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  const displayedReviews = activeTab === "store" ? storeReviews : productReviews
  const totalProductReviews = productReviews.length

  return (
    <div className="p-6 xl:p-8 min-h-screen">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center gap-5">
          <div>
            <p className="text-5xl font-black text-yellow-400">{storeStats.avgRating || "—"}</p>
            <Stars value={Math.round(storeStats.avgRating)} size={18} />
            <p className="text-xs text-gray-500 mt-1">{storeStats.count} store reviews</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(s => (
              <RatingBar key={s} label={String(s)} count={storeStats.distribution?.[s] || 0} total={storeStats.count} />
            ))}
          </div>
        </div>
        {[
          { label: "Store Reviews", value: storeStats.count, icon: "🏪", text: "text-violet-400" },
          { label: "Product Reviews", value: totalProductReviews, icon: "📦", text: "text-sky-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.text}`}>{stat.icon} {stat.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-white">Reviews</h1>
        <div className="flex gap-2">
          {["all", "5", "4", "3", "2", "1"].map(r => (
            <button
              key={r}
              onClick={() => setRatingFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition
                ${ratingFilter === r
                  ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                  : "bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300"}`}
            >
              {r === "all" ? "All" : `${r} ★`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(["store", "products"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition capitalize
              ${activeTab === tab ? "bg-indigo-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}
          >
            {tab === "store" ? `🏪 Store (${storeStats.count})` : `📦 Products (${totalProductReviews})`}
          </button>
        ))}
      </div>

      {/* Review list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-gray-400 text-lg font-semibold">No reviews yet</p>
          <p className="text-gray-600 text-sm mt-1">They'll appear here when customers leave feedback</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map((r: any) => (
            <div key={r._id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-sm font-black text-indigo-300">
                    {(r.userId?.name || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{r.userId?.name || "Customer"}</p>
                    <p className="text-xs text-gray-500">{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Stars value={r.rating} size={14} />
                  <span className={`text-sm font-black ${RATING_COLORS[r.rating] || "text-gray-400"}`}>{r.rating}/5</span>
                  {r.isVerifiedPurchase && (
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      ✓ Verified
                    </span>
                  )}
                </div>
              </div>

              {activeTab === "products" && r.targetId?.name && (
                <p className="mt-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg w-fit">
                  📦 {r.targetId.name}
                </p>
              )}

              {r.comment && (
                <p className="mt-3 text-sm text-gray-300 leading-relaxed">{r.comment}</p>
              )}

              {/* Vendor reply */}
              {r.vendorReply?.text ? (
                <div className="mt-3 bg-gray-800/50 border-l-2 border-indigo-500 pl-4 py-2.5 rounded-r-xl">
                  <p className="text-xs font-bold text-indigo-400 mb-1">Your Reply</p>
                  <p className="text-xs text-gray-400">{r.vendorReply.text}</p>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    value={replyText[r._id] || ""}
                    onChange={e => setReplyText(prev => ({ ...prev, [r._id]: e.target.value }))}
                    placeholder="Reply publicly to this review…"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    onClick={() => submitReply(r._id)}
                    disabled={replying === r._id || !replyText[r._id]?.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition"
                  >
                    {replying === r._id ? "…" : "Reply"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
