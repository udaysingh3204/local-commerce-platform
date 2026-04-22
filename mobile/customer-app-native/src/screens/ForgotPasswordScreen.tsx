import { useState } from "react"
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView, Text, TextInput, View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { API_BASE_URL } from "../config/env"
import { Colors, Font, Radius, Shadow, Spacing } from "../theme"
import type { RootNavProp } from "../navigation/types"

export default function ForgotPasswordScreen() {
  const nav = useNavigation<RootNavProp>()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Enter your email address"); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok && res.status !== 200) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { message?: string }).message || "Request failed")
      }
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: Spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <Pressable
            onPress={() => nav.goBack()}
            style={{ position: "absolute", top: 0, left: Spacing.xl, flexDirection: "row", alignItems: "center" }}
          >
            <Text style={{ fontSize: Font.lg, color: Colors.primary }}>←</Text>
            <Text style={{ fontSize: Font.md, color: Colors.primary, fontWeight: "700", marginLeft: 6 }}>Back</Text>
          </Pressable>

          {sent ? (
            /* ── Success state ────────────────────────────────────────────── */
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 64, marginBottom: Spacing.lg }}>📬</Text>
              <Text style={{ fontSize: Font.xxl, fontWeight: "900", color: Colors.text, textAlign: "center", marginBottom: Spacing.md }}>
                Check your inbox
              </Text>
              <Text style={{ fontSize: Font.md, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: Spacing.xxl }}>
                We've sent a reset link to{"\n"}
                <Text style={{ fontWeight: "700", color: Colors.text }}>{email}</Text>.{"\n"}
                The link expires in 1 hour.
              </Text>
              <Pressable
                onPress={() => nav.navigate("Login")}
                style={({ pressed }) => ({
                  backgroundColor: Colors.primary, borderRadius: Radius.lg,
                  paddingVertical: 16, paddingHorizontal: Spacing.xxl,
                  opacity: pressed ? 0.85 : 1, ...Shadow.sm,
                })}
              >
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.md }}>Back to Sign In</Text>
              </Pressable>
            </View>
          ) : (
            /* ── Form ─────────────────────────────────────────────────────── */
            <>
              <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
                <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🔑</Text>
                <Text style={{ fontSize: Font.xxl, fontWeight: "900", color: Colors.text }}>Forgot password?</Text>
                <Text style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 6, textAlign: "center" }}>
                  Enter your email and we'll send a reset link.
                </Text>
              </View>

              <View style={{
                backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
                padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, ...Shadow.md,
              }}>
                <Text style={{
                  fontSize: Font.xs, fontWeight: "700", color: Colors.textSecondary,
                  letterSpacing: 1, textTransform: "uppercase", marginBottom: 6,
                }}>
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  style={{
                    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
                    paddingHorizontal: Spacing.lg, paddingVertical: 14,
                    fontSize: Font.md, color: Colors.text, backgroundColor: Colors.bg,
                    marginBottom: Spacing.lg,
                  }}
                />

                {error && (
                  <View style={{
                    backgroundColor: "#fef2f2", borderRadius: Radius.md, padding: Spacing.md,
                    borderWidth: 1, borderColor: "#fecaca", marginBottom: Spacing.lg,
                  }}>
                    <Text style={{ color: "#b91c1c", fontSize: Font.sm }}>{error}</Text>
                  </View>
                )}

                <Pressable
                  onPress={handleSubmit}
                  disabled={loading}
                  style={({ pressed }) => ({
                    backgroundColor: loading ? Colors.textMuted : Colors.primary,
                    borderRadius: Radius.lg, paddingVertical: 16,
                    alignItems: "center", opacity: pressed ? 0.85 : 1, ...Shadow.sm,
                  })}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.md }}>Send Reset Link →</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
