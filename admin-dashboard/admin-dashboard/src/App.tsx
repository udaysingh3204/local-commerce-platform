import { lazy, Suspense, useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import API from "./api/api"
import Sidebar from "./components/Sidebar"

const Dashboard = lazy(() => import("./pages/Dashboard"))
const Orders = lazy(() => import("./pages/Orders"))
const Stores = lazy(() => import("./pages/Stores"))
const Users = lazy(() => import("./pages/Users"))
const GrowthLeads = lazy(() => import("./pages/GrowthLeads"))
const DemoLab = lazy(() => import("./pages/DemoLab"))
const Delivery = lazy(() => import("./pages/Delivery"))
const Suppliers = lazy(() => import("./pages/Suppliers"))
const PromotionsDashboard = lazy(() => import("./pages/PromotionsDashboard"))
const LoyaltyDashboard = lazy(() => import("./pages/LoyaltyDashboard"))
const Login = lazy(() => import("./pages/Login"))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full ad-spin mx-auto mb-4" />
        <p className="text-slate-400 font-semibold">Loading admin workspace...</p>
      </div>
    </div>
  )
}

function ProtectedLayout() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null)

  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem("adminToken")
      const localAuth = localStorage.getItem("adminAuth") === "true"

      if (!token) {
        setIsAuth(localAuth)
        return
      }

      try {
        const res = await API.get("/auth/bootstrap")
        const user = res.data?.user
        const startup = res.data?.startup || null

        if (!user || user.role !== "admin") {
          throw new Error("Invalid admin session")
        }

        localStorage.setItem("adminAuth", "true")
        localStorage.setItem("adminUser", JSON.stringify(user))
        localStorage.setItem("adminBootstrap", JSON.stringify(startup))
        setIsAuth(true)
      } catch {
        localStorage.removeItem("adminToken")
        localStorage.removeItem("adminUser")
        localStorage.removeItem("adminAuth")
        localStorage.removeItem("adminBootstrap")
        setIsAuth(false)
      }
    }

    restore()
  }, [])

  if (isAuth === null) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full ad-spin mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">Restoring admin session...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Sidebar />
      <div className="flex-1 overflow-auto ad-scroll">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/users" element={<Users />} />
            <Route path="/growth" element={<GrowthLeads />} />
            <Route path="/demo-lab" element={<DemoLab />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/promotions" element={<PromotionsDashboard />} />
            <Route path="/loyalty" element={<LoyaltyDashboard />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}