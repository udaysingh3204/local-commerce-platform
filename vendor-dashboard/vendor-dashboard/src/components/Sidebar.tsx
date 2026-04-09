import { Link } from "react-router-dom"
import { useVendor } from "../context/VendorContext"

export default function Sidebar() {
  const { vendor, store, stores, selectStore, logout } = useVendor()

  return (
    <div style={{
      width: "220px",
      background: "#111827",
      color: "white",
      padding: "20px",
      display: "flex",
      flexDirection: "column"
    }}>
      <h2 className="text-lg font-bold">Vendor Panel</h2>
      {vendor && (
        <p className="text-sm text-gray-400 mt-1">{vendor.name}</p>
      )}

      {stores.length > 1 && (
        <select
          value={store?._id || ""}
          onChange={(e) => {
            const s = stores.find(st => st._id === e.target.value)
            if (s) selectStore(s)
          }}
          className="mt-3 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
        >
          {stores.map(s => (
            <option key={s._id} value={s._id}>{s.storeName}</option>
          ))}
        </select>
      )}

      {store && (
        <p className="text-xs text-gray-500 mt-1">{store.storeName}</p>
      )}

      <nav style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px", flex: 1 }}>
        <Link to="/" style={{ color: "white" }}>Dashboard</Link>
        <Link to="/create-store" style={{ color: "white" }}>Create Store</Link>
        <Link to="/products" style={{ color: "white" }}>Products</Link>
        <Link to="/orders" style={{ color: "white" }}>Orders</Link>
        <Link to="/analytics" style={{ color: "white" }}>Analytics</Link>
      </nav>

      <button
        onClick={logout}
        className="mt-auto bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  )
}