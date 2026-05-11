import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import * as WebBrowser from "expo-web-browser"
import * as AuthSession from "expo-auth-session"
import { API_BASE_URL } from "../config/env"

WebBrowser.maybeCompleteAuthSession()

type GoogleOAuthButtonProps = {
  onSuccess: (email: string, name: string, googleId: string) => Promise<void>
  onError?: (error: Error) => void
  disabled?: boolean
}

export default function GoogleOAuthButton({ onSuccess, onError, disabled }: GoogleOAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const redirectUrl = AuthSession.makeRedirectUri({ scheme: "localmart" })

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // For now, show a message that Google OAuth needs to be configured
      // In a production app, you would:
      // 1. Configure a Google OAuth client ID in app.json
      // 2. Use AuthSession.startAsync to open Google login
      // 3. Exchange the token with your backend
      alert("Google Sign-In requires Google OAuth Client ID configuration in app.json")
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Pressable
      onPress={handleGoogleLogin}
      disabled={disabled || loading}
      style={{
        marginTop: 12,
        borderRadius: 14,
        backgroundColor: "#ffffff",
        borderWidth: 1.5,
        borderColor: "#e5e7eb",
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        opacity: disabled || loading ? 0.6 : 1,
      }}
    >
      <Text style={{ fontSize: 18, marginRight: 10 }}>🔐</Text>
      <Text style={{ color: "#111827", fontWeight: "700" }}>
        {loading ? "Signing in..." : "Sign in with Google"}
      </Text>
    </Pressable>
  )
}
