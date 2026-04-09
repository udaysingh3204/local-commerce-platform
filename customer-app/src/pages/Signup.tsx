import { useState } from "react"
import API from "../api/api"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

export default function Signup() {

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  })

  const navigate = useNavigate()

  const handleSignup = async () => {
    try {
      await API.post("/auth/register", form)
      toast.success("Signup successful 🎉")
      navigate("/login")
    } catch {
      toast.error("Signup failed ❌")
    }
  }

  return (
    <div className="p-8">
      <h1>Signup</h1>

      <input placeholder="Name" onChange={e => setForm({...form, name: e.target.value})} />
      <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
      <input placeholder="Phone" onChange={e => setForm({...form, phone: e.target.value})} />
      <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />

      <button onClick={handleSignup}>Signup</button>
    </div>
  )
}