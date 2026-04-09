import { useEffect, useState } from "react"
import API from "../api/api"

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")

  useEffect(() => {
    API.get("/auth/users")
      .then(res => {
        const s = (res.data as any[]).filter(u => u.role === "supplier")
        setSuppliers(s)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = suppliers.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 xl:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 ad-fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-1">
            {suppliers.length} wholesale supplier{suppliers.length !== 1 ? "s" : ""} on platform
          </p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/60 w-52 transition"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: "Total Suppliers",  value: suppliers.length,  icon: "🏭", color: "text-orange-400" },
          { label: "Active Partners",  value: suppliers.length,  icon: "🤝", color: "text-emerald-400" },
          { label: "Product Lines",    value: "—",               icon: "📦", color: "text-sky-400"    },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="text-slate-500 text-xs font-semibold">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier cards */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-5 animate-pulse">
              <div className="w-12 h-12 bg-white/[0.04] rounded-xl mb-3" />
              <div className="h-3 bg-white/[0.04] rounded-full w-2/3 mb-2" />
              <div className="h-3 bg-white/[0.04] rounded-full w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-20 text-center">
          <div className="text-6xl mb-4">🏭</div>
          <h3 className="text-white font-black text-lg mb-2">No suppliers yet</h3>
          <p className="text-slate-500 text-sm">Suppliers who register on the platform will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s._id} className="bg-[#0d1120] border border-white/[0.05] rounded-2xl p-5 ad-card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg shadow-orange-900/50">
                  {s.name?.[0]?.toUpperCase() ?? "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm truncate">{s.name}</p>
                  <p className="text-slate-500 text-xs truncate">{s.email}</p>
                  {s.phone && <p className="text-slate-600 text-xs mt-0.5">{s.phone}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border text-orange-400 bg-orange-500/10 border-orange-500/20">
                  🏭 Supplier
                </span>
                <p className="text-slate-600 text-xs">
                  {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
