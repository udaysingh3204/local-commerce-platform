import type { StackNavigationProp } from "@react-navigation/stack"
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"
import type { CompositeNavigationProp, RouteProp } from "@react-navigation/native"

// ─── Tab Navigator ────────────────────────────────────────────────────────────
export type TabParamList = {
  Home: undefined
  Explore: undefined
  Orders: undefined
  Notifications: undefined
  Wishlist: undefined
  Profile: undefined
}

// ─── Main Stack (wraps tabs + modal-style screens) ────────────────────────────
export type RootStackParamList = {
  // Auth screens (pre-login)
  Login: undefined
  ForgotPassword: undefined
  // App screens (post-login)
  Tabs: undefined
  StoreDetail: { storeId: string; storeName: string }
  ProductDetail: { productId: string; storeId: string; storeName: string }
  Checkout: undefined
  OrderDetail: { orderId: string }
  DeliveryRadar: { orderId: string }
}

// ─── Convenience navigation prop types ───────────────────────────────────────
export type RootNavProp = StackNavigationProp<RootStackParamList>
export type TabNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  StackNavigationProp<RootStackParamList>
>

export type StoreDetailRouteProp = RouteProp<RootStackParamList, "StoreDetail">
export type ProductDetailRouteProp = RouteProp<RootStackParamList, "ProductDetail">
export type OrderDetailRouteProp = RouteProp<RootStackParamList, "OrderDetail">
export type DeliveryRadarRouteProp = RouteProp<RootStackParamList, "DeliveryRadar">
