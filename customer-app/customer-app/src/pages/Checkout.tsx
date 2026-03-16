import API from "../api/api"

export default function Checkout({cart}:any){

const placeOrder = async()=>{

const order = {

customerId:"demo_customer",
storeId:cart[0].storeId,

items:cart.map((p:any)=>({

productId:p._id,
quantity:p.quantity

})),

totalAmount:cart.reduce((sum:any,p:any)=>sum+p.price*p.quantity,0)

}

await API.post("/orders",order)

alert("Order placed successfully")

}

return(

<div className="p-10">

<h1 className="text-3xl font-bold mb-6">
Checkout
</h1>

<button
onClick={placeOrder}
className="bg-blue-600 text-white px-4 py-2 rounded"
>

Place Order

</button>

</div>

)

}