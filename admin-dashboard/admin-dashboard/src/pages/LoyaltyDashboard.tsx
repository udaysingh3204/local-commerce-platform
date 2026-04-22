import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { API_BASE_URL } from "../api/api"

type Tier = "bronze" | "silver" | "gold" | "platinum"

type LeaderboardUser = {
  rank: number
  name: string
  points: number
  tier?: Tier
}

type LoyaltyStats = {
  totalUsers: number
  totalPointsAwarded: number
  avgPointsPerUser: number
}

type LoyaltyState = {
  leaderboard: LeaderboardUser[]
  stats: LoyaltyStats
}

const tierColors: Record<Tier, string> = {
  bronze: "#a78bfa",
  silver: "#e5e7eb",
  gold: "#fbbf24",
  platinum: "#c084fc",
}

const tierEmojis: Record<Tier, string> = {
  bronze: "🥉",
  silver: "⚪",
  gold: "🥇",
  platinum: "💎",
}

const tierOrder: Tier[] = ["bronze", "silver", "gold", "platinum"]

export default function LoyaltyDashboard() {
  const [state, setState] = useState<LoyaltyState>({
    leaderboard: [],
    stats: {
      totalUsers: 0,
      totalPointsAwarded: 0,
      avgPointsPerUser: 0,
    },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const leaderboardRes = await fetch(`${API_BASE_URL}/loyalty/leaderboard?limit=20`)
        if (!leaderboardRes.ok) {
          throw new Error("Unable to load loyalty leaderboard")
        }

        const leaderboardData = await leaderboardRes.json()
        const leaderboard: LeaderboardUser[] = (leaderboardData.leaderboard || []).map((u: any, index: number) => ({
          rank: u.rank || index + 1,
          name: u.name || `User ${index + 1}`,
          points: u.points || 0,
          tier: (u.tier || "bronze") as Tier,
        }))

        const totalPointsAwarded = leaderboard.reduce((sum, user) => sum + user.points, 0)
        const totalUsers = leaderboard.length
        const avgPointsPerUser = totalUsers > 0 ? Math.round(totalPointsAwarded / totalUsers) : 0

        if (!disposed) {
          setState({
            leaderboard,
            stats: {
              totalUsers,
              totalPointsAwarded,
              avgPointsPerUser,
            },
          })
        }
      } catch (nextError) {
        if (!disposed) {
          setError(nextError instanceof Error ? nextError.message : "Failed to load loyalty data")
        }
      } finally {
        if (!disposed) {
          setLoading(false)
        }
      }
    }

    void fetchData()
    const intervalId = setInterval(() => {
      void fetchData()
    }, 60000)

    return () => {
      disposed = true
      clearInterval(intervalId)
    }
  }, [])

  const tierDistribution = useMemo(() => {
    const counts: Record<Tier, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    }

    state.leaderboard.forEach((user) => {
      const tier = user.tier || "bronze"
      counts[tier] += 1
    })

    return tierOrder.map((tier) => ({
      name: tier,
      value: counts[tier],
    }))
  }, [state.leaderboard])

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "20px" }}>Loyalty And Rewards Dashboard</h2>

      {error && (
        <div style={{ marginBottom: "16px", borderRadius: "10px", border: "1px solid #fecaca", backgroundColor: "#fef2f2", padding: "10px", color: "#b91c1c" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <StatCard label="Active Members" value={state.stats.totalUsers.toLocaleString("en-IN")} loading={loading} />
        <StatCard label="Total Points" value={state.stats.totalPointsAwarded.toLocaleString("en-IN")} loading={loading} />
        <StatCard label="Avg Points/User" value={state.stats.avgPointsPerUser.toLocaleString("en-IN")} loading={loading} />
        <StatCard
          label="Platinum Members"
          value={state.leaderboard.filter((u) => u.tier === "platinum").length.toLocaleString("en-IN")}
          loading={loading}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <div style={{ borderRadius: "12px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>Tier Distribution</h3>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={84} label>
                  {tierDistribution.map((entry) => (
                    <Cell key={entry.name} fill={tierColors[entry.name as Tier]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ borderRadius: "12px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>Tier Summary</h3>
          {tierOrder.map((tier) => (
            <div key={tier} style={{ marginTop: "10px", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>{tierEmojis[tier]} {tier.toUpperCase()}</span>
              <span>{state.leaderboard.filter((u) => (u.tier || "bronze") === tier).length} members</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: "12px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", padding: "16px" }}>
        <h3 style={{ marginTop: 0 }}>Top Members</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <HeaderCell>Rank</HeaderCell>
                <HeaderCell>Member</HeaderCell>
                <HeaderCell>Tier</HeaderCell>
                <HeaderCell>Points</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {state.leaderboard.map((user) => {
                const tier = user.tier || "bronze"
                return (
                  <tr key={`${user.rank}-${user.name}`}>
                    <BodyCell>{user.rank}</BodyCell>
                    <BodyCell>{user.name}</BodyCell>
                    <BodyCell>
                      <span style={{ borderRadius: "999px", backgroundColor: tierColors[tier], padding: "4px 10px", fontWeight: 700, color: tier === "silver" ? "#0f172a" : "#111827" }}>
                        {tierEmojis[tier]} {tier.toUpperCase()}
                      </span>
                    </BodyCell>
                    <BodyCell>{user.points.toLocaleString("en-IN")}</BodyCell>
                  </tr>
                )
              })}
              {state.leaderboard.length === 0 && !loading && (
                <tr>
                  <BodyCell colSpan={4}>No loyalty users available yet.</BodyCell>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

type StatCardProps = {
  label: string
  value: string
  loading: boolean
}

function StatCard({ label, value, loading }: StatCardProps) {
  return (
    <div style={{ borderRadius: "12px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", padding: "14px" }}>
      <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ marginTop: "8px", fontSize: "24px", fontWeight: 900, color: "#111827" }}>{loading ? "..." : value}</div>
    </div>
  )
}

type HeaderCellProps = {
  children: ReactNode
}

function HeaderCell({ children }: HeaderCellProps) {
  return (
    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e5e7eb", color: "#334155", fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {children}
    </th>
  )
}

type BodyCellProps = {
  children: ReactNode
  colSpan?: number
}

function BodyCell({ children, colSpan }: BodyCellProps) {
  return (
    <td colSpan={colSpan} style={{ padding: "10px", borderBottom: "1px solid #f1f5f9", color: "#0f172a", fontSize: "14px" }}>
      {children}
    </td>
  )
}
