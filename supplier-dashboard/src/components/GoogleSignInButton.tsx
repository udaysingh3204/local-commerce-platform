import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential?: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_black" | "filled_blue"
              size?: "large" | "medium" | "small"
              shape?: "rectangular" | "pill" | "circle" | "square"
              text?: "signin_with" | "signup_with" | "continue_with" | "signin"
              width?: number
              logo_alignment?: "left" | "center"
            }
          ) => void
        }
      }
    }
  }
}

type Props = {
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  theme?: "light" | "dark"
  onCredential: (credential: string) => Promise<void>
}

const SCRIPT_ID = "google-identity-services"

export default function GoogleSignInButton({ text = "continue_with", theme = "light", onCredential }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scriptReady, setScriptReady] = useState(Boolean(window.google?.accounts?.id))
  const [submitting, setSubmitting] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptReady(true)
      return
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true), { once: true })
      return
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => setScriptReady(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!clientId || !scriptReady || !containerRef.current || !window.google?.accounts?.id) return

    containerRef.current.innerHTML = ""

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        if (!credential || submitting) return
        setSubmitting(true)
        try {
          await onCredential(credential)
        } finally {
          setSubmitting(false)
        }
      },
      cancel_on_tap_outside: true,
      auto_select: false,
    })

    window.google.accounts.id.renderButton(containerRef.current, {
      theme: theme === "dark" ? "filled_black" : "outline",
      size: "large",
      shape: "pill",
      text,
      width: 320,
      logo_alignment: "left",
    })
  }, [clientId, onCredential, scriptReady, submitting, text, theme])

  if (!clientId) {
    return <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.</div>
  }

  return (
    <div>
      <div ref={containerRef} className="min-h-11" />
      {submitting && <p className="mt-2 text-xs text-gray-500">Verifying Google account...</p>}
    </div>
  )
}