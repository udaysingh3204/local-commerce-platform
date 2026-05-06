import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 select-none">
        <span className="text-8xl">🛍️</span>
      </div>
      <h1 className="text-3xl font-black text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-400 text-sm max-w-xs mb-8 leading-relaxed">
        Looks like this page got lost in the neighbourhood. Let's get you back home.
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all shadow-lg shadow-violet-200"
        >
          Go home
        </Link>
        <Link
          to="/search"
          className="px-6 py-3 rounded-xl bg-white border border-gray-200 hover:border-violet-300 text-gray-700 font-bold text-sm transition-all"
        >
          Search products
        </Link>
      </div>
      <p className="mt-10 text-xs text-gray-300 font-mono">404</p>
    </div>
  )
}
