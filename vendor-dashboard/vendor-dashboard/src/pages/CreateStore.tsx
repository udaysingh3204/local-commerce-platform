import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import API from "../api/api"
import { useVendor } from "../context/VendorContext"

const CATEGORIES = [
  "Grocery & Supermarket", "Restaurant & Food", "Pharmacy & Medical",
  "Electronics & Mobile", "Fashion & Clothing", "Home & Furniture",
  "Beauty & Wellness", "Sports & Fitness", "Books & Stationary", "Other"
]

export default function CreateStore() {
  const { vendor } = useVendor()
  const navigate = useNavigate()
  const [form, setForm] = useState({ storeName: "", category: "", lat: "", lng: "" })
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [done, setDone] = useState(false)

  const getLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported by your browser")
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }))
        toast.success("Location detected!")
        setLocating(false)
      },
      () => {
        toast.error("Location access denied. Enter coordinates manually.")
        setLocating(false)
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.storeName.trim()) return toast.error("Store name is required")
    if (!form.category)        return toast.error("Please select a category")
    if (!form.lat || !form.lng) return toast.error("Location is required")
    const lat = parseFloat(form.lat)
    const lng = parseFloat(form.lng)
    if (isNaN(lat) || lat < -90  || lat > 90)  return toast.error("Invalid latitude (must be -90 to 90)")
    if (isNaN(lng) || lng < -180 || lng > 180) return toast.error("Invalid longitude (must be -180 to 180)")

    setLoading(true)
    try {
      await API.post("/stores", {
        storeName: form.storeName.trim(),
        category:  form.category,
        vendorId:  vendor?._id,
        location: { type: "Point", coordinates: [lng, lat] },
      })
      toast.success("Store created successfully!")
      setDone(true)
      setTimeout(() => navigate("/"), 1500)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create store")
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="max-w-xl mx-auto mt-20 text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-4xl">🎉</div>
      <h2 className="text-2xl font-black text-white">Store Created!</h2>
      <p className="text-gray-400">Redirecting to your dashboard...</p>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Create Store</h2>
        <p className="text-gray-500 text-sm mt-0.5">Set up your storefront to start selling</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
        {/* Store Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Store Name *</label>
          <input
            value={form.storeName}
            onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
            placeholder="e.g. Fresh Mart Jubilee Hills"
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Category *</label>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Store Location *</label>
            <button
              type="button"
              onClick={getLocation}
              disabled={locating}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {locating ? "Detecting..." : "📍 Use My Location"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Latitude</label>
              <input
                value={form.lat}
                onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                placeholder="17.385044"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Longitude</label>
              <input
                value={form.lng}
                onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                placeholder="78.486671"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
              />
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">Click "Use My Location" to auto-detect, or enter coordinates manually.</p>
        </div>

        {/* Preview Card */}
        {(form.storeName || form.category) && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">🏪</div>
              <div>
                <p className="font-bold text-white">{form.storeName || "Store Name"}</p>
                <p className="text-xs text-gray-400">{form.category || "Category"} {form.lat && form.lng ? `· ${form.lat}, ${form.lng}` : ""}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/40 text-sm"
        >
          {loading ? "Creating Store..." : "Create Store"}
        </button>
      </form>
    </div>
  )
}
