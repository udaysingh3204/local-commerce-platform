import { Routes, Route } from "react-router-dom"
import Deliveries from "./pages/Deliveries"
import Login from "./pages/Login"
import Earnings from "./pages/Earnings"
function App() {
  return (
    <Routes>
      <Route path="/" element={<Deliveries />} />
      <Route path="/login" element={<Login />} />
      <Route path="/earnings" element={<Earnings />} />

    </Routes>
  )
}

export default App