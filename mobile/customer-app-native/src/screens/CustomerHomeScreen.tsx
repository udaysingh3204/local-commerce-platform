import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native"
import { fetchJson, MOBILE_STORAGE_KEYS } from "../lib/shared"
import type { AppConfig, CustomerAuthUser, CustomerStartup } from "../lib/shared"
import { API_BASE_URL } from "../config/env"
import { getSecureValue, setSecureValue } from "../lib/secureStore"
import StoreDetailScreen from "./StoreDetailScreen"
import ProductDetailScreen from "./ProductDetailScreen"
import CheckoutScreen from "./CheckoutScreen"
import OrderDetailScreen from "./OrderDetailScreen"
import ProfileScreen from "./ProfileScreen"
import NotificationsScreen from "./NotificationsScreen"

type CustomerHomeScreenProps = {
  appConfig: AppConfig | null
  user: CustomerAuthUser
  startup: CustomerStartup
  onLogout: () => Promise<void>
}

const cardStyle = {
  borderRadius: 20,
  backgroundColor: "#ffffff",
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#e5e7eb",
} as const

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

type CustomerOrder = {
  _id: string
  status: string
  totalAmount: number
  paymentStatus?: string
  createdAt?: string
}

type CartItem = {
  product: ProductItem
  quantity: number
}

type AvailablePromotion = {
  campaignId: string
  name: string
  code?: string | null
  discount?: {
    percentage?: number
    flatAmount?: number
  }
  remainingUses?: number | null
}

type AppliedPromotion = {
  campaignId: string
  code?: string | null
  name: string
  discountAmount: number
  remainingUses?: number | null
}

type PersistedCartPayload = {
  storeId: string | null
  items: CartItem[]
}

const CUSTOMER_CART_STORAGE_KEY = "mobile.customer.cart.v1"

const statusTone: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#fff7ed", text: "#c2410c", label: "Pending" },
  accepted: { bg: "#eff6ff", text: "#1d4ed8", label: "Accepted" },
  preparing: { bg: "#f5f3ff", text: "#6d28d9", label: "Preparing" },
  out_for_delivery: { bg: "#ecfeff", text: "#0e7490", label: "Out for delivery" },
  delivered: { bg: "#ecfdf5", text: "#047857", label: "Delivered" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", label: "Cancelled" },
}

export default function CustomerHomeScreen({ appConfig, user, startup, onLogout }: CustomerHomeScreenProps) {
  const [stores, setStores] = useState<StoreItem[]>([])
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null)
  const [selectedStoreProducts, setSelectedStoreProducts] = useState<ProductItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [view, setView] = useState<"home" | "store" | "product" | "checkout" | "order-detail" | "profile" | "notifications">("home")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartStoreId, setCartStoreId] = useState<string | null>(null)
  const [cartHydrated, setCartHydrated] = useState(false)
  const [availablePromotions, setAvailablePromotions] = useState<AvailablePromotion[]>([])
  const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotion | null>(null)
  const [couponCodeInput, setCouponCodeInput] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)
  const [applyingCode, setApplyingCode] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [productsLoading, setProductsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const cartItemCount = useMemo(() => cartItems.reduce((sum, line) => sum + line.quantity, 0), [cartItems])
  const subtotalAmount = useMemo(() => cartItems.reduce((sum, line) => sum + (line.product.price * line.quantity), 0), [cartItems])

  const withCustomerAuth = async <T,>(path: string, options?: RequestInit) => {
    const token = await getSecureValue(MOBILE_STORAGE_KEYS.customerToken)
    if (!token) {
      throw new Error("Customer session expired. Please login again.")
    }

    const normalizedHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    if (options?.headers && typeof options.headers === "object" && !Array.isArray(options.headers)) {
      Object.assign(normalizedHeaders, options.headers as Record<string, string>)
    }

    return fetchJson<T>(API_BASE_URL, path, {
      ...options,
      headers: normalizedHeaders,
    })
  }

  const buildOrderPreview = () => ({
    customerId: user._id,
    storeId: selectedStore?._id,
    subtotal: subtotalAmount,
    items: cartItems.map((line) => ({
      productId: line.product._id,
      quantity: line.quantity,
      price: line.product.price,
    })),
    totalAmount: subtotalAmount,
  })

  useEffect(() => {
    let disposed = false

    const restoreCart = async () => {
      try {
        const payload = await getSecureValue(CUSTOMER_CART_STORAGE_KEY)
        if (!payload || disposed) {
          return
        }

        const parsed = JSON.parse(payload) as PersistedCartPayload
        const safeItems = Array.isArray(parsed?.items)
          ? parsed.items.filter((line) => line?.product?._id && Number(line.quantity) > 0)
          : []

        if (!disposed) {
          setCartItems(safeItems)
          setCartStoreId(typeof parsed?.storeId === "string" ? parsed.storeId : null)
        }
      } catch {
        if (!disposed) {
          setCartItems([])
          setCartStoreId(null)
        }
      } finally {
        if (!disposed) {
          setCartHydrated(true)
        }
      }
    }

    void restoreCart()

    return () => {
      disposed = true
    }
  }, [user._id])

  useEffect(() => {
    if (!cartHydrated) return

    void setSecureValue(
      CUSTOMER_CART_STORAGE_KEY,
      JSON.stringify({
        storeId: cartStoreId,
        items: cartItems,
      } satisfies PersistedCartPayload)
    )
  }, [cartHydrated, cartStoreId, cartItems])

  useEffect(() => {
    let disposed = false

    const loadDashboardData = async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setLoadError(null)

      try {
        const [storeData, orderData] = await Promise.all([
          fetchJson<StoreItem[]>(API_BASE_URL, "/api/stores"),
          fetchJson<CustomerOrder[]>(API_BASE_URL, `/api/orders/customer/${user._id}`),
        ])

        if (disposed) return

        const topStores = storeData.slice(0, 6)
        setStores(topStores)
        setOrders(orderData.slice(0, 4))
        setSelectedStore((current) => {
          if (current) {
            return topStores.find((store) => store._id === current._id) || topStores[0] || null
          }
          if (cartStoreId) {
            return topStores.find((store) => store._id === cartStoreId) || topStores[0] || null
          }
          return topStores[0] || null
        })
        setLastSyncedAt(new Date())
      } catch (error) {
        if (disposed) return
        setLoadError(error instanceof Error ? error.message : "Unable to load dashboard data")
      } finally {
        if (!disposed) {
          if (mode === "initial") {
            setLoading(false)
          } else {
            setRefreshing(false)
          }
        }
      }
    }

    void loadDashboardData()
    const intervalId = setInterval(() => {
      void loadDashboardData("refresh")
    }, 45000)

    return () => {
      disposed = true
      clearInterval(intervalId)
    }
  }, [user._id, cartStoreId])

  const onRefresh = async () => {
    setRefreshing(true)
    setLoadError(null)
    try {
      const [storeData, orderData] = await Promise.all([
        fetchJson<StoreItem[]>(API_BASE_URL, "/api/stores"),
        fetchJson<CustomerOrder[]>(API_BASE_URL, `/api/orders/customer/${user._id}`),
      ])
      const topStores = storeData.slice(0, 6)
      setStores(topStores)
      setOrders(orderData.slice(0, 4))
      setSelectedStore((current) => {
        if (current) {
          return topStores.find((store) => store._id === current._id) || topStores[0] || null
        }
        if (cartStoreId) {
          return topStores.find((store) => store._id === cartStoreId) || topStores[0] || null
        }
        return topStores[0] || null
      })
      setLastSyncedAt(new Date())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to refresh dashboard data")
    } finally {
      setRefreshing(false)
    }
  }

  const openStore = (store: StoreItem) => {
    setSelectedStore(store)
    setView("store")
  }

  const openProduct = (product: ProductItem) => {
    setSelectedProduct(product)
    setView("product")
  }

  const openOrder = (orderId: string) => {
    setSelectedOrderId(orderId)
    setView("order-detail")
  }

  const addToCart = (product: ProductItem) => {
    if (!selectedStore?._id) {
      Alert.alert("Select a store", "Open a store before adding products to cart.")
      return
    }

    if (cartStoreId && cartStoreId !== selectedStore._id) {
      Alert.alert("One-store cart", "Your cart has items from another store. Place that order first or clear cart.")
      return
    }

    if (!cartStoreId) {
      setCartStoreId(selectedStore._id)
    }

    setCartItems((current) => {
      const existing = current.find((line) => line.product._id === product._id)
      if (existing) {
        return current.map((line) => (
          line.product._id === product._id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        ))
      }

      return [...current, { product, quantity: 1 }]
    })
  }

  const increaseCartQuantity = (productId: string) => {
    setCartItems((current) => current.map((line) => (
      line.product._id === productId ? { ...line, quantity: line.quantity + 1 } : line
    )))
  }

  const decreaseCartQuantity = (productId: string) => {
    setCartItems((current) => current
      .map((line) => (
        line.product._id === productId ? { ...line, quantity: Math.max(0, line.quantity - 1) } : line
      ))
      .filter((line) => line.quantity > 0))
  }

  const openCheckout = () => {
    setPromoError(null)
    if (cartStoreId && selectedStore?._id !== cartStoreId) {
      const cartStore = stores.find((store) => store._id === cartStoreId)
      if (cartStore) {
        setSelectedStore(cartStore)
      }
    }
    setView("checkout")
  }

  const fetchAvailablePromotions = async () => {
    if (!selectedStore?._id || cartItems.length === 0) {
      setAvailablePromotions([])
      return
    }

    setPromoLoading(true)
    setPromoError(null)

    try {
      const query = new URLSearchParams({
        products: JSON.stringify(cartItems.map((line) => ({ productId: line.product._id, quantity: line.quantity }))),
        totalAmount: String(subtotalAmount),
        storeId: selectedStore._id,
      })

      const response = await withCustomerAuth<{ promotions: AvailablePromotion[] }>(`/api/promotions/available/for-order?${query.toString()}`)
      setAvailablePromotions(response.promotions || [])
    } catch (error) {
      setPromoError(error instanceof Error ? error.message : "Unable to load offers")
      setAvailablePromotions([])
    } finally {
      setPromoLoading(false)
    }
  }

  const applyPromotionByCampaign = async (campaignId: string, campaignName: string) => {
    if (cartItems.length === 0) {
      setPromoError("Add items to cart before applying an offer")
      return
    }

    setApplyingCode(true)
    setPromoError(null)

    try {
      const response = await withCustomerAuth<{ campaignId: string; discount: number; campaign?: AvailablePromotion }>(`/api/promotions/${campaignId}/apply`, {
        method: "POST",
        body: JSON.stringify({ order: buildOrderPreview() }),
      })

      setAppliedPromotion({
        campaignId: response.campaignId,
        name: campaignName,
        code: response.campaign?.code || null,
        discountAmount: Math.max(0, Number(response.discount || 0)),
        remainingUses: typeof response.campaign?.remainingUses === "number" ? response.campaign.remainingUses : null,
      })
    } catch (error) {
      setPromoError(error instanceof Error ? error.message : "Unable to apply offer")
    } finally {
      setApplyingCode(false)
    }
  }

  const applyBestOffer = async () => {
    if (availablePromotions.length === 0) {
      setPromoError("No eligible offers found for current cart")
      return
    }

    const best = availablePromotions
      .map((promo) => {
        const estimate = promo.discount?.flatAmount || Math.floor((subtotalAmount * (promo.discount?.percentage || 0)) / 100)
        return {
          promo,
          estimate,
        }
      })
      .sort((a, b) => b.estimate - a.estimate)[0]

    if (!best) return
    await applyPromotionByCampaign(best.promo.campaignId, best.promo.name)
  }

  const applyCouponCode = async () => {
    const code = couponCodeInput.trim().toUpperCase()
    if (!code) {
      setPromoError("Enter a coupon code first")
      return
    }

    setApplyingCode(true)
    setPromoError(null)

    try {
      const response = await withCustomerAuth<{ campaignId: string; discount: number; campaign?: AvailablePromotion }>(`/api/promotions/code/${encodeURIComponent(code)}/apply`, {
        method: "POST",
        body: JSON.stringify({ order: buildOrderPreview() }),
      })

      setAppliedPromotion({
        campaignId: response.campaignId,
        code,
        name: response.campaign?.name || code,
        discountAmount: Math.max(0, Number(response.discount || 0)),
        remainingUses: typeof response.campaign?.remainingUses === "number" ? response.campaign.remainingUses : null,
      })
    } catch (error) {
      setPromoError(error instanceof Error ? error.message : "Unable to apply coupon code")
    } finally {
      setApplyingCode(false)
    }
  }

  const removeAppliedPromotion = () => {
    setAppliedPromotion(null)
    setPromoError(null)
  }

  const placeOrder = async () => {
    if (!selectedStore?._id || cartItems.length === 0) {
      Alert.alert("Cart is empty", "Add products before placing an order.")
      return
    }

    const finalTotal = Math.max(0, subtotalAmount - (appliedPromotion?.discountAmount || 0))
    setPlacingOrder(true)

    try {
      await fetchJson(API_BASE_URL, "/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: user._id,
          storeId: selectedStore._id,
          items: cartItems.map((line) => ({
            productId: line.product._id,
            quantity: line.quantity,
            price: line.product.price,
          })),
          totalAmount: finalTotal,
          paymentMethod: "cod",
          customerLocation: {
            lat: 12.9716,
            lng: 77.5946,
          },
          deliveryAddress: {
            line: "Customer app checkout",
            city: "Bengaluru",
            pincode: "560001",
          },
          promotion: appliedPromotion
            ? {
                campaignId: appliedPromotion.campaignId,
                code: appliedPromotion.code,
                name: appliedPromotion.name,
                discountAmount: appliedPromotion.discountAmount,
              }
            : undefined,
        }),
      })

      setCartItems([])
      setCartStoreId(null)
      setAppliedPromotion(null)
      setAvailablePromotions([])
      setCouponCodeInput("")
      setView("home")
      await onRefresh()
      Alert.alert("Order placed", "Your order was placed successfully.")
    } catch (error) {
      Alert.alert("Order failed", error instanceof Error ? error.message : "Unable to place order")
    } finally {
      setPlacingOrder(false)
    }
  }

  useEffect(() => {
    let disposed = false

    const loadSelectedStoreProducts = async () => {
      if (!selectedStore?._id) {
        setSelectedStoreProducts([])
        return
      }

      setProductsLoading(true)
      setSelectedProduct(null)
      try {
        const products = await fetchJson<ProductItem[]>(
          API_BASE_URL,
          `/api/products/store/${selectedStore._id}`
        )

        if (disposed) return
        setSelectedStoreProducts(products.slice(0, 8))
      } catch {
        if (disposed) return
        setSelectedStoreProducts([])
      } finally {
        if (!disposed) {
          setProductsLoading(false)
        }
      }
    }

    void loadSelectedStoreProducts()

    return () => {
      disposed = true
    }
  }, [selectedStore?._id])

  useEffect(() => {
    if (view !== "checkout") return
    void fetchAvailablePromotions()
  }, [view, subtotalAmount, selectedStore?._id, cartItems.length])

  useEffect(() => {
    if (cartItems.length > 0) return
    setCartStoreId(null)
    setAppliedPromotion(null)
    setAvailablePromotions([])
    setPromoError(null)
  }, [cartItems.length])

  if (view === "store" && selectedStore) {
    return (
      <StoreDetailScreen
        store={selectedStore}
        products={selectedStoreProducts}
        loading={productsLoading}
        lastSyncedAt={lastSyncedAt}
        onBack={() => setView("home")}
        onSelectProduct={openProduct}
        onRefreshProducts={() => void onRefresh()}
        cartCount={cartItemCount}
        onOpenCheckout={openCheckout}
      />
    )
  }

  if (view === "product" && selectedStore && selectedProduct) {
    return (
      <ProductDetailScreen
        store={selectedStore}
        product={selectedProduct}
        onBackToStore={() => setView("store")}
        cartCount={cartItemCount}
        onAddToCart={addToCart}
        onOpenCheckout={openCheckout}
      />
    )
  }

  if (view === "order-detail" && selectedOrderId) {
    return (
      <OrderDetailScreen
        orderId={selectedOrderId}
        onBack={() => setView("home")}
        withAuth={withCustomerAuth}
      />
    )
  }

  if (view === "profile") {
    return (
      <ProfileScreen
        user={user}
        onLogout={onLogout}
        withAuth={withCustomerAuth}
      />
    )
  }

  if (view === "notifications") {
    return (
      <NotificationsScreen
        onBack={() => setView("home")}
        withAuth={withCustomerAuth}
        onOpenOrder={(orderId) => openOrder(orderId)}
      />
    )
  }

  if (view === "checkout") {
    return (
      <CheckoutScreen
        store={selectedStore}
        cartItems={cartItems}
        promotions={availablePromotions.map((promo) => ({
          campaignId: promo.campaignId,
          code: promo.code,
          name: promo.name,
          discount: promo.discount,
          remainingUses: promo.remainingUses,
        }))}
        promoLoading={promoLoading}
        promoError={promoError}
        applyingCode={applyingCode}
        placingOrder={placingOrder}
        couponCodeInput={couponCodeInput}
        appliedPromotion={appliedPromotion}
        onCouponCodeChange={setCouponCodeInput}
        onBack={() => setView(selectedProduct ? "product" : "store")}
        onIncreaseQuantity={increaseCartQuantity}
        onDecreaseQuantity={decreaseCartQuantity}
        onRefreshOffers={() => void fetchAvailablePromotions()}
        onApplyBestOffer={() => void applyBestOffer()}
        onApplyOfferByCampaign={(campaignId, campaignName) => void applyPromotionByCampaign(campaignId, campaignName)}
        onApplyCouponCode={() => void applyCouponCode()}
        onRemovePromotion={removeAppliedPromotion}
        onPlaceOrder={() => void placeOrder()}
        cartCount={cartItemCount}
      />
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 2, color: "#7c3aed" }}>CUSTOMER DASHBOARD</Text>
            <Text style={{ marginTop: 8, fontSize: 22, fontWeight: "900", color: "#0f172a" }}>Hello, {user.name || user.email}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Notifications */}
            <Pressable
              onPress={() => setView("notifications")}
              style={{ borderRadius: 999, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 10, position: "relative" }}
            >
              <Text style={{ color: "#0f172a", fontWeight: "900" }}>
                🔔{unreadNotifications > 0 ? ` ${unreadNotifications}` : ""}
              </Text>
            </Pressable>
            {/* Cart */}
            <Pressable
              onPress={openCheckout}
              style={{ borderRadius: 999, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 10 }}
            >
              <Text style={{ color: "#0f172a", fontWeight: "900" }}>🛒 {cartItemCount}</Text>
            </Pressable>
            {/* Profile */}
            <Pressable
              onPress={() => setView("profile")}
              style={{ borderRadius: 999, backgroundColor: "#6366f1", paddingHorizontal: 12, paddingVertical: 10 }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>👤</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={{ ...cardStyle, flex: 1, marginBottom: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Active Orders</Text>
            <Text style={{ marginTop: 8, fontSize: 28, fontWeight: "900", color: "#111827" }}>{startup.activeOrders}</Text>
          </View>
          <View style={{ ...cardStyle, flex: 1, marginBottom: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#ec4899" }}>Pending Payments</Text>
            <Text style={{ marginTop: 8, fontSize: 28, fontWeight: "900", color: "#111827" }}>{startup.pendingPayments}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: "#64748b", fontSize: 12 }}>
            Last synced: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "waiting for first sync"}
          </Text>
        </View>

        <View style={{ ...cardStyle, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>READY TO CHECKOUT</Text>
            <Text style={{ marginTop: 6, color: "#475569" }}>{cartItemCount} item(s) in cart</Text>
          </View>
          <Pressable
            onPress={openCheckout}
            disabled={cartItemCount === 0}
            style={{ borderRadius: 12, backgroundColor: cartItemCount === 0 ? "#94a3b8" : "#111827", paddingHorizontal: 14, paddingVertical: 10 }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "900" }}>Open checkout</Text>
          </Pressable>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Nearby stores</Text>
          <Text style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>Tap a store card to open its product catalog.</Text>
          {loading && (
            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={{ color: "#475569" }}>Fetching live store feed...</Text>
            </View>
          )}
          {!loading && stores.length === 0 && !loadError && (
            <Text style={{ marginTop: 10, color: "#475569" }}>No stores are available right now.</Text>
          )}
          {!loading && stores.map((store) => (
            <Pressable
              key={store._id}
              onPress={() => openStore(store)}
              style={{
                marginTop: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: selectedStore?._id === store._id ? "#818cf8" : "#e2e8f0",
                padding: 12,
                backgroundColor: selectedStore?._id === store._id ? "#eef2ff" : "#f8fafc",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>{store.storeName}</Text>
              <Text style={{ marginTop: 4, color: "#475569", fontSize: 12 }}>
                {(store.category || "general").toUpperCase()} • Radius {store.deliveryRadius ?? 5} km
              </Text>
              {store.address ? <Text style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>{store.address}</Text> : null}
            </Pressable>
          ))}
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Recent orders</Text>
          {!loading && orders.length === 0 && !loadError && (
            <Text style={{ marginTop: 10, color: "#475569" }}>No orders yet. Place your first order from the store feed.</Text>
          )}
          {!loading && orders.map((order) => {
            const tone = statusTone[order.status] || { bg: "#e2e8f0", text: "#334155", label: order.status }
            return (
              <Pressable
                key={order._id}
                onPress={() => openOrder(order._id)}
                style={({ pressed }) => ({
                  marginTop: 10, borderRadius: 14, borderWidth: 1,
                  borderColor: "#e2e8f0", padding: 12, backgroundColor: pressed ? "#f1f5f9" : "#f8fafc"
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: "#111827", fontWeight: "800" }}>Order #{order._id.slice(-6).toUpperCase()}</Text>
                  <View style={{ borderRadius: 999, backgroundColor: tone.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: tone.text, fontSize: 11, fontWeight: "800" }}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={{ marginTop: 6, color: "#0f172a", fontWeight: "700" }}>Total: INR {Math.round(order.totalAmount || 0)}</Text>
                <Text style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                  Payment: {order.paymentStatus || "pending"}
                </Text>
                <Text style={{ marginTop: 4, color: "#6366f1", fontSize: 12, fontWeight: "600" }}>Tap for details →</Text>
              </Pressable>
            )
          })}
          {loadError && (
            <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", padding: 10 }}>
              <Text style={{ color: "#b91c1c", fontSize: 12 }}>{loadError}</Text>
            </View>
          )}
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Enabled mobile contract</Text>
          {[
            appConfig?.auth.customer.bootstrap || "/api/auth/bootstrap",
            appConfig?.commerce.stores || "/api/stores",
            appConfig?.commerce.customerOrders || "/api/orders/customer/:customerId",
            appConfig?.commerce.liveTracking || "/api/orders/:id/tracking",
          ].map((item) => (
            <Text key={item} style={{ marginTop: 8, color: "#111827", fontWeight: "600" }}>{item}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
