import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap
} from "react-leaflet"
import { getDistance } from "geolib"
import { useParams } from "react-router-dom"
import L from "leaflet"
import confetti from "canvas-confetti"
import { toast } from "sonner"
import "leaflet/dist/leaflet.css"
import "leaflet-routing-machine"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "https://local-commerce-platform-production.up.railway.app"
const socket = io(SOCKET_URL)

/* 🚚 DRIVER ICON */
const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
  iconSize: [40, 40]
})

/* 🧭 AUTO FOLLOW DRIVER (LIVE NAVIGATION) */
function AutoFollow({ location }: any) {
  const map = useMap()

  useEffect(() => {
    if (!location) return

    map.flyTo([location.lat, location.lng], 17, {
      animate: true,
      duration: 1.2
    })
  }, [location])

  return null
}

/* 🛣 ROUTE DRAWING */
function Routing({ from, to }: any) {
  const map = useMap()
  const routingRef = useRef<any>(null)

  useEffect(() => {
    if (!from || !to) return

    if (routingRef.current) {
      map.removeControl(routingRef.current)
    }

    const routing = (L as any).Routing.control({
      waypoints: [
        L.latLng(from.lat, from.lng),
        L.latLng(to.lat, to.lng)
      ],
      lineOptions: {
        styles: [{ color: "#2563eb", weight: 6 }]
      },
      addWaypoints: false,
      draggableWaypoints: false,
      createMarker: () => null
    }).addTo(map)

    routingRef.current = routing
  }, [from, to])

  return null
}

/* 🔥 SMOOTH MOVEMENT */
function useSmoothLocation(targetLocation: any) {
  const [smoothLocation, setSmoothLocation] = useState<any>(targetLocation)

  useEffect(() => {
    if (!targetLocation) return
    setSmoothLocation(targetLocation)
  }, [targetLocation])

  return smoothLocation
}

export default function TrackOrder() {

  const { orderId } = useParams()

  const [rawLocation, setRawLocation] = useState<any>(null)
  const smoothLocation = useSmoothLocation(rawLocation)

  const [eta, setEta] = useState<number | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [status, setStatus] = useState<string>("pending")

  const customerLocation = { lat: 28.5355, lng: 77.3910 }

  const statusSteps = [
    "pending",
    "accepted",
    "preparing",
    "out_for_delivery",
    "delivered"
  ]

  const statusLabels: any = {
    pending: "Placed",
    accepted: "Accepted",
    preparing: "Preparing",
    out_for_delivery: "On the way",
    delivered: "Delivered"
  }

  const shareLink = `${window.location.origin}/track/${orderId}`

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    toast.success("🔗 Tracking link copied!")
  }

  useEffect(() => {

    if (!orderId) return

    socket.emit("joinOrderRoom", orderId)

    /* 📍 LOCATION */
    socket.on("deliveryLocationUpdate", (data: any) => {
      if (data.orderId !== orderId) return

      const loc = data.location
      setRawLocation(loc)

      const dist = getDistance(
        { latitude: loc.lat, longitude: loc.lng },
        { latitude: customerLocation.lat, longitude: customerLocation.lng }
      )

      const km = dist / 1000
      setDistanceKm(Number(km.toFixed(2)))

      const speed = 25
      const minutes = Math.ceil((km / speed) * 60)

      setEta(minutes)
    })

    /* 📦 STATUS */
    socket.on("orderStatusUpdated", (data: any) => {
      if (data.orderId === orderId) {
        setStatus(data.status)

        if (data.status === "out_for_delivery") {
          toast.info("🚚 Rider is on the way!")
        }

        if (data.status === "delivered") {
          toast.success("🎉 Order Delivered!")
          confetti()
        }
      }
    })

    return () => {
      socket.off("deliveryLocationUpdate")
      socket.off("orderStatusUpdated")
    }

  }, [orderId])

  return (
    <div style={{ height: "100vh" }}>

      {/* 🗺️ MAP */}
      <MapContainer
        center={[customerLocation.lat, customerLocation.lng]}
        zoom={15}
        style={{ height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {smoothLocation && (
          <>
            <Marker
              position={[smoothLocation.lat, smoothLocation.lng]}
              icon={driverIcon}
            />

            <Routing from={smoothLocation} to={customerLocation} />

            <AutoFollow location={smoothLocation} />
          </>
        )}

        <Marker position={[customerLocation.lat, customerLocation.lng]} />
      </MapContainer>

      {/* 📊 INFO CARD */}
      <div style={{
        position: "absolute",
        top: 20,
        left: 20,
        background: "white",
        padding: "12px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
      }}>
        {distanceKm && <p>📏 {distanceKm} km</p>}
        {eta && <p>⏱️ {eta} mins</p>}
      </div>

      {/* 📦 TIMELINE */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20,
        background: "white",
        padding: "16px",
        borderRadius: "14px"
      }}>
        <h4>📦 Order Progress</h4>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {statusSteps.map((step, index) => {
            const active = statusSteps.indexOf(status) >= index

            return (
              <div key={step} style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  margin: "0 auto",
                  background: active ? "#22c55e" : "#ccc"
                }} />
                <small>{statusLabels[step]}</small>
              </div>
            )
          })}
        </div>
      </div>

      {/* 🔗 SHARE */}
      <button
        onClick={copyLink}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "#000",
          color: "white",
          padding: "10px 14px",
          borderRadius: "8px"
        }}
      >
        🔗 Share
      </button>

    </div>
  )
}