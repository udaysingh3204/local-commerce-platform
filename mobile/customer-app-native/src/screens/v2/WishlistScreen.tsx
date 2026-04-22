import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing } from "../../theme"

type WishlistItem = {
  wishlistItemId: string
  productId: string
  name: string
  description: string
  price: number
  priceWhenAdded: number
  priceDropPercent: number
  discount: number
  rating: number
  category: string
  image: string
  addedAt: string
  shouldNotify: boolean
  isTrendingUp: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

export default function WishlistScreen() {
  const { user, withAuth, addToCart, cartStoreId } = useApp()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!user) { setLoading(false); return }
    if (mode === "initial") setLoading(true); else setRefreshing(true)
    try {
      const data = await withAuth<{ wishlist: WishlistItem[] }>("/api/wishlist")
      setItems(data.wishlist)
    } catch {
      // ignore — wishlist not critical
    } finally {
      if (mode === "initial") setLoading(false); else setRefreshing(false)
    }
  }, [user?._id])

  useFocusEffect(useCallback(() => { void load("refresh") }, [load]))

  const handleRemove = async (productId: string) => {
    setRemoving(prev => ({ ...prev, [productId]: true }))
    try {
      await withAuth(`/api/wishlist/${productId}`, { method: "DELETE" })
      setItems(prev => prev.filter(i => i.productId !== productId))
    } catch {
      // ignore
    } finally {
      setRemoving(prev => ({ ...prev, [productId]: false }))
    }
  }

  const handleAddToCart = (item: WishlistItem) => {
    addToCart(
      {
        _id: item.productId,
        name: item.name,
        price: item.price,
        category: item.category,
        description: item.description,
      },
      cartStoreId ?? "wishlist"
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>🤍</Text>
        <Text style={{ color: Colors.text, fontWeight: "700", fontSize: Font.lg, marginBottom: 6 }}>
          Log in to see your wishlist
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: Font.sm, textAlign: "center", paddingHorizontal: 32 }}>
          Save products and track price drops.
        </Text>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: Colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        ...Shadow.sm,
      }}>
        <Text style={{ fontSize: Font.xxl, fontWeight: "800", color: Colors.text }}>Wishlist</Text>
        <Text style={{ color: Colors.textMuted, fontSize: Font.sm, marginTop: 2 }}>
          {items.length} {items.length === 1 ? "item" : "items"} saved
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🤍</Text>
          <Text style={{ color: Colors.text, fontWeight: "700", fontSize: Font.lg, marginBottom: 8 }}>
            Nothing saved yet
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: Font.sm, textAlign: "center" }}>
            Browse stores and tap the heart icon to save products you love.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.md, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load("refresh")}
              tintColor={Colors.primary}
            />
          }
        >
          {items.map(item => (
            <View
              key={item.wishlistItemId}
              style={{
                backgroundColor: Colors.bgCard,
                borderRadius: Radius.lg,
                overflow: "hidden",
                ...Shadow.sm,
              }}
            >
              {/* Image */}
              <View style={{ height: 160, backgroundColor: Colors.bgMuted, position: "relative" }}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 40 }}>📦</Text>
                  </View>
                )}
                {item.priceDropPercent > 0 && (
                  <View style={{
                    position: "absolute", top: 8, left: 8,
                    backgroundColor: Colors.success,
                    paddingHorizontal: 8, paddingVertical: 3,
                    borderRadius: 99,
                  }}>
                    <Text style={{ color: "#fff", fontSize: Font.xs, fontWeight: "700" }}>
                      ↓ {item.priceDropPercent.toFixed(0)}% drop
                    </Text>
                  </View>
                )}
                {item.isTrendingUp && (
                  <View style={{
                    position: "absolute", top: 8, right: 8,
                    backgroundColor: Colors.secondary,
                    paddingHorizontal: 8, paddingVertical: 3,
                    borderRadius: 99,
                  }}>
                    <Text style={{ color: "#fff", fontSize: Font.xs, fontWeight: "700" }}>🔥 Trending</Text>
                  </View>
                )}
              </View>

              {/* Body */}
              <View style={{ padding: Spacing.md, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <Text style={{ flex: 1, color: Colors.text, fontWeight: "700", fontSize: Font.base }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.category ? (
                    <View style={{
                      backgroundColor: Colors.primaryLight,
                      paddingHorizontal: 8, paddingVertical: 2,
                      borderRadius: 99,
                    }}>
                      <Text style={{ color: Colors.primary, fontSize: Font.xs, fontWeight: "600" }}>{item.category}</Text>
                    </View>
                  ) : null}
                </View>

                {item.description ? (
                  <Text style={{ color: Colors.textMuted, fontSize: Font.sm }} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Price row */}
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 2 }}>
                  <Text style={{ color: Colors.text, fontWeight: "800", fontSize: Font.xl }}>{fmt(item.price)}</Text>
                  {item.priceDropPercent > 0 && (
                    <Text style={{ color: Colors.textMuted, fontSize: Font.sm, textDecorationLine: "line-through" }}>
                      {fmt(item.priceWhenAdded)}
                    </Text>
                  )}
                  {item.rating != null && (
                    <Text style={{ color: Colors.secondary, fontSize: Font.xs, fontWeight: "700", marginLeft: "auto" }}>
                      ★ {item.rating.toFixed(1)}
                    </Text>
                  )}
                </View>

                {item.shouldNotify && (
                  <Text style={{ color: Colors.success, fontSize: Font.xs, fontWeight: "600" }}>
                    🔔 Price dropped — great time to buy!
                  </Text>
                )}

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={() => handleAddToCart(item)}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: pressed ? Colors.primaryDark : Colors.primary,
                      paddingVertical: 10,
                      borderRadius: Radius.md,
                      alignItems: "center",
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: Font.sm }}>Add to Cart</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void handleRemove(item.productId)}
                    disabled={removing[item.productId]}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: Radius.md,
                      borderWidth: 1,
                      borderColor: removing[item.productId] ? Colors.border : Colors.danger,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed || removing[item.productId] ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ color: Colors.danger, fontWeight: "700", fontSize: Font.sm }}>
                      {removing[item.productId] ? "…" : "Remove"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
