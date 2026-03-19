import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import { getDistance } from "geolib"
import { useParams } from "react-router-dom"
import "leaflet/dist/leaflet.css"

const socket = io("https://local-commerce-platform-production.up.railway.app")

// 🔥 Smooth animation hook
function useSmoothLocation(targetLocation: any) {
  const [smoothLocation, setSmoothLocation] = useState<any>(targetLocation)
  const animationRef = useRef<any>(null)

  useEffect(() => {
    if (!targetLocation) return

    let start = smoothLocation || targetLocation
    let end = targetLocation

    let progress = 0

    const animate = () => {
      progress += 0.05

      if (progress >= 1) {
        setSmoothLocation(end)
        return
      }

      const lat = start.lat + (end.lat - start.lat) * progress
      const lng = start.lng + (end.lng - start.lng) * progress

      setSmoothLocation({ lat, lng })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetLocation])

  return smoothLocation
}

export default function TrackOrder() {

  const { orderId } = useParams()

  const [rawLocation, setRawLocation] = useState<any>(null)
  const smoothLocation = useSmoothLocation(rawLocation)

  const [eta, setEta] = useState<number | null>(null)
  const [status, setStatus] = useState<string>("pending")

  const customerLocation = { lat: 28.5355, lng: 77.3910 }

  useEffect(() => {

    if (!orderId) return

    // ✅ Join socket room
    socket.emit("joinOrderRoom", orderId)

    const handleLocation = (data: any) => {
      if (data.orderId !== orderId) return

      const loc = {
        lat: data.location.lat,
        lng: data.location.lng
      }

      setRawLocation(loc)

      // ETA calculation
      const distance = getDistance(
        { latitude: loc.lat, longitude: loc.lng },
        { latitude: customerLocation.lat, longitude: customerLocation.lng }
      )

      const speed = 8.33
      const minutes = Math.ceil((distance / speed) / 60)

      setEta(minutes)
    }

    const handleStatus = (data: any) => {
      if (data.orderId === orderId) {
        setStatus(data.status)
      }
    }

    socket.on("deliveryLocationUpdate", handleLocation)
    socket.on("orderStatusUpdated", handleStatus)

    return () => {
      socket.off("deliveryLocationUpdate", handleLocation)
      socket.off("orderStatusUpdated", handleStatus)
    }

  }, [orderId])

  return (
    <div style={{ height: "100vh" }}>

      <h2 style={{ padding: "10px" }}>
        🚚 Live Delivery Tracking
      </h2>

      <MapContainer
        center={[customerLocation.lat, customerLocation.lng]}
        zoom={15}
        style={{ height: "90vh" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {smoothLocation && (
          <Marker position={[smoothLocation.lat, smoothLocation.lng]}>
            <Popup>Delivery Partner</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* ETA */}
      {eta !== null && (
        <div style={{
          position: "absolute",
          top: 80,
          left: 20,
          background: "white",
          padding: "12px",
          borderRadius: "10px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.2)"
        }}>
          ⏱️ ETA: {eta} mins
        </div>
      )}

      {/* STATUS */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        background: "white",
        padding: "12px",
        borderRadius: "10px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.2)"
      }}>
        📦 Status: {status}
      </div>

    </div>
  )
}