import { useState } from "react"
import { useSupplier } from "../context/SupplierContext"
import GoogleSignInButton from "../components/GoogleSignInButton"

export default function Login() {
  const { login, loginWithGoogle } = useSupplier()
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
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.16),transparent_26%),linear-gradient(135deg,#1e1b4b_0%,#111827_55%,#030712_100%)] p-12 relative overflow-hidden border-r border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.12)_0%,transparent_70%)]" />
        <span className="text-2xl font-black text-white relative">🛍️ LocalMart</span>
        <div className="relative">
          <h2 className="text-5xl font-black text-white leading-tight mb-4">
            Supply smarter,<br/><span className="text-indigo-400">sell faster.</span>
          </h2>
          <p className="text-gray-400 text-lg">Manage wholesale orders and stock for local stores.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 relative">
          {[
            { title: "Wholesale Orders", copy: "Manage store demand with cleaner queue visibility and faster triage." },
            { title: "Inventory Sync", copy: "Keep product-line visibility tied to live supplier throughput." },
            { title: "Store Network", copy: "Track the retail side of your fulfillment footprint in one flow." },
            { title: "Analytics", copy: "Use order shape and delivered revenue to drive smarter stocking." },
          ].map((s) => (
            <div key={s.title} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 backdrop-blur-sm">
              <p className="text-white font-black text-sm">{s.title}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{s.copy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl mb-4 shadow-lg shadow-indigo-900">
              📦
            </div>
            <h1 className="text-3xl font-black text-white mb-1">Supplier Login</h1>
            <p className="text-gray-500 text-sm">Access your wholesale workspace with sharper ops visibility and cleaner order flow.</p>
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
                placeholder="supplier@example.com"
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3.5 rounded-2xl font-black text-sm hover:shadow-lg hover:shadow-indigo-900 transition-all disabled:opacity-60 mt-2"
            >
              {loading ? "Signing in..." : "Access Dashboard →"}
            </button>
          </form>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: "Orders", value: "Live" },
                { label: "Products", value: "Tracked" },
                { label: "Revenue", value: "Clear" },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">{metric.label}</p>
                  <p className="mt-1 text-sm font-black text-white">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
