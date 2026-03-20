import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { useCart } from "../context/CartContext"

export default function StorePage(){

  const { storeId } = useParams()
  const navigate = useNavigate()

  const [products,setProducts] = useState<any[]>([])
  const [loading,setLoading] = useState(true)

  const { addToCart, cart } = useCart()

  const fetchProducts = async()=>{
    try{
      const res = await API.get(`/products/store/${storeId}`)
      setProducts(res.data)
    }catch(err){
      console.error(err)
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    fetchProducts()
  },[storeId])

  return(

    <div className="p-8 bg-gray-100 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">

        <h1 className="text-3xl font-bold">
          🏪 Store Products
        </h1>

        <button
          onClick={()=>navigate("/cart")}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
        >
          🛒 Cart ({cart.length})
        </button>

      </div>

      {/* LOADING */}
      {loading && <p>Loading products...</p>}

      {/* EMPTY */}
      {!loading && products.length === 0 && (
        <p>No products available</p>
      )}

      {/* PRODUCT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

        {products.map(product=>(

          <div
            key={product._id}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5"
          >

            {/* IMAGE */}
            <img
              src={product.image || "https://via.placeholder.com/150"}
              className="w-full h-40 object-cover rounded-lg mb-4"
            />

            {/* NAME */}
            <h2 className="text-lg font-semibold">
              {product.name}
            </h2>

            {/* PRICE */}
            <p className="text-gray-600 mb-3">
              ₹{product.price}
            </p>

            {/* BUTTON */}
            <button
              onClick={()=>addToCart(product)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            >
              ➕ Add to Cart
            </button>

          </div>

        ))}

      </div>

    </div>

  )
}