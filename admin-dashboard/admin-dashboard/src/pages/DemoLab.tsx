import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import API from "../api/api"

type DemoStatus = {
  safeToSeed: boolean
  credentials: Array<{ role: string; email: string; password: string }>
  counts: Record<string, number>
}

const ACTIONS = [
  { key: "full", label: "Seed full demo", endpoint: "/demo/seed/full", tone: "bg-violet-500/10 border-violet-500/20 text-violet-300", copy: "Refreshes cross-module demo users, stores, orders, growth leads, and wholesale data." },
  { key: "operations", label: "Refresh retail ops", endpoint: "/demo/seed/operations", tone: "bg-amber-500/10 border-amber-500/20 text-amber-300", copy: "Rebuilds customer, store, delivery, tracking, and notification scenarios." },
  { key: "growth", label: "Refresh growth", endpoint: "/demo/seed/growth", tone: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300", copy: "Rebuilds waitlist, referral, and launch-demand lead scenarios." },
  { key: "wholesale", label: "Refresh wholesale", endpoint: "/demo/seed/wholesale", tone: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300", copy: "Rebuilds supplier and wholesale orders so the supplier dashboard has live data." },
]

export default function DemoLab() {
  const [status, setStatus] = useState<DemoStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningAction, setRunningAction] = useState<string | null>(null)

  const loadStatus = async () => {
    try {
      setLoading(true)
      const res = await API.get("/demo/status")
      setStatus(res.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Could not load demo status.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const orderedCounts = useMemo(() => {
    if (!status?.counts) return []
    return [
      ["Users", status.counts.users],
      ["Drivers", status.counts.drivers],
      ["Stores", status.counts.stores],
      ["Products", status.counts.products],
      ["Orders", status.counts.orders],
      ["Notifications", status.counts.notifications],
      ["Growth leads", status.counts.growthLeads],
      ["Wholesale products", status.counts.wholesaleProducts],
      ["Wholesale orders", status.counts.wholesaleOrders],
    ]
  }, [status])

  const runAction = async (action: typeof ACTIONS[number]) => {
    setRunningAction(action.key)
    try {
      const res = await API.post(action.endpoint)
      setStatus(res.data?.status || null)
      toast.success(res.data?.message || `${action.label} complete.`)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || `Could not run ${action.label.toLowerCase()}.`)
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <div className="p-6 xl:p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Demo Lab</h1>
          <p className="text-slate-500 text-sm mt-1">Admin-safe controls for generating realistic retail, growth, and supplier scenarios.</p>
        </div>
        <button
          onClick={loadStatus}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/10"
        >
          Refresh status
        </button>
      </div>

      {!status?.safeToSeed && (
        <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-300">Safety lock</p>
          <p className="mt-1 text-sm text-slate-300">Demo seed actions are blocked because the current backend database target does not look like a local, demo, or test database.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr] gap-6 mb-6">
        <section className="rounded-3xl border border-white/8 bg-[#0d1120] p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Scenario actions</p>
              <h2 className="mt-2 text-xl font-black text-white">Generate dynamic demo data</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${status?.safeToSeed ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-rose-400/20 bg-rose-400/10 text-rose-300"}`}>
              {status?.safeToSeed ? "safe target" : "unsafe target"}
            </span>
          </div>

          <div className="space-y-3">
            {ACTIONS.map((action) => (
              <div key={action.key} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="max-w-xl">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${action.tone}`}>
                      {action.label}
                    </span>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{action.copy}</p>
                  </div>
                  <button
                    onClick={() => runAction(action)}
                    disabled={!status?.safeToSeed || runningAction === action.key}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {runningAction === action.key ? "Running..." : "Execute"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-[#0d1120] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Demo accounts</p>
          <h2 className="mt-2 text-xl font-black text-white">Ready-to-use credentials</h2>

          {loading ? (
            <div className="mt-6 text-sm text-slate-500">Loading demo credentials...</div>
          ) : (
            <div className="mt-5 space-y-3">
              {(status?.credentials || []).map((entry) => (
                <div key={entry.email} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-black text-white capitalize">{entry.role}</p>
                      <p className="mt-1 text-xs text-slate-400">{entry.email}</p>
                    </div>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                      {entry.password}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-white/8 bg-[#0d1120] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Current demo state</p>
        <h2 className="mt-2 text-xl font-black text-white">Module coverage snapshot</h2>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
          {orderedCounts.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}