const TRACKING_SIGNAL_STALE_AFTER_MINUTES = 5
const TRACKING_DELAY_RISK_AFTER_MINUTES = 1
const TRACKING_DELAY_LATE_AFTER_MINUTES = 5

const APP_CAPABILITIES = {
  platform: "local-commerce-platform",
  apiVersion: "2026-04-13",
  appSupport: {
    maintenanceMode: false,
    minimumVersions: {
      customer: {
        android: "0.1.0",
        ios: "0.1.0",
      },
      driver: {
        android: "0.1.0",
        ios: "0.1.0",
      },
      adminOps: {
        android: "0.1.0",
        ios: "0.1.0",
      },
    },
    releaseChannels: ["development", "staging", "production"],
  },
  realtime: {
    protocol: "socket.io",
    joinOrderRoomEvent: "joinOrderRoom",
    orderLocationEvent: "deliveryLocationUpdate",
    orderStatusEvent: "orderStatusUpdated",
    driverLocationEvent: "driverLocationUpdate",
  },
  trackingPolicy: {
    signalStaleAfterMinutes: TRACKING_SIGNAL_STALE_AFTER_MINUTES,
    delayRiskAfterMinutes: TRACKING_DELAY_RISK_AFTER_MINUTES,
    delayLateAfterMinutes: TRACKING_DELAY_LATE_AFTER_MINUTES,
  },
  support: {
    payments: {
      webhookReconciliationReady: true,
      mockModeAvailable: true,
    },
    auth: {
      customerBootstrapReady: true,
      driverBootstrapReady: true,
    },
    tracking: {
      signalHealthReady: true,
      delayAlertsReady: true,
      socketAccelerationReady: true,
    },
  },
}

module.exports = {
  APP_CAPABILITIES,
  TRACKING_SIGNAL_STALE_AFTER_MINUTES,
  TRACKING_DELAY_RISK_AFTER_MINUTES,
  TRACKING_DELAY_LATE_AFTER_MINUTES,
}