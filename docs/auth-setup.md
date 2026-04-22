## Auth Setup

### Customer App

- Configure [customer-app/.env.example](customer-app/.env.example) values in `customer-app/.env`
- `VITE_API_URL` should point at the backend API
- `VITE_SOCKET_URL` should point at the backend host
- `VITE_GOOGLE_CLIENT_ID` must be the Google web client ID used by the frontend

### Vendor Dashboard

- Configure [vendor-dashboard/vendor-dashboard/.env.example](vendor-dashboard/vendor-dashboard/.env.example) values in `vendor-dashboard/vendor-dashboard/.env`
- `VITE_GOOGLE_CLIENT_ID` enables Google sign-in for vendor login and registration

### Supplier Dashboard

- Configure [supplier-dashboard/.env.example](supplier-dashboard/.env.example) values in `supplier-dashboard/.env`
- `VITE_GOOGLE_CLIENT_ID` enables Google sign-in for supplier login

### Admin Dashboard

- Configure [admin-dashboard/admin-dashboard/.env.example](admin-dashboard/admin-dashboard/.env.example) values in `admin-dashboard/admin-dashboard/.env`
- `VITE_GOOGLE_CLIENT_ID` enables Google sign-in for the admin login page
- Admin Google access is additionally gated by `ADMIN_GOOGLE_ALLOWLIST` in backend env

### Delivery Dashboard

- Configure [delivery-dashboard/.env.example](delivery-dashboard/.env.example) values in `delivery-dashboard/.env`
- `VITE_GOOGLE_CLIENT_ID` enables Google sign-in for driver login

### Backend

- Configure [backend/.env.example](backend/.env.example) values in `backend/.env`
- `GOOGLE_CLIENT_ID` must match the customer app Google client ID
- `JWT_SECRET` should be a strong random secret
- `ADMIN_GOOGLE_ALLOWLIST` should contain comma-separated admin Google emails
- `OPENROUTESERVICE_API_KEY` is optional and enables road-based ETA plus route geometry for admin dispatch

### Supported Auth Flows

- Email/password sign up and sign in
- Google sign in for customer, vendor, supplier, delivery, and allowlisted admin accounts
- Token-backed session restore via `GET /api/auth/me`
- Guest browsing from customer login and signup screens
- Hybrid local plus Google account linking for existing users

Detailed Google Cloud Console steps are in [docs/google-auth-setup.md](google-auth-setup.md).