import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native"

type StoreItem = {
  _id: string
  storeName: string
}

type ProductItem = {
  _id: string
  name: string
  price: number
}

type CartItem = {
  product: ProductItem
  quantity: number
}

type Promotion = {
  campaignId: string
  code?: string | null
  name: string
  remainingUses?: number | null
  discount?: {
    percentage?: number
    flatAmount?: number
  }
}

type AppliedPromotion = {
  campaignId: string
  code?: string | null
  name: string
  discountAmount: number
  remainingUses?: number | null
}

type CheckoutScreenProps = {
  store: StoreItem | null
  cartItems: CartItem[]
  cartCount: number
  promotions: Promotion[]
  promoLoading: boolean
  promoError: string | null
  applyingCode: boolean
  placingOrder: boolean
  couponCodeInput: string
  appliedPromotion: AppliedPromotion | null
  onCouponCodeChange: (value: string) => void
  onBack: () => void
  onIncreaseQuantity: (productId: string) => void
  onDecreaseQuantity: (productId: string) => void
  onRefreshOffers: () => void
  onApplyBestOffer: () => void
  onApplyOfferByCampaign: (campaignId: string, campaignName: string) => void
  onApplyCouponCode: () => void
  onRemovePromotion: () => void
  onPlaceOrder: () => void
}

const cardStyle = {
  borderRadius: 20,
  backgroundColor: "#ffffff",
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#e5e7eb",
} as const

export default function CheckoutScreen({
  store,
  cartItems,
  cartCount,
  promotions,
  promoLoading,
  promoError,
  applyingCode,
  placingOrder,
  couponCodeInput,
  appliedPromotion,
  onCouponCodeChange,
  onBack,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRefreshOffers,
  onApplyBestOffer,
  onApplyOfferByCampaign,
  onApplyCouponCode,
  onRemovePromotion,
  onPlaceOrder,
}: CheckoutScreenProps) {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const discountAmount = appliedPromotion?.discountAmount || 0
  const finalTotal = Math.max(0, subtotal - discountAmount)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={onBack}
            style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ fontWeight: "800", color: "#0f172a" }}>Back</Text>
          </Pressable>
          <View style={{ borderRadius: 999, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: "#0f172a", fontWeight: "900", fontSize: 12 }}>Cart {cartCount}</Text>
          </View>
        </View>

        <View style={{ ...cardStyle, marginTop: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>CHECKOUT</Text>
          <Text style={{ marginTop: 8, fontSize: 22, fontWeight: "900", color: "#0f172a" }}>{store?.storeName || "Your cart"}</Text>
          <Text style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>Review your items and apply the best coupon before placing order.</Text>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>CART ITEMS</Text>
          {cartItems.length === 0 ? (
            <Text style={{ marginTop: 10, color: "#64748b" }}>Your cart is empty.</Text>
          ) : (
            cartItems.map((line) => (
              <View key={line.product._id} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, backgroundColor: "#f8fafc" }}>
                <Text style={{ color: "#0f172a", fontWeight: "800" }}>{line.product.name}</Text>
                <Text style={{ marginTop: 4, color: "#334155", fontSize: 12 }}>INR {Math.round(line.product.price)} each</Text>
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable onPress={() => onDecreaseQuantity(line.product._id)} style={{ borderRadius: 8, backgroundColor: "#e2e8f0", paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontWeight: "900", color: "#0f172a" }}>-</Text>
                    </Pressable>
                    <Text style={{ minWidth: 24, textAlign: "center", fontWeight: "800", color: "#0f172a" }}>{line.quantity}</Text>
                    <Pressable onPress={() => onIncreaseQuantity(line.product._id)} style={{ borderRadius: 8, backgroundColor: "#e2e8f0", paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontWeight: "900", color: "#0f172a" }}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={{ color: "#0f172a", fontWeight: "800" }}>INR {Math.round(line.product.price * line.quantity)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={cardStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>OFFERS AND COUPONS</Text>
            <Pressable onPress={onRefreshOffers} style={{ borderRadius: 999, backgroundColor: "#eef2ff", paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: "#4338ca", fontWeight: "800", fontSize: 11 }}>Refresh offers</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
            <TextInput
              value={couponCodeInput}
              onChangeText={onCouponCodeChange}
              placeholder="Enter coupon code"
              autoCapitalize="characters"
              style={{
                flex: 1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#cbd5e1",
                backgroundColor: "#ffffff",
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: "#0f172a",
                fontWeight: "700",
              }}
            />
            <Pressable
              onPress={onApplyCouponCode}
              disabled={applyingCode}
              style={{ borderRadius: 10, backgroundColor: applyingCode ? "#94a3b8" : "#111827", paddingHorizontal: 14, justifyContent: "center" }}
            >
              {applyingCode ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={{ color: "#ffffff", fontWeight: "800" }}>Apply</Text>}
            </Pressable>
          </View>

          <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
            <Pressable onPress={onApplyBestOffer} style={{ borderRadius: 10, backgroundColor: "#4f46e5", paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: "#ffffff", fontWeight: "800" }}>Auto apply best</Text>
            </Pressable>
            {appliedPromotion ? (
              <Pressable onPress={onRemovePromotion} style={{ borderRadius: 10, backgroundColor: "#f1f5f9", paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ color: "#0f172a", fontWeight: "800" }}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          {appliedPromotion ? (
            <View style={{ marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: "#86efac", backgroundColor: "#ecfdf5", padding: 10 }}>
              <Text style={{ color: "#166534", fontWeight: "700", fontSize: 12 }}>
                Applied {appliedPromotion.name}{appliedPromotion.code ? ` (${appliedPromotion.code})` : ""} - Saved INR {Math.round(appliedPromotion.discountAmount)}
                {typeof appliedPromotion.remainingUses === "number" ? ` - ${appliedPromotion.remainingUses} use(s) left` : ""}
              </Text>
            </View>
          ) : null}

          {promoError ? (
            <View style={{ marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", padding: 10 }}>
              <Text style={{ color: "#b91c1c", fontWeight: "700", fontSize: 12 }}>{promoError}</Text>
            </View>
          ) : null}

          {promoLoading ? (
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={{ color: "#475569" }}>Checking available offers...</Text>
            </View>
          ) : null}

          {!promoLoading && promotions.length > 0 ? (
            promotions.slice(0, 3).map((promo) => {
              const estimate = promo.discount?.flatAmount || Math.floor((subtotal * (promo.discount?.percentage || 0)) / 100)
              return (
                <View key={promo.campaignId} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, backgroundColor: "#f8fafc" }}>
                  <Text style={{ color: "#0f172a", fontWeight: "800" }}>{promo.name}</Text>
                  <Text style={{ marginTop: 4, color: "#334155", fontSize: 12 }}>
                    Save ~ INR {Math.round(estimate)}{promo.code ? ` - ${promo.code}` : ""}
                    {typeof promo.remainingUses === "number" ? ` - ${promo.remainingUses} left` : ""}
                  </Text>
                  <Pressable
                    onPress={() => onApplyOfferByCampaign(promo.campaignId, promo.name)}
                    style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 10, backgroundColor: "#eef2ff", paddingHorizontal: 12, paddingVertical: 8 }}
                  >
                    <Text style={{ color: "#4338ca", fontWeight: "800", fontSize: 12 }}>Apply this offer</Text>
                  </Pressable>
                </View>
              )
            })
          ) : null}
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>PRICE BREAKDOWN</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#475569" }}>Subtotal</Text>
              <Text style={{ color: "#0f172a", fontWeight: "700" }}>INR {Math.round(subtotal)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#475569" }}>Coupon discount</Text>
              <Text style={{ color: "#047857", fontWeight: "700" }}>- INR {Math.round(discountAmount)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: "#e2e8f0" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#0f172a", fontWeight: "900" }}>Total payable</Text>
              <Text style={{ color: "#0f172a", fontWeight: "900" }}>INR {Math.round(finalTotal)}</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={onPlaceOrder}
          disabled={placingOrder || cartItems.length === 0}
          style={{ borderRadius: 14, backgroundColor: placingOrder || cartItems.length === 0 ? "#94a3b8" : "#111827", paddingVertical: 14, alignItems: "center", marginBottom: 32 }}
        >
          {placingOrder ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 16 }}>Place order - INR {Math.round(finalTotal)}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}