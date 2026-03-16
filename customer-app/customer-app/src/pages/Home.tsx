import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"

export default function Home(){

const navigate = useNavigate()

const [stores,setStores] = useState<any[]>([])

useEffect(()=>{

navigator.geolocation.getCurrentPosition(async(pos)=>{

const lat = pos.coords.latitude
const lng = pos.coords.longitude

const res = await API.get(`/stores/nearby?lat=${lat}&lng=${lng}`)

setStores(res.data)

})

},[])

return(

<div className="p-10">

<h1 className="text-3xl font-bold mb-6">
Nearby Stores
</h1>

<div className="grid grid-cols-3 gap-6">

{stores.map((store:any)=>(

<div
key={store._id}
className="bg-white p-6 rounded-xl shadow cursor-pointer"
onClick={()=>navigate(`/store/${store._id}`)}
>

<h2 className="font-bold text-lg">
{store.storeName}
</h2>

<p className="text-gray-500">
{store.category}
</p>

</div>

))}

</div>

</div>

)

}