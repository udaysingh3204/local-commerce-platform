import { useEffect, useState } from "react"
import {
  ActivityIndicator, Alert, Pressable, RefreshControl,
  SafeAreaView, ScrollView, Text, View,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { fetchJson } from "../../lib/shared"
import { API_BASE_URL } from "../../config/env"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing, CATEGORY_CONFIG } from "../../theme"
import type { RootNavProp, StoreDetailRouteProp } from "../../navigation/types"
import ReviewsPanel from "../../components/ReviewsPanel"

type Product = { _id: string; name: string; price: number; category?: string; description?: string; quantity?: number }

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

export default function StoreDetailScreenV2() {
  const nav = useNavigation<RootNavProp>()
  const route = useRoute<StoreDetailRouteProp>()
  const { storeId, storeName } = route.params
  const { addToCart, cartItems, cartItemCount, increaseQty, decreaseQty, cartStoreId } = useApp()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true); else setRefreshing(true)
    try {
      const data = await fetchJson<Product[]>(API_BASE_URL, `/api/products/store/${storeId}`)
      setProducts(data)
    } catch { /* ignore */ } finally {
      if (mode === "initial") setLoading(false); else setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [storeId])

  const getCartQty = (productId: string) =>
    cartItems.find((l) => l.product._id === productId)?.quantity ?? 0

  const handleAdd = (product: Product) => {
    const ok = addToCart(product, storeId)
    if (!ok) {
      Alert.alert(
        "Different store",
        "Your cart has items from another store. Clear your cart to shop here.",
        [{ text: "OK" }]
      )
    }
  }

  const storeCategory = products[0]?.category ?? "default"
  const catConfig = CATEGORY_CONFIG[storeCategory] ?? CATEGORY_CONFIG.default

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{
        backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg, paddingBottom: Spacing.xl,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg }}>
          <Pressable onPress={() => nav.goBack()} style={{ marginRight: Spacing.md, padding: 4 }}>
            <Text style={{ fontSize: 22, color: "#fff" }}>←</Text>
          </Pressable>
          <Text style={{ fontSize: Font.lg, fontWeight: "800", color: "#fff", flex: 1 }} numberOfLines={1}>
            {storeName}
          </Text>
          <Pressable
            onPress={() => nav.navigate("Checkout")}
            style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: Radius.full,
            }}
          >
            <Text style={{ fontSize: 16 }}>🛒</Text>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.md }}>{cartItemCount}</Text>
          </Pressable>
        </View>

        {/* Store hero */}
        <View style={{
          backgroundColor: "rgba(255,255,255,0.15)", borderRadius: Radius.xl,
          padding: Spacing.lg, flexDirection: "row", alignItems: "center", gap: Spacing.lg,
        }}>
          <Text style={{ fontSize: 48 }}>{catConfig.icon}</Text>
          <View>
            <Text style={{ fontSize: Font.xl, fontWeight: "900", color: "#fff" }}>{storeName}</Text>
            <Text style={{ fontSize: Font.sm, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
              {products.length} products available
            </Text>
          </View>
        </View>
      </View>

      {cartStoreId === storeId && cartItemCount > 0 && (
        <Pressable
          onPress={() => nav.navigate("Checkout")}
          style={{
            margin: Spacing.xl, marginBottom: 0, backgroundColor: Colors.success,
            borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: "row",
            justifyContent: "space-between", alignItems: "center", ...Shadow.md,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.md }}>
            🛒  {cartItemCount} item{cartItemCount > 1 ? "s" : ""} in cart
          </Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.md }}>
            Go to Checkout →
          </Text>
        </Pressable>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 12, color: Colors.textSecondary }}>Loading products…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={Colors.primary} />}
        >
          {products.length === 0 ? (
            <View style={{ padding: 48, alignItems: "center" }}>
              <Text style={{ fontSize: 48 }}>📦</Text>
              <Text style={{ fontSize: Font.lg, fontWeight: "700", color: Colors.text, marginTop: 12 }}>No products yet</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.md }}>
              {products.map((product) => {
                const qty = getCartQty(product._id)
                const inStock = (product.quantity ?? 1) > 0
                return (
                  <Pressable
                    key={product._id}
                    onPress={() => nav.navigate("ProductDetail", { productId: product._id, storeId, storeName })}
                    style={({ pressed }) => ({
                      width: "47%", backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
                      borderWidth: 1, borderColor: qty > 0 ? Colors.primary : Colors.border,
                      overflow: "hidden", opacity: pressed ? 0.9 : 1, ...Shadow.sm,
                    })}
                  >
                    {/* Product image placeholder */}
                    <View style={{
                      height: 110, backgroundColor: qty > 0 ? Colors.primaryLight : Colors.bgMuted,
                      justifyContent: "center", alignItems: "center",
                    }}>
                      <Text style={{ fontSize: 48 }}>
                        {CATEGORY_CONFIG[product.category ?? ""]?.icon ?? "📦"}
                      </Text>
                      {qty > 0 && (
                        <View style={{
                          position: "absolute", top: 8, right: 8, backgroundColor: Colors.primary,
                          width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center",
                        }}>
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>{qty}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ padding: Spacing.md }}>
                      <Text style={{ fontSize: Font.md, fontWeight: "800", color: Colors.text }} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={{ fontSize: Font.sm, fontWeight: "900", color: Colors.primary, marginTop: 4 }}>
                        {fmt(product.price)}
                      </Text>
                      {!inStock && (
                        <Text style={{ fontSize: Font.xs, color: Colors.danger, marginTop: 2 }}>Out of stock</Text>
                      )}

                      {/* Cart controls */}
                      {qty === 0 ? (
                        <Pressable
                          onPress={(e) => { e.stopPropagation?.(); handleAdd(product) }}
                          disabled={!inStock}
                          style={{
                            marginTop: Spacing.sm, backgroundColor: inStock ? Colors.primary : Colors.bgMuted,
                            borderRadius: Radius.md, paddingVertical: 7, alignItems: "center",
                          }}
                        >
                          <Text style={{ color: inStock ? "#fff" : Colors.textMuted, fontSize: Font.sm, fontWeight: "700" }}>
                            {inStock ? "Add to Cart" : "Out of Stock"}
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={{
                          marginTop: Spacing.sm, flexDirection: "row", alignItems: "center",
                          backgroundColor: Colors.bg, borderRadius: Radius.md, overflow: "hidden",
                          borderWidth: 1, borderColor: Colors.primary,
                        }}>
                          <Pressable
                            onPress={(e) => { e.stopPropagation?.(); decreaseQty(product._id) }}
                            style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.primaryLight }}
                          >
                            <Text style={{ color: Colors.primary, fontWeight: "900", fontSize: Font.md }}>−</Text>
                          </Pressable>
                          <Text style={{ flex: 1, textAlign: "center", fontWeight: "900", color: Colors.primary }}>
                            {qty}
                          </Text>
                          <Pressable
                            onPress={(e) => { e.stopPropagation?.(); increaseQty(product._id) }}
                            style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.primary }}
                          >
                            <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.md }}>+</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          )}

          {/* Store Reviews */}
          <ReviewsPanel targetType="store" targetId={storeId} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
