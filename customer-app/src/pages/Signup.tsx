import { useState } from "react"
import API from "../api/api"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "sonner"

const PERKS = [
  { icon: "🆓", text: "100% free to join, forever" },
  { icon: "🚀", text: "Delivery in 30 minutes or less" },
  { icon: "🏪", text: "Support your local businesses" },
  { icon: "🔐", text: "Your data is always safe with us" },
]

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const pwScore = (() => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()

  const pwColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"]
  const pwLabels = ["", "Weak", "Fair", "Good", "Strong"]

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) { toast.error("Fill all required fields"); return }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return }
    setLoading(true)
    try {
      await API.post("/auth/register", form)
      toast.success("Account created! 🎉")
      navigate("/login")
    } catch {
      toast.error("Signup failed — email may be taken")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col flex-1 bg-[#05120f] p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-20 w-96 h-96 bg-emerald-700/25 rounded-full blur-3xl ca-blob" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 bg-teal-700/20 rounded-full blur-3xl ca-blob ca-d4" />
        <div className="absolute inset-0 ca-dot-grid opacity-20" />
        {/* Logo */}
        <div className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-base shadow-lg shadow-emerald-900/30">
            🛍️
          </div>
          <span className="text-xl font-black text-white">LocalMart</span>
        </div>
        <div className="relative flex-1 flex flex-col justify-center">
          <h2 className="text-5xl font-black text-white leading-[1.05] mb-4">
            Join the local<br />
            <span className="bg-linear-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">revolution.</span>
          </h2>
          <p className="text-emerald-300 mb-10">Support neighbourhood stores. Get everything delivered in minutes.</p>
          <div className="space-y-3">
            {PERKS.map(p => (
              <div key={p.text} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center text-base shrink-0">{p.icon}</span>
                <span className="text-emerald-200 text-sm font-medium">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-3 bg-white/6 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full bg-yellow-300 flex items-center justify-center text-lg shrink-0">✨</div>
          <div>
            <p className="text-white font-bold text-sm">It's 100% free to join</p>
            <p className="text-emerald-300 text-xs">No subscription, no hidden fees ever</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-sm shadow-lg">🛍️</div>
            <span className="font-black text-gray-900">LocalMart</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-1">Create account ✨</h1>
            <p className="text-gray-500 text-sm">Shop local, delivered to your door</p>
          </div>

          <div className="space-y-4">
            {[
              { k: "name", label: "Full Name", type: "text", ph: "Your name" },
              { k: "email", label: "Email", type: "email", ph: "you@example.com" },
              { k: "phone", label: "Phone (optional)", type: "tel", ph: "+91 98765 43210" },
            ].map(({ k, label, type, ph }) => (
              <div key={k}>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
                <input
                  type={type}
                  value={(form as any)[k]}
                  onChange={set(k)}
                  placeholder={ph}
                  className="mt-1.5 w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 text-sm focus:outline-none focus:border-emerald-400 bg-gray-50 transition"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-gray-100 text-sm focus:outline-none focus:border-emerald-400 bg-gray-50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-base"
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full ${pwScore >= i ? pwColors[pwScore] : "bg-gray-100"}`} />
                    ))}
                  </div>
                  {pwScore > 0 && <p className={`text-xs font-bold mt-1 ${pwScore >= 3 ? "text-emerald-600" : pwScore >= 2 ? "text-yellow-600" : "text-red-500"}`}>{pwLabels[pwScore]}</p>}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="mt-6 w-full bg-linear-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full ca-spin-slow" />
                Creating account...
              </span>
            ) : "Create Account →"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-600 font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
