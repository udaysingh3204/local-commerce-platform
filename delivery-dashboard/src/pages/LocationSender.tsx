import { useEffect, useState } from "react"
import API from "../api/api"

export default function LocationSender({ orderId }: { orderId?: string }) {
  const [status, setStatus] = useState("Acquiring driver GPS...")

  useEffect(() => {
    let cancelled = false

    const interval = setInterval(() => {

      navigator.geolocation.getCurrentPosition(
        async (position) => {

          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }

          try {
            await API.patch("/driver/me/location", location)
            if (!cancelled) {
              setStatus(orderId ? "Sharing driver and order location..." : "Driver location synced for dispatch")
            }
          } catch {
            if (!cancelled) {
              setStatus("Unable to sync driver GPS with backend")
            }
          }

        },
        async () => {
          console.log("Location permission denied")

          // fallback (fake movement)
          const fallbackLocation = {
            lat: 28.5355 + Math.random() * 0.01,
            lng: 77.3910 + Math.random() * 0.01
          }

          try {
            await API.patch("/driver/me/location", fallbackLocation)
            if (!cancelled) {
              setStatus(orderId ? "Using fallback route simulation" : "Using fallback GPS for dispatch simulation")
            }
          } catch {
            if (!cancelled) {
              setStatus("Location sharing unavailable")
            }
          }
        }
      )

    }, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }

  }, [orderId])

  return <p>📡 {status}</p>
}