import { useEffect, useState } from "react"
import API from "../api/api"
import { useVendor } from "../context/VendorContext"

const URGENCY = (predicted: number, stock: number): { label: string; cls: string; icon: string } => {
  const ratio = stock / Math.max(predicted, 1)
  if (ratio < 0.3 || stock === 0) return { label: "Critical", cls: "bg-red-500/20 text-red-400 border-red-500/30",    icon: "🔴" }
  if (ratio < 0.7)                return { label: "High",    cls: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: "🟠" }
  if (ratio < 1.2)                return { label: "Medium",  cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: "🟡" }
  return                               { label: "Good",    cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: "🟢" }
}

export default function DemandPrediction() {
  const { store } = useVendor()
  const storeId = store?._id ?? ""
  const [predictions, setPredictions] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!storeId) return
    Promise.all([
      API.get(`/predictions/${storeId}`).catch(() => ({ data: { predictions: [] } })),
      API.get(`/products/store/${storeId}`).catch(() => ({ data: [] })),
    ]).then(([predRes, prodRes]) => {
      setPredictions(predRes.data?.predictions ?? [])
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : [])
    }).finally(() => setLoading(false))
  }, [storeId])

  const productMap = Object.fromEntries(products.map(p => [p._id, p]))

  const critical = predictions.filter(([id, pred]: any) => {
    const p = productMap[id]
    return p && p.stock / Math.max(pred, 1) < 0.7
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-white">Demand Forecast</h2>
        <p className="text-gray-500 text-sm mt-0.5">AI-powered predictions to optimize your inventory</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Products Tracked", value: predictions.length, icon: "🔮", color: "text-blue-400", bg: "from-blue-500/15" },
          { label: "Critical Restocks", value: critical.length, icon: "🚨", color: critical.length > 0 ? "text-red-400" : "text-gray-400", bg: "from-red-500/15" },
          { label: "Healthy Stock", value: predictions.length - critical.length, icon: "✅", color: "text-emerald-400", bg: "from-emerald-500/15" },
        ].map(s => (
          <div key={s.label} className={`bg-linear-to-br ${s.bg} to-transparent border border-gray-800 rounded-2xl p-4 flex items-center gap-4`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xs text-gray-500 font-semibold">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <span className="text-xl mt-0.5">💡</span>
        <div>
          <p className="text-sm font-bold text-blue-300">How predictions work</p>
          <p className="text-xs text-blue-400/80 mt-0.5">
            Our AI analyzes your order history to forecast expected demand for the next 7 days.
            Restock products marked "Critical" or "High" urgency to avoid stockouts.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-4 w-3/4 bg-gray-800 rounded" />
              <div className="h-3 w-1/2 bg-gray-800 rounded" />
              <div className="h-8 bg-gray-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : predictions.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl py-20 text-center">
          <div className="text-5xl mb-3">🔮</div>
          <p className="text-gray-400 font-semibold">No predictions available yet</p>
          <p className="text-gray-600 text-sm mt-1">Generate more sales data to get AI-powered forecasts</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {predictions.map(([productId, predicted]: any) => {
            const product = productMap[productId]
            const stock = product?.stock ?? 0
            const urgency = URGENCY(predicted, stock)
            const restockQty = Math.max(0, Math.ceil(predicted * 1.5) - stock)

            return (
              <div key={productId} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4 hover:border-gray-700 transition-colors">
                {/* Product info */}
                <div className="flex items-start gap-3">
                  {product?.image ? (
                    <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-800 flex-shrink-0 flex items-center justify-center text-xl">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{product?.name ?? productId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{product?.category ?? "Unknown category"}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${urgency.cls}`}>
                    {urgency.icon} {urgency.label}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/60 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Predicted Demand</p>
                    <p className="text-lg font-black text-blue-400">{predicted}</p>
                    <p className="text-xs text-gray-600">next 7 days</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Current Stock</p>
                    <p className={`text-lg font-black ${stock === 0 ? "text-red-400" : stock <= 5 ? "text-yellow-400" : "text-emerald-400"}`}>{stock}</p>
                    <p className="text-xs text-gray-600">units left</p>
                  </div>
                </div>

                {/* Restock suggestion */}
                {restockQty > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-orange-300">Restock Needed</p>
                      <p className="text-xs text-orange-400/80">Order {restockQty} more units</p>
                    </div>
                    <span className="text-lg font-black text-orange-400">+{restockQty}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
