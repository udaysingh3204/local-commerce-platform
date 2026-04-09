import { Routes, Route } from "react-router-dom"

import Home from "./pages/Home"
import StorePage from "./pages/StorePage"
import Cart from "./pages/Cart"
import TrackOrder from "./pages/TrackOrder"
import Checkout from "./pages/Checkout"
import { CartProvider } from "./context/CartContext"
import DeliveryDashboard from "./pages/DeliveryDashboard"
import Login from "./pages/Login"
import Signup from "./pages/Signup"

function App() {

	return (

		<CartProvider>

			<Routes>

				<Route path="/" element={<Home />} />

				<Route path="/store/:storeId" element={<StorePage />} />

				<Route path="/cart" element={<Cart />} />

				<Route path="/track/:orderId" element={<TrackOrder />} />
				<Route path="/checkout" element={<Checkout />} />
			<Route path="/delivery-dashboard/:orderId" element={<DeliveryDashboard />} />
				<Route path="/login" element={<Login />} />
				<Route path="/signup" element={<Signup />} />
			</Routes>

		</CartProvider>

	)
}

export default App