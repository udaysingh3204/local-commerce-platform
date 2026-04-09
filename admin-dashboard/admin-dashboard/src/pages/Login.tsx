import { useState } from "react"
import { useNavigate } from "react-router-dom"

const ADMIN_EMAIL = "admin@localmart.com"
const ADMIN_PASSWORD = "Admin@2024"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handle = async () => {
    if (!email || !password) { alert("Fill all fields"); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("adminAuth", "true")
      navigate("/")
    } else {
      alert("Invalid admin credentials")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-12 relative overflow-hidden border-r border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.15)_0%,transparent_70%)]" />
        <div>
          <span className="text-2xl font-black text-white">🛍️ LocalMart</span>
          <span className="ml-2 text-xs font-bold bg-violet-600 text-white px-2 py-0.5 rounded-full">ADMIN</span>
        </div>
        <div>
          <h2 className="text-5xl font-black text-white leading-tight mb-4">
            Platform<br/><span className="text-violet-400">Command Centre</span>
          </h2>
          <p className="text-gray-400 text-lg">Full visibility. Total control.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {["Orders: 32", "Stores: 8", "Users: 3", "Revenue: ₹50"].map(s => (
            <div key={s} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-white font-bold text-sm">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-2xl mb-4 shadow-lg shadow-violet-900">
              👑
            </div>
            <h1 className="text-3xl font-black text-white mb-1">Admin Login</h1>
            <p className="text-gray-500 text-sm">Restricted access only</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handle()}
                placeholder="admin@localmart.com"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handle()}
                placeholder="••••••••"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            onClick={handle}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-violet-900 transition-all disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Access Dashboard →"}
          </button>

          <p className="text-center text-gray-700 text-xs mt-6">
            Default: admin@localmart.com / Admin@2024
          </p>
        </div>
      </div>
    </div>
  )
}
