import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import API from "../api/api"
import { useVendor } from "../context/VendorContext"
import type { Product } from "../types/product"

const CATEGORIES = ["Grocery", "Food & Beverages", "Electronics", "Fashion", "Pharmacy", "Home & Kitchen", "Beauty", "Sports", "Books", "Other"]

const emptyForm = { name: "", price: 0, stock: 0, category: "", image: "" }

function stockBadge(stock: number) {
  if (stock === 0) return { label: "Out of Stock", cls: "bg-red-500/20 text-red-400 border-red-500/30" }
  if (stock <= 5) return { label: `${stock} left`, cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" }
  return { label: `${stock} in stock`, cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" }
}

export default function Products() {
  const { store } = useVendor()
  const storeId = store?._id ?? ""
  const fileRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchProducts = async () => {
    if (!storeId) return
    try {
      const res = await API.get(`/products/store/${storeId}`)
      setProducts(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error("Failed to load products")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [storeId])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setImageFile(null)
    setImagePreview("")
    setPanelOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, price: p.price, stock: p.stock, category: p.category, image: p.image ?? "" })
    setImagePreview(p.image ?? "")
    setImageFile(null)
    setPanelOpen(true)
  }

  const closePanel = () => { setPanelOpen(false); setEditing(null) }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return form.image
    const fd = new FormData()
    fd.append("image", imageFile)
    const res = await API.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })
    return res.data.imageUrl ?? res.data.url ?? ""
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Product name is required")
    if (form.price <= 0) return toast.error("Price must be greater than 0")
    if (!form.category) return toast.error("Please select a category")
    setSaving(true)
    try {
      const imageUrl = await uploadImage()
      if (editing) {
        await API.put(`/products/${editing._id}`, { ...form, image: imageUrl })
        toast.success("Product updated!")
      } else {
        await API.post("/products/create", { ...form, image: imageUrl, storeId })
        toast.success("Product added!")
      }
      await fetchProducts()
      closePanel()
    } catch {
      toast.error("Failed to save product")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await API.delete(`/products/${id}`)
      setProducts(prev => prev.filter(p => p._id !== id))
      toast.success("Product deleted")
    } catch {
      toast.error("Failed to delete product")
    } finally {
      setDeleting(null)
    }
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === "All" || p.category === filterCategory
    return matchSearch && matchCat
  })

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))]
  const lowStockCount = products.filter(p => p.stock <= 5).length
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Products</h2>
          <p className="text-gray-500 text-sm mt-0.5">{products.length} products in inventory</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/40"
        >
          <span className="text-base">+</span> Add Product
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Products", value: products.length, icon: "📦", color: "text-blue-400" },
          { label: "Low Stock", value: lowStockCount, icon: "⚠️", color: lowStockCount > 0 ? "text-yellow-400" : "text-gray-400" },
          { label: "Inventory Value", value: `${totalValue.toLocaleString("en-IN")}`, icon: "💎", color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xs text-gray-500 font-semibold">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-gray-900 border border-gray-800 text-white placeholder-gray-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                filterCategory === cat
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-800" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-800 rounded w-3/4" />
                <div className="h-2.5 bg-gray-800 rounded w-1/2" />
                <div className="h-5 bg-gray-800 rounded-full w-2/3 mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl py-20 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-400 font-semibold">No products found</p>
          <p className="text-gray-600 text-sm mt-1">{search ? "Try a different search" : "Add your first product to get started"}</p>
          {!search && (
            <button onClick={openAdd} className="mt-4 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors">+ Add Product</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(p => {
            const badge = stockBadge(p.stock)
            return (
              <div key={p._id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 hover:scale-[1.02] transition-all duration-200 group">
                {/* Image */}
                <div className="aspect-square bg-gray-800 relative overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-800 to-gray-900">📦</div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {/* Quick actions overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(p)}
                      className="bg-white/90 hover:bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p._id!)}
                      disabled={deleting === p._id}
                      className="bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === p._id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3 space-y-2">
                  <p className="text-sm font-bold text-white truncate">{p.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-emerald-400">{p.price}</span>
                    <span className="text-xs text-gray-600">{p.category}</span>
                  </div>
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide Panel Overlay */}
      {panelOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closePanel} />}

      {/* Slide Panel */}
      <div className={`fixed right-0 top-0 h-full w-full sm:w-[420px] bg-gray-950 border-l border-gray-800 z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Panel Header */}
        <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-black text-white">{editing ? "Edit Product" : "Add New Product"}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{editing ? "Update product details" : "Fill in the details below"}</p>
          </div>
          <button onClick={closePanel} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-lg">×</button>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Product Image</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-video bg-gray-900 border-2 border-dashed border-gray-700 hover:border-emerald-500/50 rounded-2xl flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <div className="text-3xl mb-2">📷</div>
                  <p className="text-xs text-gray-500">Click to upload image</p>
                </div>
              )}
              {imagePreview && <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Change Image</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Product Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Aashirvaad Atta 5kg"
              className="w-full bg-gray-900 border border-gray-800 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Price () *</label>
              <input
                type="number"
                min="0"
                value={form.price || ""}
                onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="w-full bg-gray-900 border border-gray-800 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Stock Qty *</label>
              <input
                type="number"
                min="0"
                value={form.stock || ""}
                onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                className="w-full bg-gray-900 border border-gray-800 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Category *</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Panel Footer */}
        <div className="px-6 py-5 border-t border-gray-800 flex gap-3 flex-shrink-0">
          <button
            onClick={closePanel}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-emerald-900/40"
          >
            {saving ? "Saving..." : editing ? "Update Product" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  )
}
