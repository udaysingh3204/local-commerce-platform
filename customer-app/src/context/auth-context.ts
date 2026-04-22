import { createContext } from "react"

export type AuthUser = {
  _id: string
  name?: string
  email?: string
  phone?: string
  role?: string
  avatar?: string
  authProvider?: string
}

export type AuthStartup = {
  activeOrders: number
  pendingPayments: number
}

export type AuthContextValue = {
  user: AuthUser | null
  startup: AuthStartup
  authReady: boolean
  login: (userData: AuthUser, token: string, startupData?: Partial<AuthStartup>) => void
  logout: () => void
}

export const AUTH_STORAGE_KEYS = {
  user: "user",
  token: "token",
  startup: "startup",
} as const

export const AuthContext = createContext<AuthContextValue | null>(null)

export const getStoredUser = (): AuthUser | null => {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.user)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEYS.user)
    return null
  }
}

export const getStoredToken = () => localStorage.getItem(AUTH_STORAGE_KEYS.token)

export const getStoredStartup = (): AuthStartup => {
  const stored = localStorage.getItem(AUTH_STORAGE_KEYS.startup)

  if (!stored) {
    return { activeOrders: 0, pendingPayments: 0 }
  }

  try {
    const parsed = JSON.parse(stored) as Partial<AuthStartup>
    return {
      activeOrders: parsed.activeOrders ?? 0,
      pendingPayments: parsed.pendingPayments ?? 0,
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEYS.startup)
    return { activeOrders: 0, pendingPayments: 0 }
  }
}
