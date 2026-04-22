// ─── LocalMart Design System ─────────────────────────────────────────────────

export const Colors = {
  primary:   "#6366f1",   // indigo
  primaryDark: "#4f46e5",
  primaryLight: "#e0e7ff",
  secondary: "#f59e0b",  // amber
  success:   "#10b981",
  danger:    "#ef4444",
  warning:   "#f59e0b",
  info:      "#3b82f6",

  // Backgrounds
  bg:        "#f8fafc",
  bgCard:    "#ffffff",
  bgMuted:   "#f1f5f9",

  // Text
  text:      "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textInverse: "#ffffff",

  // Borders
  border:    "#e2e8f0",
  borderDark: "#cbd5e1",

  // Status
  statusPending:   { bg: "#fff7ed", text: "#c2410c" },
  statusAccepted:  { bg: "#eff6ff", text: "#1d4ed8" },
  statusPreparing: { bg: "#f5f3ff", text: "#6d28d9" },
  statusDelivery:  { bg: "#ecfeff", text: "#0e7490" },
  statusDelivered: { bg: "#ecfdf5", text: "#047857" },
  statusCancelled: { bg: "#fef2f2", text: "#b91c1c" },
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const

export const Font = {
  xs: 11,
  sm: 13,
  md: 14,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const Shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const

export const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  pending:          { bg: "#fff7ed", text: "#c2410c", label: "Pending",          icon: "⏳" },
  accepted:         { bg: "#eff6ff", text: "#1d4ed8", label: "Accepted",         icon: "✅" },
  preparing:        { bg: "#f5f3ff", text: "#6d28d9", label: "Preparing",        icon: "👨‍🍳" },
  out_for_delivery: { bg: "#ecfeff", text: "#0e7490", label: "Out for Delivery",  icon: "🛵" },
  delivered:        { bg: "#ecfdf5", text: "#047857", label: "Delivered",         icon: "🎉" },
  cancelled:        { bg: "#fef2f2", text: "#b91c1c", label: "Cancelled",         icon: "❌" },
}

export const CATEGORY_CONFIG: Record<string, { icon: string; gradient: [string, string] }> = {
  grocery:       { icon: "🥦", gradient: ["#10b981", "#059669"] },
  food:          { icon: "🍔", gradient: ["#f59e0b", "#ef4444"] },
  bakery:        { icon: "🥐", gradient: ["#f59e0b", "#d97706"] },
  pharmacy:      { icon: "💊", gradient: ["#3b82f6", "#06b6d4"] },
  home:          { icon: "🧼", gradient: ["#06b6d4", "#0284c7"] },
  fruits:        { icon: "🍎", gradient: ["#84cc16", "#10b981"] },
  dairy:         { icon: "🥛", gradient: ["#60a5fa", "#818cf8"] },
  beverages:     { icon: "🥤", gradient: ["#06b6d4", "#3b82f6"] },
  "personal-care": { icon: "🧴", gradient: ["#f472b6", "#e879f9"] },
  snacks:        { icon: "🍿", gradient: ["#fbbf24", "#f97316"] },
  default:       { icon: "🏪", gradient: ["#6366f1", "#a855f7"] },
}
