import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import Layout from "./components/Layout"
import { VendorProvider, useVendor } from "./context/VendorContext"

import Dashboard from "./pages/Dashboard"
import CreateStore from "./pages/CreateStore"
import Products from "./pages/Products"
import Orders from "./pages/Orders"
import Analytics from "./pages/Analytics"
import DemandPrediction from "./pages/DemandPrediction"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Landing from "./pages/Landing"

function AppRoutes() {
  const { vendor } = useVendor()

  return (
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
        <Route path="/demand-prediction" element={<DemandPrediction />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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