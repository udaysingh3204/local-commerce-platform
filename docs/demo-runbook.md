## Demo Runbook

This workspace now supports a safe demo-data path plus stable fixed-port frontend development.

### Required backend environment

Set these in `local-commerce-platform/backend/.env`:

- `MONGO_URI`: use a local, demo, or test database URL. The current local setup now points to a dedicated `local-commerce-demo` database for safe seeded testing.
- `JWT_SECRET`: any strong local secret
- `GOOGLE_CLIENT_ID`: optional, required only for Google sign-in tests
- `RAZORPAY_KEY`: required for live Razorpay Checkout instead of mock payment mode
- `RAZORPAY_SECRET`: required for server-side payment verification
- `RAZORPAY_BRAND_NAME`: optional checkout brand label
- `RAZORPAY_BRAND_DESCRIPTION`: optional checkout description
- `RAZORPAY_WEBHOOK_SECRET`: optional for now, required later for webhook-backed reconciliation
- `OPENROUTESERVICE_API_KEY`: optional, enables road-based ETA and route geometry
- `ADMIN_GOOGLE_ALLOWLIST`: optional comma-separated emails for Google admin access

### Safe local startup

From the workspace root:

- `npm install`
- `npm run dev`

`npm run dev` now reuses already-running services on the fixed ports instead of failing immediately.

Fixed ports:

- Backend API: `5000`
- Customer App: `5173`
- Admin Dashboard: `5174`
- Delivery Dashboard: `5175`
- Supplier Dashboard: `5176`
- Vendor Dashboard: `5177`

### Preview commands

After building a frontend, you can preview it on the fixed preview ports:

- `npm run preview:customer`
- `npm run preview:admin`
- `npm run preview:delivery`
- `npm run preview:supplier`
- `npm run preview:vendor`

### Demo data

From the workspace root:

- `npm run seed:demo`

Safety guard:

- The seeder refuses to run unless `MONGO_URI` looks like a local, demo, or test database.

Demo accounts created by the seed script:

- Admin: `admin@localmart.demo` / `Admin12345!`
- Grocery Vendor: `vendor.grocery@localmart.demo` / `Vendor12345!`
- Bakery Vendor: `vendor.bakery@localmart.demo` / `Vendor12345!`
- Cafe Vendor: `vendor.cafe@localmart.demo` / `Vendor12345!`
- Pharmacy Vendor: `vendor.pharmacy@localmart.demo` / `Vendor12345!`
- Home Essentials Vendor: `vendor.essentials@localmart.demo` / `Vendor12345!`
- Supplier: `supplier@localmart.demo` / `Supplier12345!`
- Customer One: `customer.one@localmart.demo` / `Customer12345!`
- Customer Two: `customer.two@localmart.demo` / `Customer12345!`
- Customer Three: `customer.three@localmart.demo` / `Customer12345!`
- Driver One: `driver.one@localmart.demo` / `Driver12345!`
- Driver Two: `driver.two@localmart.demo` / `Driver12345!`
- Driver Three: `driver.three@localmart.demo` / `Driver12345!`
- Driver Four: `driver.four@localmart.demo` / `Driver12345!`

The demo seed creates:

- admin, vendor, supplier, customer, and driver identities
- seven stores across grocery, bakery, cafe, pharmacy, and home-essentials use cases in Noida
- a 70+ item catalog with generated product images, grocery staples, fresh produce, bakery items, cafe SKUs, pharmacy essentials, and home-care inventory
- orders across pending, accepted, preparing, out-for-delivery, delivered, and cancelled states
- payment states across paid, pending, and failed flows including retry metadata
- notifications for customer flows
- growth leads for the admin growth funnel
- wholesale products and supplier orders for the supplier dashboard
- realistic multi-store vendor coverage so store browsing, cart, checkout, analytics, and dispatch flows feel closer to a live hyperlocal marketplace

### App-ready bootstrap

Protected frontend and app clients can now call:

- `GET /api/auth/bootstrap`
- `GET /api/driver/bootstrap`

The response includes:

- sanitized current user data
- a role home route hint
- role-aware startup counts for active orders, pending payments, stores, supplier product lines, wholesale orders, and admin queue load
- driver startup counts for active and completed deliveries

Bootstrap data is now surfaced in:

- customer navbar
- vendor navbar and vendor dashboard greeting
- supplier dashboard header
- admin sidebar live-startup card
- driver deliveries workspace summary pills

### Payment flow

Customer checkout now supports two modes:

- mock mode for local/demo/test databases
- live Razorpay Checkout when `RAZORPAY_KEY` and `RAZORPAY_SECRET` are configured

Available payment endpoints:

- `GET /api/payment/config`
- `POST /api/payment/create-order`
- `POST /api/payment/verify`
- `POST /api/payment/fail`
- `POST /api/payment/webhook`

Compatibility note:

- the backend now accepts both `/api/payment/*` and `/api/payments/*` paths so older frontend calls do not break

Webhook note:

- webhook reconciliation is now implemented but stays inactive until `RAZORPAY_WEBHOOK_SECRET` is configured
- once you create a Razorpay webhook later, point it to `/api/payment/webhook`

This is intended to reduce mobile app startup fan-out later by giving a compact session snapshot in one request.

### Admin Demo Lab

After logging in as the seeded admin on the admin dashboard, open the new Demo Lab page.

It provides protected admin actions for:

- full demo refresh across retail, delivery, growth, and wholesale modules
- retail ops refresh for customer, store, order, tracking, and notification scenarios
- growth refresh for waitlist and referral testing
- wholesale refresh for supplier products and supplier-order flows

The Demo Lab page also shows:

- whether the current backend database target is safe for demo seeding
- the currently available demo credentials
- a live count snapshot for seeded users, stores, orders, growth leads, and wholesale data

### Recommended test path

1. Run `npm run seed:demo`
2. Start services with `npm run dev`
3. Open the customer app on `5173` and place/track orders with seeded accounts
4. Open the admin dashboard on `5174` and verify analytics, delivery desk, incidents, and growth leads
5. Verify the new payment summary section on the admin dashboard and confirm failed/pending payments are visible in admin orders
6. Open Demo Lab in admin and use targeted refresh buttons when you want to reset only one module without reseeding everything
7. Open the delivery dashboard on `5175` and log in as a seeded driver to test live delivery state changes
8. Open the supplier dashboard on `5176` and verify seeded wholesale orders appear for the supplier account
9. Open the vendor dashboard on `5177` to confirm products, orders, analytics, and payment state reflect the seeded stores
10. In the customer app, use a seeded non-COD order with pending or failed payment to test the new payment recovery button on the Orders page

### What is needed from you for real production payments

To move from production-ready code into real payment processing, you should provide or configure:

- a real Razorpay Key ID and Secret for the target environment
- the exact production frontend domain that should be treated as the canonical checkout origin
- the business display name, support contact, and optional brand logo you want shown in Razorpay Checkout
- later, if you want server-confirmed asynchronous settlement handling, a Razorpay webhook secret

Current state after your latest input:

- local backend test keys can now be configured and used for Razorpay test-mode checkout
- production domain is not required yet for local and current hosted test flows
- webhook reconciliation is code-ready but still needs a webhook secret later

### Current next build phase

The next practical platform steps are:

1. Add authenticated admin actions for dispatch reassignment, lead ownership, and bulk exports
2. Add webhook-backed payment reconciliation and post-payment recovery states
3. Expand bootstrap-driven role summaries into richer app home and dashboard modules