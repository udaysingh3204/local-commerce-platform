import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet"

type Driver = {
  _id: string
  name?: string
  email?: string
  isAvailable?: boolean
  location?: { coordinates?: number[] }
}

type Order = {
  _id: string
  status: string
  totalAmount: number
  createdAt: string
  deliveryLocation?: { lat?: number; lng?: number }
  deliveryPartnerId?: string
  estimatedDeliveryTime?: number
  items?: Array<{ quantity?: number }>
  storeLocation?: { coordinates?: number[] }
}

type LiveLocation = {
  lat: number
  lng: number
  updatedAt: number
}

type Recommendation = {
  orderId: string
  candidates?: Array<{
    driverId: string
    driverName?: string
    distanceKm?: number
    eta?: number
    source?: string
    routePath?: [number, number][]
  }>
}

type Props = {
  activeOrders: Order[]
  drivers: Driver[]
  focusOrderId: string | null
  liveOrderLocations: Record<string, LiveLocation>
  orders: Order[]
  recommendations: Recommendation[]
  visibleDriverMode: "all" | "available" | "unavailable"
}

const toLatLng = (coordinates?: number[]) => {
  if (!coordinates || coordinates.length !== 2) return null

  const [lng, lat] = coordinates
  if (typeof lat !== "number" || typeof lng !== "number") return null
  if (lat === 0 && lng === 0) return null

  return { lat, lng }
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  map.setView(center, map.getZoom(), { animate: true })
  return null
}

export default function DispatchMap({ activeOrders, drivers, focusOrderId, liveOrderLocations, orders, recommendations, visibleDriverMode }: Props) {
  const validDrivers = drivers
    .filter((driver) => {
      if (visibleDriverMode === "available") return Boolean(driver.isAvailable)
      if (visibleDriverMode === "unavailable") return !driver.isAvailable
      return true
    })
    .map((driver) => ({
      ...driver,
      latLng: toLatLng(driver.location?.coordinates),
    }))
    .filter((driver) => driver.latLng)

  const mappedOrders = orders
    .map((order) => ({
      ...order,
      latLng: toLatLng(order.storeLocation?.coordinates),
      recommendation: recommendations.find((entry) => entry.orderId === order._id),
    }))
    .filter((order) => order.latLng)

  const mappedActiveOrders = activeOrders
    .map((order) => {
      const assignedDriver = validDrivers.find((driver) => driver._id === order.deliveryPartnerId)
      const persistedLocation =
        typeof order.deliveryLocation?.lat === "number" && typeof order.deliveryLocation?.lng === "number"
          ? { lat: order.deliveryLocation.lat, lng: order.deliveryLocation.lng }
          : null
      const liveLocation = liveOrderLocations[order._id] ?? (persistedLocation ? { ...persistedLocation, updatedAt: Date.now() } : null)

      return {
        ...order,
        assignedDriver,
        courierLatLng: liveLocation ?? assignedDriver?.latLng ?? null,
        latLng: toLatLng(order.storeLocation?.coordinates),
      }
    })
    .filter((order) => order.latLng)

  const focusedActiveOrder = mappedActiveOrders.find((order) => order._id === focusOrderId) || null
  const focusedDispatchOrder = mappedOrders.find((order) => order._id === focusOrderId) || null
  const center: [number, number] = focusedActiveOrder?.courierLatLng
    ? [focusedActiveOrder.courierLatLng.lat, focusedActiveOrder.courierLatLng.lng]
    : focusedActiveOrder
      ? [focusedActiveOrder.latLng!.lat, focusedActiveOrder.latLng!.lng]
      : focusedDispatchOrder
        ? [focusedDispatchOrder.latLng!.lat, focusedDispatchOrder.latLng!.lng]
    : validDrivers[0]
      ? [validDrivers[0].latLng!.lat, validDrivers[0].latLng!.lng]
      : [28.5355, 77.391]

  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-[#0d1120] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">Spatial Dispatch</p>
          <h2 className="mt-1 text-lg font-black text-white">Live driver and order map</h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />Orders</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Active Trips</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Available Drivers</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Offline/Busy</span>
        </div>
      </div>

      <div className="h-105 w-full bg-[#09111c]">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
          <RecenterMap center={center} />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mappedActiveOrders.map((order) => {
            const isFocused = order._id === focusedActiveOrder?._id
            const courierLatLng = order.courierLatLng

            return (
              <>
                <CircleMarker
                  key={`active-store-${order._id}`}
                  center={[order.latLng!.lat, order.latLng!.lng]}
                  radius={isFocused ? 10 : 8}
                  pathOptions={{
                    color: isFocused ? "#f59e0b" : "#fb923c",
                    fillColor: isFocused ? "#f59e0b" : "#f97316",
                    fillOpacity: 0.75,
                    weight: isFocused ? 3 : 2,
                  }}
                >
                  <Popup>
                    <div>
                      <p style={{ fontWeight: 800, marginBottom: 4 }}>Active delivery #{order._id.slice(-8).toUpperCase()}</p>
                      <p>Status: {order.status.replaceAll("_", " ")}</p>
                      <p>Amount: ₹{order.totalAmount}</p>
                      <p>ETA: {order.estimatedDeliveryTime ? `${order.estimatedDeliveryTime} min` : "Tracking"}</p>
                    </div>
                  </Popup>
                </CircleMarker>
                {courierLatLng && (
                  <>
                    <CircleMarker
                      key={`active-courier-${order._id}`}
                      center={[courierLatLng.lat, courierLatLng.lng]}
                      radius={isFocused ? 9 : 7}
                      pathOptions={{
                        color: isFocused ? "#22c55e" : "#34d399",
                        fillColor: isFocused ? "#22c55e" : "#10b981",
                        fillOpacity: 0.9,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div>
                          <p style={{ fontWeight: 800, marginBottom: 4 }}>{order.assignedDriver?.name || "Assigned driver"}</p>
                          <p>{order.assignedDriver?.email || "Driver account"}</p>
                          <p>Live courier beacon for order #{order._id.slice(-8).toUpperCase()}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                    <Polyline
                      key={`active-line-${order._id}`}
                      positions={[
                        [order.latLng!.lat, order.latLng!.lng],
                        [courierLatLng.lat, courierLatLng.lng],
                      ]}
                      pathOptions={{ color: isFocused ? "#f59e0b" : "#fb923c", weight: isFocused ? 4 : 3, opacity: 0.7 }}
                    />
                  </>
                )}
              </>
            )
          })}

          {mappedOrders.map((order) => {
            const isFocused = order._id === focusedDispatchOrder?._id
            const topCandidate = order.recommendation?.candidates?.[0]
            const linkedDriver = topCandidate
              ? validDrivers.find((driver) => driver._id === topCandidate.driverId)
              : null

            return (
              <CircleMarker
                key={order._id}
                center={[order.latLng!.lat, order.latLng!.lng]}
                radius={isFocused ? 11 : 8}
                pathOptions={{
                  color: isFocused ? "#f59e0b" : "#22d3ee",
                  fillColor: isFocused ? "#f59e0b" : "#06b6d4",
                  fillOpacity: 0.7,
                  weight: isFocused ? 3 : 2,
                }}
              >
                <Popup>
                  <div>
                    <p style={{ fontWeight: 800, marginBottom: 4 }}>Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p>Status: {order.status.replaceAll("_", " ")}</p>
                    <p>Amount: ₹{order.totalAmount}</p>
                    {topCandidate && <p>Best ETA: {topCandidate.eta} min</p>}
                    {topCandidate?.source && <p>ETA Source: {topCandidate.source === "road" ? "Road routing" : "Local estimate"}</p>}
                  </div>
                </Popup>
                {linkedDriver?.latLng && (
                  <Polyline
                    positions={topCandidate?.routePath?.length ? topCandidate.routePath : [
                      [order.latLng!.lat, order.latLng!.lng],
                      [linkedDriver.latLng.lat, linkedDriver.latLng.lng],
                    ]}
                    pathOptions={{ color: isFocused ? "#f59e0b" : "#38bdf8", weight: isFocused ? 3 : 2, dashArray: "6 8", opacity: 0.7 }}
                  />
                )}
              </CircleMarker>
            )
          })}

          {validDrivers.map((driver) => (
            <CircleMarker
              key={driver._id}
              center={[driver.latLng!.lat, driver.latLng!.lng]}
              radius={7}
              pathOptions={{
                color: driver.isAvailable ? "#34d399" : "#64748b",
                fillColor: driver.isAvailable ? "#10b981" : "#475569",
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div>
                  <p style={{ fontWeight: 800, marginBottom: 4 }}>{driver.name || "Driver"}</p>
                  <p>{driver.email || "Driver account"}</p>
                  <p>Status: {driver.isAvailable ? "Available" : "Offline / Busy"}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}