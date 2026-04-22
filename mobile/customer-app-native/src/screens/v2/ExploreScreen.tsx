import { useEffect, useState } from "react"
import {
  ActivityIndicator, Pressable, RefreshControl,
  SafeAreaView, ScrollView, Text, TextInput, View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { fetchJson } from "@local-commerce-platform/mobile-shared"
import { API_BASE_URL } from "../../config/env"
import { Colors, Font, Radius, Shadow, Spacing, CATEGORY_CONFIG } from "../../theme"
import type { TabNavProp } from "../../navigation/types"

type StoreItem = { _id: string; storeName: string; category?: string; deliveryRadius?: number; address?: string }

const CATEGORIES = [
  { key: "all", label: "All", icon: "🏪" },
  ...Object.entries(CATEGORY_CONFIG).slice(0, 9).map(([key, cfg]) => ({ key, label: key.replace(/-/g, " "), icon: cfg.icon })),
]

const vibeCopy = (category: string, search: string, count: number) => {
  if (search.trim()) return `Search mode is on. ${count} match${count === 1 ? "" : "es"} survived the vibe check.`
  if (category !== "all") return `Dialed into ${category.replace(/-/g, " ")} mode. Curated chaos only.`
  return `All neighborhoods unlocked. Swipe until a store feels dangerously convenient.`
}

export default function ExploreScreen() {
  const nav = useNavigation<TabNavProp>()
  const [stores, setStores] = useState<StoreItem[]>([])
  const [filtered, setFiltered] = useState<StoreItem[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true); else setRefreshing(true)
    try {
      const data = await fetchJson<StoreItem[]>(API_BASE_URL, "/api/stores")
      setStores(data)
    } catch { /* ignore */ } finally {
      if (mode === "initial") setLoading(false); else setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    let list = stores
    if (category !== "all") list = list.filter((s) => s.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.storeName.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q))
    }
    setFiltered(list)
  }, [stores, category, search])

  const quickMoodPills = [
    { key: "food", label: "Snack spiral", icon: "🍟" },
    { key: "grocery", label: "Reset groceries", icon: "🫛" },
    { key: "bakery", label: "Soft life bakery", icon: "🥐" },
    { key: "pharmacy", label: "Fix-me-fast", icon: "💊" },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
        backgroundColor: Colors.bgCard, ...Shadow.sm,
      }}>
        <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.text, marginBottom: Spacing.md }}>
          Explore Stores
        </Text>
        <View style={{ backgroundColor: "#0f172a", borderRadius: 24, padding: Spacing.lg, marginBottom: Spacing.md }}>
          <Text style={{ fontSize: Font.xs, color: "#67e8f9", fontWeight: "800", letterSpacing: 1.3 }}>DISCOVERY MODE</Text>
          <Text style={{ fontSize: Font.lg, color: "#fff", fontWeight: "900", marginTop: 6 }}>Find a store that matches the mood, not just the need.</Text>
          <Text style={{ fontSize: Font.sm, color: "#cbd5e1", marginTop: 6, lineHeight: 20 }}>{vibeCopy(category, search, filtered.length || stores.length)}</Text>
        </View>
        {/* Search bar */}
        <View style={{
          flexDirection: "row", alignItems: "center", backgroundColor: Colors.bg,
          borderRadius: Radius.full, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
        }}>
          <Text style={{ fontSize: 16, marginRight: Spacing.sm }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search stores, categories…"
            placeholderTextColor={Colors.textMuted}
            style={{ flex: 1, height: 44, fontSize: Font.md, color: Colors.text }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Text style={{ color: Colors.textMuted, fontSize: Font.lg }}>✕</Text>
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md }}>
          {quickMoodPills.map((pill) => (
            <Pressable
              key={pill.key}
              onPress={() => setCategory(pill.key)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                marginRight: Spacing.sm,
                backgroundColor: pressed ? Colors.primaryLight : Colors.bg,
                borderRadius: Radius.full,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: Colors.border,
              })}
            >
              <Text style={{ marginRight: 6 }}>{pill.icon}</Text>
              <Text style={{ color: Colors.text, fontWeight: "700", fontSize: Font.sm }}>{pill.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}
        style={{ backgroundColor: Colors.bgCard, maxHeight: 60 }}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            onPress={() => setCategory(cat.key)}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 4,
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
              marginRight: Spacing.sm, opacity: pressed ? 0.8 : 1,
              backgroundColor: category === cat.key ? Colors.primary : Colors.bg,
              borderWidth: 1, borderColor: category === cat.key ? Colors.primary : Colors.border,
            })}
          >
            <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
            <Text style={{
              fontSize: Font.sm, fontWeight: "700", textTransform: "capitalize",
              color: category === cat.key ? "#fff" : Colors.textSecondary,
            }}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={Colors.primary} />}
        >
          <Text style={{ fontSize: Font.sm, color: Colors.textMuted, marginBottom: Spacing.md }}>
            {filtered.length} store{filtered.length !== 1 ? "s" : ""} found
          </Text>

          {filtered.length === 0 ? (
            <View style={{ padding: 48, alignItems: "center" }}>
              <Text style={{ fontSize: 48 }}>🏪</Text>
              <Text style={{ fontSize: Font.lg, fontWeight: "700", color: Colors.text, marginTop: 12 }}>
                No stores found
              </Text>
              <Text style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 4, textAlign: "center" }}>
                Try a different search or category
              </Text>
            </View>
          ) : (
            filtered.map((store) => {
              const cat = CATEGORY_CONFIG[store.category ?? ""] ?? CATEGORY_CONFIG.default
              return (
                <Pressable
                  key={store._id}
                  onPress={() => nav.navigate("StoreDetail", { storeId: store._id, storeName: store.storeName })}
                  style={({ pressed }) => ({
                    flexDirection: "row", backgroundColor: Colors.bgCard,
                    borderRadius: Radius.xl, marginBottom: Spacing.md,
                    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
                    opacity: pressed ? 0.9 : 1, ...Shadow.sm,
                  })}
                >
                  <View style={{
                    width: 80, backgroundColor: Colors.primary,
                    justifyContent: "center", alignItems: "center",
                  }}>
                    <Text style={{ fontSize: 36 }}>{cat.icon}</Text>
                  </View>
                  <View style={{ flex: 1, padding: Spacing.md }}>
                    <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.text }}>{store.storeName}</Text>
                    <Text style={{ fontSize: Font.sm, color: Colors.textSecondary, marginTop: 2, textTransform: "capitalize" }}>
                      {store.category || "General"}
                    </Text>
                    <Text style={{ fontSize: Font.xs, color: Colors.secondary, fontWeight: "800", marginTop: 4 }}>
                      {(store.deliveryRadius ?? 5) <= 3 ? "Blink-and-it’s-there fast" : "Worth the scroll, still local"}
                    </Text>
                    {store.address && (
                      <Text style={{ fontSize: Font.xs, color: Colors.textMuted, marginTop: 3 }} numberOfLines={1}>
                        📍 {store.address}
                      </Text>
                    )}
                  </View>
                  <View style={{ justifyContent: "center", paddingRight: Spacing.md }}>
                    <View style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm }}>
                      <Text style={{ fontSize: Font.xs, color: Colors.primary, fontWeight: "700" }}>
                        {store.deliveryRadius ?? 5}km
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: Colors.primary, textAlign: "center", marginTop: 6 }}>→</Text>
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
