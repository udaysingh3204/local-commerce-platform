import { BrowserRouter, Routes, Route } from "react-router-dom"
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

function AppRoutes() {
  const { vendor } = useVendor()

  if (!vendor) {
    return <Login />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create-store" element={<CreateStore />} />
        <Route path="/products" element={<Products />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/demand-prediction" element={<DemandPrediction />} />
      </Route>
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