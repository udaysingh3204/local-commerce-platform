## Frontend Dev Ports

Use stable ports so each module always opens on the same URL.

- Customer App: `http://localhost:5173`
- Admin Dashboard: `http://localhost:5174`
- Delivery Dashboard: `http://localhost:5175`
- Supplier Dashboard: `http://localhost:5176`
- Vendor Dashboard: `http://localhost:5177`

Root launch commands:

- `npm run dev`
- `npm run dev:all`
- `npm run dev:customer`
- `npm run dev:admin`
- `npm run dev:delivery`
- `npm run dev:supplier`
- `npm run dev:vendor`

If a port is already occupied, Vite now fails fast instead of silently switching ports. That prevents opening the wrong module and mistaking it for a broken CSS build.

Expected fixed ports:

- Backend API: `http://localhost:5000`
- Customer App: `http://localhost:5173`
- Admin Dashboard: `http://localhost:5174`
- Delivery Dashboard: `http://localhost:5175`
- Supplier Dashboard: `http://localhost:5176`
- Vendor Dashboard: `http://localhost:5177`

If you see `Port 5174 is already in use` or similar, that usually means the correct module is already running in another terminal. Reuse that tab or stop the existing process before starting a second copy.