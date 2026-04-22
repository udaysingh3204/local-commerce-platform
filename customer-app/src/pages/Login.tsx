import { useState } from "react"
import API from "../api/api"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { toast } from "sonner"
import GoogleSignInButton from "../components/GoogleSignInButton"

const PERKS = [
  { icon: "⚡", text: "30-minute delivery, guaranteed" },
  { icon: "🏪", text: "500+ local stores near you" },
  { icon: "🥦", text: "Fresh produce, daily restocked" },
  { icon: "💳", text: "Secure payments, free delivery" },
]

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Invalid credentials ❌")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async (credential: string) => {
    const res = await API.post("/auth/google", { credential, role: "customer" })
    login(res.data.user, res.data.token)
    toast.success("Signed in with Google ✨")
    navigate("/")
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col flex-1 bg-[#0d0620] p-12 relative overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-32 -left-24 w-96 h-96 bg-violet-700/25 rounded-full blur-3xl ca-blob" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-pink-700/20 rounded-full blur-3xl ca-blob ca-d5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 ca-dot-grid opacity-20" />
        {/* Content */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center text-base shadow-lg shadow-violet-900/30">
              🛍️
            </div>
            <span className="text-xl font-black text-white">LocalMart</span>
          </div>
        </div>
        <div className="relative flex-1 flex flex-col justify-center">
          <h2 className="text-5xl font-black text-white leading-[1.05] mb-4">
            Your neighbourhood,<br />
            <span className="ca-shimmer-text">delivered fast.</span>
          </h2>
          <p className="text-violet-300 mb-10">Shop from local stores you love. Get everything in 30 minutes.</p>
          <div className="space-y-3">
            {PERKS.map(p => (
              <div key={p.text} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center text-base shrink-0">{p.icon}</span>
                <span className="text-violet-200 text-sm font-medium">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex gap-4">
          {["40k+ Users", "500+ Stores", "FREE Delivery"].map(s => (
            <div key={s} className="bg-white/6 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-white font-bold text-sm">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm shadow-lg">🛍️</div>
            <span className="font-black text-gray-900">LocalMart</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-1">Welcome back 👋</h1>
            <p className="text-gray-500 text-sm">Sign in to your LocalMart account</p>
          </div>

          <div className="space-y-4">
            <GoogleSignInButton text="signin_with" onCredential={handleGoogleLogin} />

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-300">Or</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                className="mt-1.5 w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 text-sm focus:outline-none focus:border-violet-400 focus:ring-0 bg-gray-50 transition"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
                <Link to="/forgot-password" className="text-xs text-violet-500 font-semibold hover:underline">Forgot password?</Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-gray-100 text-sm focus:outline-none focus:border-violet-400 focus:ring-0 bg-gray-50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-base"
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 w-full bg-linear-to-r from-violet-600 to-pink-500 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full ca-spin-slow" />
                Signing in...
              </span>
            ) : "Sign In →"}
          </button>

          <button
            type="button"
            onClick={() => { toast.success("Browsing as guest"); navigate("/") }}
            className="mt-3 w-full border-2 border-gray-100 text-gray-700 py-3.5 rounded-xl font-black text-sm hover:border-violet-200 hover:text-violet-600 transition-all"
          >
            Continue as Guest
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
