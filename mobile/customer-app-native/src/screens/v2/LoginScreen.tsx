import { useState } from "react"
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView, Text, TextInput, View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useApp } from "../../context/AppContext"
import { Colors, Font, Radius, Shadow, Spacing } from "../../theme"
import type { RootNavProp } from "../../navigation/types"

export default function LoginScreen() {
  const nav = useNavigation<RootNavProp>()
  const { login, appConfig } = useApp()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Please fill all fields"); return }
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: Spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
            <View style={{
              width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.primary,
              justifyContent: "center", alignItems: "center", marginBottom: Spacing.md, ...Shadow.md,
            }}>
              <Text style={{ fontSize: 36 }}>🛍️</Text>
            </View>
            <Text style={{ fontSize: Font.xxxl, fontWeight: "900", color: Colors.text }}>LocalMart</Text>
            <Text style={{ fontSize: Font.md, color: Colors.textSecondary, marginTop: 4 }}>
              Shop from local stores near you
            </Text>
          </View>

          {/* Card */}
          <View style={{
            backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
            padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, ...Shadow.md,
          }}>
            <Text style={{ fontSize: Font.xl, fontWeight: "900", color: Colors.text, marginBottom: Spacing.lg }}>
              Welcome back 👋
            </Text>

            {/* Email */}
            <Text style={{ fontSize: Font.xs, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
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

            {/* Password row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: Font.xs, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 1, textTransform: "uppercase" }}>
                Password
              </Text>
              <Pressable onPress={() => nav.navigate("ForgotPassword")}>
                <Text style={{ fontSize: Font.sm, fontWeight: "700", color: Colors.primary }}>
                  Forgot password?
                </Text>
              </Pressable>
            </View>
            <View style={{ position: "relative", marginBottom: Spacing.lg }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                style={{
                  borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
                  paddingHorizontal: Spacing.lg, paddingVertical: 14, paddingRight: 50,
                  fontSize: Font.md, color: Colors.text, backgroundColor: Colors.bg,
                }}
              />
              <Pressable
                onPress={() => setShowPw(s => !s)}
                style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}
              >
                <Text style={{ fontSize: 18, color: Colors.textSecondary }}>{showPw ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>

            {error && (
              <View style={{
                backgroundColor: "#fef2f2", borderRadius: Radius.md, padding: Spacing.md,
                borderWidth: 1, borderColor: "#fecaca", marginBottom: Spacing.lg,
              }}>
                <Text style={{ color: "#b91c1c", fontSize: Font.sm }}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleLogin}
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
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: Font.md }}>Sign In →</Text>
              )}
            </Pressable>
          </View>

          {appConfig && (
            <Text style={{
              textAlign: "center", marginTop: Spacing.xl,
              fontSize: Font.xs, color: Colors.textMuted,
            }}>
              {appConfig.readiness.customerApp}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
