import { useState, useEffect } from "react"
import API from "../api/api"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import GoogleSignInButton from "../components/GoogleSignInButton"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem("driver")) navigate("/")
  }, [])

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Fill all fields"); return }
    setLoading(true)
    try {
      const res = await API.post("/driver/login", { email, password })
      const { token, driver } = res.data
      localStorage.setItem("driver", JSON.stringify(driver))
      localStorage.setItem("driverToken", token)
      toast.success(`Let's ride, ${driver.name}! 🛵`)
      navigate("/")
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async (credential: string) => {
    try {
      const res = await API.post("/driver/google", { credential })
      const { token, driver } = res.data
      localStorage.setItem("driver", JSON.stringify(driver))
      localStorage.setItem("driverToken", token)
      toast.success(`Let's ride, ${driver.name}!`)
      navigate("/")
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Google sign-in failed")
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_28%),linear-gradient(135deg,#0a0a0a_0%,#111827_50%,#1f2937_100%)] p-12">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              <span className="text-lg">🛵</span>
              Driver ops mode
            </div>
            <h1 className="mt-8 text-6xl font-black leading-[0.95] text-white">
              Run faster,<br />
              <span className="text-orange-300">earn smarter.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Dispatch queue, live GPS sync, active run control, and earnings intelligence now live in one courier workspace built for actual shift flow.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            {[
              { title: "Dispatch lane", body: "Open orders, live assignments, and active delivery controls in one screen." },
              { title: "GPS confidence", body: "Location sync stays tied to the current run so customers and ops stay aligned." },
              { title: "Payout clarity", body: "Weekly and daily earnings panels reflect completed work, not stale estimates." },
              { title: "Shift rhythm", body: "Availability, queue mix, and delivery pace stay visible without tab thrash." },
            ].map((card) => (
              <div key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-lg font-black text-white">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_55%)]" />
          <div className="mb-8 text-center lg:text-left">
            <div className="w-16 h-16 mx-auto lg:mx-0 rounded-2xl bg-linear-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-3xl mb-4 shadow-2xl shadow-orange-900">
              🛵
            </div>
            <h1 className="text-3xl font-black text-white">Driver Portal</h1>
            <p className="text-gray-400 text-sm mt-2">Access your delivery workspace, live queue, and earnings intelligence.</p>
          </div>

          <div className="bg-gray-900/95 border border-gray-800 rounded-[28px] p-6 shadow-2xl backdrop-blur-sm">
            <div className="space-y-4">
              <GoogleSignInButton text="signin_with" theme="dark" onCredential={handleGoogleLogin} />

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-600">Or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="driver@email.com"
                  className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="mt-1 w-full px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="mt-5 w-full bg-linear-to-r from-yellow-400 to-orange-500 text-gray-900 py-3.5 rounded-2xl font-black text-sm hover:shadow-lg hover:shadow-orange-900 transition-all disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Start delivering →"}
            </button>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: "Live queue", value: "Real-time" },
                { label: "GPS sync", value: "On run" },
                { label: "Payouts", value: "Tracked" },
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
