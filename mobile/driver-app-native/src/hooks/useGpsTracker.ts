import { useEffect, useRef } from "react"
import * as Location from "expo-location"
import { AppState, type AppStateStatus } from "react-native"
import { API_BASE_URL } from "../config/env"
import { getSecureValue } from "../lib/secureStore"
import { MOBILE_STORAGE_KEYS } from "../lib/shared"

const GPS_INTERVAL_MS = 15_000 // send location every 15 s while active

async function sendLocation(lat: number, lng: number) {
  const token = await getSecureValue(MOBILE_STORAGE_KEYS.driverToken)
  if (!token) return
  await fetch(`${API_BASE_URL}/api/driver/me/location`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lat, lng }),
  })
}

/**
 * Starts watching GPS and syncing to backend while the component is mounted.
 * Only active when `enabled` is true (e.g. driver has an active delivery).
 */
export function useGpsTracker(enabled: boolean) {
  const subRef = useRef<Location.LocationSubscription | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPos = useRef<{ lat: number; lng: number } | null>(null)
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    if (!enabled) return

    let active = true

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted" || !active) return

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 20,
        },
        (loc) => {
          lastPos.current = { lat: loc.coords.latitude, lng: loc.coords.longitude }
        }
      )

      // Send to backend on interval (not on every GPS update to avoid flooding)
      intervalRef.current = setInterval(() => {
        if (lastPos.current && appState.current !== "background") {
          sendLocation(lastPos.current.lat, lastPos.current.lng).catch(() => {})
        }
      }, GPS_INTERVAL_MS)
    }

    void start()

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      appState.current = next
    })

    return () => {
      active = false
      subRef.current?.remove()
      if (intervalRef.current) clearInterval(intervalRef.current)
      sub.remove()
    }
  }, [enabled])
}
