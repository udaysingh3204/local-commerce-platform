import { useEffect, useState } from "react"
import { SafeAreaView, Text, View } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import type { AppConfig, DriverStartup, DriverUser } from "./lib/shared"
import DriverHomeScreen from "./screens/DriverHomeScreen"
import EarningsScreen from "./screens/EarningsScreen"
import DriverLoginScreen from "./screens/DriverLoginScreen"
import { bootstrapDriver, clearDriverToken, loginDriver, persistDriverToken } from "./lib/auth"
import { loadAppConfig } from "./lib/appConfig"

type DriverSessionState = {
  appConfig: AppConfig | null
  driver: DriverUser | null
  startup: DriverStartup
  loading: boolean
  error: string | null
}

const emptyStartup: DriverStartup = {
  activeDeliveries: 0,
  completedDeliveries: 0,
}

const Tab = createBottomTabNavigator()

function DriverTabs({ appConfig, driver, startup, onLogout }: {
  appConfig: AppConfig | null
  driver: DriverUser
  startup: DriverStartup
  onLogout: () => Promise<void>
}) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0f172a", borderTopColor: "#1e293b", paddingBottom: 6, height: 58 },
        tabBarActiveTintColor: "#f59e0b",
        tabBarInactiveTintColor: "#475569",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tab.Screen
        name="Deliveries"
        options={{ tabBarLabel: "Deliveries", tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🛵</Text> }}
      >
        {() => (
          <DriverHomeScreen
            appConfig={appConfig}
            driver={driver}
            startup={startup}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Earnings"
        options={{ tabBarLabel: "Earnings", tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>₹</Text> }}
      >
        {() => <EarningsScreen driverId={String(driver._id)} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

export default function DriverRoot() {
  const [session, setSession] = useState<DriverSessionState>({
    appConfig: null,
    driver: null,
    startup: emptyStartup,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const hydrate = async () => {
      try {
        const appConfig = await loadAppConfig()
        const bootstrap = await bootstrapDriver()

        setSession({
          appConfig,
          driver: bootstrap?.response.driver || null,
          startup: bootstrap?.response.startup || emptyStartup,
          loading: false,
          error: null,
        })
      } catch (error) {
        setSession((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Unable to initialize driver app",
        }))
      }
    }

    void hydrate()
  }, [])

  const handleLogin = async (email: string, password: string) => {
    const login = await loginDriver(email, password)
    await persistDriverToken(login.token)
    const bootstrap = await bootstrapDriver()

    setSession((current) => ({
      ...current,
      driver: bootstrap?.response.driver || login.driver,
      startup: bootstrap?.response.startup || emptyStartup,
      error: null,
    }))
  }

  const handleLogout = async () => {
    await clearDriverToken()
    setSession((current) => ({
      ...current,
      driver: null,
      startup: emptyStartup,
    }))
  }

  if (session.loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#030712" }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: "#ffffff" }}>LocalMart Driver</Text>
          <Text style={{ color: "#94a3b8" }}>Preparing driver workspace...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!session.driver) {
    return (
      <DriverLoginScreen
        appConfig={session.appConfig}
        error={session.error}
        onLogin={handleLogin}
      />
    )
  }

  return (
    <NavigationContainer>
      <DriverTabs
        appConfig={session.appConfig}
        driver={session.driver}
        startup={session.startup}
        onLogout={handleLogout}
      />
    </NavigationContainer>
  )
}
