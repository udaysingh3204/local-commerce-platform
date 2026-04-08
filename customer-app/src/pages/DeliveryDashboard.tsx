import { useEffect } from "react"
import { io } from "socket.io-client"

const socket = io("http://localhost:5000")

export default function DeliveryDashboard() {

  const orderId = "69cecdf18025573d8f961df9" // 🔥 replace manually for now

  useEffect(() => {
    navigator.geolocation.watchPosition((pos) => {

      const location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }

      socket.emit("deliveryLocationUpdate", {
        orderId,
        location
      })

    })
  }, [])

  return <h2>🚚 Driver sending live location...</h2>
}