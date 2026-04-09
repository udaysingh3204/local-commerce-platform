import { useEffect } from "react"
import { io } from "socket.io-client"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "https://local-commerce-platform-production.up.railway.app"
const socket = io(SOCKET_URL)

export default function LocationSender({ orderId }: any) {

  useEffect(() => {

    if (!orderId) return

    const interval = setInterval(() => {

      navigator.geolocation.getCurrentPosition(
        (position) => {

          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }

          socket.emit("deliveryLocationUpdate", {
            orderId,
            location
          })

        },
        () => {
          console.log("Location permission denied")

          // fallback (fake movement)
          socket.emit("deliveryLocationUpdate", {
            orderId,
            location: {
              lat: 28.5355 + Math.random() * 0.01,
              lng: 77.3910 + Math.random() * 0.01
            }
          })
        }
      )

    }, 3000)

    return () => clearInterval(interval)

  }, [orderId])

  return <p>📡 Sending live location...</p>
}