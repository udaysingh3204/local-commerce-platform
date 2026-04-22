import { createContext, useContext, useState, type ReactNode } from "react"
import { useEffect } from "react"
import API from "../api/api"

type Supplier = {
  _id: string
  name: string
  email: string
  role: string
  avatar?: string
  authProvider?: string
}

type SupplierContextType = {
  supplier: Supplier | null
  startup: {
    wholesaleOrders: number
    productLines: number
  }
  authReady: boolean
  token: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
}

const SupplierContext = createContext<SupplierContextType | null>(null)

const DEFAULT_STARTUP = {
  wholesaleOrders: 0,
  productLines: 0,
}

export function SupplierProvider({ children }: { children: ReactNode }) {
  const [supplier, setSupplier] = useState<Supplier | null>(() => {
    try {
      const stored = localStorage.getItem("supplier")
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("supplierToken"))
  const [authReady, setAuthReady] = useState(false)
  const [startup, setStartup] = useState(() => {
    try {
      const stored = localStorage.getItem("supplierStartup")
      return stored ? { ...DEFAULT_STARTUP, ...JSON.parse(stored) } : DEFAULT_STARTUP
    } catch {
      return DEFAULT_STARTUP
    }
  })

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem("supplierToken")

      if (!storedToken) {
        setAuthReady(true)
        return
      }

      try {
        const res = await API.get("/auth/bootstrap")
        const user = res.data?.user
        const startupData = {
          wholesaleOrders: res.data?.startup?.wholesaleOrders ?? 0,
          productLines: res.data?.startup?.productLines ?? 0,
        }

        if (!user || user.role !== "supplier") {
          throw new Error("Invalid supplier session")
        }

        setSupplier(user)
        setToken(storedToken)
        setStartup(startupData)
        localStorage.setItem("supplier", JSON.stringify(user))
        localStorage.setItem("supplierStartup", JSON.stringify(startupData))
      } catch {
        localStorage.removeItem("supplier")
        localStorage.removeItem("supplierToken")
        localStorage.removeItem("supplierStartup")
        setSupplier(null)
        setToken(null)
        setStartup(DEFAULT_STARTUP)
      } finally {
        setAuthReady(true)
      }
    }

    restoreSession()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await API.post("/auth/login", { email, password })
    const { user, token: t } = res.data

    if (user.role !== "supplier") {
      throw new Error("This account is not a supplier account")
    }

    const bootstrapRes = await API.get("/auth/bootstrap", {
      headers: {
        Authorization: `Bearer ${t}`,
      },
    })

    const startupData = {
      wholesaleOrders: bootstrapRes.data?.startup?.wholesaleOrders ?? 0,
      productLines: bootstrapRes.data?.startup?.productLines ?? 0,
    }

    setSupplier(user)
    setToken(t)
    setStartup(startupData)
    setAuthReady(true)
    localStorage.setItem("supplier", JSON.stringify(user))
    localStorage.setItem("supplierToken", t)
    localStorage.setItem("supplierStartup", JSON.stringify(startupData))
  }

  const loginWithGoogle = async (credential: string) => {
    const res = await API.post("/auth/google", { credential, role: "supplier" })
    const { user, token: t } = res.data

    if (user.role !== "supplier") {
      throw new Error("This Google account is not a supplier account")
    }

    const bootstrapRes = await API.get("/auth/bootstrap", {
      headers: {
        Authorization: `Bearer ${t}`,
      },
    })

    const startupData = {
      wholesaleOrders: bootstrapRes.data?.startup?.wholesaleOrders ?? 0,
      productLines: bootstrapRes.data?.startup?.productLines ?? 0,
    }

    setSupplier(user)
    setToken(t)
    setStartup(startupData)
    setAuthReady(true)
    localStorage.setItem("supplier", JSON.stringify(user))
    localStorage.setItem("supplierToken", t)
    localStorage.setItem("supplierStartup", JSON.stringify(startupData))
  }

  const logout = () => {
    setSupplier(null)
    setToken(null)
    localStorage.removeItem("supplier")
    localStorage.removeItem("supplierToken")
    localStorage.removeItem("supplierStartup")
    setStartup(DEFAULT_STARTUP)
    setAuthReady(true)
  }

  return (
    <SupplierContext.Provider value={{ supplier, startup, authReady, token, login, loginWithGoogle, logout }}>
      {children}
    </SupplierContext.Provider>
  )
}

export function useSupplier() {
  const ctx = useContext(SupplierContext)
  if (!ctx) throw new Error("useSupplier must be used within SupplierProvider")
  return ctx
}
