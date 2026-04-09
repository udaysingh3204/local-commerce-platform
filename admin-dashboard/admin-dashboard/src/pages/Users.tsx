import { useEffect, useState } from "react"
import API from "../api/api"

const ROLE_CFG: Record<string, { label: string; color: string; bg: string; icon: string; avatarBg: string }> = {
  customer: { label: "Customer", color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20",  icon: "👤", avatarBg: "bg-violet-700"  },
  vendor:   { label: "Vendor",   color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",      icon: "🏪", avatarBg: "bg-blue-700"    },
  supplier: { label: "Supplier", color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",  icon: "🏭", avatarBg: "bg-orange-700"  },
  delivery: { label: "Delivery", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",icon: "🚚", avatarBg: "bg-emerald-700" },
  admin:    { label: "Admin",    color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",      icon: "👑", avatarBg: "bg-rose-700"    },
}

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    API.get("/auth/users")
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const roleCounts = users.reduce((acc: any, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  const filtered = users
    .filter(u => roleFilter === "all" || u.role === roleFilter)
    .filter(u => !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="p-6 xl:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 ad-fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Users</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} registered users</p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/60 w-52 transition"
          />
        </div>
      </div>

      {/* Role stat cards (clickable filter) */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(ROLE_CFG).map(([role, cfg]) => (
          <button
            key={role}
            onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
            className={`text-center p-4 rounded-2xl border transition-all ad-card
              ${roleFilter === role
                ? `${cfg.bg} ${cfg.color}`
                : "bg-[#0d1120] border-white/[0.05] text-slate-400 hover:border-white/10 hover:text-slate-300"
              }`}
          >
            <p className="text-2xl mb-1">{cfg.icon}</p>
            <p className="text-xl font-black">{roleCounts[role] ?? 0}</p>
            <p className="text-xs font-bold capitalize mt-0.5">{role}s</p>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        {["all", ...Object.keys(ROLE_CFG)].map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize
              ${roleFilter === r
                ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                : "bg-white/[0.03] text-slate-500 border-white/[0.05] hover:bg-white/[0.06]"
              }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0d1120] border border-white/[0.05] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full ad-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["User", "Contact", "Role", "Joined"].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const cfg = ROLE_CFG[user.role] ?? { label: user.role, color: "text-slate-400", bg: "bg-white/5 border-white/10", icon: "👤", avatarBg: "bg-slate-700" }
                return (
                  <tr key={user._id} className="border-b border-white/[0.03] ad-table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${cfg.avatarBg} flex items-center justify-center text-white text-sm font-black shrink-0`}>
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <p className="text-white font-semibold">{user.name || "—"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-400 text-xs">{user.email}</p>
                      <p className="text-slate-600 text-xs mt-0.5">{user.phone || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-slate-500">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
