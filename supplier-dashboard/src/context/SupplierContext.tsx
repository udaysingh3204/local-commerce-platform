import { createContext, useContext, useState, type ReactNode } from "react"
import API from "../api/api"

type Supplier = {
  _id: string
  name: string
  email: string
  role: string
}

type SupplierContextType = {
  supplier: Supplier | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const SupplierContext = createContext<SupplierContextType | null>(null)

export function SupplierProvider({ children }: { children: ReactNode }) {
  const [supplier, setSupplier] = useState<Supplier | null>(() => {
    try {
      const stored = localStorage.getItem("supplier")
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("supplierToken"))

  const login = async (email: string, password: string) => {
    const res = await API.post("/auth/login", { email, password })
    const { user, token: t } = res.data

    if (user.role !== "supplier") {
      throw new Error("This account is not a supplier account")
    }

    setSupplier(user)
    setToken(t)
    localStorage.setItem("supplier", JSON.stringify(user))
    localStorage.setItem("supplierToken", t)
  }

  const logout = () => {
    setSupplier(null)
    setToken(null)
    localStorage.removeItem("supplier")
    localStorage.removeItem("supplierToken")
  }

  return (
    <SupplierContext.Provider value={{ supplier, token, login, logout }}>
      {children}
    </SupplierContext.Provider>
  )
}

export function useSupplier() {
  const ctx = useContext(SupplierContext)
  if (!ctx) throw new Error("useSupplier must be used within SupplierProvider")
  return ctx
}
