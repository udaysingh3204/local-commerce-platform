import { useState, useEffect, useCallback } from "react"
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native"
import { Colors, Font, Radius, Shadow, Spacing } from "../theme"
import { useApp } from "../context/AppContext"
import { API_BASE_URL } from "../config/env"

interface Review {
  _id: string
  userId: { name: string } | null
  rating: number
  comment: string
  isVerifiedPurchase: boolean
  vendorReply?: { text: string }
  createdAt: string
}

interface ReviewStats {
  avgRating: number
  count: number
  distribution: Record<number, number>
}

function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Pressable key={s} onPress={() => onChange?.(s)} hitSlop={6}>
          <Text style={{ fontSize: size, color: s <= value ? "#f59e0b" : "#4b5563" }}>★</Text>
        </Pressable>
      ))}
    </View>
  )
}

interface Props {
  targetType: "product" | "store"
  targetId: string
}

export default function ReviewsPanel({ targetType, targetId }: Props) {
  const { withAuth, user } = useApp()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats>({ avgRating: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  const [myReviewId, setMyReviewId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formRating, setFormRating] = useState(5)
  const [formComment, setFormComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await withAuth<{ reviews: Review[]; stats: ReviewStats; myReviewId: string | null }>(
        `/api/reviews/${targetType}/${targetId}`
      )
      setReviews(data.reviews || [])
      setStats(data.stats)
      setMyReviewId(data.myReviewId || null)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [targetType, targetId])

  useEffect(() => { void load() }, [load])

  const submitReview = async () => {
    if (!formRating) { setFormError("Select a rating"); return }
    setSubmitting(true)
    setFormError("")
    try {
      const SecureStore = await import("expo-secure-store")
      const token = await SecureStore.getItemAsync("userToken")
      await fetch(`${API_BASE_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetType, targetId, rating: formRating, comment: formComment }),
      })
      setShowModal(false)
      setFormComment("")
      setFormRating(5)
      await load()
    } catch {
      setFormError("Failed to submit review")
    } finally { setSubmitting(false) }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })

  const avgLabel = stats.avgRating ? stats.avgRating.toFixed(1) : "—"

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Reviews</Text>
          {stats.count > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Stars value={Math.round(stats.avgRating)} size={14} />
              <Text style={styles.avgText}>{avgLabel}</Text>
              <Text style={styles.countText}>({stats.count})</Text>
            </View>
          )}
        </View>
        {user && !myReviewId && (
          <Pressable onPress={() => setShowModal(true)} style={styles.writeBtn}>
            <Text style={styles.writeBtnText}>✏️ Write Review</Text>
          </Pressable>
        )}
      </View>

      {/* Rating distribution */}
      {stats.count > 0 && (
        <View style={styles.distBox}>
          {[5, 4, 3, 2, 1].map((s) => {
            const pct = stats.count > 0 ? ((stats.distribution[s] || 0) / stats.count) * 100 : 0
            return (
              <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={styles.distLabel}>{s}</Text>
                <Text style={{ fontSize: 11, color: "#f59e0b" }}>★</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%` as any }]} />
                </View>
                <Text style={styles.distCount}>{stats.distribution[s] || 0}</Text>
              </View>
            )
          })}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator color={Colors.primary} size="small" />
        </View>
      ) : reviews.length === 0 ? (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
          <Text style={{ color: Colors.textMuted, fontSize: Font.sm }}>No reviews yet</Text>
        </View>
      ) : (
        reviews.map((r) => (
          <View key={r._id} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(r.userId?.name || "U")[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.reviewerName}>{r.userId?.name || "Customer"}</Text>
                  <Text style={styles.reviewDate}>{fmtDate(r.createdAt)}</Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Stars value={r.rating} size={13} />
                {r.isVerifiedPurchase && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                )}
              </View>
            </View>
            {!!r.comment && (
              <Text style={styles.comment}>{r.comment}</Text>
            )}
            {r.vendorReply?.text && (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>Store Reply</Text>
                <Text style={styles.replyText}>{r.vendorReply.text}</Text>
              </View>
            )}
          </View>
        ))
      )}

      {/* Write review modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <Text style={styles.modalLabel}>Rating</Text>
            <View style={{ flexDirection: "row", gap: 4, marginBottom: 16 }}>
              <Stars value={formRating} onChange={setFormRating} size={32} />
            </View>
            <Text style={styles.modalLabel}>Comment (optional)</Text>
            <TextInput
              value={formComment}
              onChangeText={setFormComment}
              placeholder="Share your experience…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={1000}
              style={styles.textarea}
            />
            {!!formError && <Text style={styles.errorText}>{formError}</Text>}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable onPress={submitReview} disabled={submitting} style={[styles.submitBtn, submitting && { opacity: 0.6 }]}>
                <Text style={styles.submitBtnText}>{submitting ? "Submitting…" : "Submit"}</Text>
              </Pressable>
              <Pressable onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: Spacing.xl, paddingTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.md },
  heading: { fontSize: Font.lg, fontWeight: "900", color: Colors.text },
  avgText: { fontSize: Font.md, fontWeight: "800", color: Colors.text },
  countText: { fontSize: Font.sm, color: Colors.textMuted },
  writeBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.md,
  },
  writeBtnText: { color: "#fff", fontSize: Font.sm, fontWeight: "700" },
  distBox: {
    backgroundColor: Colors.bgMuted, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  distLabel: { fontSize: Font.sm, color: Colors.textSecondary, width: 12, textAlign: "right" },
  barBg: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 99, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: "#f59e0b", borderRadius: 99 },
  distCount: { fontSize: Font.xs, color: Colors.textMuted, width: 20, textAlign: "right" },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primaryLight, justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: Font.sm, fontWeight: "900", color: Colors.primary },
  reviewerName: { fontSize: Font.sm, fontWeight: "700", color: Colors.text },
  reviewDate: { fontSize: Font.xs, color: Colors.textMuted },
  comment: { fontSize: Font.sm, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 20 },
  verifiedBadge: {
    backgroundColor: "#d1fae5", borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  verifiedText: { fontSize: 9, fontWeight: "700", color: "#065f46" },
  replyBox: {
    marginTop: Spacing.sm, borderLeftWidth: 2, borderLeftColor: Colors.primary,
    paddingLeft: Spacing.sm, paddingVertical: 6,
  },
  replyLabel: { fontSize: 10, fontWeight: "800", color: Colors.primary, marginBottom: 2 },
  replyText: { fontSize: Font.xs, color: Colors.textSecondary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.xxl,
  },
  modalTitle: { fontSize: Font.xl, fontWeight: "900", color: Colors.text, marginBottom: Spacing.lg },
  modalLabel: { fontSize: Font.sm, fontWeight: "700", color: Colors.textSecondary, marginBottom: Spacing.xs },
  textarea: {
    backgroundColor: Colors.bgMuted, borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: Font.sm, minHeight: 100, textAlignVertical: "top",
    borderWidth: 1, borderColor: Colors.border,
  },
  errorText: { color: Colors.danger, fontSize: Font.xs, marginTop: 4 },
  submitBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 13, alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: Font.md },
  cancelBtn: {
    flex: 1, backgroundColor: Colors.bgMuted, borderRadius: Radius.md,
    paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: Font.md },
})
