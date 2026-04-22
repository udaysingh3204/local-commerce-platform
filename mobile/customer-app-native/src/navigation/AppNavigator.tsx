import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import { Text, View } from "react-native"
import { useApp } from "../context/AppContext"
import { Colors, Font } from "../theme"
import type { RootStackParamList, TabParamList } from "./types"

// ─── Auth screens ──────────────────────────────────────────────────────────────
import LoginScreen from "../screens/v2/LoginScreen"
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen"

// ─── App screens ──────────────────────────────────────────────────────────────
import HomeScreen from "../screens/v2/HomeScreen"
import ExploreScreen from "../screens/v2/ExploreScreen"
import OrdersScreen from "../screens/v2/OrdersScreen"
import NotificationsScreenV2 from "../screens/v2/NotificationsScreenV2"
import ProfileScreenV2 from "../screens/v2/ProfileScreenV2"
import WishlistScreen from "../screens/v2/WishlistScreen"
import StoreDetailScreenV2 from "../screens/v2/StoreDetailScreenV2"
import ProductDetailScreenV2 from "../screens/v2/ProductDetailScreenV2"
import CheckoutScreenV2 from "../screens/v2/CheckoutScreenV2"
import OrderDetailScreenV2 from "../screens/v2/OrderDetailScreenV2"
import DeliveryRadarScreen from "../screens/v2/DeliveryRadarScreen"

const Tab = createBottomTabNavigator<TabParamList>()
const Stack = createStackNavigator<RootStackParamList>()

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home:          { active: "🏠", inactive: "🏡" },
  Explore:       { active: "🔍", inactive: "🔎" },
  Orders:        { active: "📦", inactive: "📭" },
  Notifications: { active: "🔔", inactive: "🔕" },
  Wishlist:      { active: "🤍", inactive: "🩶" },
  Profile:       { active: "👤", inactive: "👥" },
}

function TabNavigator() {
  const { cartItemCount } = useApp()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: { fontSize: Font.xs, fontWeight: "700" },
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name] ?? { active: "●", inactive: "○" }
          return <Text style={{ fontSize: 22 }}>{focused ? icons.active : icons.inactive}</Text>
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: "Explore" }} />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: "Orders" }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreenV2}
        options={{ title: "Alerts" }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ title: "Wishlist" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreenV2}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { user } = useApp()

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // ── Authenticated screens ───────────────────────────────────────────
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="StoreDetail" component={StoreDetailScreenV2} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreenV2} />
          <Stack.Screen name="Checkout" component={CheckoutScreenV2} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreenV2} />
          <Stack.Screen name="DeliveryRadar" component={DeliveryRadarScreen} />
        </>
      ) : (
        // ── Auth screens ────────────────────────────────────────────────────
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}
