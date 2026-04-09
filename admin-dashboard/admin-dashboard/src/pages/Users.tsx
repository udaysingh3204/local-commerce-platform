import { useEffect, useState } from "react"
import API from "../api/api"

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState("all")

  useEffect(() => {
    API.get("/auth/users")
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = roleFilter === "all"
    ? users
    : users.filter(u => u.role === roleFilter)

  const roleCounts = users.reduce((acc: any, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  if (loading) return <div className="p-10 text-gray-500">Loading users...</div>

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Users</h1>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {["customer", "vendor", "supplier", "delivery", "admin"].map(role => (
          <div key={role} className="bg-white p-4 rounded-xl shadow text-center">
            <p className="text-gray-500 text-xs capitalize">{role}s</p>
            <h2 className="text-2xl font-bold">{roleCounts[role] || 0}</h2>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {["all", "customer", "vendor", "supplier", "delivery", "admin"].map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              roleFilter === r ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user._id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{user.name}</td>
                <td className="p-3 text-gray-500">{user.email}</td>
                <td className="p-3">{user.phone || "—"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs capitalize ${
                    user.role === "admin" ? "bg-purple-100 text-purple-700" :
                    user.role === "vendor" ? "bg-blue-100 text-blue-700" :
                    user.role === "supplier" ? "bg-orange-100 text-orange-700" :
                    user.role === "delivery" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
