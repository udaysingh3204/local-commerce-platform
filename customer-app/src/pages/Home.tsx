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

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const lat = 28.5355
        const lng = 77.3910

        const res = await API.get(`/stores/nearby?lat=${lat}&lng=${lng}`)
        setStores(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStores()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        ⏳ Loading stores...
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Nearby Stores 🛍️
        </h1>

        <button
          onClick={() => navigate("/cart")}
          className="bg-black text-white px-4 py-2 rounded-lg hover:scale-105 transition"
        >
          🛒 Cart
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {stores.map(store => (

          <div
            key={store._id}
            onClick={() => navigate(`/store/${store._id}`)}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition p-4 cursor-pointer"
          >

            {/* IMAGE */}
            <img
              src="https://images.unsplash.com/photo-1606787366850-de6330128bfc"
              className="w-full h-36 object-cover rounded-lg mb-3"
            />

            {/* NAME */}
            <h2 className="text-lg font-semibold">
              {store.storeName}
            </h2>

            {/* CATEGORY */}
            <p className="text-gray-500 text-sm">
              {store.category}
            </p>

            {/* EXTRA INFO */}
            <div className="flex justify-between text-sm mt-2">

              <span className="text-green-600">
                ⭐ 4.3
              </span>

              <span className="text-gray-500">
                ⏱ 20-30 min
              </span>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}