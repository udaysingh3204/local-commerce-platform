import { useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import GoogleSignInButton from "../components/GoogleSignInButton"

const ADMIN_EMAIL = "admin@localmart.com"
const ADMIN_PASSWORD = "Admin@2024"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handle = async () => {
    if (!email || !password) { setError("Please fill all fields"); return }
    setLoading(true); setError("")
    try {
      const res = await API.post("/auth/login", { email, password })
      const { user, token } = res.data

      if (user.role !== "admin") {
        throw new Error("This account does not have admin access")
      }

      localStorage.setItem("adminAuth", "true")
      localStorage.setItem("adminToken", token)
      localStorage.setItem("adminUser", JSON.stringify(user))
      navigate("/")
    } catch (apiError: any) {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem("adminAuth", "true")
        localStorage.removeItem("adminToken")
        localStorage.removeItem("adminUser")
        navigate("/")
      } else {
        setError(apiError?.response?.data?.message || apiError?.message || "Invalid admin credentials")
      }
    }
    setLoading(false)
  }

  const handleGoogleLogin = async (credential: string) => {
    const res = await API.post("/auth/google", { credential, role: "admin" })
    const { user, token } = res.data
    localStorage.setItem("adminAuth", "true")
    localStorage.setItem("adminToken", token)
    localStorage.setItem("adminUser", JSON.stringify(user))
    navigate("/")
  }

  return (
    <div className="min-h-screen flex bg-[#050810]">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden border-r border-white/[0.04] bg-[#070b14]">
        {/* Blobs */}
        <div className="absolute -top-40 -left-28 w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-900/15 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xl shadow-xl shadow-violet-900/60">
            👑
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none">LocalMart</p>
            <span className="text-[10px] font-bold bg-violet-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Admin</span>
          </div>
        </div>

        {/* Headline */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/10 text-violet-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            Secure admin access
          </div>
          <h2 className="text-5xl font-black text-white leading-[1.05] mb-4">
            Platform<br />
            <span className="ad-shimmer-text">Command Centre</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xs">Full visibility. Total control. Every decision backed by live data.</p>
        </div>

        {/* Stats grid */}
        <div className="relative grid grid-cols-2 gap-3">
          {[
            { label: "Platform Users",  value: "3.2k+" },
            { label: "Active Stores",   value: "500+"  },
            { label: "Daily Orders",    value: "1k+"   },
            { label: "Platform Revenue",value: "₹5L+"  },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
              <p className="text-slate-500 text-xs font-semibold">{s.label}</p>
              <p className="text-white font-black text-xl mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 lg:max-w-[420px] flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Icon + title */}
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-violet-600 to-purple-700 flex items-center justify-center text-2xl mb-5 shadow-xl shadow-violet-900/60">
              👑
            </div>
            <h1 className="text-3xl font-black text-white mb-1">Admin Login</h1>
            <p className="text-slate-500 text-sm">Restricted access — authorised personnel only</p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <GoogleSignInButton text="signin_with" theme="dark" onCredential={handleGoogleLogin} />

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-600">Or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError("") }}
                onKeyDown={e => e.key === "Enter" && handle()}
                placeholder="admin@localmart.com"
                className="mt-1.5 w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border-2 border-white/[0.07] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError("") }}
                  onKeyDown={e => e.key === "Enter" && handle()}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/[0.04] border-2 border-white/[0.07] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-base"
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <div className="mt-3 flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handle}
            disabled={loading}
            className="mt-5 w-full bg-linear-to-r from-violet-600 to-purple-600 text-white py-4 rounded-xl font-black text-sm shadow-xl shadow-violet-900/50 hover:shadow-violet-900/70 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full ad-spin inline-block" />
                Verifying...
              </span>
            ) : "Access Dashboard →"}
          </button>

          <p className="text-center text-slate-700 text-xs mt-6">
            Default: admin@localmart.com / Admin@2024
          </p>
        </div>
      </div>
    </div>
  )
}
