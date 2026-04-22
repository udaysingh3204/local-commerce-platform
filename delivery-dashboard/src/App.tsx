import { lazy, Suspense, useEffect, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import API from "./api/api"

const Deliveries = lazy(() => import("./pages/Deliveries"))
const Login = lazy(() => import("./pages/Login"))
const Earnings = lazy(() => import("./pages/Earnings"))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 font-semibold">Loading driver workspace...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const [driverReady, setDriverReady] = useState(false)
  const [hasDriver, setHasDriver] = useState(false)

  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem("driverToken")
      const localDriver = localStorage.getItem("driver")

      if (!token) {
        setHasDriver(Boolean(localDriver))
        setDriverReady(true)
        return
      }

      try {
        const res = await API.get("/driver/bootstrap")
        const driver = res.data?.driver
        if (!driver?._id) throw new Error("Invalid driver session")
        localStorage.setItem("driver", JSON.stringify(driver))
        localStorage.setItem("driverBootstrap", JSON.stringify(res.data?.startup || {}))
        setHasDriver(true)
      } catch {
        localStorage.removeItem("driver")
        localStorage.removeItem("driverToken")
        localStorage.removeItem("driverBootstrap")
        setHasDriver(false)
      } finally {
        setDriverReady(true)
      }
    }

    restore()
  }, [])

  if (!driverReady) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">Restoring driver session...</p>
        </div>
      </div>
    )
  }

  return hasDriver ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Deliveries /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  )
}

export default App