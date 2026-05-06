import { Link } from "react-router-dom"

/* ── Mock Dashboard Card ── */
function DashboardPreview() {
  const bars = [30, 52, 41, 67, 55, 78, 62, 88, 74, 91, 83, 100]
  return (
    <div className="relative w-full max-w-[360px] mx-auto">
      <div className="absolute -inset-8 bg-emerald-500/10 rounded-full blur-3xl lm-glow-pulse" />

      <div className="relative bg-gray-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl lm-float">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Revenue · This Month</p>
            <p className="text-white text-3xl font-black mt-1">Rs. 1,24,800</p>
            <p className="text-emerald-400 text-sm font-semibold mt-0.5">up 23.5% from last month</p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full lm-ping-slow" />
            Live
          </div>
        </div>

        <div className="flex items-end gap-1 h-14 mb-5">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-sm transition-all ${i >= 10 ? "bg-emerald-500" : "bg-emerald-500/20"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        <div className="space-y-2.5">
          {[
            { name: "Organic Tomatoes", qty: "2kg", status: "delivered", amt: "Rs. 180" },
            { name: "Basmati Rice 5kg", qty: "1 bag", status: "on-way", amt: "Rs. 520" },
            { name: "Cold Press Oil", qty: "500ml", status: "delivered", amt: "Rs. 340" },
          ].map((o) => (
            <div key={o.name} className="flex items-center justify-between border-t border-white/5 pt-2.5">
              <div>
                <p className="text-white text-xs font-semibold">{o.name}</p>
                <p className="text-gray-500 text-xs">{o.qty}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.status === "delivered" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                  {o.status === "delivered" ? "Done" : "On way"}
                </span>
                <span className="text-white text-xs font-bold">{o.amt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -top-5 -right-6 bg-violet-600/90 backdrop-blur-md border border-violet-400/20 rounded-xl px-4 py-3 shadow-xl lm-float-slow lm-d7">
        <p className="text-violet-200 text-xs">Avg Order Value</p>
        <p className="text-white font-black text-xl">Rs. 347</p>
        <p className="text-violet-300 text-xs">+12% this week</p>
      </div>

      <div className="absolute -bottom-5 -left-6 bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 lm-float-slow lm-d8">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-base flex-shrink-0">
          📦
        </div>
        <div>
          <p className="text-white text-xs font-bold">48 orders today</p>
          <p className="text-gray-400 text-xs">5 need your attention</p>
        </div>
      </div>
    </div>
  )
}

/* ── Bento Feature Card ── */
type FeatureCardProps = { icon: string; title: string; desc: string; tag?: string; accent?: string }

function FeatureCard({ icon, title, desc, tag, accent = "emerald" }: FeatureCardProps) {
  const gradient: Record<string, string> = {
    emerald: "from-emerald-500/8 to-teal-500/4 border-emerald-900/60 hover:border-emerald-700/50",
    violet: "from-violet-500/8 to-purple-500/4 border-violet-900/60 hover:border-violet-700/50",
    blue: "from-blue-500/8 to-cyan-500/4 border-blue-900/60 hover:border-blue-700/50",
    amber: "from-amber-500/8 to-orange-500/4 border-amber-900/60 hover:border-amber-700/50",
    pink: "from-pink-500/8 to-rose-500/4 border-pink-900/60 hover:border-pink-700/50",
    sky: "from-sky-500/8 to-cyan-500/4 border-sky-900/60 hover:border-sky-700/50",
  }
  return (
    <div className={`group relative bg-[#0c0e18] border rounded-2xl p-6 bg-linear-to-br hover:-translate-y-1 transition-all duration-300 ${gradient[accent]}`}>
      {tag && (
        <span className="absolute top-4 right-4 text-xs font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
          {tag}
        </span>
      )}
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-white font-black text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

const FEATURES = [
  { icon: "📦", title: "Smart Inventory", desc: "Real-time stock tracking, low-stock alerts before runouts, and bulk upload for hundreds of SKUs.", accent: "emerald" },
  { icon: "🔮", title: "AI Demand Forecast", tag: "AI", desc: "Our ML model predicts what customers want next week. Restock smarter, waste less, earn more.", accent: "violet" },
  { icon: "📈", title: "Deep Analytics", desc: "Revenue trends, top-performing products, category breakdowns and repeat customer rate — all in charts.", accent: "blue" },
  { icon: "⚡", title: "Real-time Orders", desc: "Live order notifications powered by WebSocket. Accept, reject and update in under a second.", accent: "amber" },
  { icon: "🚚", title: "Delivery Tracking", desc: "Integrated partner network. Track every delivery live, step-by-step, from store to doorstep.", accent: "sky" },
  { icon: "🏪", title: "Multi-store", desc: "Run multiple stores from one account. Switch between locations and manage everything centrally.", accent: "pink" },
]

const TICKER_ITEMS = [
  "Smart Inventory", "Real-time Orders", "AI Demand Forecast",
  "Deep Analytics", "Delivery Tracking", "Instant Alerts",
  "Secure Payments", "Multi-store", "Any Device",
]

const STEPS = [
  { n: "01", icon: "🏪", title: "Create your store", desc: "Sign up in 2 minutes. Add your store name, category, address and you're live." },
  { n: "02", icon: "📦", title: "Add your products", desc: "Upload products with photos, prices and stock levels. Organize by category." },
  { n: "03", icon: "🚀", title: "Start selling", desc: "Accept orders, track deliveries, and watch revenues grow with AI-powered insights." },
]

const STATS = [
  { value: "500+", label: "Active Vendors" },
  { value: "Rs. 2Cr+", label: "GMV Processed" },
  { value: "10K+", label: "Daily Orders" },
  { value: "4.9", label: "Avg Vendor Rating" },
]

export default function Landing() {
  const tickerDouble = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div className="min-h-screen bg-[#060810] text-white overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#060810]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm">🛍️</div>
            <span className="text-lg font-black text-white">LocalMart</span>
            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-1">Vendor</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              Log in
            </Link>
            <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-bold bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-800/50 hover:-translate-y-0.5 transition-all">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-16 lm-dot-grid overflow-hidden">
        <div className="absolute top-[-120px] left-[-180px] w-[700px] h-[600px] bg-emerald-600/12 rounded-full blur-[120px] lm-blob" />
        <div className="absolute top-[80px] right-[-120px] w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[100px] lm-blob lm-d7" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[280px] bg-blue-600/6 rounded-full blur-[100px]" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center w-full">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 lm-slide-up">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full lm-ping-slow" />
              Now with AI Demand Forecasting
            </div>

            <h1 className="text-6xl lg:text-7xl font-black leading-[1.02] mb-6 lm-slide-up lm-d1" style={{ opacity: 0 }}>
              The Vendor<br />
              <span className="lm-shimmer-text">OS for Local</span><br />
              Businesses.
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-lg lm-slide-up lm-d2" style={{ opacity: 0 }}>
              Manage inventory, accept orders, track deliveries and use AI to predict demand —
              all from one beautifully designed dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12 lm-slide-up lm-d3" style={{ opacity: 0 }}>
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-black text-base bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-900/30 hover:shadow-emerald-800/50 hover:-translate-y-0.5 transition-all"
              >
                Start Selling Free
                <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-black text-base border border-white/10 text-white hover:bg-white/5 hover:border-white/20 transition-all"
              >
                Already a vendor? Login
              </Link>
            </div>

            <div className="flex items-center gap-4 lm-slide-up lm-d4" style={{ opacity: 0 }}>
              <div className="flex -space-x-3">
                {["🧑‍🍳", "👩‍🌾", "👨‍🏪", "👩‍🍳", "🧑‍🌾"].map((e, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-linear-to-br from-gray-700 to-gray-800 border-2 border-[#060810] flex items-center justify-center text-base">
                    {e}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-amber-400 text-sm">★★★★★</div>
                <p className="text-gray-500 text-xs mt-0.5">500+ vendors trust LocalMart</p>
              </div>
            </div>
          </div>

          <div className="relative lm-slide-up lm-d5" style={{ opacity: 0 }}>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="border-y border-white/5 bg-white/[0.015] py-4 overflow-hidden">
        <div className="flex lm-marquee whitespace-nowrap">
          {tickerDouble.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 text-sm font-semibold text-gray-600 px-6">
              <span className="w-1 h-1 bg-emerald-500 rounded-full flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES BENTO */}
      <section className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              Built for vendors who<br />
              <span className="lm-shimmer-text">mean business.</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              No bloat. No confusion. Every tool designed around how local vendors actually work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-bold uppercase tracking-widest mb-3">Simple onboarding</p>
            <h2 className="text-4xl font-black text-white">Live in 3 steps.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="text-6xl font-black text-white/4 mb-3 leading-none select-none">{s.n}</div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="text-white font-black text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 border-t border-white/5 bg-white/[0.012]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-10 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-5xl font-black text-white mb-2">{s.value}</p>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-3xl overflow-hidden bg-linear-to-br from-emerald-950 via-[#0c0e18] to-violet-950 border border-white/8 p-16 text-center">
            <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500/8 rounded-full blur-3xl" />
            <div className="relative">
              <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-4">Zero risk · Free forever</p>
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-5 leading-tight">
                Ready to grow your<br />local business?
              </h2>
              <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
                Join 500+ vendors already scaling with LocalMart. Setup takes under 2 minutes — no credit card required.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-base bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-900/40 hover:shadow-emerald-700/50 hover:-translate-y-0.5 transition-all"
              >
                Create Vendor Account — Free →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs">🛍️</div>
            <span className="text-gray-600 text-sm font-bold">LocalMart Vendor Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-700">
            <Link to="/login" className="hover:text-gray-400 transition-colors font-medium">Login</Link>
            <Link to="/register" className="hover:text-gray-400 transition-colors font-medium">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
