import { useQuery } from "@tanstack/react-query"
import { SafeAreaView, ScrollView, Text, View } from "react-native"
import { AppConfig, fetchJson } from "../lib/shared"
import { API_BASE_URL } from "../config/env"

const cardStyle = {
  borderRadius: 20,
  backgroundColor: "#ffffff",
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#e5e7eb",
} as const

export default function CustomerKickoffScreen() {
  const configQuery = useQuery({
    queryKey: ["app-config"],
    queryFn: () => fetchJson<AppConfig>(API_BASE_URL, "/api/app/config"),
  })

  const config = configQuery.data

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 2, color: "#7c3aed" }}>CUSTOMER APP</Text>
          <Text style={{ fontSize: 28, fontWeight: "900", color: "#0f172a", marginTop: 8 }}>React Native kickoff shell</Text>
          <Text style={{ marginTop: 8, color: "#475569", lineHeight: 22 }}>
            This app boots from the shared backend contract and is ready for session restore, store feed, checkout, orders, and live tracking implementation.
          </Text>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Handshake</Text>
          <Text style={{ marginTop: 8, fontSize: 18, fontWeight: "800", color: "#111827" }}>
            {configQuery.isLoading ? "Loading app config..." : config ? `${config.platform} · ${config.apiVersion}` : "Config unavailable"}
          </Text>
          <Text style={{ marginTop: 6, color: "#475569" }}>
            Base URL: {API_BASE_URL}
          </Text>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Next API Calls</Text>
          {[
            config?.auth.customer.bootstrap || "/api/auth/bootstrap",
            config?.commerce.stores || "/api/stores",
            config?.commerce.customerOrders || "/api/orders/customer/:customerId",
            config?.commerce.liveTracking || "/api/orders/:id/tracking",
          ].map((path) => (
            <Text key={path} style={{ marginTop: 8, color: "#111827", fontWeight: "600" }}>{path}</Text>
          ))}
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Tracking Policy</Text>
          <Text style={{ marginTop: 8, color: "#111827", fontWeight: "700" }}>
            Signal stale after {config?.trackingPolicy.signalStaleAfterMinutes ?? "--"} min
          </Text>
          <Text style={{ marginTop: 6, color: "#111827", fontWeight: "700" }}>
            Delay risk after {config?.trackingPolicy.delayRiskAfterMinutes ?? "--"} min
          </Text>
          <Text style={{ marginTop: 6, color: "#111827", fontWeight: "700" }}>
            Delivery late after {config?.trackingPolicy.delayLateAfterMinutes ?? "--"} min
          </Text>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Build Targets</Text>
          {[
            "Session restore and secure token storage",
            "Store feed and product detail screens",
            "Checkout plus payment handoff",
            "Orders list with delay and signal alerts",
            "Live map tracking via Socket.IO room subscription",
          ].map((item) => (
            <Text key={item} style={{ marginTop: 8, color: "#334155" }}>{`• ${item}`}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}