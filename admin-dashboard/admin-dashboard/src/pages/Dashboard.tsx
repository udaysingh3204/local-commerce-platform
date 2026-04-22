import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import API from "../api/api"
import { toast } from "sonner"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts"

const GROWTH_LABELS: Record<string, string> = {
  "campus-waitlist": "Campus waitlist",
  "apartment-crew": "Apartment crew",
  "creator-community": "Creator community",
  waitlist: "General waitlist",
}

const TONE_STYLES: Record<string, string> = {
  healthy: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  critical: "border-rose-400/20 bg-rose-400/10 text-rose-300",
}

const INCIDENT_ACK_STORAGE_KEY = "adminIncidentAckIds"

const buildTargetHref = (target?: { path?: string; query?: Record<string, string> }) => {
  if (!target?.path) return null

  const params = new URLSearchParams(target.query || {})
  const query = params.toString()
  return query ? `${target.path}?${query}` : target.path
}

const STAT_CARDS = [
  { key: "users",   label: "Total Users",    icon: "👥", grad: "from-violet-600 to-purple-700",  glow: "shadow-violet-900/50", border: "border-violet-500/20", trend: "+12%", trendUp: true },
  { key: "stores",  label: "Active Stores",  icon: "🏪", grad: "from-emerald-500 to-teal-600",   glow: "shadow-emerald-900/50",border: "border-emerald-500/20",trend: "+3%",  trendUp: true },
  { key: "orders",  label: "Total Orders",   icon: "📦", grad: "from-orange-500 to-amber-500",   glow: "shadow-orange-900/50", border: "border-orange-500/20", trend: "+28%", trendUp: true },
  { key: "revenue", label: "Total Revenue",  icon: "💰", grad: "from-sky-500 to-cyan-500",       glow: "shadow-sky-900/50",    border: "border-sky-500/20",    trend: "+18%", trendUp: true, prefix: "₹" },
]

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: "Pending",      color: "text-yellow-400",  bg: "bg-yellow-500/10"  },
  accepted:         { label: "Accepted",     color: "text-blue-400",    bg: "bg-blue-500/10"    },
  preparing:        { label: "Preparing",    color: "text-purple-400",  bg: "bg-purple-500/10"  },
  out_for_delivery: { label: "On the Way",   color: "text-orange-400",  bg: "bg-orange-500/10"  },
  delivered:        { label: "Delivered",    color: "text-emerald-400", bg: "bg-emerald-500/10" },
  cancelled:        { label: "Cancelled",    color: "text-rose-400",    bg: "bg-rose-500/10"    },
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1120] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white font-black text-sm">₹{(payload[0]?.value ?? 0).toLocaleString()}</p>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [couponWindowDays, setCouponWindowDays] = useState(30)
  const [couponExporting, setCouponExporting] = useState(false)
  const [acknowledgedIncidents, setAcknowledgedIncidents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(INCIDENT_ACK_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const seenIncidentIds = useRef<Set<string>>(new Set())

  const activeIncidents = (stats.incidentFeed || []).filter((incident: any) => !acknowledgedIncidents.includes(incident.id))

  useEffect(() => {
    localStorage.setItem(INCIDENT_ACK_STORAGE_KEY, JSON.stringify(acknowledgedIncidents))
  }, [acknowledgedIncidents])

  useEffect(() => {
    let disposed = false

    const load = async (isFirstLoad = false) => {
      try {
        const res = await API.get("/analytics/dashboard", {
          params: { daysBack: couponWindowDays },
        })
        if (disposed) return

        setStats(res.data)

        const incidents = res.data?.incidentFeed || []
        incidents.forEach((incident: any) => {
          if (acknowledgedIncidents.includes(incident.id)) return
          if (seenIncidentIds.current.has(incident.id)) return
          seenIncidentIds.current.add(incident.id)

          if (!isFirstLoad && incident.severity === "critical") {
            toast.error(incident.title, {
              description: incident.detail,
            })
          }
        })
      } catch (error) {
        console.error(error)
      } finally {
        if (!disposed) {
          setLoading(false)
        }
      }
    }

    load(true)
    const intervalId = window.setInterval(() => load(false), 30000)

    return () => {
      disposed = true
      window.clearInterval(intervalId)
    }
  }, [acknowledgedIncidents, couponWindowDays])

  const acknowledgeIncident = (incidentId: string) => {
    setAcknowledgedIncidents((current) => current.includes(incidentId) ? current : [...current, incidentId])
    toast.success("Incident acknowledged", {
      description: "It will stay hidden until the underlying state changes.",
    })
  }

  const resetAcknowledgements = () => {
    setAcknowledgedIncidents([])
    toast.success("Acknowledged incidents restored")
  }

  const exportCouponCsv = async () => {
    try {
      setCouponExporting(true)
      const response = await API.get("/analytics/coupons/export", {
        params: { daysBack: couponWindowDays },
        responseType: "blob",
      })

      const contentDisposition = response.headers?.["content-disposition"] || ""
      const filenameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/)
      const filename = filenameMatch?.[1] || `coupon-analytics-${couponWindowDays}d.csv`

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8" }))
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)

      toast.success("Coupon report exported")
    } catch (error) {
      console.error(error)
      toast.error("Failed to export coupon report")
    } finally {
      setCouponExporting(false)
    }
  }

  const dashboardDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const dailySales = stats.dailySales || []
  const latestSalesPoint = dailySales[dailySales.length - 1]
  const previousSalesPoint = dailySales[dailySales.length - 2]
  const latestRevenue = Number(latestSalesPoint?.revenue || 0)
  const previousRevenue = Number(previousSalesPoint?.revenue || 0)
  const revenueMomentum = previousRevenue > 0
    ? `${latestRevenue >= previousRevenue ? "+" : ""}${Math.round(((latestRevenue - previousRevenue) / previousRevenue) * 100)}%`
    : "Fresh"
  const liveOrders = Number(stats.statusCounts?.pending || 0) + Number(stats.statusCounts?.accepted || 0) + Number(stats.statusCounts?.preparing || 0) + Number(stats.statusCounts?.out_for_delivery || 0)
  const commandLinks = [
    {
      label: "Ops action",
      title: activeIncidents.length > 0 ? "Review active incidents" : "Check dispatch board",
      detail: activeIncidents.length > 0 ? `${activeIncidents.length} active issue${activeIncidents.length === 1 ? "" : "s"} need visibility.` : "Platform is calm enough to focus on routing and queue balance.",
      to: activeIncidents[0] ? buildTargetHref(activeIncidents[0].target) || "/delivery" : "/delivery",
      tone: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    },
    {
      label: "Campaigns",
      title: "Tune offers and coupon vibes",
      detail: `${stats.couponSummary?.couponOrders || 0} coupon orders in the current window.`,
      to: "/promotions",
      tone: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    },
    {
      label: "Growth",
      title: "Inspect lead momentum",
      detail: `${stats.growthSummary?.thisWeekLeads || 0} new leads this week from active funnels.`,
      to: "/growth-leads",
      tone: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
    },
  ]
  const pulseCards = [
    { label: "Live revenue pulse", value: latestRevenue ? `₹${latestRevenue.toLocaleString()}` : "No sales", detail: latestSalesPoint?._id ? `Latest day ${latestSalesPoint._id}` : "Waiting for sales data", accent: "text-cyan-300" },
    { label: "Revenue momentum", value: revenueMomentum, detail: previousRevenue > 0 ? `vs previous day ₹${previousRevenue.toLocaleString()}` : "Trend activates after two revenue points", accent: latestRevenue >= previousRevenue ? "text-emerald-300" : "text-amber-300" },
    { label: "Live order load", value: liveOrders, detail: "Pending, accepted, preparing, and in-transit orders combined.", accent: "text-violet-300" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full ad-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 xl:p-8">
      <section className="mb-8 rounded-[32px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.12),transparent_24%),linear-gradient(135deg,#08111f_0%,#0b1324_50%,#0d1120_100%)] p-6 shadow-2xl shadow-cyan-950/20 ad-fade-in">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">
              Command deck live
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Platform Overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              One glance for revenue momentum, queue pressure, growth capture, and coupon performance. The goal here is faster operator judgment, not just more charts.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              <span>{dashboardDate}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
                Live
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            {pulseCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 xl:grid-cols-3">
          {commandLinks.map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white/10 ${item.tone}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{item.label}</p>
              <p className="mt-2 text-lg font-black text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {stats.opsBriefing && (
        <div className="mb-6 grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6 ad-fade-in">
          <section className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),linear-gradient(135deg,#08111f_0%,#091827_45%,#0a1220_100%)] p-6">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                    AI Ops Briefing
                  </div>
                  <h2 className="mt-3 text-2xl font-black text-white">{stats.opsBriefing.headline}</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Generated from live platform analytics at {new Date(stats.opsBriefing.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {stats.opsBriefing.topStore && (
                  <div className="min-w-52 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Top Store</p>
                    <p className="mt-2 text-lg font-black text-white">{stats.opsBriefing.topStore.storeName}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      ₹{Number(stats.opsBriefing.topStore.revenue || 0).toLocaleString()} from {stats.opsBriefing.topStore.orders} orders
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {stats.opsBriefing.metrics.map((metric: any) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${TONE_STYLES[metric.tone] || TONE_STYLES.healthy}`}>
                      {metric.label}
                    </div>
                    <p className="mt-4 text-3xl font-black text-white">{metric.value}</p>
                    <p className="mt-2 text-xs text-slate-400">{metric.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-[#0d1120] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Recommended Actions</p>
                <h3 className="mt-2 text-xl font-black text-white">What to do next</h3>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-cyan-300 text-lg">◎</div>
            </div>
            <div className="space-y-3">
              {stats.opsBriefing.actions.map((action: any, index: number) => (
                <div key={`${action.title}-${index}`} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${action.tone === "critical" ? "bg-rose-400" : action.tone === "warning" ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <div>
                      <p className="text-sm font-black text-white">{action.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{action.detail}</p>
                      {buildTargetHref(action.target) && (
                        <Link
                          to={buildTargetHref(action.target) || "/"}
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/15"
                        >
                          {action.target?.label || "Open"}
                          <span>→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {(stats.incidentFeed?.length > 0 || acknowledgedIncidents.length > 0) && (
        <div className="mb-6 rounded-3xl border border-white/8 bg-[#0d1120] p-6 ad-fade-in">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-rose-300">Live Incident Rail</p>
              <h2 className="mt-2 text-xl font-black text-white">Operational exceptions requiring attention</h2>
            </div>
            <div className="flex items-center gap-2">
              {acknowledgedIncidents.length > 0 && (
                <button
                  onClick={resetAcknowledgements}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/10"
                >
                  Restore Acknowledged
                </button>
              )}
              <div className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">
                {activeIncidents.length} Active
              </div>
            </div>
          </div>

          {activeIncidents.length === 0 ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-200">
              All current incidents are acknowledged. New issues will reappear automatically if their state changes.
            </div>
          ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {activeIncidents.map((incident: any) => {
              const severityClass = incident.severity === "critical"
                ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                : "border-amber-400/20 bg-amber-400/10 text-amber-300"

              return (
                <div key={incident.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${severityClass}`}>
                      {incident.severity}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(incident.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm font-black text-white">{incident.title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{incident.detail}</p>
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {buildTargetHref(incident.target) && (
                      <Link
                        to={buildTargetHref(incident.target) || "/"}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-black/30"
                      >
                        {incident.target?.label || "Open"}
                        <span>→</span>
                      </Link>
                    )}
                    <button
                      onClick={() => acknowledgeIncident(incident.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-400/15"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      )}

      {stats.growthSummary && (
        <div className="mb-6 grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-6 ad-fade-in">
          <section className="rounded-3xl border border-fuchsia-400/15 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.16),transparent_35%),linear-gradient(135deg,#111022_0%,#101525_50%,#0d1120_100%)] p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-fuchsia-300">Growth Queue</p>
                <h2 className="mt-2 text-xl font-black text-white">Launch demand snapshot</h2>
              </div>
              <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/10 px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">This week</p>
                <p className="text-2xl font-black text-white">{stats.growthSummary.thisWeekLeads}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Total leads", value: stats.growthSummary.totalLeads, tone: "text-white" },
                { label: "Referred leads", value: stats.growthSummary.referredLeads, tone: "text-cyan-300" },
                { label: "Campus queue", value: stats.growthSummary.campusWaitlist, tone: "text-emerald-300" },
                { label: "Top demand lanes", value: stats.growthSummary.topUseCases.length, tone: "text-amber-300" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className={`mt-3 text-3xl font-black ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {stats.growthSummary.topUseCases.map((entry: any) => (
                <div key={entry.useCase} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-300">{GROWTH_LABELS[entry.useCase] || entry.useCase}</span>
                  <span className="rounded-full bg-fuchsia-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
                    {entry.count} leads
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-[#0d1120] p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Recent captures</p>
                <h2 className="mt-2 text-xl font-black text-white">Newest waitlist and referral leads</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                homepage funnel
              </div>
            </div>

            <div className="space-y-3">
              {(stats.growthSummary.recentLeads || []).map((lead: any) => (
                <div key={lead.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{lead.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{lead.email} · {lead.city}</p>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(lead.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                      {GROWTH_LABELS[lead.useCase] || lead.useCase}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                      {lead.source}
                    </span>
                    {lead.referralCode && (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                        {lead.referralCode}
                      </span>
                    )}
                  </div>

                  {lead.interests?.length > 0 && (
                    <p className="mt-3 text-xs leading-5 text-slate-400">
                      Interests: {lead.interests.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {stats.paymentSummary && (
        <div className="mb-6 rounded-3xl border border-white/8 bg-[#0d1120] p-6 ad-fade-in">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-300">Payments</p>
              <h2 className="mt-2 text-xl font-black text-white">Recovery and failure watch</h2>
            </div>
            <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
              {stats.paymentSummary.actionable} actionable this week
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            {[
              { label: "Paid", value: stats.paymentSummary.paid, tone: "text-emerald-300" },
              { label: "Pending", value: stats.paymentSummary.pending, tone: "text-amber-300" },
              { label: "Failed", value: stats.paymentSummary.failed, tone: "text-rose-300" },
              { label: "Retries", value: stats.paymentSummary.retries, tone: "text-cyan-300" },
              { label: "Recovery rate", value: `${stats.paymentSummary.recoveryRate}%`, tone: "text-white" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className={`mt-3 text-3xl font-black ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.couponSummary && (
        <div className="mb-6 rounded-3xl border border-white/8 bg-[#0d1120] p-6 ad-fade-in">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">Coupon Performance</p>
              <h2 className="mt-2 text-xl font-black text-white">Discount spend and revenue impact ({stats.couponSummary.windowDays || couponWindowDays} days)</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setCouponWindowDays(days)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] transition ${couponWindowDays === days ? "border-cyan-300/40 bg-cyan-400/20 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
                >
                  {days}d
                </button>
              ))}
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                {stats.couponSummary.couponOrders} coupon orders
              </div>
              <button
                type="button"
                onClick={exportCouponCsv}
                disabled={couponExporting}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                {couponExporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Discount spend", value: `₹${Number(stats.couponSummary.discountSpend || 0).toLocaleString()}`, tone: "text-rose-300" },
              { label: "Discounted revenue", value: `₹${Number(stats.couponSummary.discountedRevenue || 0).toLocaleString()}`, tone: "text-emerald-300" },
              { label: "Avg discount/order", value: `₹${Number(stats.couponSummary.avgDiscountPerOrder || 0).toLocaleString()}`, tone: "text-amber-300" },
              { label: "Discount rate", value: `${Number(stats.couponSummary.discountRate || 0).toFixed(2)}%`, tone: "text-cyan-300" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className={`mt-3 text-2xl font-black ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {(stats.couponSummary.topCoupons || []).length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-slate-400">
                No delivered coupon orders yet in the last 30 days.
              </div>
            ) : (
              (stats.couponSummary.topCoupons || []).map((coupon: any) => (
                <div key={coupon.code} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-white">{coupon.code}</p>
                    <p className="text-xs text-slate-400">{coupon.orders} orders · ₹{Number(coupon.revenue || 0).toLocaleString()} revenue</p>
                  </div>
                  <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">
                    ₹{Number(coupon.discountSpend || 0).toLocaleString()} spend
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {stats.wholesaleSummary && (
        <div className="mb-6 grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6 ad-fade-in">
          <section className="rounded-3xl border border-amber-400/15 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_35%),linear-gradient(135deg,#1b1203_0%,#121826_45%,#0d1120_100%)] p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-300">Wholesale Ops</p>
                <h2 className="mt-2 text-xl font-black text-white">Supplier pipeline and fulfillment health</h2>
              </div>
              <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                {stats.wholesaleSummary.stuckOrders} stuck
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Wholesale orders", value: stats.wholesaleSummary.totalOrders, tone: "text-white" },
                { label: "Active pipeline", value: stats.wholesaleSummary.activeOrders, tone: "text-cyan-300" },
                { label: "Delivered", value: stats.wholesaleSummary.deliveredOrders, tone: "text-emerald-300" },
                { label: "Cancel rate", value: `${stats.wholesaleSummary.cancellationRate}%`, tone: "text-rose-300" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className={`mt-3 text-3xl font-black ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Avg confirm time</p>
                <p className="mt-3 text-2xl font-black text-amber-200">{stats.wholesaleSummary.avgConfirmationHours ? `${stats.wholesaleSummary.avgConfirmationHours.toFixed(1)} h` : "--"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Avg fulfillment</p>
                <p className="mt-3 text-2xl font-black text-amber-200">{stats.wholesaleSummary.avgFulfillmentHours ? `${stats.wholesaleSummary.avgFulfillmentHours.toFixed(1)} h` : "--"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-6 text-slate-300">
              Delivered wholesale revenue is ₹{Number(stats.wholesaleSummary.deliveredRevenue || 0).toLocaleString()} across the current dataset, with {stats.wholesaleSummary.stuckOrders} orders older than 48 hours still not in a terminal state.
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-[#0d1120] p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Supplier Ranking</p>
                <h2 className="mt-2 text-xl font-black text-white">Wholesale leaders by delivered revenue</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                Top {Math.min((stats.wholesaleSummary.topSuppliers || []).length, 4)}
              </div>
            </div>

            <div className="space-y-3">
              {(stats.wholesaleSummary.topSuppliers || []).length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-slate-400">
                  No wholesale supplier data available yet.
                </div>
              ) : (
                (stats.wholesaleSummary.topSuppliers || []).map((supplier: any, index: number) => (
                  <div key={supplier.supplierId} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${index === 0 ? "bg-linear-to-br from-amber-400 to-orange-500 text-slate-950" : "bg-white/8 text-slate-200"}`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{supplier.supplierName}</p>
                          <p className="mt-1 text-xs text-slate-500">{supplier.orders} wholesale orders · {supplier.deliveredOrders} delivered</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                        ₹{Number(supplier.deliveredRevenue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((card, i) => {
          const raw = stats[card.key] ?? 0
          const display = card.key === "revenue" ? Number(raw).toLocaleString() : raw
          return (
            <div
              key={card.key}
              className={`bg-[linear-gradient(180deg,rgba(13,17,32,0.95)_0%,rgba(13,17,32,0.78)_100%)] border ${card.border} rounded-[24px] p-5 ad-count-up ad-card shadow-xl`}
              style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${card.grad} flex items-center justify-center text-lg shadow-lg ${card.glow}`}>
                  {card.icon}
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                  {card.trend}
                </span>
              </div>
              <p className="text-slate-400 text-xs font-semibold mb-1">{card.label}</p>
              <p className="text-white font-black text-3xl">{card.prefix ?? ""}{display}</p>
            </div>
          )
        })}
      </div>

      {/* ── Status Breakdown ── */}
      {stats.statusCounts && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Object.entries(stats.statusCounts).map(([status, count]: any) => {
            const cfg = STATUS_CFG[status] ?? { label: status, color: "text-slate-400", bg: "bg-white/4" }
            return (
              <div key={status} className={`${cfg.bg} border border-white/5 rounded-xl p-3 text-center`}>
                <p className={`text-[11px] font-bold mb-1 ${cfg.color}`}>{cfg.label}</p>
                <p className="text-white font-black text-2xl">{count}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Chart + Recent Orders ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Revenue Bar Chart */}
        {stats.dailySales?.length > 0 && (
          <div className="xl:col-span-3 bg-[linear-gradient(180deg,rgba(13,17,32,0.96)_0%,rgba(13,17,32,0.8)_100%)] border border-white/5 rounded-[28px] p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-white font-black text-base">Daily Revenue</h2>
              <p className="text-slate-500 text-xs mt-0.5">Last 30 days</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.dailySales} barSize={8} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="_id" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139,92,246,0.06)" }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {stats.dailySales.map((_: any, idx: number) => (
                    <Cell
                      key={idx}
                      fill={`rgba(139,92,246,${0.35 + (idx / stats.dailySales.length) * 0.65})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Orders */}
        {stats.recentOrders?.length > 0 && (
          <div className="xl:col-span-2 bg-[linear-gradient(180deg,rgba(13,17,32,0.96)_0%,rgba(13,17,32,0.8)_100%)] border border-white/5 rounded-[28px] p-6 shadow-xl">
            <h2 className="text-white font-black text-base mb-5">Recent Orders</h2>
            <div className="space-y-2.5">
              {stats.recentOrders.slice(0, 6).map((order: any) => {
                const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending
                return (
                  <div key={order._id} className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/4 hover:bg-white/4 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center text-xs font-black text-violet-400 shrink-0">
                        #{order._id.slice(-3)}
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">{order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-slate-600 text-xs">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-xs font-black">₹{order.totalAmount}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}