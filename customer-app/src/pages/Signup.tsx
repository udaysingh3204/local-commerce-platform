import { useState } from "react"
import API from "../api/api"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "sonner"

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) { toast.error("Fill all required fields"); return }
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
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
        <div>
          <span className="text-3xl font-black text-white">🛍️ LocalMart</span>
        </div>
        <div className="relative">
          <h2 className="text-5xl font-black text-white leading-tight mb-4">
            Join the local<br/>
            <span className="text-yellow-300">revolution.</span>
          </h2>
          <p className="text-emerald-100 text-lg">Support neighbourhood stores. Get everything delivered in minutes.</p>
        </div>
        <div className="relative flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl p-4">
          <div className="w-10 h-10 rounded-full bg-yellow-300 flex items-center justify-center text-lg">✨</div>
          <div>
            <p className="text-white font-bold text-sm">It's 100% free to join</p>
            <p className="text-emerald-200 text-xs">No subscription, no hidden fees</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-1">Create account ✨</h1>
            <p className="text-gray-500 text-sm">Shop local, delivered to your door</p>
          </div>

          <div className="space-y-4">
            {[
              { k: "name", label: "Full Name", type: "text", ph: "Your name" },
              { k: "email", label: "Email", type: "email", ph: "you@example.com" },
              { k: "phone", label: "Phone (optional)", type: "tel", ph: "+91 98765 43210" },
              { k: "password", label: "Password", type: "password", ph: "Min 8 characters" },
            ].map(({ k, label, type, ph }) => (
              <div key={k}>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
                <input
                  type={type}
                  value={(form as any)[k]}
                  onChange={set(k)}
                  placeholder={ph}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account →"}
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