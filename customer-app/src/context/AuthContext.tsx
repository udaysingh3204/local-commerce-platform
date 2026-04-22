import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import API from "../api/api"
import { AUTH_STORAGE_KEYS, getStoredStartup, getStoredToken, getStoredUser, type AuthStartup, type AuthUser, AuthContext } from "./auth-context"

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {

  const [user, setUser] = useState<AuthUser | null>(getStoredUser)
  const [startup, setStartup] = useState<AuthStartup>(getStoredStartup)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredToken()

      if (!token) {
        setAuthReady(true)
        return
      }

      try {
        const res = await API.get("/auth/bootstrap")
        const nextUser = res.data?.user ?? null
        const nextStartup = {
          activeOrders: res.data?.startup?.activeOrders ?? 0,
          pendingPayments: res.data?.startup?.pendingPayments ?? 0,
        }

        if (nextUser) {
          localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(nextUser))
          localStorage.setItem(AUTH_STORAGE_KEYS.startup, JSON.stringify(nextStartup))
          setUser(nextUser)
          setStartup(nextStartup)
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEYS.user)
          localStorage.removeItem(AUTH_STORAGE_KEYS.token)
          localStorage.removeItem(AUTH_STORAGE_KEYS.startup)
          setUser(null)
          setStartup({ activeOrders: 0, pendingPayments: 0 })
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEYS.user)
        localStorage.removeItem(AUTH_STORAGE_KEYS.token)
        localStorage.removeItem(AUTH_STORAGE_KEYS.startup)
        setUser(null)
        setStartup({ activeOrders: 0, pendingPayments: 0 })
      } finally {
        setAuthReady(true)
      }
    }

    restoreSession()
  }, [])

  const login = (userData: AuthUser, token: string, startupData?: Partial<AuthStartup>) => {
    const nextStartup = {
      activeOrders: startupData?.activeOrders ?? 0,
      pendingPayments: startupData?.pendingPayments ?? 0,
    }
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(userData))
    localStorage.setItem(AUTH_STORAGE_KEYS.token, token)
    localStorage.setItem(AUTH_STORAGE_KEYS.startup, JSON.stringify(nextStartup))
    setUser(userData)
    setStartup(nextStartup)
    setAuthReady(true)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEYS.user)
    localStorage.removeItem(AUTH_STORAGE_KEYS.token)
    localStorage.removeItem(AUTH_STORAGE_KEYS.startup)
    setUser(null)
    setStartup({ activeOrders: 0, pendingPayments: 0 })
    setAuthReady(true)
  }

  return (
    <AuthContext.Provider value={{ user, startup, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}