import { useState, useEffect } from "react"
import API from "../api/api"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem("driver")) navigate("/")
  }, [])

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Fill all fields"); return }
    setLoading(true)
    try {
      const res = await API.post("/driver/login", { email, password })
      const { token, driver } = res.data
      localStorage.setItem("driver", JSON.stringify(driver))
      localStorage.setItem("driverToken", token)
      toast.success(`Let's ride, ${driver.name}! ???`)
      navigate("/")
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08)_0%,transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-3xl mb-4 shadow-2xl shadow-orange-900">
            ???
          </div>
          <h1 className="text-3xl font-black text-white">Driver Portal</h1>
          <p className="text-gray-500 text-sm mt-1">LocalMart Delivery</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="driver@email.com"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-5 w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 py-3.5 rounded-xl font-black text-sm hover:shadow-lg hover:shadow-orange-900 transition-all disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Start Delivering ?"}
          </button>
        </div>
      </div>
    </div>
  )
}
