import { useEffect, useRef } from "react"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { Platform, Alert } from "react-native"
import { API_BASE_URL } from "../config/env"
import { getSecureValue } from "../lib/secureStore"
import { MOBILE_STORAGE_KEYS } from "@local-commerce-platform/mobile-shared"

// Show notification banners while app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null // emulators don't get real tokens

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== "granted") return null

  // projectId is only required for bare workflow with EAS; in Expo Go it's optional
  const tokenData = await Notifications.getExpoPushTokenAsync()
  return tokenData.data
}

async function registerTokenWithBackend(token: string): Promise<void> {
  const authToken = await getSecureValue(MOBILE_STORAGE_KEYS.customerToken)
  if (!authToken) return

  await fetch(`${API_BASE_URL}/api/notifications/push-token`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token }),
  })
}

/**
 * Call this inside a component that mounts after the user is logged in.
 * Handles:
 *  - Permission request
 *  - Token registration with backend
 *  - Android notification channel setup
 *  - Foreground notification listener (shows an Alert)
 */
export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    // Android needs an explicit channel
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("orders", {
        name: "Order Updates",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366f1",
      })
    }

    // Get token and register
    getExpoPushToken()
      .then((token) => { if (token) registerTokenWithBackend(token) })
      .catch(() => {/* permission denied or simulator */})

    // Foreground: received but not tapped
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body } = notification.request.content
        if (title || body) {
          Alert.alert(title ?? "Notification", body ?? "")
        }
      }
    )

    // User tapped the notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // Could navigate to order detail here — handled via deep linking later
      }
    )

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])
}
