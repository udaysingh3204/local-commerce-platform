import { SupplierProvider, useSupplier } from "./context/SupplierContext"
import Orders from "./pages/Orders"
import Login from "./pages/Login"

function AppContent() {
  const { supplier, logout } = useSupplier()

  if (!supplier) {
    return <Login />
  }

  return (
    <div>
      <div className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center">
        <h1 className="font-bold">Supplier Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{supplier.name}</span>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
      <Orders />
    </div>
  )
}

function App() {
  return (
    <SupplierProvider>
      <AppContent />
    </SupplierProvider>
  )
}

export default App