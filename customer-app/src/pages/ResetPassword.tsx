import { useState, useEffect } from "react"
import API from "../api/api"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { toast } from "sonner"

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const navigate = useNavigate()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token")
      navigate("/forgot-password")
    }
  }, [token, navigate])

  const handleSubmit = async () => {
    if (!password || !confirm) { toast.error("Fill all fields"); return }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return }
    if (password !== confirm) { toast.error("Passwords do not match"); return }

    setLoading(true)
    try {
      await API.post("/auth/reset-password", { token, password })
      toast.success("Password reset successfully! Please sign in.")
      navigate("/login")
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Reset link is invalid or has expired")
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

        <h1 className="text-3xl font-black text-gray-900 mb-1">Set new password</h1>
        <p className="text-gray-500 text-sm mb-8">Must be at least 8 characters.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">New Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-gray-100 text-sm focus:outline-none focus:border-violet-400 bg-gray-50 transition"
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

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••"
              className="mt-1.5 w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 text-sm focus:outline-none focus:border-violet-400 bg-gray-50 transition"
            />
          </div>
        </div>

        {/* Password strength indicator */}
        {password && (
          <div className="mt-3">
            <div className="flex gap-1">
              {[8, 12, 16].map((len, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    password.length >= len
                      ? i === 0 ? "bg-red-400" : i === 1 ? "bg-yellow-400" : "bg-green-400"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {password.length < 8 ? "Too short" : password.length < 12 ? "Weak" : password.length < 16 ? "Good" : "Strong"}
            </p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full bg-linear-to-r from-violet-600 to-pink-500 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Resetting...
            </span>
          ) : "Reset Password →"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-violet-600 font-bold hover:underline">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
