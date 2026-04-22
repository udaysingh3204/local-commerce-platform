# Mobile Workspace

This folder contains the React Native mobile starting point for the platform.

Included workspaces:

- `shared`: shared API contracts, storage keys, and network helpers
- `customer-app-native`: Expo-based customer app shell
- `driver-app-native`: Expo-based driver app shell

Current implementation status:

- both native apps handshake with `GET /api/app/config`
- both apps include secure token storage hooks via Expo Secure Store
- customer app includes login plus `GET /api/auth/bootstrap` restore flow
- driver app includes login plus `GET /api/driver/bootstrap` restore flow
- both apps now render authenticated home shells instead of static placeholder cards

Quick start:

1. Run `npm run mobile:install` from the repository root.
2. Start the backend from the root workspace.
3. Copy `.env.example` to `.env` inside `customer-app-native` and/or `driver-app-native`.
4. Set `EXPO_PUBLIC_API_BASE_URL` to your machine's LAN URL, for example `http://10.203.59.25:5000`.
5. Run `npm run mobile:customer` or `npm run mobile:driver`.

Web development note:

- Expo web running on `localhost` now defaults to `http://localhost:5000` automatically, so stale LAN env values no longer break browser sessions.
- Physical phones still need `EXPO_PUBLIC_API_BASE_URL` set to a reachable LAN backend URL in `.env`.

The mobile apps read capability and readiness metadata from `GET /api/app/config`.

Phone testing notes:

- Use the same Wi-Fi network on the phone and development machine.
- The Expo QR code opens the native shell, but API calls still need the backend reachable on your LAN IP.
- `http://localhost:5000` only works on the same machine or simulator, not on a physical phone.
- Expo web uses browser storage fallback for auth tokens; native iOS/Android uses Expo Secure Store.

Next implementation target:

- customer store feed and orders list
- driver queue and live delivery workspace