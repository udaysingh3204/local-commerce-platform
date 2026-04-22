import { ActivityIndicator, SafeAreaView, Text } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { AppProvider, useApp } from "./context/AppContext"
import AppNavigator from "./navigation/AppNavigator"
import { usePushNotifications } from "./hooks/usePushNotifications"

// ─── Inner shell (reads from AppContext) ───────────────────────────────────────
function AppShell() {
  const { loading } = useApp()

  // Register push token once user is authenticated
  usePushNotifications()

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🛍</Text>
        <Text style={{ fontSize: 28, fontWeight: "900", color: "#111827", marginBottom: 8 }}>LocalMart</Text>
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    )
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  )
}

// ─── Root: provide global state then render shell ─────────────────────────────
export default function CustomerRoot() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
