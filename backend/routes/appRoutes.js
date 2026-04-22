const express = require("express")
const { APP_CAPABILITIES } = require("../config/appCapabilities")

const router = express.Router()

router.get("/config", (_req, res) => {
  const paymentsEnabled = Boolean(process.env.RAZORPAY_KEY)
  const googleAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID)
  const roadRoutingEnabled = Boolean(process.env.OPENROUTESERVICE_API_KEY)

  res.json({
    platform: APP_CAPABILITIES.platform,
    apiVersion: APP_CAPABILITIES.apiVersion,
    environment: process.env.NODE_ENV || "development",
    appSupport: APP_CAPABILITIES.appSupport,
    auth: {
      customer: {
        login: "/api/auth/login",
        google: "/api/auth/google",
        bootstrap: "/api/auth/bootstrap",
      },
      driver: {
        login: "/api/driver/login",
        google: "/api/driver/google",
        bootstrap: "/api/driver/bootstrap",
        insights: "/api/driver/me/insights",
      },
    },
    commerce: {
      stores: "/api/stores",
      products: "/api/products",
      customerOrders: "/api/orders/customer/:customerId",
      liveTracking: "/api/orders/:id/tracking",
    },
    payments: {
      enabled: paymentsEnabled,
      provider: paymentsEnabled ? "razorpay" : "mock",
      config: "/api/payment/config",
      createOrder: "/api/payment/create-order",
      verify: "/api/payment/verify",
      fail: "/api/payment/fail",
    },
    realtime: APP_CAPABILITIES.realtime,
    trackingPolicy: APP_CAPABILITIES.trackingPolicy,
    support: APP_CAPABILITIES.support,
    features: {
      googleAuthEnabled,
      roadRoutingEnabled,
      liveCustomerTracking: true,
      customerDelayAlerts: true,
      driverInsights: true,
      adminDispatchWatchlist: true,
      adminBatchDispatch: true,
    },
    readiness: {
      customerApp: "ready",
      driverApp: "ready",
      adminOpsApp: "ready",
      notes: [
        googleAuthEnabled ? "Google sign-in is configured." : "Google sign-in requires GOOGLE_CLIENT_ID to be configured.",
        paymentsEnabled ? "Razorpay checkout is configured for live/test key usage." : "Payments fall back to safe mock mode until Razorpay keys are configured.",
        roadRoutingEnabled ? "Road-based ETA routing is enabled." : "ETA currently falls back to local distance estimates until OPENROUTESERVICE_API_KEY is configured.",
        "Customer and driver apps can start immediately against the current auth, orders, tracking, payment, and realtime contract.",
      ],
    },
  })
})

module.exports = router