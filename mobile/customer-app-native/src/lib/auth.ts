import { createAuthHeaders, CustomerBootstrapResponse, CustomerLoginResponse, fetchJson, MOBILE_STORAGE_KEYS } from "@local-commerce-platform/mobile-shared"
import { API_BASE_URL } from "../config/env"
import { deleteSecureValue, getSecureValue, setSecureValue } from "./secureStore"

export const loginCustomer = (email: string, password: string) => (
  fetchJson<CustomerLoginResponse>(API_BASE_URL, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
)

export const bootstrapCustomer = async () => {
  const token = await getSecureValue(MOBILE_STORAGE_KEYS.customerToken)
  if (!token) return null

  const response = await fetchJson<CustomerBootstrapResponse>(API_BASE_URL, "/api/auth/bootstrap", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return { token, response }
}

export const persistCustomerToken = (token: string) => setSecureValue(MOBILE_STORAGE_KEYS.customerToken, token)

export const clearCustomerToken = () => deleteSecureValue(MOBILE_STORAGE_KEYS.customerToken)