## Google Auth Setup

This project uses Google Identity Services on the Vite frontend and verifies the Google ID token in the Express backend. `NextAuth` is not the right fit here because this codebase is not a Next.js app.

### 1. Create A Google Cloud Project

1. Open `https://console.cloud.google.com/`
2. Create a new project or select an existing one
3. Enable the `Google Identity Services` / OAuth APIs if prompted

### 2. Configure The OAuth Consent Screen

1. Go to `APIs & Services` → `OAuth consent screen`
2. Choose `External`
3. Fill the required fields:
   - App name: `LocalMart`
   - User support email: your email
   - Developer contact email: your email
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. Add test users while the app is in testing mode

### 3. Create The OAuth Client ID

1. Go to `APIs & Services` → `Credentials`
2. Click `Create Credentials` → `OAuth client ID`
3. Application type: `Web application`
4. Name it `LocalMart Web`

### 4. Add Authorized JavaScript Origins

Add every frontend origin that will render the Google button:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:5174`
- `http://127.0.0.1:5174`
- `http://localhost:5175`
- `http://127.0.0.1:5175`
- `http://localhost:5176`
- `http://127.0.0.1:5176`
- `http://localhost:5177`
- `http://127.0.0.1:5177`
- Your deployed customer app origin, for example `https://local-commerce-platform.vercel.app`

If admin, delivery, vendor, and supplier dashboards will also use Google sign-in in production, add their deployed origins too, for example:

- `https://admin-dashboard-ruddy-eight-35.vercel.app`
- `https://delivery-dashboard-three-murex.vercel.app`
- `https://vendor-dashboard-rho.vercel.app`
- `https://supplier-dashboard-tau.vercel.app`

If you later expose Google sign-in in other frontends, add those origins too.

### 5. Redirect URIs

No redirect URI is required for the current implementation because it uses Google Identity Services with frontend token issuance and backend ID-token verification.

### 6. Copy The Client ID Into The Project

Put the same client ID in both places:

- `backend/.env`
  - `GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`
- `customer-app/.env`
  - `VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`
- `admin-dashboard/admin-dashboard/.env`
  - `VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`
- `delivery-dashboard/.env`
  - `VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`
- `supplier-dashboard/.env`
  - `VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`
- `vendor-dashboard/vendor-dashboard/.env`
  - `VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`

Keep `VITE_API_URL=http://localhost:5000/api` for local development unless your backend is running elsewhere.

### 7. Restart The Apps

Restart both processes after editing env files:

- Backend: `npm --prefix ./local-commerce-platform/backend run dev`
- Customer app: `npm --prefix ./local-commerce-platform/customer-app run dev`

### 8. Verify The Flow

1. Open `http://localhost:5173/login`
2. Click the Google button
3. Complete Google sign-in
4. Confirm the backend returns a token and the UI lands on the home page signed in
5. Refresh the page and confirm session restore works through `GET /api/auth/me`

### Notes

- Google sign-in is implemented for customer, vendor, supplier, delivery, and allowlisted admin accounts.
- Existing email/password users can add Google and become `hybrid` accounts.
- Existing Google-only users still sign in through Google if they have no local password.
- Admin Google sign-in additionally requires the email to be present in `ADMIN_GOOGLE_ALLOWLIST` on the backend.