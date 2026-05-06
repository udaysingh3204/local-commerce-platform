import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"

import { CartProvider } from "./context/CartContext"
import Navbar from "./components/Navbar"
import DeliveryRadar from "./components/DeliveryRadar"
import { useAuth } from "./context/useAuth"

const Home = lazy(() => import("./pages/Home"))
const StorePage = lazy(() => import("./pages/StorePage"))
const Cart = lazy(() => import("./pages/Cart"))
const TrackOrder = lazy(() => import("./pages/TrackOrder"))
const Checkout = lazy(() => import("./pages/Checkout"))
const DeliveryDashboard = lazy(() => import("./pages/DeliveryDashboard"))
const Login = lazy(() => import("./pages/Login"))
const Signup = lazy(() => import("./pages/Signup"))
const Orders = lazy(() => import("./pages/Orders"))
const Wishlist = lazy(() => import("./pages/Wishlist"))
const Notifications = lazy(() => import("./pages/Notifications"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const ResetPassword = lazy(() => import("./pages/ResetPassword"))const Search = lazy(() => import('./pages/Search'))
function RouteFallback() {
	return (
		<div className="min-h-[50vh] bg-gray-50 flex items-center justify-center px-6">
			<div className="text-center">
				<div className="w-10 h-10 border-2 border-violet-200 border-t-violet-500 rounded-full ca-spin-slow mx-auto mb-4" />
				<p className="text-sm font-semibold text-violet-700">Loading LocalMart experience...</p>
			</div>
		</div>
	)
}

function App() {
	const { authReady } = useAuth()

	if (!authReady) {
		return (
			<div className="min-h-screen bg-[#140725] flex items-center justify-center px-6">
				<div className="text-center">
					<div className="w-12 h-12 border-2 border-violet-400/30 border-t-violet-400 rounded-full ca-spin-slow mx-auto mb-4" />
					<p className="text-violet-200 font-semibold">Restoring your LocalMart session...</p>
				</div>
			</div>
		)
	}

	return (

		<CartProvider>

			<Navbar />
			<DeliveryRadar />

			<Suspense fallback={<RouteFallback />}>
				<Routes>

					<Route path="/" element={<Home />} />

					<Route path="/store/:storeId" element={<StorePage />} />

					<Route path="/cart" element={<Cart />} />

					<Route path="/track/:orderId" element={<TrackOrder />} />
					<Route path="/checkout" element={<Checkout />} />
					<Route path="/orders" element={<Orders />} />
					<Route path="/notifications" element={<Notifications />} />
					<Route path="/wishlist" element={<Wishlist />} />
					<Route path="/delivery-dashboard/:orderId" element={<DeliveryDashboard />} />
					<Route path="/login" element={<Login />} />
					<Route path="/signup" element={<Signup />} />
					<Route path="/forgot-password" element={<ForgotPassword />} />
					<Route path="/reset-password" element={<ResetPassword />} />
					<Route path="/search" element={<Search />} />
				</Routes>
			</Suspense>

		</CartProvider>

	)
}

export default App