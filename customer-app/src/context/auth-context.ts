import { createContext } from "react"

export type AuthUser = {
  _id: string
  name?: string
  email?: string
  phone?: string
  role?: string
}

export type AuthContextValue = {
  user: AuthUser | null
  login: (userData: AuthUser, token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const getStoredUser = (): AuthUser | null => {
  const storedUser = localStorage.getItem("user")

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    localStorage.removeItem("user")
    return null
  }
}
