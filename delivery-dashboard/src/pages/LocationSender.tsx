import { useEffect } from "react"
import { io } from "socket.io-client"

const socket = io("http://localhost:5000")

export default function LocationSender(){

const partnerId="69a9ec0110383934be5af02a"

const orderId="ORDER_ID"

useEffect(()=>{

navigator.geolocation.watchPosition((pos)=>{

socket.emit("deliveryLocationUpdate",{

partnerId,
orderId,
lat:pos.coords.latitude,
lng:pos.coords.longitude

})

})

},[])

return(

<div className="p-10">

<h1>Sending Live Location...</h1>

</div>

)

}