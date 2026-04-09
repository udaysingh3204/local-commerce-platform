import { BrowserRouter, Routes, Route } from "react-router-dom"
import Sidebar from "./components/Sidebar"
import Dashboard from "./pages/Dashboard"
import Orders from "./pages/Orders"
import Stores from "./pages/Stores"
import Users from "./pages/Users"
import Delivery from "./pages/Delivery"

export default function App() {

  return (

    <BrowserRouter>

      <div className="flex">

        <Sidebar />

        <div className="flex-1 bg-gray-100 min-h-screen">

          <Routes>

            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/users" element={<Users />} />
            <Route path="/delivery" element={<Delivery />} />

          </Routes>

        </div>

      </div>

    </BrowserRouter>

  )

}