import { Link } from "react-router-dom"

const features = [
  {
    icon: "📦",
    title: "Smart Inventory",
    desc: "Real-time stock tracking with low-stock alerts. Never run out of your bestsellers again.",
  },
  {
    icon: "🧾",
    title: "Order Management",
    desc: "Accept, track, and fulfill orders with one click. Full order lifecycle in your hands.",
  },
  {
    icon: "📈",
    title: "Deep Analytics",
    desc: "Revenue trends, top products, category breakdowns — all in beautiful charts.",
  },
  {
    icon: "🔮",
    title: "AI Demand Forecast",
    desc: "Predict what customers want before they know it. Restock smarter, earn more.",
  },
  {
    icon: "⚡",
    title: "Real-time Updates",
    desc: "Live order notifications via WebSocket. Stay on top of your business 24/7.",
  },
  {
    icon: "🚚",
    title: "Delivery Tracking",
    desc: "Integrated delivery partner system. Track every order from store to doorstep.",
  },
]

const stats = [
  { value: "500+", label: "Active Vendors" },
  { value: "10K+", label: "Orders Daily" },
  { value: "50+", label: "Cities" },
  { value: "4.9★", label: "Vendor Rating" },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* NAV */}
      <nav className="border-b border-gray-800/60 sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-black text-white">🛍️ LocalMart</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-gray-800 transition-all"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-900/50 transition-all"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08)_0%,transparent_60%)]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Now serving 500+ vendors across India
          </div>

          <h1 className="text-6xl lg:text-7xl font-black leading-[1.05] mb-6">
            Sell more.<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Grow faster.
            </span>
          </h1>

          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            The only vendor platform built for local businesses. Manage your store,
            track orders, and use AI to predict demand — all from one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-xl hover:shadow-emerald-900/50 hover:-translate-y-0.5 transition-all"
            >
              Create Vendor Account — Free
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base border border-gray-700 text-white hover:border-gray-500 hover:bg-gray-800/50 transition-all"
            >
              Already a vendor? Login →
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-gray-800/60 bg-gray-900/30">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-black text-white mb-1">{s.value}</p>
              <p className="text-gray-500 text-sm font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Everything you need to{" "}
              <span className="text-emerald-400">run your store</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Purpose-built tools for local vendors. No complexity, just results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-emerald-800/50 hover:bg-gray-900/80 transition-all"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-white font-black text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative bg-gradient-to-br from-emerald-900/40 to-gray-900 border border-emerald-900/50 rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.07)_0%,transparent_70%)]" />
            <div className="relative">
              <h2 className="text-4xl font-black text-white mb-4">
                Ready to grow your business?
              </h2>
              <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto">
                Join 500+ vendors already selling more with LocalMart. Setup takes under 2 minutes.
              </p>
              <Link
                to="/register"
                className="inline-block px-10 py-4 rounded-2xl font-black text-base bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-xl hover:shadow-emerald-900/50 hover:-translate-y-0.5 transition-all"
              >
                Start Selling Today →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800/60 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-gray-600 text-sm font-black">🛍️ LocalMart Vendor Platform</span>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link to="/login" className="hover:text-gray-400 transition-colors">Login</Link>
            <Link to="/register" className="hover:text-gray-400 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
