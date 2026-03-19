import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"

export default function Home(){

  const navigate = useNavigate()
  const [stores,setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{

    const fetchStores = async () => {
      try {
        // 🔥 fallback location (IMPORTANT)
        const lat = 28.5355
        const lng = 77.3910

        const res = await API.get(`/stores/nearby?lat=${lat}&lng=${lng}`)

        console.log("Stores:", res.data)

        setStores(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStores()

  },[])

  return(

<div className="p-8 bg-gray-100 min-h-screen">

  {/* HEADER */}
  <div className="flex justify-between items-center mb-8">

    <h1 className="text-4xl font-bold">
      Nearby Stores 🛍️
    </h1>

    <button
      onClick={()=>navigate("/cart")}
      className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow"
    >
      🛒 Cart
    </button>

  </div>

  {/* STORE GRID */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

    {stores.map((store:any)=>(

      <div
        key={store._id}
        onClick={()=>navigate(`/store/${store._id}`)}
        className="bg-white rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer p-5"
      >

        {/* IMAGE PLACEHOLDER */}
        <div className="h-32 bg-gray-200 rounded-lg mb-4 flex items-center justify-center text-gray-500">
          🏪 Store Image
        </div>

        {/* STORE NAME */}
        <h2 className="text-xl font-semibold">
          {store.storeName}
        </h2>

        {/* CATEGORY */}
        <p className="text-gray-500">
          {store.category}
        </p>

        {/* EXTRA */}
        <p className="text-sm text-green-600 mt-2">
          🚀 Fast Delivery
        </p>

      </div>

    ))}

  </div>

</div>

)
}