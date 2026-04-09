import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import API from "../api/api"

type Vendor = {
  _id: string
  name: string
  email: string
  role: string
}

type Store = {
  _id: string
  storeName: string
  category: string
}

type VendorContextType = {
  vendor: Vendor | null
  token: string | null
  store: Store | null
  stores: Store[]
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  selectStore: (store: Store) => void
}

const VendorContext = createContext<VendorContextType | null>(null)

export function VendorProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(() => {
    try {
      const stored = localStorage.getItem("vendor")
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("vendorToken"))

  const [store, setStore] = useState<Store | null>(() => {
    try {
      const stored = localStorage.getItem("vendorStore")
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [stores, setStores] = useState<Store[]>([])

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
  }, [vendor, token])

  const login = async (email: string, password: string) => {
    const res = await API.post("/auth/login", { email, password })
    const { user, token: t } = res.data

    if (user.role !== "vendor") {
      throw new Error("This account is not a vendor account")
    }

    setVendor(user)
    setToken(t)
    localStorage.setItem("vendor", JSON.stringify(user))
    localStorage.setItem("vendorToken", t)
  }

  const logout = () => {
    setVendor(null)
    setToken(null)
    setStore(null)
    setStores([])
    localStorage.removeItem("vendor")
    localStorage.removeItem("vendorToken")
    localStorage.removeItem("vendorStore")
  }

  const selectStore = (s: Store) => {
    setStore(s)
    localStorage.setItem("vendorStore", JSON.stringify(s))
  }

  return (
    <VendorContext.Provider value={{ vendor, token, store, stores, login, logout, selectStore }}>
      {children}
    </VendorContext.Provider>
  )
}

export function useVendor() {
  const ctx = useContext(VendorContext)
  if (!ctx) throw new Error("useVendor must be used within VendorProvider")
  return ctx
}
