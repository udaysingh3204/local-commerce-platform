import { createAuthHeaders, DriverBootstrapResponse, DriverLoginResponse, fetchJson, MOBILE_STORAGE_KEYS } from "@local-commerce-platform/mobile-shared"
import { API_BASE_URL } from "../config/env"
import { deleteSecureValue, getSecureValue, setSecureValue } from "./secureStore"

export const loginDriver = (email: string, password: string) => (
  fetchJson<DriverLoginResponse>(API_BASE_URL, "/api/driver/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
)

export const bootstrapDriver = async () => {
  const token = await getSecureValue(MOBILE_STORAGE_KEYS.driverToken)
  if (!token) return null

  const response = await fetchJson<DriverBootstrapResponse>(API_BASE_URL, "/api/driver/bootstrap", {
    headers: createAuthHeaders(token),
  })

  return { token, response }
}

export const persistDriverToken = (token: string) => setSecureValue(MOBILE_STORAGE_KEYS.driverToken, token)

export const clearDriverToken = () => deleteSecureValue(MOBILE_STORAGE_KEYS.driverToken)