import { useEffect, useMemo, useState } from "react"
import API from "../api/api"
import { toast } from "sonner"

const USE_CASE_LABELS: Record<string, string> = {
  "campus-waitlist": "Campus waitlist",
  "apartment-crew": "Apartment crew",
  "creator-community": "Creator community",
  waitlist: "General waitlist",
}

const STATUS_OPTIONS = ["new", "contacted", "qualified", "converted", "archived"]

const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`

export default function GrowthLeads() {
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [availableUseCases, setAvailableUseCases] = useState<string[]>([])
  const [availableSources, setAvailableSources] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [searchDraft, setSearchDraft] = useState("")
  const [useCase, setUseCase] = useState("all")
  const [source, setSource] = useState("all")
  const [drafts, setDrafts] = useState<Record<string, { status: string; ownerNote: string }>>({})
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await API.get("/growth/leads", {
          params: {
            q: query || undefined,
            useCase: useCase === "all" ? undefined : useCase,
            source: source === "all" ? undefined : source,
            limit: 80,
          },
        })

        if (cancelled) return

        setLeads(res.data?.leads || [])
        setTotal(res.data?.total || 0)
        setAvailableUseCases(res.data?.filters?.useCases || [])
        setAvailableSources(res.data?.filters?.sources || [])
        setDrafts(Object.fromEntries((res.data?.leads || []).map((lead: any) => [lead._id, {
          status: lead.status || "new",
          ownerNote: lead.ownerNote || "",
        }])))
      } catch (error) {
        if (!cancelled) {
          console.error(error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [query, source, useCase])

  const exportCsv = () => {
    if (leads.length === 0) {
      toast.error("There are no leads to export right now.")
      return
    }

    const lines = [
      ["name", "email", "city", "useCase", "source", "status", "referralCode", "referredBy", "interests", "ownerNote", "createdAt"].join(","),
      ...leads.map((lead) => [
        escapeCsv(lead.name || ""),
        escapeCsv(lead.email || ""),
        escapeCsv(lead.city || ""),
        escapeCsv(lead.useCase || ""),
        escapeCsv(lead.source || ""),
        escapeCsv(drafts[lead._id]?.status || lead.status || "new"),
        escapeCsv(lead.referralCode || ""),
        escapeCsv(lead.referredBy || ""),
        escapeCsv((lead.interests || []).join(" | ")),
        escapeCsv(drafts[lead._id]?.ownerNote || lead.ownerNote || ""),
        escapeCsv(new Date(lead.createdAt).toISOString()),
      ].join(",")),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `growth-leads-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("Growth leads exported as CSV.")
  }

  const updateDraft = (leadId: string, field: "status" | "ownerNote", value: string) => {
    setDrafts((current) => ({
      ...current,
      [leadId]: {
        status: current[leadId]?.status || "new",
        ownerNote: current[leadId]?.ownerNote || "",
        [field]: value,
      },
    }))
  }

  const saveLead = async (leadId: string) => {
    const payload = drafts[leadId]
    if (!payload) return

    setSavingLeadId(leadId)

    try {
      const res = await API.patch(`/growth/leads/${leadId}`, payload)
      const updatedLead = res.data?.lead

      setLeads((current) => current.map((lead) => lead._id === leadId ? updatedLead : lead))
      setDrafts((current) => ({
        ...current,
        [leadId]: {
          status: updatedLead.status || "new",
          ownerNote: updatedLead.ownerNote || "",
        },
      }))
      toast.success("Lead updated.")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Could not update lead.")
    } finally {
      setSavingLeadId(null)
    }
  }

  const stats = useMemo(() => {
    const referred = leads.filter((lead) => Boolean(lead.referredBy || lead.referralCode)).length
    const campus = leads.filter((lead) => lead.useCase === "campus-waitlist").length
    const creator = leads.filter((lead) => lead.useCase === "creator-community").length

    return [
      { label: "Loaded leads", value: total, tone: "text-white" },
      { label: "Referral-linked", value: referred, tone: "text-cyan-300" },
      { label: "Campus queue", value: campus, tone: "text-emerald-300" },
      { label: "Creator demand", value: creator, tone: "text-fuchsia-300" },
    ]
  }, [leads, total])

  return (
    <div className="p-6 xl:p-8">
      <div className="flex items-center justify-between mb-6 ad-fade-in gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Growth Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Waitlist, referral and launch-demand captures from the customer homepage.</p>
        </div>
        <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
          live funnel data
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/8 bg-[#0d1120] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
            <p className={`mt-3 text-3xl font-black ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-3xl border border-white/8 bg-[#0d1120] p-5">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.6fr_0.6fr] gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
            <input
              placeholder="Search lead name, email or referral code"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setQuery(searchDraft.trim())
                }
              }}
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/4 border border-white/7 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition"
            />
          </div>
          <select
            value={useCase}
            onChange={(event) => setUseCase(event.target.value)}
            className="rounded-xl bg-white/4 border border-white/7 px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/60"
          >
            <option value="all">All use cases</option>
            {availableUseCases.map((entry) => (
              <option key={entry} value={entry}>{USE_CASE_LABELS[entry] || entry}</option>
            ))}
          </select>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="rounded-xl bg-white/4 border border-white/7 px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/60"
          >
            <option value="all">All sources</option>
            {availableSources.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setQuery(searchDraft.trim())}
            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/15"
          >
            Apply search
          </button>
          <button
            onClick={() => {
              setSearchDraft("")
              setQuery("")
              setUseCase("all")
              setSource("all")
            }}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/10"
          >
            Reset
          </button>
          <button
            onClick={exportCsv}
            className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-400/15"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-[#0d1120] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Lead queue</p>
            <p className="mt-1 text-sm text-slate-400">Newest high-intent captures for follow-up, referrals and launch planning.</p>
          </div>
          <div className="text-sm font-semibold text-slate-400">{total} matching leads</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No leads match the current filters.</div>
        ) : (
          <div className="divide-y divide-white/6">
            {leads.map((lead) => (
              <div key={lead._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-white font-black text-base">{lead.name || lead.email}</p>
                    <p className="mt-1 text-sm text-slate-400">{lead.email}{lead.phone ? ` · ${lead.phone}` : ""}{lead.city ? ` · ${lead.city}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Captured</p>
                    <p className="mt-1 text-sm text-slate-300">{new Date(lead.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                    {USE_CASE_LABELS[lead.useCase] || lead.useCase || "waitlist"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                    {lead.source || "homepage"}
                  </span>
                  {lead.referralCode && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                      {lead.referralCode}
                    </span>
                  )}
                  {lead.referredBy && (
                    <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
                      referred by {lead.referredBy}
                    </span>
                  )}
                </div>

                {lead.interests?.length > 0 && (
                  <p className="mt-3 text-xs leading-5 text-slate-400">Interests: {lead.interests.join(", ")}</p>
                )}

                <div className="mt-4 grid grid-cols-1 xl:grid-cols-[0.35fr_1fr_auto] gap-3">
                  <select
                    value={drafts[lead._id]?.status || lead.status || "new"}
                    onChange={(event) => updateDraft(lead._id, "status", event.target.value)}
                    className="rounded-xl bg-white/4 border border-white/7 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    value={drafts[lead._id]?.ownerNote || ""}
                    onChange={(event) => updateDraft(lead._id, "ownerNote", event.target.value)}
                    placeholder="Owner note for follow-up, launch, or conversion context"
                    className="rounded-xl bg-white/4 border border-white/7 px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60"
                  />
                  <button
                    onClick={() => saveLead(lead._id)}
                    disabled={savingLeadId === lead._id}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-60"
                  >
                    {savingLeadId === lead._id ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}