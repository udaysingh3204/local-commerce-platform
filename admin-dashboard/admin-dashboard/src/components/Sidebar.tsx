import { Link } from "react-router-dom"

export default function Sidebar() {

  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-6">

      <h1 className="text-2xl font-bold mb-8">
        Admin Panel
      </h1>

      <nav className="space-y-4">

        <Link to="/" className="block hover:text-yellow-400">
          Dashboard
        </Link>

        <Link to="/users" className="block hover:text-yellow-400">
          Users
        </Link>

        <Link to="/stores" className="block hover:text-yellow-400">
          Stores
        </Link>

        <Link to="/orders" className="block hover:text-yellow-400">
          Orders
        </Link>

        <Link to="/suppliers" className="block hover:text-yellow-400">
          Suppliers
        </Link>

        <Link to="/delivery" className="block hover:text-yellow-400">
          Delivery
        </Link>

      </nav>

    </div>
  )

}