import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"

import Dashboard from "./pages/Dashboard"
import CreateStore from "./pages/CreateStore"
import Products from "./pages/Products"
import Orders from "./pages/Orders"
import Analytics from "./pages/Analytics"
import DemandPrediction from "./pages/DemandPrediction"
function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App