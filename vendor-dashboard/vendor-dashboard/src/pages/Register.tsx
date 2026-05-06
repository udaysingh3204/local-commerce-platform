import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import API from "../api/api"
import GoogleSignInButton from "../components/GoogleSignInButton"
import { useVendor } from "../context/VendorContext"

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Special char", ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const colors = ["bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"]
  const labels = ["", "Weak", "Fair", "Good", "Strong"]

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : "bg-gray-700"}`} />
        ))}
        <span className={`text-xs font-bold ml-2 ${score === 4 ? "text-emerald-400" : score >= 2 ? "text-amber-400" : "text-red-400"}`}>
          {labels[score]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <span className={`text-xs ${c.ok ? "text-emerald-400" : "text-gray-600"}`}>{c.ok ? "✓" : "○"}</span>
            <span className={`text-xs ${c.ok ? "text-gray-400" : "text-gray-600"}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const PERKS = [
  { icon: "✅", text: "Free forever — no credit card needed" },
  { icon: "⚡", text: "Store live in under 2 minutes" },
  { icon: "🔮", text: "AI-powered demand insights included" },
  { icon: "🚚", text: "Integrated delivery partner network" },
  { icon: "📈", text: "Real-time analytics from day one" },
]

export default function Register() {
  const navigate = useNavigate()
  const { loginWithGoogle } = useVendor()
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (form.password !== form.confirm) return setError("Passwords do not match")
    if (form.password.length < 6) return setError("Password must be at least 6 characters")

    setLoading(true)
    try {
      await API.post("/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: "vendor",
      })
      toast.success("Account created! Welcome to LocalMart.")
      navigate("/login")
    } catch (err: any) {
      setError(err?.response?.data?.message || "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async (credential: string) => {
    try {
      await loginWithGoogle(credential)
      toast.success("Vendor account connected with Google")
      navigate("/dashboard")
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Google signup failed")
      throw err
    }
  }

  return (
    <div className="min-h-screen flex bg-[#060810]">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 relative overflow-hidden p-12 border-r border-white/5">
        {/* Background blobs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-600/12 rounded-full blur-[100px] lm-blob" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[90px] lm-blob lm-d7" />
        <div className="absolute inset-0 lm-dot-grid opacity-50" />

        {/* Top logo */}
        <Link to="/" className="relative flex items-center gap-2 z-10">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-base">🛍️</div>
          <span className="text-xl font-black text-white">LocalMart</span>
        </Link>

        {/* Center content */}
        <div className="relative z-10">
          <div className="mb-8">
            <h2 className="text-5xl font-black text-white leading-[1.08] mb-5">
              Join 500+<br />
              <span className="lm-shimmer-text">vendors growing</span><br />
              with LocalMart.
            </h2>
            <p className="text-gray-500 text-base leading-relaxed">
              The smartest way to run your local store. Built for speed, designed for scale.
            </p>
          </div>

          {/* Perks list */}
          <div className="space-y-3">
            {PERKS.map((p) => (
              <div key={p.text} className="flex items-center gap-3">
                <span className="text-base w-6 flex-shrink-0">{p.icon}</span>
                <span className="text-gray-400 text-sm font-medium">{p.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: floating stat bubbles */}
        <div className="relative z-10 flex gap-3 flex-wrap">
          {[
            { label: "500+", sub: "Active Vendors", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
            { label: "10K+", sub: "Daily Orders", color: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
            { label: "4.9★", sub: "Vendor Rating", color: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
          ].map((s) => (
            <div key={s.label} className={`border rounded-xl px-4 py-2 ${s.color}`}>
              <p className="font-black text-lg leading-none">{s.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL (FORM) ── */}
      <div className="flex-1 lg:max-w-[480px] flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="mb-8">
            <Link to="/" className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm">🛍️</div>
              <span className="text-lg font-black text-white">LocalMart</span>
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl mb-4 shadow-lg shadow-emerald-900/40">
              🏪
            </div>
            <h1 className="text-3xl font-black text-white mb-1">Create account</h1>
            <p className="text-gray-500 text-sm">Register as a vendor on LocalMart — it's free.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950/60 border border-red-800/50 text-red-400 p-3.5 rounded-xl mb-5 text-sm flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              {error}
            </div>
          )}

          <div className="mb-5 space-y-4">
            <GoogleSignInButton text="signup_with" theme="dark" onCredential={handleGoogleRegister} />

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-600">Or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: "name", label: "Full Name", type: "text", placeholder: "Your name" },
              { id: "email", label: "Email address", type: "email", placeholder: "vendor@example.com" },
              { id: "phone", label: "Phone number", type: "tel", placeholder: "10-digit mobile number" },
            ].map((f) => (
              <div key={f.id}>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{f.label}</label>
                <input
                  type={f.type}
                  value={(form as any)[f.id]}
                  onChange={set(f.id)}
                  required
                  placeholder={f.placeholder}
                  className="mt-1.5 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:border-white/15"
                />
              </div>
            ))}

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                required
                placeholder="Create a strong password"
                className="mt-1.5 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all hover:border-white/15"
              />
              <PasswordStrength password={form.password} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={set("confirm")}
                required
                placeholder="Repeat your password"
                className={`mt-1.5 w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 transition-all ${
                  form.confirm && form.password !== form.confirm
                    ? "border-red-500/50 focus:ring-red-500/30"
                    : "border-white/8 focus:ring-emerald-500/50 focus:border-emerald-500/50 hover:border-white/15"
                }`}
              />
              {form.confirm && form.password !== form.confirm && (
                <p className="text-red-400 text-xs mt-1.5">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-linear-to-r from-emerald-500 to-teal-600 text-white py-3.5 rounded-xl font-black text-sm shadow-lg shadow-emerald-900/30 hover:shadow-emerald-800/50 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full lm-spin-slow" />
                  Creating your account...
                </span>
              ) : (
                "Create Vendor Account →"
              )}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
              Log in →
            </Link>
          </p>

          <p className="text-center text-gray-700 text-xs mt-4 leading-relaxed">
            By registering, you agree to our terms of service.<br />
            Your data is encrypted and never sold.
          </p>
        </div>
      </div>
    </div>
  )
}


