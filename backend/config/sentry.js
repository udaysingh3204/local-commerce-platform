const Sentry = require("@sentry/node")

const init = () => {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    console.warn("[sentry] SENTRY_DSN not set — error monitoring disabled")
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version || "1.0.0",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Do not send PII
    beforeSend(event) {
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = "[Filtered]"
      }
      return event
    },
  })

  console.info("[sentry] Initialized — environment:", process.env.NODE_ENV)
}

module.exports = { init, Sentry }
