## Mobile App Kickoff

This document is the practical starting point for building the first mobile clients.

### Recommendation

Start with:

1. Customer app
2. Driver app

Do not wait for more dashboard polish before starting these two apps.

### Stack recommendation

If you want shared JavaScript skills with the current web codebase, use React Native.

If you want stricter platform consistency and a single high-performance UI toolkit, use Flutter.

Given the current codebase, React Native is the lower-friction starting choice.

### First backend handshake

Call this endpoint first on app startup or environment setup:

- `GET /api/app/config`

Use it to read:

- auth endpoints
- driver endpoints
- payment mode
- realtime event names
- tracking thresholds
- current feature flags

### Tracking thresholds

These now come from the backend app config and should be treated as source-of-truth product behavior:

- `trackingPolicy.signalStaleAfterMinutes`
- `trackingPolicy.delayRiskAfterMinutes`
- `trackingPolicy.delayLateAfterMinutes`

This matters because the customer web app already uses these semantics:

- stale courier signal
- ETA at risk
- running late

### Customer app screen map

1. Splash / Session Restore
   - `GET /api/app/config`
   - `GET /api/auth/bootstrap`

2. Login / Signup
   - `POST /api/auth/login`
   - `POST /api/auth/register`
   - `POST /api/auth/google`

3. Store Feed
   - `GET /api/stores`

4. Store Detail
   - `GET /api/stores/:storeId`
   - `GET /api/products/store/:storeId`

5. Cart / Checkout
   - `POST /api/orders`
   - `GET /api/payment/config`
   - `POST /api/payment/create-order`
   - `POST /api/payment/verify`
   - `POST /api/payment/fail`

6. Orders List
   - `GET /api/orders/customer/:customerId`
   - `GET /api/orders/:id/tracking` for active orders

7. Live Tracking
   - `GET /api/orders/:id/tracking`
   - Socket.IO room join via `joinOrderRoom`
   - Listen for `deliveryLocationUpdate`
   - Listen for `orderStatusUpdated`

### Driver app screen map

1. Splash / Session Restore
   - `GET /api/app/config`
   - `GET /api/driver/bootstrap`

2. Driver Login
   - `POST /api/driver/login`
   - `POST /api/driver/google`

3. Driver Home / Queue
   - `GET /api/orders?driverId=:driverId&includeCompleted=true`
   - `GET /api/orders`
   - `GET /api/driver/me/insights`

4. Active Delivery
   - `PATCH /api/orders/:id/status`
   - `PATCH /api/driver/me/location`

5. Earnings / Performance
   - `GET /api/driver/me/insights`

### Realtime integration notes

Customer app:

- join order room once tracking screen opens
- treat the REST tracking payload as authoritative state
- use socket events as accelerators for UI refresh, not as the only source of truth

Driver app:

- keep location sync resilient to backgrounding
- send GPS updates at a controlled interval
- rely on REST state refresh after major mutations like accept and delivered

### What can be built immediately

Customer app MVP:

- session restore
- browse stores
- view products
- place order
- pay or mock-pay
- track live order
- see delay and stale-signal alerts

Driver app MVP:

- session restore
- view open queue
- accept job
- start delivery
- mark delivered
- sync GPS
- view earnings and performance

### What to defer to sprint 2

- deep push notification workflows
- offline queueing for driver location writes
- customer support chat
- advanced payment reconciliation UX
- admin mobile interface

### Start condition

App development should start now if:

- the first mobile target is customer plus driver
- the team is comfortable with current auth and payment env vars
- the team accepts that some optional production enrichments still depend on third-party keys

That condition is already met in this repository.