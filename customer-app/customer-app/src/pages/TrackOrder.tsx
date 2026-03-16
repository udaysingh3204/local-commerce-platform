import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-routing-machine"
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"

const socket = io("http://localhost:5000")

function Routing({ location }: any) {

  const map = useMap()

  useEffect(() => {

    if (!location) return

    const routing = L.Routing.control({
      waypoints: [
        L.latLng(28.5355, 77.3910), // store
        L.latLng(location.lat, location.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false
    }).addTo(map)

    return () => map.removeControl(routing)

  }, [location])

  return null
}

export default function TrackOrder() {

  const [location, setLocation] = useState<any>(null)

  useEffect(() => {

    socket.on("deliveryLocationUpdate", (data) => {

      setLocation({
        lat: data.lat,
        lng: data.lng,
        eta: data.eta
      })

    })

    return () => {
      socket.off("deliveryLocationUpdate")
    }

  }, [])

  return (

    <div style={{ height: "100vh" }}>

      <h2 style={{ padding: "10px" }}>
        Live Delivery Tracking
      </h2>

      <MapContainer
        center={[28.5355, 77.3910]}
        zoom={15}
        style={{ height: "90vh" }}
      >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {location && (

          <>
            <Marker position={[location.lat, location.lng]}>
              <Popup>
                Delivery Partner Location
              </Popup>
            </Marker>

            <Routing location={location} />
          </>

        )}

      </MapContainer>

      {location && (

        <div
          style={{
            position: "absolute",
            top: 80,
            left: 20,
            background: "white",
            padding: "12px",
            borderRadius: "10px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.2)"
          }}
        >

          🚚 ETA: {location.eta} minutes

        </div>

      )}

    </div>

  )
}