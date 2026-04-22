## React Native Kickoff

This is the recommended path if you want to start app development immediately with the least friction against the current codebase.

### Why React Native first

- the existing frontend stack is React + TypeScript
- the current API contract is already documented in TypeScript-friendly terms
- state, auth, tracking, and payment flows map naturally to React Native architecture

### Recommended repo structure

Add these apps when you begin implementation:

- `mobile/customer-app-native`
- `mobile/driver-app-native`

Keep them separate from the current Vite apps so mobile navigation, native modules, and release pipelines do not bleed into the web dashboards.

This repository now includes that scaffold already.

Concrete paths:

- `local-commerce-platform/mobile/shared`
- `local-commerce-platform/mobile/customer-app-native`
- `local-commerce-platform/mobile/driver-app-native`

Root helper commands now available:

- `npm run mobile:install`
- `npm run mobile:customer`
- `npm run mobile:driver`
- `npm run mobile:android:customer`
- `npm run mobile:android:driver`
- `npm run mobile:ios:customer`
- `npm run mobile:ios:driver`

### Shared mobile foundation

Both apps should share the same foundation choices:

- React Native + TypeScript
- React Navigation
- TanStack Query for API state
- Zustand or Context for lightweight session state
- Socket.IO client for live order events
- Expo if you want faster iteration early
- bare React Native later if advanced native integrations become necessary

### First startup sequence

1. Load environment base URL.
2. Call `GET /api/app/config`.
3. Cache `apiVersion`, `trackingPolicy`, `realtime`, and `appSupport`.
4. Restore token from secure storage.
5. Call bootstrap endpoint:
   - customer: `GET /api/auth/bootstrap`
   - driver: `GET /api/driver/bootstrap`

### Customer app MVP screens

1. Splash
   - reads app config
   - restores token
   - routes to login or home

2. Login
   - email/password
   - optional Google sign-in if enabled by config

3. Home / Store Feed
   - nearby stores
   - categories

4. Store Detail
   - product list
   - add to cart

5. Cart / Checkout
   - address
   - payment choice
   - order placement

6. Orders
   - active and historical orders
   - tracking alerts from backend state

7. Live Tracking
   - map
   - courier snapshot
   - signal health
   - delay alerts

### Driver app MVP screens

1. Splash
   - reads app config
   - restores driver token

2. Login
   - email/password
   - optional Google sign-in if enabled

3. Queue / Workspace
   - active run
   - open orders
   - driver metrics

4. Active Delivery
   - order details
   - start delivery
   - mark delivered
   - location sync state

5. Earnings
   - weekly trend
   - recent deliveries
   - performance summary

### Core API modules to implement first

Customer app:

- `authApi`
- `storeApi`
- `productApi`
- `orderApi`
- `paymentApi`
- `trackingApi`

Driver app:

- `driverAuthApi`
- `driverOrdersApi`
- `driverInsightsApi`
- `driverLocationApi`

### Realtime handling rules

Customer app:

- use Socket.IO only after the tracking screen opens
- join the order room with `joinOrderRoom`
- refresh the tracking query after `deliveryLocationUpdate` and `orderStatusUpdated`

Driver app:

- write GPS on a controlled interval
- stop location writes when no active delivery exists
- refresh insights and current queue after status mutations

### Native storage recommendations

- tokens: secure storage
- app config cache: async storage
- non-sensitive UI preferences: async storage
- never store raw payment secrets client-side

### Build-now checklist

The mobile team can begin immediately if they implement these in order:

1. shared API client with auth header support
2. `GET /api/app/config` handshake
3. secure token storage
4. bootstrap flows
5. customer browse + orders
6. driver queue + location sync
7. live tracking socket layer

Current repo status:

- steps 1 to 4 now exist in the scaffolded native apps
- the next real implementation work starts at customer browse + orders and driver queue + location sync

### Definition of ready for kickoff

You are ready to open app implementation work now because:

- app config exists
- bootstrap endpoints exist
- payment contract exists
- live tracking contract exists
- delay and signal-health semantics exist
- driver insights contract exists

That is enough to start real React Native development without waiting for more backend design work.