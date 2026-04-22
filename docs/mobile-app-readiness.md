## Mobile App Readiness

This platform is ready to start customer and driver app development now.

### Readiness decision

- Customer app: ready
- Driver app: ready
- Admin operations app: ready for internal tooling if needed
- Supplier and vendor app work: possible, but lower priority than customer and driver apps

The reason the platform is ready now is that the backend already exposes stable auth, bootstrap, order, tracking, payment, and delivery-insight surfaces that cover the first real mobile workflows.

### Start-from-here endpoint

Use this public endpoint first:

- `GET /api/app/config`

It returns:

- auth entry points for customer and driver sessions
- payment capability flags
- realtime event names for Socket.IO
- feature availability flags
- a readiness summary for app teams

### Customer app contract

Core flows already backed by the API:

- register and login: `POST /api/auth/register`, `POST /api/auth/login`
- Google login: `POST /api/auth/google`
- session restore: `GET /api/auth/bootstrap`
- store listing: `GET /api/stores`
- store details: `GET /api/stores/:storeId`
- product listing: `GET /api/products/store/:storeId`
- customer orders: `GET /api/orders/customer/:customerId`
- checkout order creation: `POST /api/orders`
- payment config and payment lifecycle:
  - `GET /api/payment/config`
  - `POST /api/payment/create-order`
  - `POST /api/payment/verify`
  - `POST /api/payment/fail`
- live order tracking: `GET /api/orders/:id/tracking`

Tracking payload is now rich enough for a real app screen. It includes:

- delivery ETA and route distance
- route type and geometry
- driver identity
- signal freshness via `signalStatus`, `signalAgeMinutes`, `lastLocationUpdateAt`
- delay state via `delayStatus`, `delayMinutes`, `isDelayed`

### Driver app contract

Core flows already backed by the API:

- register and login: `POST /api/driver/register`, `POST /api/driver/login`
- Google login: `POST /api/driver/google`
- session restore: `GET /api/driver/bootstrap`
- driver insights: `GET /api/driver/me/insights`
- availability toggle: `PATCH /api/driver/me/availability`
- location sync: `PATCH /api/driver/me/location`
- driver orders: `GET /api/orders?driverId=:driverId&includeCompleted=true`
- order state updates: `PATCH /api/orders/:id/status`

The driver dashboard already proves these flows work together:

- active run management
- completed delivery earnings
- weekly driver performance metrics
- live location writes tied to tracked orders

### Realtime contract

Socket.IO is already in use and suitable for the first mobile release.

Important events:

- join room: emit `joinOrderRoom` with the order ID
- receive courier updates: `deliveryLocationUpdate`
- receive order status changes: `orderStatusUpdated`
- receive driver updates: `driverLocationUpdate`

### What is still optional, not blocking

- Google sign-in depends on `GOOGLE_CLIENT_ID`
- road-based routing depends on `OPENROUTESERVICE_API_KEY`
- real Razorpay processing depends on `RAZORPAY_KEY` and `RAZORPAY_SECRET`
- webhook-backed payment reconciliation depends on `RAZORPAY_WEBHOOK_SECRET`

None of these block app development starting immediately because:

- local login already works
- safe mock/test payment mode already works
- local ETA fallback already works
- live order tracking already works

### Recommended app build order

1. Customer mobile app
2. Driver mobile app
3. Admin operations mobile/tablet app if you want dispatch away from the desktop

### Suggested sprint 1 scope

Customer app:

- auth and session restore
- store browse and product listing
- cart and checkout
- orders list
- live tracking screen

Driver app:

- auth and bootstrap
- active queue and current delivery
- accept order
- mark out for delivery and delivered
- background-safe location sync strategy

### Current recommendation

You are ready to start app development now if the first target is:

- a React Native or Flutter customer app
- a React Native or Flutter driver app

The backend and workflow contracts are already far enough along that app work no longer needs to wait for more web-dashboard stabilization.