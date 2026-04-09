import { useEffect, useState } from "react"
import API from "../api/api"

export default function Stores() {
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get("/stores")
      .then(res => setStores(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-10 text-gray-500">Loading stores...</div>

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">All Stores</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-gray-500 text-sm">Total Stores</p>
          <h2 className="text-2xl font-bold">{stores.length}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-gray-500 text-sm">Categories</p>
          <h2 className="text-2xl font-bold">{new Set(stores.map(s => s.category)).size}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-gray-500 text-sm">With Location</p>
          <h2 className="text-2xl font-bold">{stores.filter(s => s.location?.coordinates).length}</h2>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="text-left p-3">Store Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Delivery Radius</th>
              <th className="text-left p-3">Address</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => (
              <tr key={store._id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{store.storeName}</td>
                <td className="p-3">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    {store.category}
                  </span>
                </td>
                <td className="p-3">{store.deliveryRadius || 5} km</td>
                <td className="p-3 text-gray-500 text-xs">{store.address || "—"}</td>
                <td className="p-3 text-gray-500">{new Date(store.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {stores.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">No stores found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
