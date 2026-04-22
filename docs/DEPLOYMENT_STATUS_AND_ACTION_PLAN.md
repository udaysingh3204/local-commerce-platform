# Deployment Status And Action Plan

## Current status snapshot

Overall progress is strong. Core backend, frontend builds, API smoke checks, coupon flows, analytics, CSV export, and CI/CD deploy plus rollback workflows are implemented in code.

### What is already implemented

1. Coupon system hardening
- Persistent promotions in database
- Coupon code apply endpoint
- Per-user usage limits
- Eligibility filtering based on remaining uses
- Checkout coupon apply and remove UX

2. Order and analytics reliability
- Promotion audit persisted on order records
- Pricing breakdown persisted on order records
- Coupon analytics summary in admin dashboard API
- 7/30/90 day coupon window selector in admin dashboard
- Coupon CSV export endpoint and dashboard button

3. Release and deployment readiness
- Full release gate command from repo root
- Staged deploy GitHub Action workflow
- Rollback GitHub Action workflow
- Optional frontend reachability checks in CI
- Production deployment runbook
- CI/CD secrets and deploy guide

## Verified checks completed locally

The following checks were executed successfully in this workspace:

1. Multi-app production builds
- customer
- admin
- delivery
- supplier
- vendor

2. Backend smoke tests
- app config
- stores
- payment config
- customer bootstrap and orders
- wishlist
- referral
- driver bootstrap and insights
- admin analytics
- dispatch stats

3. Coupon and analytics flow checks
- coupon apply and usage-limit behavior
- coupon analytics dashboard payload
- coupon CSV export endpoint

## Important reality check

Code and local verification are good.

The final production sync depends on configuration in your GitHub repository and hosting providers:

1. GitHub Actions secrets must be added.
2. Deploy and rollback webhooks must exist in your hosting providers.
3. Backend production environment variables must be configured.
4. DNS and domain mappings must be configured.

Until those are configured, GitHub workflows cannot fully execute deploy and rollback in real production.

## Where to configure secrets

GitHub path:

1. Open your repository on GitHub
2. Settings
3. Secrets and variables
4. Actions
5. New repository secret

You are currently on the correct screen.

## Where each secret value comes from

### A) Backend deploy and rollback

- BACKEND_DEPLOY_HOOK_URL
  - Source: your backend host deploy webhook (Railway, Render, Fly, etc.)

- BACKEND_ROLLBACK_HOOK_URL
  - Source: your backend host rollback or previous-release webhook (or custom rollback endpoint)

- API_BASE_URL
  - Source: your production API domain
  - Example format: https://api.yourdomain.com

### B) Frontend deploy hooks

- CUSTOMER_DEPLOY_HOOK_URL
- ADMIN_DEPLOY_HOOK_URL
- DELIVERY_DEPLOY_HOOK_URL
- SUPPLIER_DEPLOY_HOOK_URL
- VENDOR_DEPLOY_HOOK_URL

Source for each: deploy webhook URL from the corresponding frontend hosting project.

### C) Frontend rollback hooks

- CUSTOMER_ROLLBACK_HOOK_URL
- ADMIN_ROLLBACK_HOOK_URL
- DELIVERY_ROLLBACK_HOOK_URL
- SUPPLIER_ROLLBACK_HOOK_URL
- VENDOR_ROLLBACK_HOOK_URL

Source for each: rollback or redeploy previous stable release webhook from the corresponding frontend hosting project.

### D) Smoke verification credentials

- SMOKE_CUSTOMER_EMAIL
- SMOKE_CUSTOMER_PASSWORD
- SMOKE_DRIVER_EMAIL
- SMOKE_DRIVER_PASSWORD
- SMOKE_ADMIN_EMAIL
- SMOKE_ADMIN_PASSWORD

Source: dedicated test accounts in your deployed environment.

Recommendation:

Use non-personal, low-privilege test accounts where possible.

### E) Optional frontend URL checks

- CUSTOMER_BASE_URL
- ADMIN_BASE_URL
- DELIVERY_BASE_URL
- SUPPLIER_BASE_URL
- VENDOR_BASE_URL

Source: your final public frontend URLs.

## Mandatory vs optional

### Mandatory minimum for staged deploy workflow

- BACKEND_DEPLOY_HOOK_URL
- API_BASE_URL
- SMOKE_CUSTOMER_EMAIL
- SMOKE_CUSTOMER_PASSWORD
- SMOKE_DRIVER_EMAIL
- SMOKE_DRIVER_PASSWORD
- SMOKE_ADMIN_EMAIL
- SMOKE_ADMIN_PASSWORD

### Mandatory minimum for rollback workflow

- BACKEND_ROLLBACK_HOOK_URL
- API_BASE_URL
- smoke credentials listed above

### Optional but highly recommended

- Frontend deploy hooks
- Frontend rollback hooks
- Frontend base URLs

If optional values are missing, those steps are skipped in workflow by design.

## Exact next action plan

### Step 1: add GitHub secrets

Add all mandatory values first. Then add optional values.

Reference doc:

- docs/CI_CD_SECRETS_AND_DEPLOY.md

### Step 2: confirm backend production env

Reference doc:

- backend/.env.example
- docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md

Ensure live values are configured in backend host settings.

### Step 3: run staged deployment in staging first

In GitHub Actions:

1. Run workflow named Staged Deploy
2. target = staging
3. couponDaysBack = 30

### Step 4: validate staging

Check:

1. Backend health endpoint
2. Login on all frontends
3. Place one test COD order
4. Apply coupon and verify analytics panel
5. Export coupon CSV

### Step 5: run production staged deployment

Repeat Step 3 with target = production.

### Step 6: monitor and hold rollback ready

1. Watch workflow logs and app behavior
2. If issue appears, run Rollback Deploy workflow immediately

## Quick confidence summary

Are we going good:

Yes. Codebase and local/system checks are in good shape.

Is everything perfectly synced in production:

Not yet, until secrets, webhook wiring, and domain/env deployment are completed in your accounts.

After those are configured and staged deploy succeeds, you will be production-synced.

## Main docs to use now

1. docs/DEPLOYMENT_STATUS_AND_ACTION_PLAN.md
2. docs/CI_CD_SECRETS_AND_DEPLOY.md
3. docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md
