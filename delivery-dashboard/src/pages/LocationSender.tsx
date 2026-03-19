import { useEffect } from "react"
import { io } from "socket.io-client"

const socket = io("https://local-commerce-platform-production.up.railway.app")

type Props = {
  orderId: string
}

export default function LocationSender({ orderId }: Props) {

  useEffect(() => {

    if (!orderId) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords

        console.log("Sending location:", latitude, longitude)

        socket.emit("deliveryLocationUpdate", {
          orderId,
          location: {
            lat: latitude,
            lng: longitude
          }
        })
      },
      (err) => {
        console.error("Location error:", err)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)

  }, [orderId])

  return null
}