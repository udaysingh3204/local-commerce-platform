import { useState, useEffect, useCallback } from "react"
import API from "../api/api"

interface Review {
  _id: string
  userId: { name: string } | null
  rating: number
  comment: string
  isVerifiedPurchase: boolean
  vendorReply?: { text: string; repliedAt: string }
  createdAt: string
}

interface ReviewStats {
  avgRating: number
  count: number
  distribution: Record<number, number>
}

interface Props {
  targetType: "product" | "store"
  targetId: string
  /** orderId for verified purchase badge */
  orderId?: string
}

function Stars({ value, onChange, size = 20 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0)
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHovered(s)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          style={{ fontSize: size, lineHeight: 1, background: "none", border: "none", padding: 0 }}
        >
          <span style={{ color: s <= (hovered || value) ? "#f59e0b" : "#d1d5db" }}>★</span>
        </button>
      ))}
    </span>
  )
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="w-4 text-right font-semibold text-gray-700">{label}</span>
      <span className="text-yellow-500">★</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-2 bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-right">{count}</span>
    </div>
  )
}

export default function ReviewsSection({ targetType, targetId, orderId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats>({ avgRating: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  const [myReviewId, setMyReviewId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Write form
  const [showForm, setShowForm] = useState(false)
  const [formRating, setFormRating] = useState(5)
  const [formComment, setFormComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const isLoggedIn = Boolean(localStorage.getItem("token"))

  const load = useCallback(async () => {
    try {
      const res = await API.get(`/reviews/${targetType}/${targetId}`)
      setReviews(res.data.reviews || [])
      setStats(res.data.stats)
      setMyReviewId(res.data.myReviewId || null)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [targetType, targetId])

  useEffect(() => { void load() }, [load])

  const submitReview = async () => {
    if (!formRating) { setFormError("Select a rating"); return }
    setSubmitting(true)
    setFormError("")
    try {
      await API.post("/reviews", {
        targetType,
        targetId,
        rating: formRating,
        comment: formComment,
        orderId: orderId || undefined,
      })
      setShowForm(false)
      setFormComment("")
      setFormRating(5)
      await load()
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to submit review")
    } finally { setSubmitting(false) }
  }

  const deleteReview = async (id: string) => {
    if (!confirm("Delete your review?")) return
    try {
      await API.delete(`/reviews/${id}`)
      await load()
    } catch { /* ignore */ }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="mt-8 border-t pt-6">
      {/* Header + CTA */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Reviews
            {stats.count > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">({stats.count})</span>
            )}
          </h3>
          {stats.count > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Stars value={Math.round(stats.avgRating)} size={16} />
              <span className="text-sm font-semibold text-gray-700">{stats.avgRating}</span>
              <span className="text-xs text-gray-400">out of 5</span>
            </div>
          )}
        </div>
        {isLoggedIn && !myReviewId && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Rating breakdown */}
      {stats.count > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 max-w-xs space-y-1.5">
          {[5, 4, 3, 2, 1].map((s) => (
            <RatingBar key={s} label={String(s)} count={stats.distribution[s] || 0} total={stats.count} />
          ))}
        </div>
      )}

      {/* Write form */}
      {showForm && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Your Review</h4>
          <div className="flex items-center gap-3 mb-3">
            <Stars value={formRating} onChange={setFormRating} size={28} />
            <span className="text-sm text-gray-500">{formRating}/5</span>
          </div>
          <textarea
            rows={3}
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
            placeholder="Share your experience (optional)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none bg-white"
            maxLength={1000}
          />
          {formError && <p className="text-red-500 text-xs mt-1">{formError}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={submitReview}
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError("") }}
              className="px-5 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-4xl mb-2">💬</p>
          <p className="text-gray-500 text-sm">No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {(r.userId?.name || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.userId?.name || "User"}</p>
                    <p className="text-xs text-gray-400">{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} size={14} />
                  {r.isVerifiedPurchase && (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Verified
                    </span>
                  )}
                  {myReviewId === r._id && (
                    <button
                      onClick={() => deleteReview(r._id)}
                      className="text-xs text-rose-400 hover:text-rose-600 font-semibold ml-2"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
              {r.vendorReply?.text && (
                <div className="mt-3 bg-gray-50 border-l-2 border-indigo-400 pl-3 py-2 rounded-r-xl">
                  <p className="text-xs font-bold text-indigo-600 mb-0.5">Store Reply</p>
                  <p className="text-xs text-gray-600">{r.vendorReply.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
