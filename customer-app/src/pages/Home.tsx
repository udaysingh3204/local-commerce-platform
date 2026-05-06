import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import confetti from "canvas-confetti"
import { toast } from "sonner"
import API from "../api/api"
import { useAuth } from "../context/useAuth"

interface Store {
  _id: string
  storeName: string
  category: string
}

interface LiveCampaign {
  campaignId: string
  name: string
  code?: string | null
  type: string
  daysRemaining?: number
  budgetProgress?: number
  metadata?: {
    audience?: string
    vibe?: string
    quiz?: {
      prompt?: string
    }
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  grocery: "🥦",
  food: "🍔",
  bakery: "🥐",
  pharmacy: "💊",
  home: "🧼",
  fruits: "🍎",
  dairy: "🥛",
  beverages: "🥤",
  "personal-care": "🧴",
  snacks: "🍿",
  default: "🏪",
}

const CATEGORY_COLORS: Record<string, string> = {
  grocery: "from-emerald-400 to-teal-500",
  food: "from-orange-400 to-rose-500",
  bakery: "from-amber-400 to-yellow-500",
  pharmacy: "from-blue-400 to-cyan-500",
  home: "from-cyan-400 to-sky-500",
  fruits: "from-lime-400 to-emerald-500",
  dairy: "from-sky-400 to-indigo-500",
  beverages: "from-cyan-400 to-blue-500",
  "personal-care": "from-pink-400 to-rose-500",
  snacks: "from-yellow-400 to-orange-500",
  default: "from-violet-400 to-pink-500",
}

const STORE_GRADIENTS = [
  "from-violet-500 to-pink-500",
  "from-orange-400 to-rose-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-yellow-400 to-orange-500",
  "from-purple-400 to-indigo-500",
  "from-pink-400 to-fuchsia-500",
  "from-sky-400 to-cyan-500",
]

const CAT_HIGHLIGHTS = [
  { key: "grocery", label: "Grocery", icon: "🥦", bg: "bg-emerald-50 border-emerald-100 hover:border-emerald-300" },
  { key: "food", label: "Food", icon: "🍔", bg: "bg-orange-50 border-orange-100 hover:border-orange-300" },
  { key: "bakery", label: "Bakery", icon: "🥐", bg: "bg-amber-50 border-amber-100 hover:border-amber-300" },
  { key: "pharmacy", label: "Pharmacy", icon: "💊", bg: "bg-blue-50 border-blue-100 hover:border-blue-300" },
  { key: "home", label: "Home Care", icon: "🧼", bg: "bg-cyan-50 border-cyan-100 hover:border-cyan-300" },
  { key: "grocery", label: "Fresh Picks", icon: "🥗", bg: "bg-lime-50 border-lime-100 hover:border-lime-300" },
]

const TICKER = ["🥦 Fresh groceries", "🧼 Home essentials", "🥐 Bakery drops", "💊 Medicine delivery", "🍔 Cafe bites", "⚡ 30 min runs", "🏪 Hyperlocal stores"]

const CULTURE_CARDS = [
  {
    title: "Campus clutch runs",
    body: "Late lecture, no snacks, no problem. Refill essentials, drinks and bakery picks without leaving the hostel or study room.",
    badge: "Student speed",
    icon: "🎒",
  },
  {
    title: "Creator-mode group orders",
    body: "Build one shared cart for game nights, shoots, rehearsals or flat parties, then track the run live with your crew.",
    badge: "Social commerce",
    icon: "📲",
  },
  {
    title: "Mood-based local drops",
    body: "Hot food, fresh groceries, pharmacy top-ups and impulse bakery drops all live in one place instead of five different apps.",
    badge: "One app stack",
    icon: "✨",
  },
]

const POWER_FEATURES = [
  {
    title: "Live courier radar",
    copy: "Real-time delivery tracking now follows your active orders across the app, not just on the map screen.",
    cta: "Track active orders",
    target: "/orders",
  },
  {
    title: "Hyperlocal essentials lane",
    copy: "Search nearby grocery, bakery, food and pharmacy stores from one feed with quick category switching.",
    cta: "Browse stores",
    target: "/",
  },
  {
    title: "Delivery intelligence",
    copy: "Your order history now learns average trip speed, reliability and on-time performance from real delivery data.",
    cta: "View order history",
    target: "/orders",
  },
]

const SEO_FAQ = [
  {
    q: "What can I order on LocalMart in Noida?",
    a: "You can order groceries, bakery items, hot food, pharmacy essentials and everyday neighborhood store products from nearby sellers in Noida.",
  },
  {
    q: "Does LocalMart support live delivery tracking?",
    a: "Yes. Active orders include real-time tracking, courier ETA updates, status notifications and delivery history intelligence.",
  },
  {
    q: "Why use LocalMart instead of a generic marketplace?",
    a: "LocalMart focuses on nearby stores first, so discovery feels hyperlocal, deliveries stay practical and neighborhood businesses stay visible online.",
  },
]

const GROWTH_INTERESTS = ["Late-night essentials", "Campus drops", "Group orders", "Bakery", "Pharmacy", "Groceries", "Home care"]

const CREW_BENEFITS = [
  "Priority access to referral drops and city launches",
  "Campus and apartment-block promo packs for shared ordering",
  "Referral-ready invite code you can paste into group chats instantly",
]

const MISSION_CONTROL = [
  {
    badge: "Radar run",
    title: "Track the drop like it owes you money",
    body: "The customer journey now has a dedicated delivery radar. Follow live route energy instead of refreshing a flat order card.",
    cta: "Open orders",
    target: "/orders",
  },
  {
    badge: "Coupon chaos",
    title: "Earn your discounts instead of begging for them",
    body: "Mission-style coupon puzzles turn checkout into an actual interaction layer, not a dead input box with vibes.",
    cta: "Browse stores",
    target: "/",
  },
  {
    badge: "Crew flywheel",
    title: "Turn one shopper into a whole group order",
    body: "Referral codes, campus waitlists and social-order behavior now sit inside the same growth story instead of random marketing copy.",
    cta: "Copy invite",
    target: "invite",
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [filtered, setFiltered] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [leadName, setLeadName] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadUseCase, setLeadUseCase] = useState("campus-waitlist")
  const [leadInterests, setLeadInterests] = useState<string[]>(["Campus drops", "Group orders"])
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [inviteCode, setInviteCode] = useState("LM-NOIDA-CREW")
  const [liveCampaigns, setLiveCampaigns] = useState<LiveCampaign[]>([])

  useEffect(() => {
    if (!user) return

    setLeadName((current) => current || user.name || "")
    setLeadEmail((current) => current || user.email || "")
    const baseCode = `${(user.name || user.email || "LOCALMART").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}-${(user._id || "CREW").slice(-4).toUpperCase()}`
    setInviteCode(baseCode || "LM-NOIDA-CREW")
  }, [user])

  useEffect(() => {
    API.get(`/stores/nearby?lat=28.5355&lng=77.391`)
      .then(res => { setStores(res.data); setFiltered(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    API.get("/promotions?active=true")
      .then((res) => setLiveCampaigns((res.data?.campaigns || []).slice(0, 3)))
      .catch(() => setLiveCampaigns([]))
  }, [])

  const categories = ["All", ...Array.from(new Set(stores.map(s => s.category).filter(Boolean)))]

  useEffect(() => {
    let result = stores
    if (activeCategory !== "All") result = result.filter(s => s.category === activeCategory)
    if (search.trim()) result = result.filter(s => s.storeName.toLowerCase().includes(search.toLowerCase()))
    setFiltered(result)
  }, [search, activeCategory, stores])

  const tickerDouble = [...TICKER, ...TICKER]

  const toggleInterest = (interest: string) => {
    setLeadInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest].slice(0, 4))
  }

  const handleLeadSubmit = async () => {
    if (!leadEmail.trim()) {
      toast.error("Add an email so we can reserve your slot.")
      return
    }

    setLeadSubmitting(true)

    try {
      await API.post("/growth/leads", {
        name: leadName,
        email: leadEmail,
        phone: leadPhone,
        city: "Noida",
        useCase: leadUseCase,
        source: "customer-homepage",
        referralCode: inviteCode,
        interests: leadInterests,
        metadata: {
          hasAccount: Boolean(user),
          activeCategory,
        },
      })

      setLeadCaptured(true)
      toast.success("You’re on the list. Invite flow is ready.")
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Could not save your spot right now.")
    } finally {
      setLeadSubmitting(false)
    }
  }

  const copyInvite = async () => {
    const shareText = `Join my LocalMart crew in Noida. Use code ${inviteCode} for campus drops, fast essentials and live order tracking.`

    try {
      await navigator.clipboard.writeText(shareText)
      toast.success("Invite copy is on your clipboard.")
    } catch {
      toast.error("Clipboard access is blocked in this browser.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ── */}
      <div className="relative bg-[#1a0533] overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-violet-700/30 rounded-full blur-3xl ca-blob" />
        <div className="absolute top-10 right-0 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl ca-blob ca-d7" />
        <div className="absolute bottom-0 left-1/3 w-72 h-48 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 ca-dot-grid opacity-30" />

        <div className="relative max-w-5xl mx-auto px-6 py-16 pb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-violet-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 ca-slide-up">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full ca-ping-slow" />
            📍 Noida, UP · Delivering now
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.04] mb-5 ca-slide-up ca-d1" style={{ opacity: 0 }}>
            Local stores,<br />
            <span className="ca-shimmer-text">delivered fast.</span>
          </h1>

          <p className="text-violet-300 text-lg mb-10 max-w-md ca-slide-up ca-d2" style={{ opacity: 0 }}>
            Fresh groceries, hot food & more — from neighbourhood stores you love, in 30 minutes. ⚡
          </p>

          {/* Search */}
          <div className="relative max-w-lg ca-slide-up ca-d3" style={{ opacity: 0 }}>
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">🔍</span>
            <input
              className="w-full pl-12 pr-14 py-4 rounded-2xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-xl shadow-violet-900/30 bg-white"
              placeholder="Search stores, groceries, food..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 mt-8 ca-slide-up ca-d4" style={{ opacity: 0 }}>
            {[
              { v: stores.length > 0 ? `${stores.length}+` : "8+", l: "Stores" },
              { v: "~28 min", l: "Avg delivery" },
              { v: "FREE", l: "Delivery fee" },
            ].map(s => (
              <div key={s.l} className="flex items-center gap-1.5">
                <p className="text-white font-black text-lg leading-none">{s.v}</p>
                <p className="text-violet-400 text-xs font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-50" style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }} />
      </div>

      {/* ── TICKER ── */}
      <div className="border-b border-gray-100 bg-white overflow-hidden py-3">
        <div className="flex ca-marquee whitespace-nowrap">
          {tickerDouble.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3 text-xs font-semibold text-gray-400 px-5">
              <span className="w-1 h-1 bg-violet-400 rounded-full shrink-0" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── CATEGORY TILES ── */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <section className="mb-10 rounded-4xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">Why Gen Z keeps this open</p>
              <h2 className="mt-2 text-2xl font-black text-gray-900">Built for fast local life, not slow marketplace sprawl</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                LocalMart is structured around what actually matters in a city like Noida: quick essentials, live tracking, neighborhood discovery and fewer taps between "need it" and "it’s here".
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Search-friendly promise</p>
              <p className="mt-1 text-sm font-black text-violet-700">Fast local delivery from nearby Noida stores</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CULTURE_CARDS.map((card) => (
              <div key={card.title} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="text-3xl">{card.icon}</span>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
                    {card.badge}
                  </span>
                </div>
                <h3 className="text-lg font-black text-gray-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <h2 className="text-lg font-black text-gray-900 mb-4">Shop by Category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CAT_HIGHLIGHTS.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? "All" : cat.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${cat.bg} ${activeCategory === cat.key ? "scale-95 border-violet-400 shadow-lg shadow-violet-100" : ""}`}
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-xs font-bold text-gray-700">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeCategory === cat
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                  : "bg-white text-gray-600 hover:bg-violet-50 border border-gray-200 hover:border-violet-200"
              }`}
            >
              {CATEGORY_ICONS[cat.toLowerCase()] ?? "🏪"} {cat === "All" ? "All Stores" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── STORES GRID ── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <section className="mb-10 rounded-4xl bg-linear-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10">
            <div className="max-w-2xl mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200">Practical product wins</p>
              <h2 className="mt-2 text-2xl font-black">A faster local-commerce stack for everyday runs</h2>
              <p className="mt-2 text-sm leading-6 text-violet-100/80">
                These are real product behaviors already shipping in the app, not placeholder marketing claims.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {POWER_FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                  <h3 className="text-lg font-black">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-violet-100/75">{feature.copy}</p>
                  <button
                    onClick={() => navigate(feature.target)}
                    className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90"
                  >
                    {feature.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-4xl border border-cyan-100 bg-linear-to-br from-cyan-50 via-white to-blue-50 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-600">Mission control</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">The product is growing into a proper local-commerce game loop</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Radar tracking, puzzle-led discounts, referral loops and social ordering are now part of one customer story. This is the shift from delivery app to local-commerce habit.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600">Current state</p>
              <p className="mt-1 text-sm font-black text-slate-900">Interactive, live, and way less basic</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MISSION_CONTROL.map((mission) => (
              <div key={mission.title} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-600">{mission.badge}</p>
                <h3 className="mt-3 text-lg font-black text-slate-950">{mission.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{mission.body}</p>
                <button
                  onClick={() => mission.target === "invite" ? void copyInvite() : navigate(mission.target)}
                  className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:opacity-90"
                >
                  {mission.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {liveCampaigns.length > 0 && (
          <section className="mb-10 rounded-4xl bg-linear-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white overflow-hidden relative">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200">Live campaign radar</p>
                  <h2 className="mt-2 text-2xl font-black">Checkout missions now have a storefront signal too</h2>
                  <p className="mt-2 text-sm leading-6 text-violet-100/80">
                    These campaign spotlights are coming from the same backend metadata that powers the quiz cards in checkout, so the tone and urgency stay aligned before the user even starts paying.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">Campaign continuity</p>
                  <p className="mt-1 text-sm font-black text-white">Discovery and checkout now speak the same language</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {liveCampaigns.map((campaign) => (
                  <div key={campaign.campaignId} className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-200">
                      {campaign.metadata?.audience ? String(campaign.metadata.audience).replace(/_/g, " ") : "all shoppers"}
                    </p>
                    <h3 className="mt-3 text-lg font-black text-white">{campaign.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-violet-100/75">
                      {campaign.metadata?.quiz?.prompt || campaign.metadata?.vibe || "Live promo energy is active right now across the storefront and checkout."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {campaign.code && <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-bold text-white">{campaign.code}</span>}
                      {typeof campaign.daysRemaining === "number" && <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-bold text-violet-100">{campaign.daysRemaining}d left</span>}
                      {typeof campaign.budgetProgress === "number" && <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-bold text-violet-100">{campaign.budgetProgress}% used</span>}
                    </div>
                    <button
                      onClick={() => navigate("/")}
                      className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-90"
                    >
                      Shop this energy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mb-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
          <div className="rounded-4xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="max-w-xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-500">Conversion engine</p>
                <h2 className="mt-2 text-2xl font-black text-gray-900">Join the campus and crew-drop waitlist</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  This is the practical growth layer: collect high-intent local leads, hand them a ready referral code, and turn discovery traffic into measurable launch demand.
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">Current city</p>
                <p className="mt-1 text-sm font-black text-emerald-800">Noida growth queue</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <input
                value={leadName}
                onChange={(event) => setLeadName(event.target.value)}
                placeholder="Your name"
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-400"
              />
              <input
                value={leadEmail}
                onChange={(event) => setLeadEmail(event.target.value)}
                placeholder="College or personal email"
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-400"
              />
              <input
                value={leadPhone}
                onChange={(event) => setLeadPhone(event.target.value)}
                placeholder="WhatsApp number"
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-400"
              />
              <select
                value={leadUseCase}
                onChange={(event) => setLeadUseCase(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-400"
              >
                <option value="campus-waitlist">Campus waitlist</option>
                <option value="apartment-crew">Apartment crew drops</option>
                <option value="creator-community">Creator community orders</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {GROWTH_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full px-3 py-2 text-xs font-bold transition ${leadInterests.includes(interest)
                    ? "bg-emerald-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-700"}`}
                >
                  {interest}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleLeadSubmit}
                disabled={leadSubmitting}
                className="rounded-full bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {leadSubmitting ? "Saving your slot..." : leadCaptured ? "Spot reserved" : "Reserve my crew slot"}
              </button>
              <p className="text-xs font-semibold text-gray-500">High-intent leads are stored in the backend for follow-up campaigns.</p>
            </div>
          </div>

          <div className="rounded-4xl bg-linear-to-br from-emerald-900 via-teal-800 to-slate-900 p-6 text-white shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200">Referral motion</p>
            <h2 className="mt-2 text-2xl font-black">Turn one signup into a whole crew order</h2>
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Your invite code</p>
              <p className="mt-2 text-3xl font-black tracking-wide">{inviteCode}</p>
              <p className="mt-2 text-sm leading-6 text-emerald-50/80">Paste it in college groups, flat chats or creator circles to seed a shared LocalMart launch queue.</p>
              <button
                onClick={copyInvite}
                className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-950 transition hover:opacity-90"
              >
                Copy invite message
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {CREW_BENEFITS.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-emerald-50/85">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-900">
            {loading ? "Finding stores..." : `${filtered.length} store${filtered.length !== 1 ? "s" : ""} nearby`}
          </h2>
          {activeCategory !== "All" && (
            <button onClick={() => setActiveCategory("All")} className="text-xs text-violet-600 font-bold">
              Clear filter ×
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-44 bg-linear-to-br from-gray-100 to-gray-200 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-7xl mb-4">🏜️</div>
            <h3 className="text-xl font-bold text-gray-700">No stores found</h3>
            <p className="text-gray-400 mt-2 mb-6">Try clearing the filter or searching differently</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All") }}
              className="bg-linear-to-r from-violet-600 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all"
            >
              Show all stores
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((store, idx) => {
              const icon  = CATEGORY_ICONS[store.category?.toLowerCase()]  ?? "🏪"
              const grad  = STORE_GRADIENTS[idx % STORE_GRADIENTS.length]
              const cGrad = CATEGORY_COLORS[store.category?.toLowerCase()] ?? CATEGORY_COLORS.default
              // Deterministic ETA from store ID hash (12–38 min)
              const etaSeed = store._id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
              const etaMin = 12 + (etaSeed % 27)
              return (
                <div
                  key={store._id}
                  onClick={() => navigate(`/store/${store._id}`)}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer ca-card"
                >
                  {/* Banner */}
                  <div className={`h-44 bg-linear-to-br ${grad} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_70%_30%,white_0%,transparent_60%)]" />
                    <span className="text-7xl drop-shadow-xl group-hover:scale-110 transition-transform duration-300 select-none relative z-10">
                      {icon}
                    </span>
                    {/* Open badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Open
                    </div>
                    {/* Category gradient bottom */}
                    <div className={`absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-black/20 to-transparent`} />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h2 className="font-black text-gray-900 text-base leading-tight">{store.storeName}</h2>
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-linear-to-r ${cGrad} text-white`}>
                        {store.category || "General"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-lg">⭐ 4.5</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-lg">⚡ {etaMin} min</span>
                      </div>
                      <span className="text-violet-600 font-bold text-xs group-hover:translate-x-1 transition-transform inline-block">
                        View →
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <section className="mt-14 rounded-4xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="max-w-3xl mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">SEO FAQ</p>
            <h2 className="mt-2 text-2xl font-black text-gray-900">Local delivery answers customers actually search for</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              This section helps LocalMart rank for practical local-commerce queries while also explaining the product clearly to new users.
            </p>
          </div>
          <div className="space-y-4">
            {SEO_FAQ.map((item) => (
              <div key={item.q} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="text-base font-black text-gray-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
