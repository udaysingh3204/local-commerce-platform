const { getDistance } = require("geolib")

exports.calculateETA = (storeLocation, deliveryLocation) => {

const distance = getDistance(
  { latitude: storeLocation.lat, longitude: storeLocation.lng },
  { latitude: deliveryLocation.lat, longitude: deliveryLocation.lng }
)

const distanceKm = distance / 1000

const avgSpeed = 25

const etaMinutes = (distanceKm / avgSpeed) * 60

return Math.round(etaMinutes)

}