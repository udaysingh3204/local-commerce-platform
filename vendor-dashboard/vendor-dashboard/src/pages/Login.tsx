import { useState } from "react"
import { Link } from "react-router-dom"
import { useVendor } from "../context/VendorContext"
import GoogleSignInButton from "../components/GoogleSignInButton"

export default function Login() {
  const { login, loginWithGoogle } = useVendor()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async (credential: string) => {
    setError("")
    try {
      await loginWithGoogle(credential)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Google sign-in failed")
      throw err
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* LEFT */}
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-emerald-900 via-gray-900 to-gray-950 p-12 relative overflow-hidden border-r border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12)_0%,transparent_70%)]" />
        <span className="text-2xl font-black text-white relative">🛍️ LocalMart</span>
        <div className="relative">
          <h2 className="text-5xl font-black text-white leading-tight mb-4">
            Grow your<br/><span className="text-emerald-400">local business.</span>
          </h2>
          <p className="text-gray-400 text-lg">Manage products, track orders, and reach more customers.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 relative">
          {["Manage Inventory", "Track Orders", "View Analytics", "Demand Forecast"].map(s => (
            <div key={s} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-white font-bold text-sm">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl mb-4 shadow-lg shadow-emerald-900">
              🏪
            </div>
            <h1 className="text-3xl font-black text-white mb-1">Vendor Login</h1>
            <p className="text-gray-500 text-sm">Manage your store on LocalMart</p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <GoogleSignInButton text="signin_with" theme="dark" onCredential={handleGoogleLogin} />

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-600">Or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="vendor@example.com"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3.5 rounded-xl font-black text-sm hover:shadow-lg hover:shadow-emerald-900 transition-all disabled:opacity-60 mt-2"
            >
              {loading ? "Signing in..." : "Access Dashboard →"}
            </button>
          </form>
          </div>

          <p className="text-center text-gray-600 text-sm mt-6">
            New vendor?{" "}
            <Link to="/register" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
              Create account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
