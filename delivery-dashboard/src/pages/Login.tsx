import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Login() {

  const navigate = useNavigate()

  useEffect(() => {
    const driver = localStorage.getItem("driver")

    if (driver) {
      navigate("/") // ✅ redirect to dashboard
    }
  }, [])

  const handleLogin = () => {
    localStorage.setItem("driver", JSON.stringify({
      _id: "test-driver-123",
      name: "Uday Driver"
    }))

    navigate("/") // ✅ go to dashboard
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">

      <div className="bg-white p-6 rounded-xl shadow-lg w-80">

        <h2 className="text-xl font-bold mb-4">🚚 Driver Login</h2>

        <input
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
        />

        <input
          placeholder="Password"
          type="password"
          className="w-full mb-3 p-2 border rounded"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Login
        </button>

      </div>
    </div>
  )
}



// localStorage.setItem("driver", JSON.stringify({
//   _id: "test-driver-123",
//   name: "Uday Driver"
// }))