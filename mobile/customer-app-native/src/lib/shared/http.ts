export const createApiUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

export const fetchJson = async <T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers)

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json")
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(createApiUrl(baseUrl, path), {
    ...init,
    headers,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const createAuthHeaders = (token?: string | null): Record<string, string> => (
  token
    ? { Authorization: `Bearer ${token}` }
    : {}
)