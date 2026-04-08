import type { ReactNode } from "react"
import { useState } from "react"
import { getStoredUser, type AuthUser, AuthContext } from "./auth-context"

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {

  const [user, setUser] = useState<AuthUser | null>(getStoredUser)

  const login = (userData: AuthUser, token: string) => {
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem("token", token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}