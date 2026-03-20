import { useCart } from "../context/CartContext"
import { useNavigate } from "react-router-dom"
import type { CartItem } from "../types/cart"

export default function Cart(){

const { cart, removeFromCart } = useCart()

const navigate = useNavigate()

const total = cart.reduce(
(sum: number, item: CartItem) => sum + item.price * item.quantity,
0
)

return(

<div className="p-10 bg-gray-100 min-h-screen">

<h1 className="text-3xl font-bold mb-6">
Your Cart
</h1>

{cart.length === 0 && (

<p>No items in cart</p>

)}

{cart.map((item: CartItem)=>(

<div
key={item._id}
className="flex justify-between bg-white p-4 rounded mb-3"
>

<p>
{item.name} x {item.quantity}
</p>

<div className="flex gap-4">

<p>
₹{item.price * item.quantity}
</p>

<button
onClick={()=>removeFromCart(item._id)}
className="text-red-500"
>
Remove
</button>

</div>

</div>

))}

<h2 className="mt-6 text-xl font-bold">
Total ₹{total}
</h2>

<button
onClick={()=>navigate("/checkout")}
className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
>
Checkout
</button>

</div>

)

}