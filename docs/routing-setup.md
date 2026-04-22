## Routing Setup

Road-based ETA is optional. The platform already works without it using local straight-line distance and average-speed estimation.

### When You Need It

- Use it if you want more realistic dispatch ETA in the admin delivery console
- Use it if you want the dispatch map to draw actual road routes instead of straight connection lines
- It is not required for auth, orders, delivery tracking, or dispatch fallback assignment

### Backend Env

Add this to [backend/.env.example](backend/.env.example) and your real `backend/.env`:

- `OPENROUTESERVICE_API_KEY=your-openrouteservice-api-key`

### What Changes After Adding The Key

- `GET /api/orders/dispatch/recommendations` starts returning road-based `eta`, `distanceKm`, and `routePath`
- Admin dispatch map uses that `routePath` to render the suggested route
- The current fallback remains active automatically if the key is missing or a routing call fails

### Verification

1. Add the key to `backend/.env`
2. Restart the backend: `npm --prefix ./local-commerce-platform/backend run dev`
3. Open `http://localhost:5174/delivery`
4. Confirm dispatch cards still appear
5. Confirm focused map lines follow roads instead of straight segments when recommendation data is available