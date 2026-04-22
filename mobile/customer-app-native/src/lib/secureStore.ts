import { Platform } from "react-native"

// expo-secure-store is native-only; fall back to localStorage on web
const isWeb = Platform.OS === "web"

let SecureStore: typeof import("expo-secure-store") | null = null
if (!isWeb) {
  // Dynamic require so bundler doesn't crash on web
  SecureStore = require("expo-secure-store")
}

export const setSecureValue = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    localStorage.setItem(key, value)
  } else {
    await SecureStore!.setItemAsync(key, value)
  }
}

export const getSecureValue = async (key: string): Promise<string | null> => {
  if (isWeb) {
    return localStorage.getItem(key)
  }
  return SecureStore!.getItemAsync(key)
}

export const deleteSecureValue = async (key: string): Promise<void> => {
  if (isWeb) {
    localStorage.removeItem(key)
  } else {
    await SecureStore!.deleteItemAsync(key)
  }
}