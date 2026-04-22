import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"
import { fetchJson, MOBILE_STORAGE_KEYS, createAuthHeaders } from "@local-commerce-platform/mobile-shared"
import { API_BASE_URL } from "../config/env"
import { getSecureValue } from "../lib/secureStore"

const c = {
  bg: "#030712",
  card: "#0f172a",
  border: "#1e293b",
  amber: "#f59e0b",
  amberDim: "#fbbf24",
  cyan: "#22d3ee",
  green: "#4ade80",
  red: "#f87171",
  muted: "#64748b",
  sub: "#94a3b8",
  text: "#f8fafc",
  textDim: "#cbd5e1",
} as const

type SummaryData = {
  activeCount: number
  deliveredCount: number
  todayDeliveredCount: number
  weekDeliveredCount: number
  todayEarnings: number
  weekEarnings: number
  totalEarnings: number
  avgOrderValue: number
  avgDeliveryMinutes: number | null
  onTimeRate: number | null
}

type TrendDay = { date: string; amount: number; deliveries: number }

type RecentDelivery = {
  _id: string
  totalAmount: number
  updatedAt: string
  durationMinutes: number | null
  estimatedDeliveryTime: number | null
  itemCount: number
  paymentMethod: string
}

type InsightsPayload = {
  insights: {
    summary: SummaryData
    trend: TrendDay[]
    recentDeliveries: RecentDelivery[]
  }
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`

const StatBox = ({
  label,
  value,
  color = "#f8fafc",
}: {
  label: string
  value: string
  color?: string
}) => (
  <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14 }}>
    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: c.muted, textTransform: "uppercase" }}>{label}</Text>
    <Text style={{ marginTop: 6, fontSize: 22, fontWeight: "900", color }}>{value}</Text>
  </View>
)

type EarningsScreenProps = { driverId: string }

export default function EarningsScreen({ driverId }: EarningsScreenProps) {
  const [data, setData] = useState<InsightsPayload["insights"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getSecureValue(MOBILE_STORAGE_KEYS.driverToken)
      if (!token) throw new Error("Session expired")
      const payload = await fetchJson<InsightsPayload>(
        API_BASE_URL,
        "/api/driver/me/insights",
        { headers: createAuthHeaders(token) }
      )
      setData(payload.insights)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load earnings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [driverId])

  const s = data?.summary

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 2, color: c.amber, marginBottom: 4 }}>EARNINGS</Text>
        <Text style={{ fontSize: 26, fontWeight: "900", color: c.text, marginBottom: 20 }}>Your Performance</Text>

        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={c.amber} size="large" />
          </View>
        )}

        {error && (
          <View style={{ backgroundColor: "#450a0a", borderWidth: 1, borderColor: "#7f1d1d", borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <Text style={{ color: c.red }}>{error}</Text>
            <Pressable onPress={() => void load()} style={{ marginTop: 10 }}>
              <Text style={{ color: c.amber, fontWeight: "700" }}>Retry</Text>
            </Pressable>
          </View>
        )}

        {s && (
          <>
            {/* Today / Week / Total */}
            <Text style={{ fontSize: 10, fontWeight: "700", color: c.muted, letterSpacing: 1.5, marginBottom: 8 }}>EARNINGS OVERVIEW</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <StatBox label="Today" value={fmt(s.todayEarnings)} color={c.amberDim} />
              <StatBox label="This Week" value={fmt(s.weekEarnings)} color={c.cyan} />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <StatBox label="All Time" value={fmt(s.totalEarnings)} color={c.green} />
              <StatBox label="Avg Order" value={fmt(s.avgOrderValue)} />
            </View>

            {/* Performance */}
            <Text style={{ fontSize: 10, fontWeight: "700", color: c.muted, letterSpacing: 1.5, marginBottom: 8 }}>PERFORMANCE</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <StatBox
                label="On-Time Rate"
                value={s.onTimeRate !== null ? `${s.onTimeRate}%` : "—"}
                color={s.onTimeRate !== null ? (s.onTimeRate >= 80 ? c.green : c.red) : c.sub}
              />
              <StatBox
                label="Avg Delivery"
                value={s.avgDeliveryMinutes !== null ? `${s.avgDeliveryMinutes} min` : "—"}
              />
            </View>

            {/* Deliveries count */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <StatBox label="Today's Drops" value={String(s.todayDeliveredCount)} color={c.amberDim} />
              <StatBox label="Week's Drops" value={String(s.weekDeliveredCount)} />
              <StatBox label="All Drops" value={String(s.deliveredCount)} color={c.cyan} />
            </View>

            {/* 7-day trend bars */}
            {data.trend.length > 0 && (
              <>
                <Text style={{ fontSize: 10, fontWeight: "700", color: c.muted, letterSpacing: 1.5, marginBottom: 12 }}>7-DAY TREND</Text>
                <View style={{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 20 }}>
                  {(() => {
                    const maxAmt = Math.max(...data.trend.map((d) => d.amount), 1)
                    return data.trend.map((day) => (
                      <View key={day.date} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ color: c.textDim, fontSize: 11, fontWeight: "600" }}>{day.date}</Text>
                          <Text style={{ color: c.text, fontSize: 11, fontWeight: "700" }}>
                            {fmt(day.amount)} · {day.deliveries} drop{day.deliveries !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: c.border, borderRadius: 4 }}>
                          <View
                            style={{
                              height: 6,
                              borderRadius: 4,
                              backgroundColor: c.amber,
                              width: `${Math.round((day.amount / maxAmt) * 100)}%`,
                            }}
                          />
                        </View>
                      </View>
                    ))
                  })()}
                </View>
              </>
            )}

            {/* Recent deliveries */}
            {data.recentDeliveries.length > 0 && (
              <>
                <Text style={{ fontSize: 10, fontWeight: "700", color: c.muted, letterSpacing: 1.5, marginBottom: 12 }}>RECENT DELIVERIES</Text>
                {data.recentDeliveries.map((d) => (
                  <View key={d._id} style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: c.text, fontWeight: "800" }}>#{d._id.slice(-6).toUpperCase()}</Text>
                      <Text style={{ color: c.green, fontWeight: "800" }}>{fmt(d.totalAmount)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                      <Text style={{ color: c.sub, fontSize: 11 }}>{d.itemCount} items</Text>
                      {d.durationMinutes !== null && (
                        <Text style={{ color: d.estimatedDeliveryTime !== null && d.durationMinutes <= d.estimatedDeliveryTime ? c.green : c.red, fontSize: 11, fontWeight: "700" }}>
                          {d.durationMinutes} min {d.estimatedDeliveryTime !== null ? `(est ${d.estimatedDeliveryTime})` : ""}
                        </Text>
                      )}
                      <Text style={{ color: c.sub, fontSize: 11, textTransform: "uppercase" }}>{d.paymentMethod}</Text>
                    </View>
                    <Text style={{ color: c.muted, fontSize: 10, marginTop: 4 }}>
                      {new Date(d.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
