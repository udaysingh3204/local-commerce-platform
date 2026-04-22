import { useEffect, useState } from "react"
import {
  ActivityIndicator, Pressable, RefreshControl,
  SafeAreaView, ScrollView, Text, View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing } from "../../theme"
import type { TabNavProp } from "../../navigation/types"

type ProfileData = {
  _id: string; name: string; email: string; role: string
  wallet?: number
  loyalty?: { tier?: string; points?: number; cashbackRate?: number; pointsMultiplier?: number; nextTier?: string | null; pointsToNextTier?: number | null }
  subscription?: { plan?: string; status?: string; renewsAt?: string | null }
  referralCode?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

const TIER_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  Bronze:   { bg: "#fef3c7", text: "#92400e", icon: "🥉" },
  Silver:   { bg: "#f1f5f9", text: "#475569", icon: "🥈" },
  Gold:     { bg: "#fefce8", text: "#854d0e", icon: "🥇" },
  Platinum: { bg: "#f0fdf4", text: "#166534", icon: "💎" },
}
const PLAN_STYLES: Record<string, { bg: string; text: string }> = {
  Free:    { bg: "#f9fafb", text: "#6b7280" },
  Plus:    { bg: "#eff6ff", text: "#1d4ed8" },
  Premium: { bg: "#f5f3ff", text: "#6d28d9" },
  Elite:   { bg: "#ecfdf5", text: "#047857" },
  Annual:  { bg: "#fefce8", text: "#854d0e" },
}

const progressPct = (value?: number | null) => {
  if (value == null) return 0
  return Math.min(100, Math.max(8, 100 - Math.min(value, 1000) / 10))
}

export default function ProfileScreenV2() {
  const nav = useNavigation<TabNavProp>()
  const { user, startup, cartItemCount, logout, withAuth } = useApp()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const load = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true); else setRefreshing(true)
    try { setProfile(await withAuth<ProfileData>("/api/auth/me")) }
    catch { /* ignore */ } finally {
      if (mode === "initial") setLoading(false); else setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [user?._id])

  const handleLogout = async () => { setLoggingOut(true); try { await logout() } finally { setLoggingOut(false) } }

  const tier = TIER_STYLES[profile?.loyalty?.tier ?? ""] ?? { bg: Colors.bgMuted, text: Colors.textSecondary, icon: "⭐" }
  const plan = PLAN_STYLES[profile?.subscription?.plan ?? ""] ?? { bg: Colors.bgMuted, text: Colors.textSecondary }
  const loyaltyProgress = progressPct(profile?.loyalty?.pointsToNextTier)
  const activeOrders = startup.activeOrders
  const questBoard = [
    {
      key: "coupon-streak",
      icon: "🧪",
      tone: "#eff6ff",
      accent: "#2563eb",
      label: cartItemCount > 0 ? "Live now" : "Warm it up",
      title: "Coupon streak",
      body: cartItemCount > 0
        ? `You have ${cartItemCount} cart item${cartItemCount === 1 ? "" : "s"}. Checkout is ready to turn that into a mission run.`
        : "No cart heat yet. Build a basket and the checkout puzzle deck becomes your discount engine.",
      cta: cartItemCount > 0 ? "Open Checkout" : "Go Explore",
      onPress: () => cartItemCount > 0 ? nav.navigate("Checkout") : nav.navigate("Explore"),
    },
    {
      key: "referral-flywheel",
      icon: "📣",
      tone: "#fff7ed",
      accent: "#c2410c",
      label: profile?.referralCode ?? "Needs sync",
      title: "Referral flywheel",
      body: profile?.referralCode
        ? `Your code ${profile.referralCode} is ready for group chats, hostel boards, and family spam. Turn one order into a crew habit.`
        : "Referral code is still syncing, but this is where your invite loop lives once the profile feed lands.",
      cta: "Keep sharing",
      onPress: () => nav.navigate("Notifications"),
    },
    {
      key: "loyalty-climb",
      icon: "⭐",
      tone: "#f5f3ff",
      accent: "#7c3aed",
      label: profile?.loyalty?.tier ?? "Bronze",
      title: "Loyalty climb",
      body: profile?.loyalty?.nextTier && profile.loyalty.pointsToNextTier != null
        ? `${profile.loyalty.pointsToNextTier} points to ${profile.loyalty.nextTier}. Keep the order loop active and stack the climb.`
        : `You already hold ${profile?.loyalty?.points ?? 0} points. The next clean run keeps the perks compounding.`,
      cta: activeOrders > 0 ? "Track orders" : "Start another run",
      onPress: () => activeOrders > 0 ? nav.navigate("Orders") : nav.navigate("Explore"),
    },
  ]

  const card = { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm } as const

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, backgroundColor: Colors.bgCard, ...Shadow.sm }}>
        <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.text }}>My Account</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={Colors.primary} />}
        >
          <View style={{ backgroundColor: "#0f172a", borderRadius: 28, padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadow.lg }}>
            <Text style={{ fontSize: Font.xs, color: "#67e8f9", fontWeight: "800", letterSpacing: 1.3 }}>ACCOUNT AURA</Text>
            <Text style={{ fontSize: Font.xxl, color: "#fff", fontWeight: "900", marginTop: 6 }}>
              {(profile?.name || user?.name || "You").split(" ")[0]}, your LocalMart persona is fully active.
            </Text>
            <Text style={{ fontSize: Font.sm, color: "#cbd5e1", marginTop: 8, lineHeight: 20 }}>
              Wallet, loyalty, referrals, and plan status all live here now. This page is less “settings” and more “commerce identity card.”
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.lg }}>
              <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.xs }}>{profile?.subscription?.plan ?? "Free"} plan</Text>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.xs }}>{profile?.loyalty?.tier ?? "Bronze"} tier</Text>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.xs }}>{profile?.referralCode ? "Referral ready" : "Referral loading"}</Text>
              </View>
            </View>
          </View>

          {/* Avatar */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
            <View style={{
              width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary,
              justifyContent: "center", alignItems: "center", marginBottom: 12, ...Shadow.lg,
            }}>
              <Text style={{ fontSize: 36, fontWeight: "900", color: "#fff" }}>
                {(profile?.name || user?.name || "?")[0].toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.text }}>{profile?.name || user?.name}</Text>
            <Text style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 2 }}>{profile?.email || user?.email}</Text>
            <View style={{
              marginTop: 8, backgroundColor: Colors.primaryLight,
              paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full,
            }}>
              <Text style={{ fontSize: Font.xs, color: Colors.primary, fontWeight: "700", textTransform: "capitalize" }}>
                {profile?.role ?? "customer"}
              </Text>
            </View>
          </View>

          {/* Wallet */}
          {profile?.wallet != null && (
            <View style={{ ...card, backgroundColor: "#ecfdf5", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 28 }}>💰</Text>
                <Text style={{ fontSize: Font.md, fontWeight: "700", color: "#065f46" }}>Wallet Balance</Text>
              </View>
              <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.success }}>{fmt(profile.wallet)}</Text>
            </View>
          )}

          {/* Loyalty */}
          {profile?.loyalty && (
            <View style={{ ...card, backgroundColor: tier.bg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View>
                  <Text style={{ fontSize: Font.xs, fontWeight: "700", color: tier.text, letterSpacing: 1 }}>LOYALTY TIER</Text>
                  <Text style={{ fontSize: Font.xxl, fontWeight: "900", color: tier.text, marginTop: 4 }}>
                    {tier.icon}  {profile.loyalty.tier ?? "Bronze"}
                  </Text>
                  <Text style={{ fontSize: Font.md, color: tier.text, marginTop: 4 }}>
                    {profile.loyalty.points ?? 0} points  ·  {((profile.loyalty.cashbackRate ?? 0) * 100).toFixed(1)}% cashback
                  </Text>
                  {profile.loyalty.nextTier && profile.loyalty.pointsToNextTier != null && (
                    <Text style={{ fontSize: Font.sm, color: tier.text, opacity: 0.75, marginTop: 4 }}>
                      {profile.loyalty.pointsToNextTier} pts to {profile.loyalty.nextTier}
                    </Text>
                  )}
                </View>
                <Text style={{ fontSize: 44 }}>⭐</Text>
              </View>
                <View style={{ marginTop: Spacing.lg }}>
                  <View style={{ height: 10, borderRadius: Radius.full, backgroundColor: "rgba(255,255,255,0.45)", overflow: "hidden" }}>
                    <View style={{ width: `${loyaltyProgress}%`, height: "100%", backgroundColor: tier.text, borderRadius: Radius.full }} />
                  </View>
                  <Text style={{ fontSize: Font.xs, color: tier.text, opacity: 0.8, marginTop: 6, fontWeight: "700" }}>
                    Tier climb progress: {loyaltyProgress}%
                  </Text>
                </View>
            </View>
          )}

          {/* Subscription */}
          {profile?.subscription?.plan && (
            <View style={{ ...card, backgroundColor: plan.bg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: Font.xs, fontWeight: "700", color: plan.text, letterSpacing: 1 }}>SUBSCRIPTION</Text>
                  <Text style={{ fontSize: Font.xl, fontWeight: "900", color: plan.text, marginTop: 4 }}>
                    {profile.subscription.plan} Plan
                  </Text>
                  {profile.subscription.renewsAt && (
                    <Text style={{ fontSize: Font.sm, color: plan.text, opacity: 0.75, marginTop: 2 }}>
                      Renews {new Date(profile.subscription.renewsAt).toLocaleDateString("en-IN")}
                    </Text>
                  )}
                </View>
                <View style={{
                  backgroundColor: profile.subscription.status === "active" ? "#dcfce7" : "#fee2e2",
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
                }}>
                  <Text style={{
                    fontSize: Font.xs, fontWeight: "900",
                    color: profile.subscription.status === "active" ? "#15803d" : "#b91c1c",
                  }}>
                    {profile.subscription.status?.toUpperCase() ?? "INACTIVE"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Referral */}
          {profile?.referralCode && (
            <View style={card}>
              <Text style={{ fontSize: Font.xs, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
                REFERRAL CODE
              </Text>
              <View style={{
                backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: Spacing.lg,
                borderWidth: 2, borderColor: Colors.primaryLight, borderStyle: "dashed", alignItems: "center",
              }}>
                <Text style={{ fontSize: Font.xxl, fontWeight: "900", letterSpacing: 6, color: Colors.primary }} selectable>
                  {profile.referralCode}
                </Text>
                <Text style={{ fontSize: Font.sm, color: Colors.textMuted, marginTop: 6 }}>
                  Share to earn referral rewards
                </Text>
              </View>
              <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 20 }}>
                Drop this code in your group chats, hostel chaos boards, or family threads. Let the network effect do the flirting.
              </Text>
            </View>
          )}

          <View style={card}>
            <Text style={{ fontSize: Font.xs, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
              QUEST BOARD
            </Text>
            <Text style={{ fontSize: Font.lg, fontWeight: "900", color: Colors.text, marginBottom: Spacing.md }}>
              Your rewards loop should stay visible even when checkout is closed.
            </Text>
            {questBoard.map((quest) => (
              <Pressable
                key={quest.key}
                onPress={quest.onPress}
                style={({ pressed }) => ({
                  backgroundColor: quest.tone,
                  borderRadius: Radius.xl,
                  padding: Spacing.lg,
                  marginBottom: Spacing.sm,
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, paddingRight: Spacing.md }}>
                    <Text style={{ fontSize: Font.xs, fontWeight: "800", color: quest.accent, letterSpacing: 1 }}>{quest.label.toUpperCase()}</Text>
                    <Text style={{ fontSize: Font.md, fontWeight: "900", color: Colors.text, marginTop: 6 }}>{quest.title}</Text>
                    <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 19, marginTop: 6 }}>{quest.body}</Text>
                    <Text style={{ fontSize: Font.sm, color: quest.accent, fontWeight: "900", marginTop: 10 }}>{quest.cta} →</Text>
                  </View>
                  <Text style={{ fontSize: 28 }}>{quest.icon}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Account settings */}
          <View style={card}>
            <Text style={{ fontSize: Font.xs, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md }}>
              ACCOUNT
            </Text>
            {[
              { label: "Name", value: profile?.name ?? user?.name ?? "—" },
              { label: "Email", value: profile?.email ?? user?.email ?? "—" },
              { label: "Role", value: profile?.role ?? "customer" },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                <Text style={{ fontSize: Font.md, color: Colors.textSecondary }}>{row.label}</Text>
                <Text style={{ fontSize: Font.md, color: Colors.text, fontWeight: "600", textTransform: "capitalize" }}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            disabled={loggingOut}
            style={({ pressed }) => ({
              backgroundColor: pressed || loggingOut ? "#fecaca" : "#fef2f2",
              borderRadius: Radius.xl, paddingVertical: Spacing.lg,
              alignItems: "center", borderWidth: 1, borderColor: "#fecaca", marginTop: Spacing.sm,
            })}
          >
            {loggingOut
              ? <ActivityIndicator color={Colors.danger} />
              : <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.danger }}>Sign Out</Text>}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
