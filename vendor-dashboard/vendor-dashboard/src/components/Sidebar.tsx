import { Link } from "react-router-dom"

export default function Sidebar() {
  return (
    <div style={{
      width: "220px",
      background: "#111827",
      color: "white",
      padding: "20px"
    }}>
      <h2>Vendor Panel</h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
        <Link to="/" style={{ color: "white" }}>Dashboard</Link>
        <Link to="/create-store" style={{ color: "white" }}>Create Store</Link>
        <Link to="/products" style={{ color: "white" }}>Products</Link>
        <Link to="/orders" style={{ color: "white" }}>Orders</Link>
        <Link to="/analytics" style={{ color: "white" }}>Analytics</Link>
      </nav>
    </div>
  )
}