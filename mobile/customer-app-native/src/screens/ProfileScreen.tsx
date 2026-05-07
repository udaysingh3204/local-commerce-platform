import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"
import type { CustomerAuthUser } from "../lib/shared"

// ─── Types ────────────────────────────────────────────────────────────────────

type LoyaltyInfo = {
  tier?: string
  points?: number
  cashbackRate?: number
  pointsMultiplier?: number
  nextTier?: string | null
  pointsToNextTier?: number | null
}

type SubscriptionInfo = {
  plan?: string
  status?: string
  renewsAt?: string | null
}

type ProfileResponse = {
  _id: string
  name: string
  email: string
  role: string
  wallet?: number
  loyalty?: LoyaltyInfo
  subscription?: SubscriptionInfo
  referralCode?: string
}

type ProfileScreenProps = {
  user: CustomerAuthUser
  onLogout: () => Promise<void>
  withAuth: <T>(path: string, options?: RequestInit) => Promise<T>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  Bronze:   { bg: "#fef3c7", text: "#92400e" },
  Silver:   { bg: "#f1f5f9", text: "#475569" },
  Gold:     { bg: "#fefce8", text: "#854d0e" },
  Platinum: { bg: "#f0fdf4", text: "#166534" },
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  Free:    { bg: "#f9fafb", text: "#6b7280" },
  Plus:    { bg: "#eff6ff", text: "#1d4ed8" },
  Premium: { bg: "#f5f3ff", text: "#6d28d9" },
  Elite:   { bg: "#ecfdf5", text: "#047857" },
  Annual:  { bg: "#fefce8", text: "#854d0e" },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen({ user, onLogout, withAuth }: ProfileScreenProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const data = await withAuth<ProfileResponse>(`/api/auth/me`)
      setProfile(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load profile")
    } finally {
      if (mode === "initial") setLoading(false)
      else setRefreshing(false)
    }
  }

  useEffect(() => { void fetchProfile() }, [user._id])

  const handleLogout = async () => {
    setLoggingOut(true)
    try { await onLogout() } finally { setLoggingOut(false) }
  }

  const tierStyle = TIER_COLORS[profile?.loyalty?.tier ?? ""] ?? { bg: "#f3f4f6", text: "#374151" }
  const planStyle = PLAN_COLORS[profile?.subscription?.plan ?? ""] ?? { bg: "#f9fafb", text: "#6b7280" }

  const card = {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  } as const

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
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", flex: 1 }}>My Account</Text>
        <Pressable onPress={() => { void fetchProfile("refresh") }} style={{ padding: 4 }}>
          <Text style={{ fontSize: 16, color: "#6366f1" }}>↻</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>Loading profile…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { void fetchProfile("refresh") }} tintColor="#6366f1" />
          }
        >
          {error && (
            <View style={{ backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: "#b91c1c", fontSize: 13 }}>{error}</Text>
            </View>
          )}

          {/* Avatar + name */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#6366f1",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>
                {(profile?.name || user.name || "?")[0].toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>
              {profile?.name || user.name}
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
              {profile?.email || user.email}
            </Text>
          </View>

          {/* Wallet balance */}
          {profile?.wallet != null && (
            <View
              style={{
                ...card,
                backgroundColor: "#ecfdf5",
                borderColor: "#a7f3d0",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 15, color: "#065f46", fontWeight: "700" }}>💰 Wallet Balance</Text>
              <Text style={{ fontSize: 18, color: "#047857", fontWeight: "800" }}>{fmt(profile.wallet)}</Text>
            </View>
          )}

          {/* Loyalty */}
          {profile?.loyalty && (
            <View style={{ ...card, backgroundColor: tierStyle.bg, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: tierStyle.text, marginBottom: 8 }}>
                LOYALTY REWARDS
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: tierStyle.text }}>
                    {profile.loyalty.tier ?? "Bronze"}
                  </Text>
                  <Text style={{ fontSize: 13, color: tierStyle.text, marginTop: 2 }}>
                    {profile.loyalty.points ?? 0} pts  ·  {((profile.loyalty.cashbackRate ?? 0) * 100).toFixed(1)}% cashback
                  </Text>
                  {profile.loyalty.pointsToNextTier != null && profile.loyalty.nextTier && (
                    <Text style={{ fontSize: 12, color: tierStyle.text, marginTop: 4, opacity: 0.8 }}>
                      {profile.loyalty.pointsToNextTier} pts to {profile.loyalty.nextTier}
                    </Text>
                  )}
                </View>
                <Text style={{ fontSize: 32 }}>⭐</Text>
              </View>
            </View>
          )}

          {/* Subscription */}
          {profile?.subscription?.plan && (
            <View style={{ ...card, backgroundColor: planStyle.bg, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: planStyle.text, marginBottom: 6 }}>
                SUBSCRIPTION
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: planStyle.text }}>
                  {profile.subscription.plan} Plan
                </Text>
                <View
                  style={{
                    backgroundColor: profile.subscription.status === "active" ? "#dcfce7" : "#fee2e2",
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: profile.subscription.status === "active" ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {profile.subscription.status?.toUpperCase() ?? "INACTIVE"}
                  </Text>
                </View>
              </View>
              {profile.subscription.renewsAt && (
                <Text style={{ fontSize: 12, color: planStyle.text, marginTop: 4, opacity: 0.75 }}>
                  Renews: {new Date(profile.subscription.renewsAt).toLocaleDateString("en-IN")}
                </Text>
              )}
            </View>
          )}

          {/* Referral code */}
          {profile?.referralCode && (
            <View style={card}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 }}>REFERRAL CODE</Text>
              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderStyle: "dashed",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 22, fontWeight: "800", letterSpacing: 4, color: "#6366f1" }}
                  selectable
                >
                  {profile.referralCode}
                </Text>
                <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Share to earn referral rewards
                </Text>
              </View>
            </View>
          )}

          {/* Account meta */}
          <View style={card}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 10 }}>ACCOUNT</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 14, color: "#6b7280" }}>Role</Text>
              <Text style={{ fontSize: 14, color: "#111827", fontWeight: "600", textTransform: "capitalize" }}>
                {profile?.role ?? user.role}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: "#6b7280" }}>Member since</Text>
              <Text style={{ fontSize: 14, color: "#111827" }}>LocalMart</Text>
            </View>
          </View>

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            disabled={loggingOut}
            style={{
              backgroundColor: loggingOut ? "#d1d5db" : "#fef2f2",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#fecaca",
            }}
          >
            {loggingOut ? (
              <ActivityIndicator color="#b91c1c" />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#b91c1c" }}>Sign Out</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
