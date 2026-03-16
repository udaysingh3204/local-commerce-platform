import { createContext, useContext, useState } from "react"

const CartContext = createContext<any>(null)

export const CartProvider = ({ children }: any) => {

const [cart, setCart] = useState<any[]>([])

const addToCart = (product:any) => {

const existing = cart.find(p => p._id === product._id)

if(existing){

setCart(
cart.map(p =>
p._id === product._id
? {...p, quantity: p.quantity + 1}
: p
)
)

}else{

setCart([...cart, { ...product, quantity: 1 }])

}

}

const removeFromCart = (id:string)=>{

setCart(cart.filter(p=>p._id!==id))

}

return(

<CartContext.Provider value={{cart,setCart,addToCart,removeFromCart}}>

{children}

</CartContext.Provider>

)

}

export const useCart = () => useContext(CartContext)