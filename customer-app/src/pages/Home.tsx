import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"

interface Store {
  _id: string
  storeName: string
  category: string
}

export default function Home() {
  const navigate = useNavigate()

  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const lat = 28.5355
        const lng = 77.3910

        const res = await API.get(`/stores/nearby?lat=${lat}&lng=${lng}`)

        setStores(res.data)
      } catch (err) {
        console.error(err)
        setError("Failed to load stores")
      } finally {
        setLoading(false)
      }
    }

    fetchStores()
  }, [])

  // 🔄 LOADING STATE
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        ⏳ Loading stores...
      </div>
    )
  }

  // ❌ ERROR STATE
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 text-xl">
        {error}
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Nearby Stores 🛍️</h1>

        <button
          onClick={() => navigate("/cart")}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow"
        >
          🛒 Cart
        </button>
      </div>

      {/* EMPTY STATE */}
      {stores.length === 0 ? (
        <div className="text-center text-gray-500 text-lg mt-20">
          🚫 No stores found nearby
        </div>
      ) : (
        /* STORE GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {stores.map((store) => (
            <div
              key={store._id}
              onClick={() => navigate(`/store/${store._id}`)}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer p-5"
            >
              {/* IMAGE */}
              <div className="h-32 bg-gray-200 rounded-lg mb-4 flex items-center justify-center text-gray-500">
                🏪 Store Image
              </div>

              {/* NAME */}
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
      )}
    </div>
  )
}