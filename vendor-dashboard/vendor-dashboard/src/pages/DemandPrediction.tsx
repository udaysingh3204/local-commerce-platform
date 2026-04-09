import { useEffect, useState } from "react"
import API from "../api/api"
import { useVendor } from "../context/VendorContext"

export default function DemandPrediction(){

const { store } = useVendor()
const storeId = store?._id || ""

const [data,setData]=useState<any[]>([])

useEffect(()=>{

API.get(`/predictions/${storeId}`)
.then(res=>setData(res.data.predictions))

},[])

return(

<div className="p-10">

<h1 className="text-3xl font-bold mb-8">
Demand Prediction
</h1>

<table className="w-full bg-white rounded-xl shadow">

<thead>

<tr className="border-b">

<th className="p-4 text-left">Product ID</th>

<th className="p-4 text-left">Predicted Demand</th>

</tr>

</thead>

<tbody>

{data.map((item:any)=>(
<tr key={item[0]} className="border-b">

<td className="p-4">{item[0]}</td>

<td className="p-4">{item[1]}</td>

</tr>
))}

</tbody>

</table>

</div>

)

}