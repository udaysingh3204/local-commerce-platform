import { AppConfig, fetchJson } from "./shared"
import { API_BASE_URL } from "../config/env"

export const loadAppConfig = () => fetchJson<AppConfig>(API_BASE_URL, "/api/app/config")