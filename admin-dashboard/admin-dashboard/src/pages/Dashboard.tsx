import { useEffect, useState } from "react"
import API from "../api/api"

export default function Dashboard() {

  const [stats,setStats] = useState<any>({})

  const fetchStats = async () => {

    const res = await API.get("/analytics/dashboard")

    setStats(res.data)

  }

  useEffect(()=>{

    fetchStats()

  },[])

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Platform Overview
      </h1>

      <div className="grid grid-cols-4 gap-6">

        <div className="bg-white p-6 shadow rounded">
          Users: {stats.users}
        </div>

        <div className="bg-white p-6 shadow rounded">
          Stores: {stats.stores}
        </div>

        <div className="bg-white p-6 shadow rounded">
          Orders: {stats.orders}
        </div>

        <div className="bg-white p-6 shadow rounded">
          Revenue: ₹{stats.revenue}
        </div>

      </div>

    </div>

  )

}