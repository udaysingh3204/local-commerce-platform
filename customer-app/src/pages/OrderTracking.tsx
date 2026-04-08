import { MapContainer, TileLayer, Marker } from "react-leaflet"
import { useEffect, useState } from "react"
import { io } from "socket.io-client"

const socket = io("http://localhost:5000")

export default function OrderTracking(){

const [position,setPosition] = useState<[number,number]>([28.6139,77.2090])

useEffect(()=>{

socket.on("deliveryLocationUpdate",(data)=>{

console.log("Location update received",data)

setPosition([data.lat,data.lng])

})

},[])

return(

<div style={{height:"100vh"}}>

<MapContainer center={position} zoom={15} style={{height:"100%"}}>

<TileLayer
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

<Marker position={position}></Marker>

</MapContainer>

</div>

)

}