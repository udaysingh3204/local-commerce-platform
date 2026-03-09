import { BrowserRouter, Routes, Route } from "react-router-dom"
import Sidebar from "./components/Sidebar"
import Dashboard from "./pages/Dashboard"

export default function App() {

  return (

    <BrowserRouter>

      <div className="flex">

        <Sidebar />

        <div className="flex-1 bg-gray-100 min-h-screen">

          <Routes>

            <Route path="/" element={<Dashboard />} />

          </Routes>

        </div>

      </div>

    </BrowserRouter>

  )

}