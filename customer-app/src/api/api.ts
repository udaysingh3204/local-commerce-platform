import axios from "axios"

const PROD_BACKEND_ORIGIN = "https://local-commerce-platform-production.up.railway.app"

export const BACKEND_ORIGIN = import.meta.env.VITE_SOCKET_URL
  ?? (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "") : undefined)
  ?? (import.meta.env.DEV ? "http://localhost:5000" : PROD_BACKEND_ORIGIN)

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? `${BACKEND_ORIGIN}/api`

const API = axios.create({
  baseURL: API_BASE_URL,
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default API