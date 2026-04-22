import { useState } from "react"
import API from "../api/api"
import { Link } from "react-router-dom"
import { toast } from "sonner"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email) { toast.error("Enter your email address"); return }
    setLoading(true)
    try {
      await API.post("/auth/forgot-password", { email })
      setSent(true)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center text-base shadow-lg shadow-violet-900/30">
            🛍️
          </div>
          <span className="text-xl font-black text-gray-900">LocalMart</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Check your inbox</h1>
            <p className="text-gray-500 text-sm mb-6">
              We've sent a password reset link to <span className="font-semibold text-gray-700">{email}</span>.
              The link expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="text-violet-600 font-bold text-sm hover:underline"
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black text-gray-900 mb-1">Forgot password?</h1>
            <p className="text-gray-500 text-sm mb-8">
              Enter your email and we'll send you a reset link.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 text-sm focus:outline-none focus:border-violet-400 bg-gray-50 transition"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-6 w-full bg-linear-to-r from-violet-600 to-pink-500 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : "Send Reset Link →"}
            </button>

            <p className="text-center text-sm text-gray-500 mt-6">
              Remembered it?{" "}
              <Link to="/login" className="text-violet-600 font-bold hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
