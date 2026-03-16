import { useEffect, useState } from "react"
import API from "../api/api"
import {
PieChart,
Pie,
Cell,
Tooltip,
BarChart,
Bar,
XAxis,
YAxis,
CartesianGrid,
ResponsiveContainer
} from "recharts"

export default function Analytics(){

const storeId="69a9e3da81a8685ca09a5b17"

const [data,setData]=useState<any>(null)

useEffect(()=>{

API.get(`/analytics/store/${storeId}`)
.then(res=>setData(res.data))

},[])

if(!data) return <p className="p-10">Loading analytics...</p>


/* ORDER STATUS CHART */

const orderStatusData=[

{ name:"Delivered", value:data.deliveredOrders || 0 },

{ name:"Preparing", value:data.preparingOrders || 0 },

{ name:"Pending", value:data.pendingOrders || 0 }

]

const COLORS=["#10B981","#F59E0B","#EF4444"]


/* DAILY SALES CHART */

const dailySales=data.dailySales || []

/* PRODUCT DEMAND CHART */

const productDemand=data.productDemand || []


return(

<div className="p-10 bg-gray-100 min-h-screen">

<h1 className="text-3xl font-bold mb-8">
Store Analytics
</h1>


{/* KPI CARDS */}

<div className="grid grid-cols-4 gap-6 mb-10">

<div className="bg-white p-6 rounded-xl shadow">

<p className="text-gray-500">Revenue</p>

<h2 className="text-2xl font-bold">
₹{data.revenue}
</h2>

</div>

<div className="bg-white p-6 rounded-xl shadow">

<p className="text-gray-500">Total Orders</p>

<h2 className="text-2xl font-bold">
{data.totalOrders}
</h2>

</div>

<div className="bg-white p-6 rounded-xl shadow">

<p className="text-gray-500">Delivered Orders</p>

<h2 className="text-2xl font-bold text-green-600">
{data.deliveredOrders}
</h2>

</div>

<div className="bg-white p-6 rounded-xl shadow">

<p className="text-gray-500">Preparing Orders</p>

<h2 className="text-2xl font-bold text-yellow-600">
{data.preparingOrders}
</h2>

</div>

</div>


{/* ORDER STATUS PIE CHART */}

<div className="bg-white p-6 rounded-xl shadow mb-10">

<h2 className="font-bold mb-4">
Order Status Distribution
</h2>

<PieChart width={400} height={300}>

<Pie data={orderStatusData} dataKey="value">

{orderStatusData.map((entry,index)=>(

<Cell key={index} fill={COLORS[index]} />

))}

</Pie>

<Tooltip />

</PieChart>

</div>


{/* DAILY SALES CHART */}

<div className="bg-white p-6 rounded-xl shadow mb-10">

<h2 className="font-bold mb-4">
Daily Revenue
</h2>

<ResponsiveContainer width="100%" height={300}>

<BarChart data={dailySales}>

<CartesianGrid strokeDasharray="3 3" />

<XAxis dataKey="date" />

<YAxis />

<Tooltip />

<Bar dataKey="revenue" fill="#3B82F6" />

</BarChart>

</ResponsiveContainer>

</div>


{/* PRODUCT DEMAND */}

<div className="bg-white p-6 rounded-xl shadow">

<h2 className="font-bold mb-4">
Top Selling Products
</h2>

<ResponsiveContainer width="100%" height={300}>

<BarChart data={productDemand}>

<CartesianGrid strokeDasharray="3 3" />

<XAxis dataKey="name" />

<YAxis />

<Tooltip />

<Bar dataKey="sales" fill="#10B981" />

</BarChart>

</ResponsiveContainer>

</div>

</div>

)

}