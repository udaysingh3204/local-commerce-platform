import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationItem = {
  _id: string
  title: string
  message: string
  type?: string
  isRead?: boolean
  createdAt?: string
  orderId?: string | null
}

type NotificationsResponse = {
  notifications: NotificationItem[]
  unreadCount?: number
  total?: number
}

type NotificationsScreenProps = {
  onBack: () => void
  withAuth: <T>(path: string, options?: RequestInit) => Promise<T>
  onOpenOrder?: (orderId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  order:    "🛍",
  delivery: "🚚",
  payment:  "💳",
  promo:    "🎟",
  system:   "📢",
  chat:     "💬",
}

const fmtDate = (iso?: string) => {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsScreen({ onBack, withAuth, onOpenOrder }: NotificationsScreenProps) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  const fetchNotifications = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const data = await withAuth<NotificationsResponse | NotificationItem[]>(
        `/api/notifications?limit=50&sort=-createdAt`
      )

      // API may return { notifications: [...] } or a plain array
      const list = Array.isArray(data) ? data : (data as NotificationsResponse).notifications ?? []
      const unread = Array.isArray(data)
        ? list.filter((n) => !n.isRead).length
        : (data as NotificationsResponse).unreadCount ?? list.filter((n) => !n.isRead).length

      setItems(list)
      setUnreadCount(unread)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load notifications")
    } finally {
      if (mode === "initial") setLoading(false)
      else setRefreshing(false)
    }
  }, [withAuth])

  useEffect(() => { void fetchNotifications() }, [fetchNotifications])

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await withAuth<unknown>(`/api/notifications/mark-all-read`, { method: "PATCH" })
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // best-effort; ignore error
    } finally {
      setMarkingAll(false)
    }
  }

  const markOneRead = async (id: string) => {
    // optimistic
    setItems((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      await withAuth<unknown>(`/api/notifications/${id}/read`, { method: "PATCH" })
    } catch {
      // rollback is not critical; notification list will re-fetch on next refresh
    }
  }

  const handleTap = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markOneRead(item._id)
    }
    if (item.orderId && onOpenOrder) {
      onOpenOrder(item.orderId)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <Pressable onPress={onBack} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ fontSize: 20, color: "#6366f1" }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", flex: 1 }}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            disabled={markingAll}
            style={{ padding: 4 }}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text style={{ fontSize: 13, color: "#6366f1", fontWeight: "600" }}>Mark all read</Text>
            )}
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>Loading notifications…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ fontSize: 16, color: "#ef4444", textAlign: "center", marginBottom: 16 }}>{error}</Text>
          <Pressable
            onPress={() => { void fetchNotifications() }}
            style={{ backgroundColor: "#6366f1", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { void fetchNotifications("refresh") }}
              tintColor="#6366f1"
            />
          }
        >
          {items.length === 0 ? (
            <View style={{ padding: 48, alignItems: "center" }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 4 }}>
                All caught up!
              </Text>
              <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center" }}>
                No notifications yet. Check back after placing an order.
              </Text>
            </View>
          ) : (
            items.map((item, idx) => {
              const icon = TYPE_ICON[item.type ?? ""] ?? "🔔"
              const tappable = !item.isRead || !!item.orderId

              return (
                <Pressable
                  key={item._id}
                  onPress={() => { void handleTap(item) }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: item.isRead ? "#fff" : "#eff6ff",
                    borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                    opacity: pressed && tappable ? 0.7 : 1,
                  })}
                >
                  {/* Unread dot */}
                  <View style={{ width: 20, alignItems: "center", paddingTop: 2, marginRight: 4 }}>
                    {!item.isRead && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#6366f1",
                        }}
                      />
                    )}
                  </View>

                  {/* Icon */}
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{icon}</Text>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: item.isRead ? "600" : "800",
                          color: "#111827",
                          flex: 1,
                          marginRight: 8,
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(item.createdAt)}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: "#6b7280", lineHeight: 18 }} numberOfLines={2}>
                      {item.message}
                    </Text>
                    {item.orderId && (
                      <Text style={{ fontSize: 12, color: "#6366f1", marginTop: 4, fontWeight: "600" }}>
                        View order →
                      </Text>
                    )}
                  </View>
                </Pressable>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
