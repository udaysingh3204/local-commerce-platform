import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { useCart } from "../context/CartContext"

export default function StorePage() {

  const { storeId } = useParams()
  const navigate = useNavigate()

  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const { addToCart, cart } = useCart()

  const fetchProducts = async () => {
    try {
      const res = await API.get(`/products/store/${storeId}`)
      setProducts(res.data)
    } catch (err) {
      console.error("Error fetching products:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [storeId])

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🛍 Store Products</h1>

        <button
          onClick={() => navigate("/cart")}
          className="bg-black text-white px-5 py-2 rounded-lg"
        >
          🛒 Cart ({cart.length})
        </button>
      </div>

      {/* LOADING */}
      {loading && <p className="text-center">Loading...</p>}

      {/* EMPTY */}
      {!loading && products.length === 0 && (
        <p className="text-center text-gray-500">
          No products available
        </p>
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

        {products.map((product) => (

          <div
            key={product._id}
            className="bg-white rounded-xl shadow hover:shadow-lg transition p-4"
          >
            <img
              src={product.image || "https://via.placeholder.com/150"}
              className="w-full h-40 object-cover rounded mb-3"
            />

            <h2 className="font-semibold text-lg">
              {product.name}
            </h2>

            <p className="text-gray-600 mb-3">
              ₹{product.price}
            </p>

            <button
              onClick={() => addToCart(product)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            >
              Add to Cart
            </button>

          </div>

        ))}
      </div>

    </div>
  )
}