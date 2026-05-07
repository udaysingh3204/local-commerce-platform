import { useQuery } from "@tanstack/react-query"
import { SafeAreaView, ScrollView, Text, View } from "react-native"
import { AppConfig, fetchJson } from "../lib/shared"
import { API_BASE_URL } from "../config/env"

const cardStyle = {
  borderRadius: 20,
  backgroundColor: "#111827",
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#1f2937",
} as const

export default function DriverKickoffScreen() {
  const configQuery = useQuery({
    queryKey: ["app-config"],
    queryFn: () => fetchJson<AppConfig>(API_BASE_URL, "/api/app/config"),
  })

  const config = configQuery.data

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#030712" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 2, color: "#f59e0b" }}>DRIVER APP</Text>
          <Text style={{ fontSize: 28, fontWeight: "900", color: "#ffffff", marginTop: 8 }}>Operations-ready native shell</Text>
          <Text style={{ marginTop: 8, color: "#94a3b8", lineHeight: 22 }}>
            This app is prepared for driver bootstrap, open queue intake, active delivery state changes, GPS sync, and earnings insights.
          </Text>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#fbbf24" }}>Handshake</Text>
          <Text style={{ marginTop: 8, fontSize: 18, fontWeight: "800", color: "#ffffff" }}>
            {configQuery.isLoading ? "Loading app config..." : config ? `${config.platform} · ${config.apiVersion}` : "Config unavailable"}
          </Text>
          <Text style={{ marginTop: 6, color: "#94a3b8" }}>
            Base URL: {API_BASE_URL}
          </Text>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#fbbf24" }}>Next API Calls</Text>
          {[
            config?.auth.driver.bootstrap || "/api/driver/bootstrap",
            config?.auth.driver.insights || "/api/driver/me/insights",
            "/api/orders?driverId=:driverId&includeCompleted=true",
            "/api/driver/me/location",
          ].map((path) => (
            <Text key={path} style={{ marginTop: 8, color: "#f8fafc", fontWeight: "600" }}>{path}</Text>
          ))}
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#fbbf24" }}>Realtime Contract</Text>
          <Text style={{ marginTop: 8, color: "#f8fafc", fontWeight: "700" }}>
            Join event: {config?.realtime.joinOrderRoomEvent ?? "joinOrderRoom"}
          </Text>
          <Text style={{ marginTop: 6, color: "#f8fafc", fontWeight: "700" }}>
            Driver update: {config?.realtime.driverLocationEvent ?? "driverLocationUpdate"}
          </Text>
          <Text style={{ marginTop: 6, color: "#f8fafc", fontWeight: "700" }}>
            Order status: {config?.realtime.orderStatusEvent ?? "orderStatusUpdated"}
          </Text>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#fbbf24" }}>Build Targets</Text>
          {[
            "Driver bootstrap and secure token restore",
            "Open dispatch queue and current active run",
            "Accept, start, and complete delivery actions",
            "Background-safe GPS sync strategy",
            "Weekly earnings and on-time performance panels",
          ].map((item) => (
            <Text key={item} style={{ marginTop: 8, color: "#cbd5e1" }}>{`• ${item}`}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}