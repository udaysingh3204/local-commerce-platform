import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { AppConfig, CustomerAuthUser, CustomerStartup } from "@local-commerce-platform/mobile-shared"
import { fetchJson, MOBILE_STORAGE_KEYS } from "@local-commerce-platform/mobile-shared"
import { bootstrapCustomer, clearCustomerToken, loginCustomer, persistCustomerToken } from "../lib/auth"
import { loadAppConfig } from "../lib/appConfig"
import { getSecureValue } from "../lib/secureStore"
import { API_BASE_URL } from "../config/env"

export type CartItem = {
  product: { _id: string; name: string; price: number; category?: string; description?: string; quantity?: number }
  quantity: number
}

type AppContextValue = {
  appConfig: AppConfig | null
  user: CustomerAuthUser | null
  startup: CustomerStartup
  loading: boolean
  error: string | null
  cartItems: CartItem[]
  cartStoreId: string | null
  cartItemCount: number
  subtotal: number
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  addToCart: (product: CartItem["product"], storeId: string) => boolean  // returns false if store mismatch
  removeFromCart: (productId: string) => void
  increaseQty: (productId: string) => void
  decreaseQty: (productId: string) => void
  clearCart: () => void
  withAuth: <T>(path: string, options?: RequestInit) => Promise<T>
}

const AppContext = createContext<AppContextValue | null>(null)

const CART_KEY = "mobile.customer.cart.v2"
const EMPTY_STARTUP: CustomerStartup = { activeOrders: 0, pendingPayments: 0 }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  const [user, setUser] = useState<CustomerAuthUser | null>(null)
  const [startup, setStartup] = useState<CustomerStartup>(EMPTY_STARTUP)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartStoreId, setCartStoreId] = useState<string | null>(null)
  const cartHydrated = useRef(false)

  // ── Hydrate on boot ──────────────────────────────────────────────────────
  useEffect(() => {
    const hydrate = async () => {
      try {
        const [config, bootstrap, cartPayload] = await Promise.all([
          loadAppConfig(),
          bootstrapCustomer(),
          getSecureValue(CART_KEY),
        ])

        setAppConfig(config)
        if (bootstrap) {
          setUser(bootstrap.response.user || null)
          setStartup(bootstrap.response.startup || EMPTY_STARTUP)
        }

        if (cartPayload) {
          try {
            const parsed = JSON.parse(cartPayload) as { storeId: string | null; items: CartItem[] }
            const safe = Array.isArray(parsed.items)
              ? parsed.items.filter((l) => l?.product?._id && Number(l.quantity) > 0)
              : []
            setCartItems(safe)
            setCartStoreId(parsed.storeId ?? null)
          } catch { /* ignore corrupt cart */ }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Startup failed")
      } finally {
        cartHydrated.current = true
        setLoading(false)
      }
    }
    void hydrate()
  }, [])

  // ── Persist cart ─────────────────────────────────────────────────────────
  const { setSecureValue: ssv } = useMemo(() => {
    // Dynamic import to avoid SSR issues
    const { setSecureValue } = require("../lib/secureStore") as typeof import("../lib/secureStore")
    return { setSecureValue }
  }, [])

  useEffect(() => {
    if (!cartHydrated.current) return
    void ssv(CART_KEY, JSON.stringify({ storeId: cartStoreId, items: cartItems }))
  }, [cartItems, cartStoreId])

  // ── Auth ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const resp = await loginCustomer(email, password)
    await persistCustomerToken(resp.token)
    const bootstrap = await bootstrapCustomer()
    setUser(bootstrap?.response.user || resp.user)
    setStartup(bootstrap?.response.startup || EMPTY_STARTUP)
  }, [])

  const logout = useCallback(async () => {
    // Best-effort: clear push token from server before wiping local session
    try {
      const token = await getSecureValue(MOBILE_STORAGE_KEYS.customerToken)
      if (token) {
        fetch(`${API_BASE_URL}/api/notifications/push-token`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    } catch { /* ignore */ }
    await clearCustomerToken()
    setUser(null)
    setStartup(EMPTY_STARTUP)
    setCartItems([])
    setCartStoreId(null)
  }, [])

  // ── Authenticated fetch ───────────────────────────────────────────────────
  const withAuth = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    const token = await getSecureValue(MOBILE_STORAGE_KEYS.customerToken)
    if (!token) throw new Error("Session expired. Please login.")
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (options?.headers && typeof options.headers === "object" && !Array.isArray(options.headers)) {
      Object.assign(headers, options.headers as Record<string, string>)
    }
    return fetchJson<T>(API_BASE_URL, path, { ...options, headers })
  }, [])

  // ── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = useCallback((product: CartItem["product"], storeId: string): boolean => {
    if (cartStoreId && cartStoreId !== storeId) return false
    if (!cartStoreId) setCartStoreId(storeId)
    setCartItems((prev) => {
      const ex = prev.find((l) => l.product._id === product._id)
      return ex
        ? prev.map((l) => l.product._id === product._id ? { ...l, quantity: l.quantity + 1 } : l)
        : [...prev, { product, quantity: 1 }]
    })
    return true
  }, [cartStoreId])

  const removeFromCart = useCallback((productId: string) => {
    setCartItems((prev) => {
      const next = prev.filter((l) => l.product._id !== productId)
      if (next.length === 0) setCartStoreId(null)
      return next
    })
  }, [])

  const increaseQty = useCallback((productId: string) => {
    setCartItems((prev) => prev.map((l) => l.product._id === productId ? { ...l, quantity: l.quantity + 1 } : l))
  }, [])

  const decreaseQty = useCallback((productId: string) => {
    setCartItems((prev) => {
      const next = prev
        .map((l) => l.product._id === productId ? { ...l, quantity: l.quantity - 1 } : l)
        .filter((l) => l.quantity > 0)
      if (next.length === 0) setCartStoreId(null)
      return next
    })
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
    setCartStoreId(null)
  }, [])

  const cartItemCount = useMemo(() => cartItems.reduce((s, l) => s + l.quantity, 0), [cartItems])
  const subtotal = useMemo(() => cartItems.reduce((s, l) => s + l.product.price * l.quantity, 0), [cartItems])

  const value = useMemo<AppContextValue>(() => ({
    appConfig, user, startup, loading, error,
    cartItems, cartStoreId, cartItemCount, subtotal,
    login, logout, addToCart, removeFromCart, increaseQty, decreaseQty, clearCart, withAuth,
  }), [appConfig, user, startup, loading, error, cartItems, cartStoreId, cartItemCount, subtotal,
    login, logout, addToCart, removeFromCart, increaseQty, decreaseQty, clearCart, withAuth])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used inside AppProvider")
  return ctx
}
