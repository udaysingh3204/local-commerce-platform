# Production Deployment Runbook

Status and planning summary:

- `local-commerce-platform/docs/DEPLOYMENT_STATUS_AND_ACTION_PLAN.md`

## 1) Domain and DNS Layout

Use one root domain and these subdomains:

- `www.yourdomain.com` -> customer web
- `admin.yourdomain.com` -> admin dashboard
- `delivery.yourdomain.com` -> delivery dashboard
- `supplier.yourdomain.com` -> supplier dashboard
- `vendor.yourdomain.com` -> vendor dashboard
- `api.yourdomain.com` -> backend API
- `links.yourdomain.com` -> deep links and referral landing pages (optional but recommended)

## 2) Environment Variables

### Backend (`local-commerce-platform/backend`)

Minimum production variables:

- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `ADMIN_GOOGLE_ALLOWLIST`
- `CORS_ORIGINS`
- `APP_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `OPENROUTESERVICE_API_KEY`
- `DISPATCH_MAX_DISTANCE_METERS`
- `PORT` (set by host in many platforms)

Set `CORS_ORIGINS` as comma-separated HTTPS origins, for example:

`https://www.yourdomain.com,https://admin.yourdomain.com,https://delivery.yourdomain.com,https://supplier.yourdomain.com,https://vendor.yourdomain.com`

### Frontend apps

Set `VITE_API_URL=https://api.yourdomain.com/api`

Set `VITE_SOCKET_URL=https://api.yourdomain.com` for apps using sockets.

Set `VITE_GOOGLE_CLIENT_ID` to your production Google web client ID.

## 3) Pre-Deploy Checks (mandatory)

From repo root:

```powershell
npm install
npm run release:check
```

If this fails, do not deploy.

## 4) Backend Deployment

Deploy `local-commerce-platform/backend` to your backend host (Railway/Render/Fly/AWS).

Required runtime checks after deploy:

```text
GET https://api.yourdomain.com/health -> 200
GET https://api.yourdomain.com/api/app/config -> 200
```

Then run API smoke against production (optional if staging first):

```powershell
$env:SMOKE_BASE_URL = "https://api.yourdomain.com"
npm run smoke:api
```

## 5) Frontend Deployment

Create 5 frontend deployments (Vercel/Netlify/Cloudflare), one per app root:

- `local-commerce-platform/customer-app`
- `local-commerce-platform/admin-dashboard/admin-dashboard`
- `local-commerce-platform/delivery-dashboard`
- `local-commerce-platform/supplier-dashboard`
- `local-commerce-platform/vendor-dashboard/vendor-dashboard`

Bind domains:

- customer -> `www.yourdomain.com`
- admin -> `admin.yourdomain.com`
- delivery -> `delivery.yourdomain.com`
- supplier -> `supplier.yourdomain.com`
- vendor -> `vendor.yourdomain.com`

## 6) Post-Deploy Verification

1. Login on all dashboards and customer app.
2. Place one COD test order.
3. Apply one coupon and verify order has `promotionAudit` and `pricingBreakdown`.
4. Open admin dashboard and confirm coupon panel has data.
5. Export coupon CSV and verify download.
6. Verify payment webhook endpoint receives test event.

## 7) First-Day Operations Checklist

1. Monitor `5xx` rates and latency on backend.
2. Watch payment failures and retries in dashboard payment block.
3. Watch coupon discount spend using coupon panel and CSV export.
4. Keep rollback target ready (previous backend release + previous frontend deployment).

## 8) Rollback Plan

1. Revert frontend deployments to previous successful versions.
2. Roll back backend image/release in host dashboard.
3. Re-run health and smoke checks.
4. Pause promotions if anomalies are detected:
   - Use promotions APIs to set campaign status `paused`.
5. Optional automated rollback path:
   - Run `.github/workflows/rollback-deploy.yml` from GitHub Actions.

## 9) CI/CD Automation

For automated staged deployments, see:

- `local-commerce-platform/docs/CI_CD_SECRETS_AND_DEPLOY.md`

Workflow file:

- `.github/workflows/staged-deploy.yml`
