const Driver = require("../models/Driver")
const Order = require("../models/Order")

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


/* SMART DRIVER ASSIGNMENT */

exports.assignNearestDriver = async(order)=>{

try{

const storeLocation = order.storeLocation

if(!storeLocation || !storeLocation.coordinates || storeLocation.coordinates.length !== 2){
return null
}

const [storeLng,storeLat] = storeLocation.coordinates

/* FIND AVAILABLE DELIVERY PARTNERS */

const partners = await Driver.find({
isAvailable:true,
location:{
$near:{
$geometry:storeLocation,
$maxDistance:5000
}
}
})

if(partners.length === 0){
return null
}

/* LOAD BALANCING */

let bestDriver = null
let bestScore = Infinity

for(const driver of partners){

const [lng,lat] = driver.location.coordinates

const distance = calculateDistance(
storeLat,
storeLng,
lat,
lng
)

/* CHECK DRIVER ACTIVE ORDERS */

const activeOrders = await Order.countDocuments({
deliveryPartnerId:driver._id,
status:{ $nin:["delivered", "cancelled"] }
})

/* DRIVER SCORE */

const score = distance + (activeOrders*2)

if(score < bestScore){

bestScore = score
bestDriver = driver

}

}

if(!bestDriver){
return null
}

/* ETA CALCULATION */

const [driverLng,driverLat] = bestDriver.location.coordinates

const distance = calculateDistance(
storeLat,
storeLng,
driverLat,
driverLng
)

const eta = estimateETA(distance)

return {
driver:bestDriver,
eta
}

}catch(err){

console.log("Dispatch error",err)

return null

}

}