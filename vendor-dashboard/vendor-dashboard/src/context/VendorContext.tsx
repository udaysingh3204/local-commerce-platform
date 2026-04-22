import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import API from "../api/api"

type Vendor = {
  _id: string
  name: string
  email: string
  role: string
  avatar?: string
  authProvider?: string
}

type Store = {
  _id: string
  storeName: string
  category: string
}

type VendorStartup = {
  activeOrders: number
  pendingPayments: number
  storesCount: number
}

type VendorContextType = {
  vendor: Vendor | null
  authReady: boolean
  token: string | null
  store: Store | null
  stores: Store[]
  startup: VendorStartup
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
  selectStore: (store: Store) => void
}

const VendorContext = createContext<VendorContextType | null>(null)

const DEFAULT_STARTUP: VendorStartup = {
  activeOrders: 0,
  pendingPayments: 0,
  storesCount: 0,
}

export function VendorProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(() => {
    try {
      const stored = localStorage.getItem("vendor")
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("vendorToken"))
  const [authReady, setAuthReady] = useState(false)

  const [store, setStore] = useState<Store | null>(() => {
    try {
      const stored = localStorage.getItem("vendorStore")
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [stores, setStores] = useState<Store[]>([])
  const [startup, setStartup] = useState<VendorStartup>(() => {
    try {
      const stored = localStorage.getItem("vendorStartup")
      return stored ? { ...DEFAULT_STARTUP, ...JSON.parse(stored) } : DEFAULT_STARTUP
    } catch {
      return DEFAULT_STARTUP
    }
  })

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem("vendorToken")

      if (!storedToken) {
        setAuthReady(true)
        return
      }

      try {
        const res = await API.get("/auth/bootstrap")
        const user = res.data?.user
        const startupData = {
          activeOrders: res.data?.startup?.activeOrders ?? 0,
          pendingPayments: res.data?.startup?.pendingPayments ?? 0,
          storesCount: res.data?.startup?.storesCount ?? 0,
        }

        if (!user || user.role !== "vendor") {
          throw new Error("Invalid vendor session")
        }

        setVendor(user)
        setToken(storedToken)
        setStartup(startupData)
        localStorage.setItem("vendor", JSON.stringify(user))
        localStorage.setItem("vendorStartup", JSON.stringify(startupData))
      } catch {
        localStorage.removeItem("vendor")
        localStorage.removeItem("vendorToken")
        localStorage.removeItem("vendorStore")
        localStorage.removeItem("vendorStartup")
        setVendor(null)
        setToken(null)
        setStore(null)
        setStartup(DEFAULT_STARTUP)
      } finally {
        setAuthReady(true)
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (vendor && token) {
      API.get(`/stores/vendor/${vendor._id}`)
        .then(res => {
          setStores(res.data)
          if (!store && res.data.length > 0) {
            setStore(res.data[0])
            localStorage.setItem("vendorStore", JSON.stringify(res.data[0]))
          }
        })
        .catch(console.error)
    }
  }, [store, token, vendor])

  const login = async (email: string, password: string) => {
    const res = await API.post("/auth/login", { email, password })
    const { user, token: t } = res.data

    if (user.role !== "vendor") {
      throw new Error("This account is not a vendor account")
    }

    const bootstrapRes = await API.get("/auth/bootstrap", {
      headers: {
        Authorization: `Bearer ${t}`,
      },
    })

    const startupData = {
      activeOrders: bootstrapRes.data?.startup?.activeOrders ?? 0,
      pendingPayments: bootstrapRes.data?.startup?.pendingPayments ?? 0,
      storesCount: bootstrapRes.data?.startup?.storesCount ?? 0,
    }

    setVendor(user)
    setToken(t)
    setStartup(startupData)
    setAuthReady(true)
    localStorage.setItem("vendor", JSON.stringify(user))
    localStorage.setItem("vendorToken", t)
    localStorage.setItem("vendorStartup", JSON.stringify(startupData))
  }

  const loginWithGoogle = async (credential: string) => {
    const res = await API.post("/auth/google", { credential, role: "vendor" })
    const { user, token: t } = res.data

    if (user.role !== "vendor") {
      throw new Error("This Google account is not a vendor account")
    }

    const bootstrapRes = await API.get("/auth/bootstrap", {
      headers: {
        Authorization: `Bearer ${t}`,
      },
    })

    const startupData = {
      activeOrders: bootstrapRes.data?.startup?.activeOrders ?? 0,
      pendingPayments: bootstrapRes.data?.startup?.pendingPayments ?? 0,
      storesCount: bootstrapRes.data?.startup?.storesCount ?? 0,
    }

    setVendor(user)
    setToken(t)
    setStartup(startupData)
    setAuthReady(true)
    localStorage.setItem("vendor", JSON.stringify(user))
    localStorage.setItem("vendorToken", t)
    localStorage.setItem("vendorStartup", JSON.stringify(startupData))
  }

  const logout = () => {
    setVendor(null)
    setToken(null)
    setStore(null)
    setStores([])
    localStorage.removeItem("vendor")
    localStorage.removeItem("vendorToken")
    localStorage.removeItem("vendorStore")
    localStorage.removeItem("vendorStartup")
    setAuthReady(true)
    setStartup(DEFAULT_STARTUP)
  }

  const selectStore = (s: Store) => {
    setStore(s)
    localStorage.setItem("vendorStore", JSON.stringify(s))
  }

  return (
    <VendorContext.Provider value={{ vendor, authReady, token, store, stores, startup, login, loginWithGoogle, logout, selectStore }}>
      {children}
    </VendorContext.Provider>
  )
}

export function useVendor() {
  const ctx = useContext(VendorContext)
  if (!ctx) throw new Error("useVendor must be used within VendorProvider")
  return ctx
}
