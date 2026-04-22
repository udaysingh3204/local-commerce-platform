const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "")

const getWebDefaultBaseUrl = () => {
	if (typeof window === "undefined") return null

	const { hostname } = window.location
	if (hostname === "localhost" || hostname === "127.0.0.1") {
		return "http://localhost:5000"
	}

	return `http://${hostname}:5000`
}

const resolveApiBaseUrl = () => {
	const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
	const webBaseUrl = getWebDefaultBaseUrl()

	if (webBaseUrl) {
		return normalizeBaseUrl(webBaseUrl)
	}

	if (envBaseUrl) {
		return normalizeBaseUrl(envBaseUrl)
	}

	return "http://localhost:5000"
}

export const API_BASE_URL = resolveApiBaseUrl()