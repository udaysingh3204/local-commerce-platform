import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import API from "../api/api"

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (form.password !== form.confirm) {
      setError("Passwords do not match")
      return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      await API.post("/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: "vendor",
      })
      toast.success("Account created! Please login.")
      navigate("/login")
    } catch (err: any) {
      setError(err?.response?.data?.message || "Registration failed. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* LEFT */}
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-gradient-to-br from-emerald-900 via-gray-900 to-gray-950 p-12 relative overflow-hidden border-r border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12)_0%,transparent_70%)]" />
        <Link to="/" className="text-2xl font-black text-white relative">🛍️ LocalMart</Link>

        <div className="relative">
          <h2 className="text-5xl font-black text-white leading-tight mb-4">
            Join 500+<br />
            <span className="text-emerald-400">vendors growing</span><br />
            with LocalMart.
          </h2>
          <p className="text-gray-400 text-lg">
            Set up your store in minutes. Start selling to local customers today.
          </p>
        </div>

        <div className="space-y-3 relative">
          {[
            { icon: "✅", text: "Free to get started" },
            { icon: "⚡", text: "Live in under 2 minutes" },
            { icon: "📈", text: "AI-powered demand insights" },
            { icon: "🚚", text: "Integrated delivery network" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-white/80">
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.text}</span>
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
            <h1 className="text-3xl font-black text-white mb-1">Create Account</h1>
            <p className="text-gray-500 text-sm">Register as a vendor on LocalMart</p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                required
                placeholder="Your store owner name"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                required
                placeholder="vendor@example.com"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                required
                placeholder="10-digit mobile number"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                required
                placeholder="Min 6 characters"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={set("confirm")}
                required
                placeholder="Repeat your password"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3.5 rounded-xl font-black text-sm hover:shadow-lg hover:shadow-emerald-900 transition-all disabled:opacity-60 mt-2"
            >
              {loading ? "Creating account..." : "Create Vendor Account →"}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
