import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { VendorProvider, useVendor } from "./context/VendorContext"

const Layout = lazy(() => import("./components/Layout"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const CreateStore = lazy(() => import("./pages/CreateStore"))
const Products = lazy(() => import("./pages/Products"))
const Orders = lazy(() => import("./pages/Orders"))
const Analytics = lazy(() => import("./pages/Analytics"))
const DemandPrediction = lazy(() => import("./pages/DemandPrediction"))
const Reviews = lazy(() => import("./pages/Reviews"))
const StoreAnalytics = lazy(() => import("./pages/StoreAnalytics"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const Landing = lazy(() => import("./pages/Landing"))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#060810] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full lm-spin-slow mx-auto mb-4" />
        <p className="text-gray-400 font-semibold">Loading vendor workspace...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { vendor, authReady } = useVendor()

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#060810] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full lm-spin-slow mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">Restoring vendor session...</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={vendor ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={vendor ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={vendor ? <Navigate to="/dashboard" replace /> : <Register />} />

        {/* Protected routes */}
        <Route element={vendor ? <Layout /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-store" element={<CreateStore />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/store-analytics" element={<StoreAnalytics />} />
          <Route path="/demand-prediction" element={<DemandPrediction />} />
          <Route path="/reviews" element={<Reviews />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <VendorProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors theme="dark" />
      </VendorProvider>
    </BrowserRouter>
  )
}

export default App