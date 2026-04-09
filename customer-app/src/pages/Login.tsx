import { useState } from "react"
import API from "../api/api"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { toast } from "sonner"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Fill all fields"); return }
    setLoading(true)
    try {
      const res = await API.post("/auth/login", { email, password })
      login(res.data.user, res.data.token)
      toast.success("Welcome back! 🚀")
      navigate("/")
    } catch {
      toast.error("Invalid credentials ❌")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
        <div>
          <span className="text-3xl font-black text-white">🛍️ LocalMart</span>
        </div>
        <div className="relative">
          <h2 className="text-5xl font-black text-white leading-tight mb-4">
            Your neighbourhood,<br/>
            <span className="text-yellow-300">delivered.</span>
          </h2>
          <p className="text-violet-200 text-lg">Fresh groceries, food & more — from local stores you love.</p>
        </div>
        <div className="flex gap-6 relative">
          {["8+ Stores", "32+ Orders", "30 min avg"].map(s => (
            <div key={s} className="bg-white/10 backdrop-blur rounded-xl px-4 py-3">
              <p className="text-white font-bold text-sm">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-1">Welcome back 👋</h1>
            <p className="text-gray-500 text-sm">Sign in to your LocalMart account</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
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
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-violet-600 to-pink-500 text-white py-3.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-violet-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            New here?{" "}
            <Link to="/signup" className="text-violet-600 font-bold hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}