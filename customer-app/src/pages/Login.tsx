import { useState } from "react"
import API from "../api/api"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { toast } from "sonner"

export default function Login() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    try {
      const res = await API.post("/auth/login", { email, password })

      login(res.data.user, res.data.token)

      toast.success("Login successful 🚀")
      navigate("/")

    } catch {
      toast.error("Login failed ❌")
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Login</h1>

      <input placeholder="Email" onChange={e => setEmail(e.target.value)} className="block mb-2 border p-2" />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} className="block mb-2 border p-2" />

      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2">
        Login
      </button>
    </div>
  )
}