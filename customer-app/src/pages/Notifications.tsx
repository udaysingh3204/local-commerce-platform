import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import API from "../api/api"
import { useAuth } from "../context/useAuth"

type NotificationItem = {
  _id: string
  title?: string
  message: string
  type?: string
  isRead?: boolean
  createdAt?: string
  orderId?: string | null
}

type NotificationsResponse = {
  notifications?: NotificationItem[]
  unreadCount?: number
}

const TYPE_ICON: Record<string, string> = {
  order: "🛍️",
  delivery: "🚚",
  payment: "💳",
  promo: "🎟️",
  system: "📢",
  chat: "💬",
}

const TYPE_LABEL: Record<string, string> = {
  order: "Order tea",
  delivery: "Courier energy",
  payment: "Money move",
  promo: "Savings drama",
  system: "App broadcast",
  chat: "Support chat",
}

const fmtDate = (iso?: string) => {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export default function Notifications() {
  const { user, authReady } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const load = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true)
    else setRefreshing(true)

    try {
      const { data } = await API.get<NotificationsResponse>("/notifications?limit=50&sort=-createdAt")
      setItems(data.notifications || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Could not load notifications")
    } finally {
      if (mode === "initial") setLoading(false)
      else setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      navigate("/login")
      return
    }
    void load()
  }, [authReady, navigate, user])

  const unread = useMemo(() => items.filter((item) => !item.isRead).length, [items])
  const unreadPromoCount = useMemo(() => items.filter((item) => !item.isRead && item.type === "promo").length, [items])
  const unreadOrderCount = useMemo(() => items.filter((item) => !item.isRead && ["order", "delivery"].includes(item.type ?? "")).length, [items])
  const latestType = items[0]?.type ?? "system"

  const missionInbox = [
    {
      key: "promo-mission",
      icon: "🧪",
      label: unreadPromoCount > 0 ? `${unreadPromoCount} live` : "Warm",
      title: "Coupon missions still have motion",
      body: unreadPromoCount > 0
        ? "Promo alerts are waiting. Head to checkout and let the quiz deck squeeze the basket harder."
        : "No fresh promo ping yet, but the coupon lab is still active whenever your next cart wakes up.",
      cta: "Open checkout",
      onPress: () => navigate("/checkout"),
      tone: "from-blue-50 to-cyan-50 border-blue-100 text-blue-700",
    },
    {
      key: "order-mission",
      icon: "🛰️",
      label: unreadOrderCount > 0 ? `${unreadOrderCount} alerts` : "Steady",
      title: "Order radar stays hot",
      body: unreadOrderCount > 0
        ? "Order and delivery pings are stacking. Tap through and keep the live-run story moving."
        : "No urgent delivery chaos right now. Your order feed is clean and under control.",
      cta: "Open orders",
      onPress: () => navigate("/orders"),
      tone: "from-violet-50 to-fuchsia-50 border-violet-100 text-violet-700",
    },
    {
      key: "wishlist-mission",
      icon: "✨",
      label: latestType === "promo" ? "Offer mode" : "Discovery",
      title: "Keep the growth loop alive",
      body: "Notifications, wishlist energy, and reward receipts now belong to the same customer story instead of separate dead ends.",
      cta: "Browse wishlist",
      onPress: () => navigate("/wishlist"),
      tone: "from-amber-50 to-orange-50 border-amber-100 text-amber-700",
    },
  ]

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await API.patch("/notifications/mark-all-read")
      setItems((current) => current.map((item) => ({ ...item, isRead: true })))
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Could not mark all as read")
    } finally {
      setMarkingAll(false)
    }
  }

  const markOneRead = async (id: string) => {
    setItems((current) => current.map((item) => item._id === id ? { ...item, isRead: true } : item))
    try {
      await API.patch(`/notifications/${id}/read`)
    } catch {
      // Optimistic update is enough here.
    }
  }

  const handleTap = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markOneRead(item._id)
    }
    if (item.orderId) {
      navigate(`/track/${item.orderId}`)
    }
  }

  if (!authReady || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative overflow-hidden bg-linear-to-br from-slate-950 via-violet-950 to-fuchsia-900 px-6 py-10 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.18),transparent_30%)]" />
        <div className="relative max-w-6xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white transition">← Home</Link>
          <div className="mt-5 flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-200">Signal feed</p>
              <h1 className="mt-2 text-4xl font-black leading-tight">Notifications finally feel like part of the product, not an afterthought.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100/80">
                Order pings, promo heat, and app updates now live in a single mission-style inbox with the same energy as checkout and orders.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Unread right now</p>
              <p className="mt-1 text-3xl font-black text-white">{unread}</p>
              <p className="mt-1 text-xs text-violet-100/75">Latest vibe: {TYPE_LABEL[latestType] ?? "App broadcast"}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Promo heat</p>
              <p className="mt-2 text-2xl font-black text-white">{unreadPromoCount}</p>
              <p className="mt-1 text-xs text-violet-100/80">Unread savings alerts still in the feed</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Order radar</p>
              <p className="mt-2 text-2xl font-black text-white">{unreadOrderCount}</p>
              <p className="mt-1 text-xs text-violet-100/80">Delivery and order alerts waiting for a tap</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">Control</p>
              <button
                onClick={() => void markAllRead()}
                disabled={markingAll || unread === 0}
                className="mt-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? "Clearing..." : unread > 0 ? "Mark all read" : "All clear"}
              </button>
              <button
                onClick={() => void load("refresh")}
                disabled={refreshing}
                className="mt-2 ml-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {missionInbox.map((mission) => (
            <button
              key={mission.key}
              onClick={mission.onPress}
              className={`rounded-3xl border bg-linear-to-br ${mission.tone} p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">{mission.label}</p>
                  <h2 className="mt-2 text-lg font-black text-slate-950">{mission.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{mission.body}</p>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.18em]">{mission.cta} →</p>
                </div>
                <span className="text-3xl">{mission.icon}</span>
              </div>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="rounded-3xl border border-gray-100 bg-white p-5 animate-pulse">
                <div className="h-3 w-24 rounded-full bg-gray-100" />
                <div className="mt-3 h-5 w-64 rounded-full bg-gray-100" />
                <div className="mt-2 h-4 w-full rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-[32px] border border-dashed border-violet-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-6xl">🔔</div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">All caught up</h2>
            <p className="mt-2 text-sm text-slate-500">New offer pings, order alerts, and broadcast updates will land here.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <button
                key={item._id}
                onClick={() => void handleTap(item)}
                className={`group w-full overflow-hidden rounded-[28px] border p-[1px] text-left transition hover:-translate-y-0.5 hover:shadow-lg ${item.isRead ? "border-gray-200 bg-white" : "border-violet-200 bg-linear-to-r from-violet-500/20 via-pink-500/10 to-cyan-500/20"}`}
              >
                <div className={`rounded-[calc(1.75rem-1px)] px-5 py-5 ${item.isRead ? "bg-white" : "bg-white/95 backdrop-blur-sm"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.isRead ? "bg-gray-100" : "bg-violet-100"}`}>
                      <span className="text-xl">{TYPE_ICON[item.type ?? ""] ?? "🔔"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-500">{(TYPE_LABEL[item.type ?? ""] ?? "App broadcast")}</p>
                          <h3 className={`mt-2 text-lg leading-tight text-slate-950 ${item.isRead ? "font-bold" : "font-black"}`}>{item.title || "LocalMart update"}</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!item.isRead && <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />}
                          <span className="text-xs font-semibold text-slate-400">{fmtDate(item.createdAt)}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {item.orderId && (
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">Track order</span>
                        )}
                        {!item.isRead && (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">Unread</span>
                        )}
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400 group-hover:text-violet-500">Open →</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}