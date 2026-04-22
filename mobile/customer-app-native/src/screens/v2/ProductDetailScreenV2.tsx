import { useEffect, useState } from "react"
import {
  ActivityIndicator, Pressable, SafeAreaView,
  ScrollView, Text, View,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing } from "../../theme"
import type { ProductDetailRouteProp, RootNavProp } from "../../navigation/types"
import ReviewsPanel from "../../components/ReviewsPanel"

type Product = {
  _id: string; name: string; description?: string; price: number
  unit?: string; stock?: number; category?: string; isAvailable?: boolean
  imageUrl?: string | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

export default function ProductDetailScreenV2() {
  const nav = useNavigation<RootNavProp>()
  const route = useRoute<ProductDetailRouteProp>()
  const { productId, storeId, storeName } = route.params
  const { withAuth, cartItems, cartStoreId, cartItemCount, addToCart, increaseQty, decreaseQty } = useApp()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try { setProduct(await withAuth<Product>(`/api/products/${productId}`)) }
      catch { /* ignore */ } finally { setLoading(false) }
    }
    void fetch()
  }, [productId])

  const cartLine = cartItems.find((l) => l.product._id === productId)
  const qty = cartLine?.quantity ?? 0

  const handleAdd = () => {
    if (!product) return
    if (cartStoreId && cartStoreId !== storeId) return // store guard – handled upstream
    addToCart(product, storeId)
  }

  const inStock = (product?.stock ?? 1) > 0 && (product?.isAvailable !== false)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
        backgroundColor: Colors.bgCard, ...Shadow.sm,
      }}>
        <Pressable onPress={() => nav.goBack()} style={{ marginRight: Spacing.md, padding: 4 }}>
          <Text style={{ fontSize: 22, color: Colors.primary }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: Font.lg, fontWeight: "900", color: Colors.text, flex: 1 }} numberOfLines={1}>
          {storeName}
        </Text>
        {cartItemCount > 0 && (
          <Pressable
            onPress={() => nav.navigate("Checkout")}
            style={{
              backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 6,
              borderRadius: Radius.full, flexDirection: "row", alignItems: "center", gap: 6,
            }}
          >
            <Text style={{ fontSize: 14 }}>🛒</Text>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.sm }}>
              {cartItemCount}
            </Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !product ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ fontSize: Font.lg, fontWeight: "800", color: Colors.text, marginTop: 12 }}>Product not found</Text>
          <Pressable onPress={() => nav.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.primary, fontWeight: "700" }}>← Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Hero image placeholder */}
          <View style={{
            height: 260, backgroundColor: Colors.primaryLight,
            justifyContent: "center", alignItems: "center",
          }}>
            <Text style={{ fontSize: 96 }}>📦</Text>
          </View>

          <View style={{ padding: Spacing.xl }}>
            {/* Category badge */}
            {product.category && (
              <View style={{
                alignSelf: "flex-start", backgroundColor: Colors.bgMuted,
                paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, marginBottom: Spacing.md,
              }}>
                <Text style={{ fontSize: Font.xs, color: Colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                  {product.category}
                </Text>
              </View>
            )}

            <Text style={{ fontSize: Font.xxxl, fontWeight: "900", color: Colors.text, marginBottom: Spacing.sm }}>
              {product.name}
            </Text>

            {/* Price row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg }}>
              <Text style={{ fontSize: Font.xxl, fontWeight: "900", color: Colors.primary }}>
                {fmt(product.price)}
                {product.unit && <Text style={{ fontSize: Font.md, color: Colors.textSecondary, fontWeight: "500" }}>  /{product.unit}</Text>}
              </Text>
              <View style={{
                backgroundColor: inStock ? "#dcfce7" : "#fee2e2",
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
              }}>
                <Text style={{ fontSize: Font.sm, fontWeight: "800", color: inStock ? "#15803d" : "#b91c1c" }}>
                  {inStock ? (product.stock != null && product.stock < 10 ? `Only ${product.stock} left` : "In Stock") : "Out of Stock"}
                </Text>
              </View>
            </View>

            {/* Description */}
            {product.description && (
              <View style={{
                backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg,
                marginBottom: Spacing.lg, ...Shadow.sm,
              }}>
                <Text style={{ fontSize: Font.sm, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8 }}>
                  DESCRIPTION
                </Text>
                <Text style={{ fontSize: Font.md, color: Colors.text, lineHeight: 22 }}>{product.description}</Text>
              </View>
            )}

            {/* Quick details */}
            <View style={{
              backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg,
              marginBottom: Spacing.lg, ...Shadow.sm,
            }}>
              {[
                { label: "Price per unit", value: product.unit ? `${fmt(product.price)} / ${product.unit}` : fmt(product.price) },
                { label: "Availability", value: inStock ? "Available" : "Out of Stock" },
                ...(product.stock != null ? [{ label: "Stock", value: `${product.stock} units` }] : []),
              ].map((row) => (
                <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                  <Text style={{ fontSize: Font.md, color: Colors.textSecondary }}>{row.label}</Text>
                  <Text style={{ fontSize: Font.md, color: Colors.text, fontWeight: "700" }}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Reviews */}
            <ReviewsPanel targetType="product" targetId={productId} />
          </View>
        </ScrollView>
      )}

      {/* Sticky Add to Cart */}
      {product && inStock && (
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: Spacing.xl, backgroundColor: Colors.bgCard,
          borderTopWidth: 1, borderTopColor: Colors.border,
        }}>
          {qty === 0 ? (
            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => ({
                backgroundColor: Colors.primary, borderRadius: Radius.xl,
                paddingVertical: Spacing.lg, alignItems: "center",
                opacity: pressed ? 0.9 : 1, ...Shadow.lg,
              })}
            >
              <Text style={{ color: "#fff", fontSize: Font.lg, fontWeight: "900" }}>Add to Cart</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
              <View style={{
                flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                backgroundColor: Colors.primaryLight, borderRadius: Radius.xl, paddingVertical: Spacing.md, gap: 16,
              }}>
                <Pressable
                  onPress={() => decreaseQty(productId)}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.xl }}>−</Text>
                </Pressable>
                <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.primary, minWidth: 28, textAlign: "center" }}>{qty}</Text>
                <Pressable
                  onPress={() => increaseQty(productId)}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.xl }}>+</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => nav.navigate("Checkout")}
                style={{ backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, ...Shadow.md }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: Font.md }}>Checkout</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}
