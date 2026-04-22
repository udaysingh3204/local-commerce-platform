import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native"

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

type StoreDetailScreenProps = {
  store: StoreItem
  products: ProductItem[]
  loading: boolean
  lastSyncedAt: Date | null
  onBack: () => void
  onSelectProduct: (product: ProductItem) => void
  onRefreshProducts: () => void
  cartCount: number
  onOpenCheckout: () => void
}

export default function StoreDetailScreen({
  store,
  products,
  loading,
  lastSyncedAt,
  onBack,
  onSelectProduct,
  onRefreshProducts,
  cartCount,
  onOpenCheckout,
}: StoreDetailScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefreshProducts} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={onBack}
            style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ fontWeight: "800", color: "#0f172a" }}>Back</Text>
          </Pressable>
          <Pressable onPress={onOpenCheckout} style={{ borderRadius: 999, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: "#0f172a", fontWeight: "900", fontSize: 12 }}>Cart {cartCount}</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: "#ffffff", padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>STORE DETAIL</Text>
          <Text style={{ marginTop: 8, fontSize: 24, fontWeight: "900", color: "#0f172a" }}>{store.storeName}</Text>
          <Text style={{ marginTop: 6, color: "#475569", fontSize: 12 }}>
            {(store.category || "general").toUpperCase()} • Radius {store.deliveryRadius ?? 5} km
          </Text>
          {store.address ? <Text style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>{store.address}</Text> : null}
          <Text style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
            Last synced: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "waiting for first sync"}
          </Text>
        </View>

        <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: "#ffffff", padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>PRODUCTS</Text>
            <Pressable onPress={onOpenCheckout} style={{ borderRadius: 999, backgroundColor: "#111827", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 11 }}>Checkout ({cartCount})</Text>
            </Pressable>
          </View>
          {loading && (
            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={{ color: "#475569" }}>Loading products...</Text>
            </View>
          )}
          {!loading && products.length === 0 && (
            <Text style={{ marginTop: 10, color: "#64748b" }}>No products available for this store yet.</Text>
          )}
          {!loading && products.map((product) => (
            <Pressable
              key={product._id}
              onPress={() => onSelectProduct(product)}
              style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, backgroundColor: "#f8fafc" }}
            >
              <Text style={{ color: "#0f172a", fontWeight: "800" }}>{product.name}</Text>
              <Text style={{ marginTop: 4, color: "#334155", fontSize: 12 }}>
                INR {Math.round(product.price || 0)} • {(product.category || "general").toUpperCase()}
              </Text>
              <Text style={{ marginTop: 6, color: "#6366f1", fontSize: 12, fontWeight: "700" }}>Open product detail</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
