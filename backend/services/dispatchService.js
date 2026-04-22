const Driver = require("../models/Driver")
const Order = require("../models/Order")
const { getRouteMetrics, hasRoutingKey } = require("./routingService")

function getDispatchRadiusMeters(){

const configured = Number(process.env.DISPATCH_MAX_DISTANCE_METERS)

if(Number.isFinite(configured) && configured > 0){
return configured
}

return 10000

}

/* DISTANCE CALCULATION (Haversine) */

function calculateDistance(lat1, lon1, lat2, lon2){

const R = 6371

const dLat = (lat2-lat1) * Math.PI/180
const dLon = (lon2-lon1) * Math.PI/180

const a =
Math.sin(dLat/2) * Math.sin(dLat/2) +
Math.cos(lat1 * Math.PI/180) *
Math.cos(lat2 * Math.PI/180) *
Math.sin(dLon/2) * Math.sin(dLon/2)

const c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a))

return R*c

}


/* ESTIMATE DELIVERY ETA */

function estimateETA(distance){

const avgSpeed = 25 // km/h (urban delivery speed)

const time = (distance/avgSpeed)*60

return Math.round(time)

}

async function getRankedDriversForOrder(order, options = {}){

const { maxDistance = getDispatchRadiusMeters(), limit = 3 } = options

const storeLocation = order.storeLocation

if(!storeLocation || !storeLocation.coordinates || storeLocation.coordinates.length !== 2){
return []
}

const [storeLng,storeLat] = storeLocation.coordinates

const partners = await Driver.find({
isAvailable:true,
location:{
$near:{
$geometry:storeLocation,
$maxDistance:maxDistance
}
}
})

if(partners.length === 0){
return []
}

const rankedDrivers = []

for(const driver of partners){

if(!driver.location || !driver.location.coordinates || driver.location.coordinates.length !== 2){
continue
}

const [lng,lat] = driver.location.coordinates

const distance = calculateDistance(
storeLat,
storeLng,
lat,
lng
)

const activeOrders = await Order.countDocuments({
deliveryPartnerId:driver._id,
status:{ $nin:["delivered", "cancelled"] }
})

const score = distance + (activeOrders*2)

rankedDrivers.push({
driver,
distanceKm:Number(distance.toFixed(2)),
activeOrders,
score:Number(score.toFixed(2)),
eta:estimateETA(distance),
routePath:[],
source:"local"
})

}

const rankedSubset = rankedDrivers
.sort((left,right)=>left.score-right.score)
.slice(0,limit)

if(!hasRoutingKey()){
return rankedSubset
}

await Promise.all(rankedSubset.map(async(entry)=>{
try{
const driverCoordinates = entry.driver.location?.coordinates

if(!driverCoordinates || driverCoordinates.length !== 2){
return
}

const [driverLng,driverLat] = driverCoordinates

const routeMetrics = await getRouteMetrics({
from:{ lat:driverLat, lng:driverLng },
to:{ lat:storeLat, lng:storeLng }
})

if(routeMetrics){
entry.distanceKm = routeMetrics.distanceKm
entry.eta = routeMetrics.eta
entry.routePath = routeMetrics.routePath
entry.source = routeMetrics.source
}
}catch(err){
console.log("Routing fallback", err.message)
}
}))

return rankedSubset

}


/* SMART DRIVER ASSIGNMENT */

exports.assignNearestDriver = async(order)=>{

try{

const rankedDrivers = await getRankedDriversForOrder(order, { limit: 1 })

if(rankedDrivers.length === 0){
return null
}

const bestMatch = rankedDrivers[0]

return {
driver:bestMatch.driver,
eta:bestMatch.eta,
distanceKm:bestMatch.distanceKm,
activeOrders:bestMatch.activeOrders,
score:bestMatch.score
}

}catch(err){

console.log("Dispatch error",err)

return null

}

}

exports.getRankedDriversForOrder = getRankedDriversForOrder