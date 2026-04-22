import { useState } from "react"
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native"
import type { AppConfig } from "@local-commerce-platform/mobile-shared"

type DriverLoginScreenProps = {
  appConfig: AppConfig | null
  error: string | null
  onLogin: (email: string, password: string) => Promise<void>
}

export default function DriverLoginScreen({ appConfig, error, onLogin }: DriverLoginScreenProps) {
  const [email, setEmail] = useState("driver.one@localmart.demo")
  const [password, setPassword] = useState("Driver12345!")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)

    try {
      await onLogin(email.trim(), password)
    } catch (nextError) {
      setSubmitError(nextError instanceof Error ? nextError.message : "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#030712" }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 2, color: "#f59e0b" }}>DRIVER APP</Text>
        <Text style={{ marginTop: 10, fontSize: 30, fontWeight: "900", color: "#ffffff" }}>Enter the driver workspace</Text>
        <Text style={{ marginTop: 8, color: "#94a3b8", lineHeight: 22 }}>
          This native app already targets the delivery queue, location sync, and driver insights surfaces from the backend.
        </Text>

        <View style={{ marginTop: 24, borderRadius: 24, backgroundColor: "#111827", padding: 20, borderWidth: 1, borderColor: "#1f2937" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#fbbf24" }}>Backend readiness</Text>
          <Text style={{ marginTop: 8, color: "#ffffff", fontWeight: "700" }}>{appConfig?.readiness.driverApp || "ready"}</Text>
          <Text style={{ marginTop: 16, color: "#e2e8f0", fontWeight: "700" }}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ marginTop: 8, borderWidth: 1, borderColor: "#334155", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#020617", color: "#ffffff" }} placeholderTextColor="#64748b" />
          <Text style={{ marginTop: 16, color: "#e2e8f0", fontWeight: "700" }}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: 8, borderWidth: 1, borderColor: "#334155", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#020617", color: "#ffffff" }} placeholderTextColor="#64748b" />

          {(submitError || error) && (
            <View style={{ marginTop: 14, borderRadius: 14, backgroundColor: "#451a03", padding: 12, borderWidth: 1, borderColor: "#78350f" }}>
              <Text style={{ color: "#fdba74" }}>{submitError || error}</Text>
            </View>
          )}

          <Pressable onPress={handleSubmit} disabled={submitting} style={{ marginTop: 18, borderRadius: 16, backgroundColor: "#f59e0b", paddingVertical: 14, alignItems: "center", opacity: submitting ? 0.7 : 1 }}>
            <Text style={{ color: "#111827", fontWeight: "900" }}>{submitting ? "Signing in..." : "Sign In"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}