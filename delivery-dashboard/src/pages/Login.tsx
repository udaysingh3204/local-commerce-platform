import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import API from "../api/api"

export default function Login() {

  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const driver = localStorage.getItem("driver")
    if (driver) {
      navigate("/")
    }
  }, [])

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter your email and password")
      return
    }

    setLoading(true)
    try {
      const res = await API.post("/driver/login", { email, password })
      const { token, driver } = res.data
      localStorage.setItem("driver", JSON.stringify(driver))
      localStorage.setItem("driverToken", token)
      toast.success(`Welcome back, ${driver.name}!`)
      navigate("/")
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "Login failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">

      <div className="bg-white p-6 rounded-xl shadow-lg w-80">

        <h2 className="text-xl font-bold mb-4">🚚 Driver Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
          type="email"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

      </div>
    </div>
  )
}