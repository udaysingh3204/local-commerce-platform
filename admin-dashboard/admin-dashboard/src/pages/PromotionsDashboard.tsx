import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react"
import { API_BASE_URL } from "../api/api"

type CampaignType = "percentage" | "flat" | "bogo" | "tiered"
type CampaignStatus = "active" | "paused" | "expired" | "draft"

type Campaign = {
  id: string
  name: string
  code?: string | null
  type: CampaignType
  status: CampaignStatus
  validFrom?: string
  discount?: {
    percentage?: number
    flatAmount?: number
  }
  metadata?: {
    audience?: string
    vibe?: string
    quiz?: {
      prompt?: string
      answer?: string
    }
  }
  currentSpend?: number
  totalBudget?: number
  maxUsagePerUser?: number
  validTo?: string
  performance?: {
    conversions?: number
    totalRevenue?: number
  }
}

type CampaignForm = {
  name: string
  code: string
  type: CampaignType
  percentage: number
  flatAmount: number
  validFrom: string
  validTo: string
  maxUsagePerUser: number
  totalBudget: number
  audience: string
  vibe: string
  quizPrompt: string
  quizAnswer: string
}

const newCampaignDefault = (): CampaignForm => ({
  name: "",
  code: "",
  type: "percentage",
  percentage: 10,
  flatAmount: 0,
  validFrom: new Date().toISOString().split("T")[0],
  validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  maxUsagePerUser: 5,
  totalBudget: 10000,
  audience: "all",
  vibe: "campaign energy",
  quizPrompt: "",
  quizAnswer: "",
})

export default function PromotionsDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openComposer, setOpenComposer] = useState(false)
  const [form, setForm] = useState<CampaignForm>(newCampaignDefault())
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)

  useEffect(() => {
    void fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`${API_BASE_URL}/promotions?active=false`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        throw new Error("Unable to load campaigns")
      }

      const data = await response.json()
      const nextCampaigns: Campaign[] = (data.campaigns || []).map((campaign: any, index: number) => ({
        id: campaign.id || campaign._id || `campaign-${index + 1}`,
        name: campaign.name || `Campaign ${index + 1}`,
        code: campaign.code || null,
        type: (campaign.type || "percentage") as CampaignType,
        status: (campaign.status || "draft") as CampaignStatus,
        validFrom: campaign.validFrom,
        discount: campaign.discount || {},
        metadata: campaign.metadata || {},
        currentSpend: campaign.currentSpend || 0,
        totalBudget: campaign.totalBudget || 0,
        maxUsagePerUser: campaign.maxUsagePerUser || 0,
        validTo: campaign.validTo,
        performance: {
          conversions: campaign.performance?.conversions || 0,
          totalRevenue: campaign.performance?.totalRevenue || 0,
        },
      }))
      setCampaigns(nextCampaigns)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to fetch campaigns")
    } finally {
      setLoading(false)
    }
  }

  const buildPayload = () => ({
    name: form.name,
    code: form.code || undefined,
    type: form.type,
    discount: form.type === "percentage"
      ? { percentage: form.percentage }
      : { flatAmount: form.flatAmount },
    validFrom: form.validFrom,
    validTo: form.validTo,
    maxUsagePerUser: form.maxUsagePerUser,
    totalBudget: form.totalBudget,
    metadata: {
      audience: form.audience,
      vibe: form.vibe,
      quiz: {
        prompt: form.quizPrompt,
        answer: form.quizAnswer,
      },
    },
  })

  const createCampaign = async () => {
    const token = localStorage.getItem("adminToken")
    const payload = buildPayload()

    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/promotions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Unable to create campaign")
      }

      setOpenComposer(false)
      setEditingCampaignId(null)
      setForm(newCampaignDefault())
      await fetchCampaigns()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Create campaign failed")
    }
  }

  const updateCampaign = async () => {
    if (!editingCampaignId) return

    const token = localStorage.getItem("adminToken")

    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/promotions/${editingCampaignId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildPayload()),
      })

      if (!response.ok) {
        throw new Error("Unable to update campaign")
      }

      setOpenComposer(false)
      setEditingCampaignId(null)
      setForm(newCampaignDefault())
      await fetchCampaigns()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Update campaign failed")
    }
  }

  const startEditingCampaign = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id)
    setForm({
      name: campaign.name,
      code: campaign.code || "",
      type: campaign.type,
      percentage: Number(campaign.discount?.percentage || 0),
      flatAmount: Number(campaign.discount?.flatAmount || 0),
      validFrom: campaign.validFrom ? new Date(campaign.validFrom).toISOString().split("T")[0] : newCampaignDefault().validFrom,
      validTo: campaign.validTo ? new Date(campaign.validTo).toISOString().split("T")[0] : newCampaignDefault().validTo,
      maxUsagePerUser: Number(campaign.maxUsagePerUser || 0),
      totalBudget: campaign.totalBudget || 0,
      audience: campaign.metadata?.audience || "all",
      vibe: campaign.metadata?.vibe || "campaign energy",
      quizPrompt: campaign.metadata?.quiz?.prompt || "",
      quizAnswer: campaign.metadata?.quiz?.answer || "",
    })
    setOpenComposer(true)
  }

  const closeComposer = () => {
    setOpenComposer(false)
    setEditingCampaignId(null)
    setForm(newCampaignDefault())
  }

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const token = localStorage.getItem("adminToken")
    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/promotions/${campaign.id}/toggle-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error("Unable to update campaign status")
      }

      await fetchCampaigns()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Status update failed")
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    const token = localStorage.getItem("adminToken")
    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/promotions/${campaignId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        throw new Error("Unable to delete campaign")
      }

      await fetchCampaigns()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Delete campaign failed")
    }
  }

  const totals = useMemo(() => {
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.currentSpend || 0), 0)
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.performance?.conversions || 0), 0)
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length
    const avgROI = campaigns.length === 0
      ? 0
      : Math.round(
        campaigns.reduce((sum, c) => {
          const spend = c.currentSpend || 0
          const revenue = c.performance?.totalRevenue || 0
          return sum + (spend > 0 ? (revenue / spend) * 100 : 0)
        }, 0) / campaigns.length
      )
    return { totalSpend, totalConversions, activeCampaigns, avgROI }
  }, [campaigns])

  const featuredCampaigns = useMemo(() => {
    return [...campaigns]
      .sort((left, right) => {
        const leftScore = Number(left.performance?.conversions || 0) + Number(left.currentSpend || 0) / 100
        const rightScore = Number(right.performance?.conversions || 0) + Number(right.currentSpend || 0) / 100
        return rightScore - leftScore
      })
      .slice(0, 3)
  }, [campaigns])

  const onNumberChange = (field: keyof CampaignForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    setForm((current) => ({ ...current, [field]: Number.isNaN(value) ? 0 : value }))
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroGlowLeft} />
        <div style={heroGlowRight} />
        <div style={heroContentStyle}>
          <div>
            <p style={eyebrowStyle}>Campaign command deck</p>
            <h2 style={heroTitleStyle}>Build loud offers, tune live performance, and keep the promo story coherent.</h2>
            <p style={heroCopyStyle}>
              This surface now handles campaign authoring, quiz metadata, and live optimization in one place instead of feeling like a back-office spreadsheet.
            </p>
          </div>
          <div style={heroActionWrapStyle}>
            <button onClick={() => setOpenComposer(true)} style={primaryButton}>New Campaign</button>
            <button onClick={() => void fetchCampaigns()} style={secondaryHeroButton}>Refresh Live Data</button>
          </div>
        </div>

        <div style={heroMetricsGridStyle}>
          <StatCard title="Active Campaigns" value={`${totals.activeCampaigns} / ${campaigns.length}`} tone="violet" />
          <StatCard title="Total Spend" value={`INR ${totals.totalSpend.toLocaleString("en-IN")}`} tone="cyan" />
          <StatCard title="Total Conversions" value={totals.totalConversions.toLocaleString("en-IN")} tone="amber" />
          <StatCard title="Average ROI" value={`${totals.avgROI}%`} tone="emerald" />
        </div>
      </section>

      {error && <div style={errorBox}>{error}</div>}

      {featuredCampaigns.length > 0 && (
        <section style={featuredSectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionEyebrowStyle}>Top movers</p>
              <h3 style={sectionTitleStyle}>Campaigns worth touching right now</h3>
            </div>
            <p style={sectionCopyStyle}>The strongest live performers bubble up here so edits and budget decisions start from signal, not guessing.</p>
          </div>
          <div style={featuredGridStyle}>
            {featuredCampaigns.map((campaign) => {
              const spend = Number(campaign.currentSpend || 0)
              const revenue = Number(campaign.performance?.totalRevenue || 0)
              const conversions = Number(campaign.performance?.conversions || 0)
              const roi = spend > 0 ? Math.round((revenue / spend) * 100) : 0
              const budget = Number(campaign.totalBudget || 0)
              const usedPercent = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0
              return (
                <div key={campaign.id} style={featuredCardStyle}>
                  <div style={featuredCardHeaderStyle}>
                    <span style={statusPill(campaign.status)}>{campaign.status.toUpperCase()}</span>
                    <span style={codePillStyle}>{campaign.code || formatCampaignOffer(campaign)}</span>
                  </div>
                  <h4 style={featuredCardTitleStyle}>{campaign.name}</h4>
                  <p style={featuredCardCopyStyle}>{campaign.metadata?.quiz?.prompt || campaign.metadata?.vibe || "Campaign metadata is ready for a stronger customer story."}</p>
                  <div style={featuredMetaWrapStyle}>
                    <span style={metaPillStyle}>{String(campaign.metadata?.audience || "all").replace(/_/g, " ")}</span>
                    <span style={metaPillStyle}>{campaign.type.toUpperCase()}</span>
                    <span style={metaPillStyle}>{campaign.validTo ? `Ends ${new Date(campaign.validTo).toLocaleDateString("en-IN")}` : "No expiry"}</span>
                  </div>
                  <div style={miniMetricGridStyle}>
                    <MiniMetric label="Conversions" value={conversions.toLocaleString("en-IN")} />
                    <MiniMetric label="ROI" value={`${roi}%`} />
                    <MiniMetric label="Budget" value={budget > 0 ? `${usedPercent}%` : "Open"} />
                  </div>
                  <div style={featuredActionRowStyle}>
                    <button onClick={() => startEditingCampaign(campaign)} style={smallButton}>Edit story</button>
                    <button onClick={() => void toggleCampaignStatus(campaign)} style={ghostButtonStyle}>
                      {campaign.status === "active" ? "Pause" : "Activate"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <p style={sectionEyebrowStyle}>Campaign ledger</p>
            <h3 style={sectionTitleStyle}>Every promotion, with its audience, offer shape, and performance trail</h3>
          </div>
          <p style={sectionCopyStyle}>Keep the structured table for precision work while the cards above handle triage and visual scanning.</p>
        </div>
        {loading && <div>Loading campaigns...</div>}
        {!loading && campaigns.length === 0 && <div>No campaigns yet.</div>}
        {!loading && campaigns.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <HeaderCell>Name</HeaderCell>
                  <HeaderCell>Audience / Quiz</HeaderCell>
                  <HeaderCell>Type</HeaderCell>
                  <HeaderCell>Status</HeaderCell>
                  <HeaderCell>Budget Used</HeaderCell>
                  <HeaderCell>Conversions</HeaderCell>
                  <HeaderCell>Valid Until</HeaderCell>
                  <HeaderCell>Actions</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const spend = campaign.currentSpend || 0
                  const budget = campaign.totalBudget || 0
                  const usedPercent = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0
                  return (
                    <tr key={campaign.id}>
                      <BodyCell>
                        <div style={{ display: "grid", gap: "4px" }}>
                          <strong style={{ color: "#0f172a" }}>{campaign.name}</strong>
                          <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: 800 }}>{campaign.code || formatCampaignOffer(campaign)}</span>
                        </div>
                      </BodyCell>
                      <BodyCell>
                        <div style={{ display: "grid", gap: "4px" }}>
                          <span>{campaign.metadata?.audience ? String(campaign.metadata.audience).replace(/_/g, " ") : "all"}</span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{campaign.metadata?.quiz?.prompt || campaign.metadata?.vibe || "No quiz prompt"}</span>
                        </div>
                      </BodyCell>
                      <BodyCell>{formatCampaignOffer(campaign)}</BodyCell>
                      <BodyCell>
                        <span style={statusPill(campaign.status)}>{campaign.status.toUpperCase()}</span>
                      </BodyCell>
                      <BodyCell>{usedPercent}% ({spend.toLocaleString("en-IN")} / {budget.toLocaleString("en-IN")})</BodyCell>
                      <BodyCell>{(campaign.performance?.conversions || 0).toLocaleString("en-IN")}</BodyCell>
                      <BodyCell>{campaign.validTo ? new Date(campaign.validTo).toLocaleDateString("en-IN") : "--"}</BodyCell>
                      <BodyCell>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => startEditingCampaign(campaign)} style={smallButton}>Edit</button>
                          <button onClick={() => void toggleCampaignStatus(campaign)} style={smallButton}>
                            {campaign.status === "active" ? "Pause" : "Activate"}
                          </button>
                          <button onClick={() => void deleteCampaign(campaign.id)} style={dangerButton}>Delete</button>
                        </div>
                      </BodyCell>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openComposer && (
        <div style={overlayStyle}>
          <div style={{ ...panelStyle, ...composerStyle }}>
            <h3 style={{ marginTop: 0 }}>{editingCampaignId ? "Edit Campaign" : "Create Campaign"}</h3>
            <p style={{ marginTop: "-4px", marginBottom: "16px", color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
              Write the coupon story, audience signal, and quiz prompt here so customer discovery and checkout stay in sync.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <label style={labelStyle}>
                Campaign Name
                <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Coupon Code
                <input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))} style={inputStyle} placeholder="Optional code like CAMPUS25" />
              </label>

              <label style={labelStyle}>
                Campaign Type
                <select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value as CampaignType }))} style={inputStyle}>
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat</option>
                  <option value="bogo">BOGO</option>
                  <option value="tiered">Tiered</option>
                </select>
              </label>

              {form.type === "percentage" && (
                <label style={labelStyle}>
                  Discount Percentage
                  <input type="number" value={form.percentage} onChange={onNumberChange("percentage")} style={inputStyle} />
                </label>
              )}

              {form.type === "flat" && (
                <label style={labelStyle}>
                  Flat Amount
                  <input type="number" value={form.flatAmount} onChange={onNumberChange("flatAmount")} style={inputStyle} />
                </label>
              )}

              <label style={labelStyle}>
                Valid From
                <input type="date" value={form.validFrom} onChange={(e) => setForm((current) => ({ ...current, validFrom: e.target.value }))} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Valid To
                <input type="date" value={form.validTo} onChange={(e) => setForm((current) => ({ ...current, validTo: e.target.value }))} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Max Usage Per User
                <input type="number" value={form.maxUsagePerUser} onChange={onNumberChange("maxUsagePerUser")} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Total Budget
                <input type="number" value={form.totalBudget} onChange={onNumberChange("totalBudget")} style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Audience Tag
                <input value={form.audience} onChange={(e) => setForm((current) => ({ ...current, audience: e.target.value }))} style={inputStyle} placeholder="growth / all / high_value" />
              </label>

              <label style={labelStyle}>
                Campaign Vibe
                <input value={form.vibe} onChange={(e) => setForm((current) => ({ ...current, vibe: e.target.value }))} style={inputStyle} placeholder="snack money / launch frenzy" />
              </label>

              <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                Quiz Prompt
                <input value={form.quizPrompt} onChange={(e) => setForm((current) => ({ ...current, quizPrompt: e.target.value }))} style={inputStyle} placeholder="Ask the customer a short campaign-backed question" />
              </label>

              <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                Quiz Answer
                <input value={form.quizAnswer} onChange={(e) => setForm((current) => ({ ...current, quizAnswer: e.target.value }))} style={inputStyle} placeholder="Expected answer, like growth or 12" />
              </label>
            </div>
            <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={closeComposer} style={smallButton}>Cancel</button>
              <button onClick={() => void (editingCampaignId ? updateCampaign() : createCampaign())} style={primaryButton}>
                {editingCampaignId ? "Save Changes" : "Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, tone }: { title: string; value: string; tone: "violet" | "cyan" | "amber" | "emerald" }) {
  const toneMap = {
    violet: { accent: "#8b5cf6", bg: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(244,114,182,0.12))" },
    cyan: { accent: "#06b6d4", bg: "linear-gradient(135deg, rgba(6,182,212,0.18), rgba(59,130,246,0.10))" },
    amber: { accent: "#f59e0b", bg: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(249,115,22,0.10))" },
    emerald: { accent: "#10b981", bg: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(45,212,191,0.10))" },
  } as const
  const config = toneMap[tone]

  return (
    <div style={{ ...metricCardStyle, background: config.bg }}>
      <div style={{ fontSize: "12px", color: "#475569", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</div>
      <div style={{ marginTop: "10px", fontSize: "28px", fontWeight: 900, color: "#0f172a" }}>{value}</div>
      <div style={{ marginTop: "12px", width: "56px", height: "4px", borderRadius: "999px", backgroundColor: config.accent }} />
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={miniMetricStyle}>
      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ marginTop: "6px", fontSize: "16px", fontWeight: 900, color: "#ffffff" }}>{value}</div>
    </div>
  )
}

function HeaderCell({ children }: { children: string }) {
  return <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "10px", fontSize: "12px", color: "#475569" }}>{children}</th>
}

function BodyCell({ children }: { children: ReactNode }) {
  return <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px", fontSize: "14px" }}>{children}</td>
}

const panelStyle: CSSProperties = {
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  padding: "20px",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
}

const inputStyle: CSSProperties = {
  marginTop: "6px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "8px",
  width: "100%",
}

const labelStyle: CSSProperties = {
  fontSize: "12px",
  color: "#334155",
  fontWeight: 700,
}

const primaryButton: CSSProperties = {
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(135deg, #111827, #7c3aed)",
  color: "#ffffff",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
}

const smallButton: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.35)",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  padding: "8px 12px",
  fontWeight: 800,
  cursor: "pointer",
}

const dangerButton: CSSProperties = {
  borderRadius: "8px",
  border: "1px solid #fecaca",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  padding: "6px 10px",
  fontWeight: 700,
  cursor: "pointer",
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(2,6,23,0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 50,
}

const pageStyle: CSSProperties = {
  padding: "24px",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  minHeight: "100%",
}

const heroStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: "28px",
  padding: "26px",
  marginBottom: "20px",
  background: "linear-gradient(135deg, #020617 0%, #312e81 55%, #7c3aed 100%)",
  color: "#ffffff",
  boxShadow: "0 26px 60px rgba(79, 70, 229, 0.28)",
}

const heroGlowLeft: CSSProperties = {
  position: "absolute",
  width: "240px",
  height: "240px",
  borderRadius: "999px",
  background: "rgba(56, 189, 248, 0.28)",
  filter: "blur(40px)",
  left: "-80px",
  top: "-60px",
}

const heroGlowRight: CSSProperties = {
  position: "absolute",
  width: "280px",
  height: "280px",
  borderRadius: "999px",
  background: "rgba(244, 114, 182, 0.24)",
  filter: "blur(50px)",
  right: "-90px",
  bottom: "-100px",
}

const heroContentStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  flexWrap: "wrap",
  alignItems: "flex-start",
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#c4b5fd",
}

const heroTitleStyle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "34px",
  lineHeight: 1.05,
  fontWeight: 900,
  maxWidth: "760px",
}

const heroCopyStyle: CSSProperties = {
  margin: "14px 0 0",
  maxWidth: "760px",
  color: "rgba(237, 233, 254, 0.88)",
  fontSize: "14px",
  lineHeight: 1.7,
}

const heroActionWrapStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
}

const secondaryHeroButton: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  backgroundColor: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
}

const heroMetricsGridStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  marginTop: "20px",
}

const metricCardStyle: CSSProperties = {
  borderRadius: "22px",
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "18px",
  backdropFilter: "blur(8px)",
}

const featuredSectionStyle: CSSProperties = {
  marginBottom: "20px",
}

const featuredGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
}

const featuredCardStyle: CSSProperties = {
  borderRadius: "24px",
  padding: "18px",
  color: "#ffffff",
  background: "linear-gradient(135deg, #0f172a 0%, #312e81 55%, #1d4ed8 100%)",
  boxShadow: "0 20px 45px rgba(37, 99, 235, 0.18)",
}

const featuredCardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
}

const featuredCardTitleStyle: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "22px",
  fontWeight: 900,
}

const featuredCardCopyStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "rgba(224, 231, 255, 0.86)",
  lineHeight: 1.6,
  fontSize: "13px",
}

const featuredMetaWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
}

const metaPillStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: 800,
  color: "#dbeafe",
  backgroundColor: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

const codePillStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: 900,
  color: "#0f172a",
  backgroundColor: "#f8fafc",
}

const miniMetricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px",
}

const miniMetricStyle: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "12px",
  backgroundColor: "rgba(15,23,42,0.26)",
}

const featuredActionRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
  flexWrap: "wrap",
}

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  marginBottom: "16px",
  flexWrap: "wrap",
  alignItems: "flex-end",
}

const sectionEyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "#6366f1",
}

const sectionTitleStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "24px",
  lineHeight: 1.2,
  color: "#0f172a",
}

const sectionCopyStyle: CSSProperties = {
  maxWidth: "460px",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.6,
  margin: 0,
}

const composerStyle: CSSProperties = {
  width: "min(760px, 95vw)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
}

const ghostButtonStyle: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  backgroundColor: "transparent",
  color: "#ffffff",
  padding: "8px 12px",
  fontWeight: 800,
  cursor: "pointer",
}

function formatCampaignOffer(campaign: Campaign) {
  if (campaign.type === "percentage") {
    return `${Number(campaign.discount?.percentage || 0)}% off`
  }

  if (campaign.type === "flat") {
    return `INR ${Number(campaign.discount?.flatAmount || 0)} off`
  }

  if (campaign.type === "bogo") {
    return "BOGO"
  }

  return "Tiered offer"
}

function statusPill(status: CampaignStatus): CSSProperties {
  const palette: Record<CampaignStatus, { bg: string; color: string }> = {
    active: { bg: "#dcfce7", color: "#166534" },
    paused: { bg: "#fef3c7", color: "#92400e" },
    expired: { bg: "#e2e8f0", color: "#475569" },
    draft: { bg: "#ede9fe", color: "#5b21b6" },
  }

  return {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "11px",
    fontWeight: 900,
    backgroundColor: palette[status].bg,
    color: palette[status].color,
    letterSpacing: "0.08em",
  }
}

const errorBox: CSSProperties = {
  marginBottom: "14px",
  borderRadius: "10px",
  border: "1px solid #fecaca",
  backgroundColor: "#fef2f2",
  padding: "10px",
  color: "#b91c1c",
}
