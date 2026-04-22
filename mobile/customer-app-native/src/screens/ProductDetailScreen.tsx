import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native"

type StoreItem = {
  _id: string
  storeName: string
  category?: string
  deliveryRadius?: number
  address?: string
}

type ProductItem = {
  _id: string
  name: string
  price: number
  category?: string
  description?: string
  quantity?: number
}

type ProductDetailScreenProps = {
  store: StoreItem
  product: ProductItem
  onBackToStore: () => void
  cartCount: number
  onAddToCart: (product: ProductItem) => void
  onOpenCheckout: () => void
}

export default function ProductDetailScreen({
  store,
  product,
  onBackToStore,
  cartCount,
  onAddToCart,
  onOpenCheckout,
}: ProductDetailScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={onBackToStore}
            style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ fontWeight: "800", color: "#0f172a" }}>Back To Store</Text>
          </Pressable>
          <Pressable onPress={onOpenCheckout} style={{ borderRadius: 999, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: "#0f172a", fontWeight: "900", fontSize: 12 }}>Cart {cartCount}</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: "#ffffff", padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>PRODUCT DETAIL</Text>
          <Text style={{ marginTop: 8, fontSize: 26, fontWeight: "900", color: "#0f172a" }}>{product.name}</Text>
          <Text style={{ marginTop: 6, color: "#334155", fontSize: 13 }}>
            INR {Math.round(product.price || 0)} • {(product.category || "general").toUpperCase()}
          </Text>
          <Text style={{ marginTop: 10, color: "#64748b", lineHeight: 20 }}>
            {product.description || "Fresh catalog item from your local store. Detailed product copy can be enriched from backend inventory metadata in the next slice."}
          </Text>
        </View>

        <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: "#ffffff", padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>STORE</Text>
          <Text style={{ marginTop: 8, color: "#0f172a", fontWeight: "800", fontSize: 16 }}>{store.storeName}</Text>
          <Text style={{ marginTop: 4, color: "#475569", fontSize: 12 }}>
            {(store.category || "general").toUpperCase()} • Radius {store.deliveryRadius ?? 5} km
          </Text>
          {store.address ? <Text style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>{store.address}</Text> : null}
        </View>

        <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: "#ffffff", padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>NEXT ACTION</Text>
          <Text style={{ marginTop: 8, color: "#334155" }}>Add this product to cart and continue with coupon-enabled checkout.</Text>
          <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => onAddToCart(product)}
              style={{ borderRadius: 10, backgroundColor: "#4f46e5", paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "800" }}>Add to cart</Text>
            </Pressable>
            <Pressable
              onPress={onOpenCheckout}
              style={{ borderRadius: 10, backgroundColor: "#111827", paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "800" }}>Checkout ({cartCount})</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
