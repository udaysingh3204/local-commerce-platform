import Sidebar from "./Sidebar"
import Navbar from "./Navbar"
import { Outlet } from "react-router-dom"

export default function Layout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      <Sidebar />

      <div style={{ flex: 1 }}>
        <Navbar />

        <div style={{ padding: "20px" }}>
          <Outlet />
        </div>

      </div>

    </div>
  )
}