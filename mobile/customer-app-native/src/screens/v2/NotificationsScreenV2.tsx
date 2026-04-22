import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator, Pressable, RefreshControl,
  SafeAreaView, ScrollView, Text, View,
} from "react-native"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Spacing } from "../../theme"
import type { TabNavProp } from "../../navigation/types"

type NotificationItem = {
  _id: string; title: string; message: string
  type?: string; isRead?: boolean; createdAt?: string; orderId?: string | null
}
type Response = { notifications?: NotificationItem[]; unreadCount?: number }
type ProfileLite = {
  referralCode?: string
  loyalty?: { tier?: string; points?: number; nextTier?: string | null; pointsToNextTier?: number | null }
}

const TYPE_ICON: Record<string, string> = {
  order: "🛍", delivery: "🚚", payment: "💳", promo: "🎟", system: "📢", chat: "💬",
}

const TYPE_LABEL: Record<string, string> = {
  order: "Order tea",
  delivery: "Courier energy",
  payment: "Money move",
  promo: "Savings drama",
  system: "App broadcast",
  chat: "Support chat",
}

const fmtDate = (iso?: string) => {
  if (!iso) return ""
  const d = new Date(iso), now = new Date()
  const m = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export default function NotificationsScreenV2() {
  const nav = useNavigation<TabNavProp>()
  const { withAuth } = useApp()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [profile, setProfile] = useState<ProfileLite | null>(null)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true); else setRefreshing(true)
    try {
      const [data, profileData] = await Promise.all([
        withAuth<Response | NotificationItem[]>("/api/notifications?limit=50&sort=-createdAt"),
        withAuth<ProfileLite>("/api/auth/me"),
      ])
      const list = Array.isArray(data) ? data : (data as Response).notifications ?? []
      const u = Array.isArray(data)
        ? list.filter((n) => !n.isRead).length
        : (data as Response).unreadCount ?? list.filter((n) => !n.isRead).length
      setItems(list)
      setUnread(u)
      setProfile(profileData)
    } catch { /* ignore */ } finally {
      if (mode === "initial") setLoading(false); else setRefreshing(false)
    }
  }, [withAuth])

  useEffect(() => { void load() }, [load])
  useFocusEffect(useCallback(() => { void load("refresh") }, [load]))

  const unreadPromoCount = items.filter((item) => !item.isRead && item.type === "promo").length
  const unreadOrderCount = items.filter((item) => !item.isRead && ["order", "delivery"].includes(item.type ?? "")).length
  const latestType = items[0]?.type ?? "system"
  const missionInbox = [
    {
      key: "promo-mission",
      icon: "🧪",
      label: unreadPromoCount > 0 ? `${unreadPromoCount} live` : "Warm",
      title: "Coupon missions still have motion",
      body: unreadPromoCount > 0
        ? "Promo alerts are waiting. Open checkout from the next cart run and squeeze the price properly."
        : "No fresh promo ping yet, but the coupon lab is still active whenever your next basket lands.",
      cta: "Jump to checkout",
      onPress: () => nav.navigate("Checkout"),
      accent: "#2563eb",
      tone: "#eff6ff",
    },
    {
      key: "referral-mission",
      icon: "📣",
      label: profile?.referralCode ?? "Syncing",
      title: "Referral loop",
      body: profile?.referralCode
        ? `Your invite code ${profile.referralCode} is ready. Notifications are now part reminder feed, part growth cockpit.`
        : "Referral sync is still warming up, but this inbox keeps the social-order loop visible between checkouts.",
      cta: "Open profile",
      onPress: () => nav.navigate("Profile"),
      accent: "#c2410c",
      tone: "#fff7ed",
    },
    {
      key: "order-mission",
      icon: "🛰️",
      label: unreadOrderCount > 0 ? `${unreadOrderCount} alerts` : (profile?.loyalty?.tier ?? "Bronze"),
      title: "Loyalty and live orders",
      body: unreadOrderCount > 0
        ? "Order and delivery pings are stacking. Tap through and keep the loyalty climb tied to actual runs, not dead stats."
        : profile?.loyalty?.nextTier && profile.loyalty.pointsToNextTier != null
          ? `${profile.loyalty.pointsToNextTier} points to ${profile.loyalty.nextTier}. One more clean run keeps the climb alive.`
          : `You already have ${profile?.loyalty?.points ?? 0} points. The next delivery closes the gap faster than settings-page dust.`,
      cta: "Open orders",
      onPress: () => nav.navigate("Orders"),
      accent: "#7c3aed",
      tone: "#f5f3ff",
    },
  ]

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await withAuth<unknown>("/api/notifications/mark-all-read", { method: "PATCH" })
      setItems((p) => p.map((n) => ({ ...n, isRead: true })))
      setUnread(0)
    } catch { /* ignore */ } finally { setMarkingAll(false) }
  }

  const markOneRead = async (id: string) => {
    setItems((p) => p.map((n) => n._id === id ? { ...n, isRead: true } : n))
    setUnread((p) => Math.max(0, p - 1))
    try { await withAuth<unknown>(`/api/notifications/${id}/read`, { method: "PATCH" }) } catch { /* ignore */ }
  }

  const handleTap = async (item: NotificationItem) => {
    if (!item.isRead) await markOneRead(item._id)
    if (item.orderId) nav.navigate("OrderDetail", { orderId: item.orderId })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
        backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
      }}>
        <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.text }}>
          Notifications{unread > 0 ? ` (${unread})` : ""}
        </Text>
        {unread > 0 && (
          <Pressable onPress={markAllRead} disabled={markingAll}>
            {markingAll
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={{ fontSize: Font.sm, color: Colors.primary, fontWeight: "700" }}>Mark all read</Text>}
          </Pressable>
        )}
      </View>

      <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm, backgroundColor: Colors.bg }}>
        <View style={{ backgroundColor: "#111827", borderRadius: 24, padding: Spacing.lg }}>
          <Text style={{ color: "#93c5fd", fontSize: Font.xs, fontWeight: "800", letterSpacing: 1.3 }}>SIGNAL FEED</Text>
          <Text style={{ color: "#fff", fontSize: Font.lg, fontWeight: "900", marginTop: 6 }}>
            {unread > 0 ? `${unread} unread drop${unread === 1 ? "" : "s"} still want your attention.` : "You cleared the board. No lingering chaos."}
          </Text>
          <Text style={{ color: "#cbd5e1", fontSize: Font.sm, marginTop: 6 }}>
            Latest vibe: {TYPE_LABEL[latestType] ?? "App broadcast"}. Promo heat: {unreadPromoCount}. Order pings: {unreadOrderCount}.
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingTop: Spacing.md }}>
          {missionInbox.map((mission) => (
            <Pressable
              key={mission.key}
              onPress={mission.onPress}
              style={({ pressed }) => ({
                width: 224,
                borderRadius: Radius.xl,
                padding: Spacing.lg,
                backgroundColor: mission.tone,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <Text style={{ color: mission.accent, fontSize: Font.xs, fontWeight: "800", letterSpacing: 1 }}>{mission.label.toUpperCase()}</Text>
                  <Text style={{ color: Colors.text, fontSize: Font.md, fontWeight: "900", marginTop: 6 }}>{mission.title}</Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: Font.sm, lineHeight: 19, marginTop: 6 }}>{mission.body}</Text>
                  <Text style={{ color: mission.accent, fontSize: Font.sm, fontWeight: "900", marginTop: 10 }}>{mission.cta} →</Text>
                </View>
                <Text style={{ fontSize: 28 }}>{mission.icon}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={Colors.primary} />}
        >
          {items.length === 0 ? (
            <View style={{ padding: 64, alignItems: "center" }}>
              <Text style={{ fontSize: 56 }}>🔔</Text>
              <Text style={{ fontSize: Font.lg, fontWeight: "800", color: Colors.text, marginTop: 16 }}>All caught up!</Text>
              <Text style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 4, textAlign: "center" }}>
                Notifications about your orders and offers will appear here.
              </Text>
            </View>
          ) : (
            items.map((item, idx) => (
              <Pressable
                key={item._id}
                onPress={() => void handleTap(item)}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "flex-start",
                  marginHorizontal: Spacing.xl,
                  marginBottom: Spacing.md,
                  paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
                  backgroundColor: item.isRead ? Colors.bgCard : "#eff6ff",
                  borderWidth: 1, borderColor: item.isRead ? Colors.border : "#bfdbfe",
                  borderRadius: Radius.xl,
                  opacity: pressed ? 0.8 : 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                })}
              >
                {/* Unread dot */}
                <View style={{ width: 12, justifyContent: "center", paddingTop: 2, marginRight: 4 }}>
                  {!item.isRead && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary }} />
                  )}
                </View>

                {/* Icon */}
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: item.isRead ? Colors.bgMuted : Colors.primaryLight,
                  justifyContent: "center", alignItems: "center", marginRight: Spacing.md,
                }}>
                  <Text style={{ fontSize: 20 }}>{TYPE_ICON[item.type ?? ""] ?? "🔔"}</Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Font.xs, color: Colors.primary, fontWeight: "800", letterSpacing: 1, marginBottom: 4 }}>
                    {(TYPE_LABEL[item.type ?? ""] ?? "APP BROADCAST").toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                    <Text style={{
                      fontSize: Font.md, flex: 1, marginRight: 8,
                      fontWeight: item.isRead ? "600" : "800", color: Colors.text,
                    }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ fontSize: Font.xs, color: Colors.textMuted }}>{fmtDate(item.createdAt)}</Text>
                  </View>
                  <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 18 }} numberOfLines={2}>
                    {item.message}
                  </Text>
                  {item.orderId && (
                    <Text style={{ fontSize: Font.xs, color: Colors.primary, fontWeight: "700", marginTop: 4 }}>
                      View order →
                    </Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
