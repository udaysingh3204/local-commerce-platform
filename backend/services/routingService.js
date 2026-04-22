const OPENROUTESERVICE_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"

const hasRoutingKey = () => Boolean(process.env.OPENROUTESERVICE_API_KEY)

exports.hasRoutingKey = hasRoutingKey

exports.getRouteMetrics = async ({ from, to }) => {
  if (!hasRoutingKey()) {
    return null
  }

  if (
    !from ||
    !to ||
    typeof from.lat !== "number" ||
    typeof from.lng !== "number" ||
    typeof to.lat !== "number" ||
    typeof to.lng !== "number"
  ) {
    return null
  }

  const response = await fetch(OPENROUTESERVICE_URL, {
    method: "POST",
    headers: {
      Authorization: process.env.OPENROUTESERVICE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Routing request failed: ${response.status} ${message}`)
  }

  const payload = await response.json()
  const feature = payload?.features?.[0]
  const summary = feature?.properties?.summary
  const geometry = feature?.geometry?.coordinates

  if (!summary) {
    return null
  }

  return {
    distanceKm: Number((summary.distance / 1000).toFixed(2)),
    eta: Math.round(summary.duration / 60),
    routePath: Array.isArray(geometry)
      ? geometry
          .filter((point) => Array.isArray(point) && point.length === 2)
          .map(([lng, lat]) => [lat, lng])
      : [],
    source: "road",
  }
}