import { useState } from "react"
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native"
import GoogleOAuthButton from "../components/GoogleOAuthButton"
import type { AppConfig } from "../lib/shared"

type CustomerLoginScreenProps = {
  appConfig: AppConfig | null
  error: string | null
  onLogin: (email: string, password: string) => Promise<void>
  onGoogleLogin?: (email: string, name: string, googleId: string) => Promise<void>
}

export default function CustomerLoginScreen({ appConfig, error, onLogin, onGoogleLogin }: CustomerLoginScreenProps) {
  const [email, setEmail] = useState("customer.one@localmart.demo")
  const [password, setPassword] = useState("Customer12345!")
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 2, color: "#7c3aed" }}>CUSTOMER APP</Text>
        <Text style={{ marginTop: 10, fontSize: 30, fontWeight: "900", color: "#0f172a" }}>Sign in to LocalMart</Text>
        <Text style={{ marginTop: 8, color: "#64748b", lineHeight: 22 }}>
          This native app already understands the shared backend contract, bootstrap flow, and delivery tracking thresholds.
        </Text>

        <View style={{ marginTop: 24, borderRadius: 24, backgroundColor: "#ffffff", padding: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5, color: "#6366f1" }}>Backend readiness</Text>
          <Text style={{ marginTop: 8, color: "#111827", fontWeight: "700" }}>{appConfig?.readiness.customerApp || "ready"}</Text>
          <Text style={{ marginTop: 16, color: "#334155", fontWeight: "700" }}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#f8fafc" }} />
          <Text style={{ marginTop: 16, color: "#334155", fontWeight: "700" }}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#f8fafc" }} />

          {(submitError || error) && (
            <View style={{ marginTop: 14, borderRadius: 14, backgroundColor: "#fef2f2", padding: 12, borderWidth: 1, borderColor: "#fecaca" }}>
              <Text style={{ color: "#b91c1c" }}>{submitError || error}</Text>
            </View>
          )}

          <Pressable onPress={handleSubmit} disabled={submitting} style={{ marginTop: 18, borderRadius: 16, backgroundColor: "#111827", paddingVertical: 14, alignItems: "center", opacity: submitting ? 0.7 : 1 }}>
            <Text style={{ color: "#ffffff", fontWeight: "900" }}>{submitting ? "Signing in..." : "Sign In"}</Text>
          </Pressable>

          <Text style={{ marginTop: 16, color: "#cbd5e1", textAlign: "center", fontWeight: "600" }}>or</Text>

          <GoogleOAuthButton
            onSuccess={onGoogleLogin || (() => Promise.resolve())}
            onError={(err) => setSubmitError(err.message)}
            disabled={submitting}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}