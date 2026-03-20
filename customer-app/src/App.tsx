import { BrowserRouter,Routes,Route } from "react-router-dom"

import Home from "./pages/Home"
import StorePage from "./pages/StorePage"
import Cart from "./pages/Cart"
import TrackOrder from "./pages/TrackOrder"
import Checkout from "./pages/Checkout"
import { CartProvider } from "./context/CartContext"

function App(){

return(

<CartProvider>

<BrowserRouter>

<Routes>

<Route path="/" element={<Home/>}/>

<Route path="/store/:storeId" element={<StorePage/>}/>

<Route path="/cart" element={<Cart/>}/>

<Route path="/track/:orderId" element={<TrackOrder/>}/>
<Route path="/checkout" element={<Checkout/>}/>
</Routes>

</BrowserRouter>

</CartProvider>

)

}

export default App