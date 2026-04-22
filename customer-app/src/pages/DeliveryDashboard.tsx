import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { io } from "socket.io-client"
import { BACKEND_ORIGIN } from "../api/api"

const socket = io(BACKEND_ORIGIN)

export default function DeliveryDashboard() {

  const { orderId } = useParams<{ orderId: string }>()

  useEffect(() => {
    if (!orderId) return

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