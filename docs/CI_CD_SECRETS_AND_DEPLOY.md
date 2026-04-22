# CI/CD Secrets and Staged Deploy

This document configures the GitHub Action workflow:

- `.github/workflows/staged-deploy.yml`
- `.github/workflows/rollback-deploy.yml`

## 1) Required GitHub Secrets

Set these in repository settings -> Secrets and variables -> Actions.

### Backend deploy and verification

- `BACKEND_DEPLOY_HOOK_URL`
- `API_BASE_URL` (example: `https://api.yourdomain.com`)

### Frontend deploy hooks

- `CUSTOMER_DEPLOY_HOOK_URL`
- `ADMIN_DEPLOY_HOOK_URL`
- `DELIVERY_DEPLOY_HOOK_URL`
- `SUPPLIER_DEPLOY_HOOK_URL`
- `VENDOR_DEPLOY_HOOK_URL`

### Optional frontend reachability URLs

- `CUSTOMER_BASE_URL` (example: `https://www.yourdomain.com`)
- `ADMIN_BASE_URL` (example: `https://admin.yourdomain.com`)
- `DELIVERY_BASE_URL` (example: `https://delivery.yourdomain.com`)
- `SUPPLIER_BASE_URL` (example: `https://supplier.yourdomain.com`)
- `VENDOR_BASE_URL` (example: `https://vendor.yourdomain.com`)

### Rollback hooks

- `BACKEND_ROLLBACK_HOOK_URL`
- `CUSTOMER_ROLLBACK_HOOK_URL`
- `ADMIN_ROLLBACK_HOOK_URL`
- `DELIVERY_ROLLBACK_HOOK_URL`
- `SUPPLIER_ROLLBACK_HOOK_URL`
- `VENDOR_ROLLBACK_HOOK_URL`

### Smoke verification credentials

- `SMOKE_CUSTOMER_EMAIL`
- `SMOKE_CUSTOMER_PASSWORD`
- `SMOKE_DRIVER_EMAIL`
- `SMOKE_DRIVER_PASSWORD`
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

## 2) How staged deploy runs

1. Release check job builds all frontend apps.
2. Backend deploy hook is triggered.
3. Workflow waits for `GET <API_BASE_URL>/health` to be healthy.
4. Frontend deploy hooks are triggered.
5. Post-deploy verification runs:
   - API smoke suite against `SMOKE_BASE_URL=API_BASE_URL`
   - optional frontend reachability checks (if `*_BASE_URL` secrets are set)
   - coupon analytics endpoint check
   - coupon CSV export endpoint check

## 3) Triggering deploy

In GitHub -> Actions -> `Staged Deploy` -> Run workflow.

Inputs:

- `target`: `staging` or `production`
- `couponDaysBack`: `7`, `30`, or `90`

## 4) Triggering rollback

In GitHub -> Actions -> `Rollback Deploy` -> Run workflow.

Inputs:

- `target`: `staging` or `production`
- `reason`: why rollback is being executed
- `couponDaysBack`: `7`, `30`, or `90`

Rollback stages:

1. Trigger backend rollback hook
2. Wait for backend health at `/health`
3. Trigger frontend rollback hooks
4. Run smoke verification and coupon endpoint checks
5. Run optional frontend reachability checks (if `*_BASE_URL` secrets are set)

## 5) Notes

- The workflow does not store cloud credentials directly; deploy hooks keep this secure and simple.
- If a frontend hook secret is omitted, that frontend deploy step is skipped.
- Keep smoke users scoped to test accounts only.
