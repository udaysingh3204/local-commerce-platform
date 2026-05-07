export type AppConfig = {
  platform: string
  apiVersion: string
  environment: string
  appSupport: {
    maintenanceMode: boolean
    minimumVersions: {
      customer: { android: string; ios: string }
      driver: { android: string; ios: string }
      adminOps: { android: string; ios: string }
    }
    releaseChannels: string[]
  }
  auth: {
    customer: {
      login: string
      google: string
      bootstrap: string
    }
    driver: {
      login: string
      google: string
      bootstrap: string
      insights: string
    }
  }
  commerce: {
    stores: string
    products: string
    customerOrders: string
    liveTracking: string
  }
  payments: {
    enabled: boolean
    provider: string
    config: string
    createOrder: string
    verify: string
    fail: string
  }
  realtime: {
    protocol: string
    joinOrderRoomEvent: string
    orderLocationEvent: string
    orderStatusEvent: string
    driverLocationEvent: string
  }
  trackingPolicy: {
    signalStaleAfterMinutes: number
    delayRiskAfterMinutes: number
    delayLateAfterMinutes: number
  }
  support: {
    payments: {
      webhookReconciliationReady: boolean
      mockModeAvailable: boolean
    }
    auth: {
      customerBootstrapReady: boolean
      driverBootstrapReady: boolean
    }
    tracking: {
      signalHealthReady: boolean
      delayAlertsReady: boolean
      socketAccelerationReady: boolean
    }
  }
  features: Record<string, boolean>
  readiness: {
    customerApp: string
    driverApp: string
    adminOpsApp: string
    notes: string[]
  }
}

export type AppHandshakeState = {
  config: AppConfig | null
  loadedAt: string | null
}

export type CustomerAuthUser = {
  _id: string
  name?: string
  email?: string
  phone?: string
  role?: string
  avatar?: string
  authProvider?: string
}

export type CustomerStartup = {
  activeOrders: number
  pendingPayments: number
}

export type CustomerBootstrapResponse = {
  user: CustomerAuthUser
  session: {
    roleHome: string
  }
  startup: CustomerStartup
}

export type CustomerLoginResponse = {
  token: string
  user: CustomerAuthUser
}

export type DriverUser = {
  _id: string
  name?: string
  email?: string
  isAvailable?: boolean
  avatar?: string
  authProvider?: string
}

export type DriverStartup = {
  activeDeliveries: number
  completedDeliveries: number
}

export type DriverBootstrapResponse = {
  driver: DriverUser
  session: {
    roleHome: string
  }
  startup: DriverStartup
}

export type DriverLoginResponse = {
  token: string
  driver: DriverUser
}