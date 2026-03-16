import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { useCart } from "../context/CartContext"

export default function StorePage(){

const { storeId } = useParams()

const navigate = useNavigate()

const [products,setProducts] = useState<any[]>([])

const { addToCart } = useCart()

const fetchProducts = async()=>{

const res = await API.get(`/products/store/${storeId}`)

setProducts(res.data)

}

useEffect(()=>{

fetchProducts()

},[])

return(

<div className="p-10 bg-gray-100 min-h-screen">

<div className="flex justify-between items-center mb-6">

<h1 className="text-3xl font-bold">
Store Products
</h1>

<button
onClick={()=>navigate("/cart")}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Go To Cart
</button>

</div>

<div className="grid grid-cols-3 gap-6">

{products.map(product=>(

<div
key={product._id}
className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition"
>

<img
src={product.image}
className="w-full h-40 object-cover rounded mb-3"
/>

<h2 className="font-bold text-lg">
{product.name}
</h2>

<p className="text-gray-500 mb-3">
₹{product.price}
</p>

<button
onClick={()=>addToCart(product)}
className="bg-blue-600 text-white px-4 py-2 rounded"
>

Add To Cart

</button>

</div>

))}

</div>

</div>

)

}