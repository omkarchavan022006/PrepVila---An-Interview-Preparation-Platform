# Frontend Deployment Guide

## Requirements

- Node.js compatible with the installed Vite release (Node.js 20.19+ or 22.12+ is recommended for Vite 8).
- A reachable Django API with the existing `/api/` routes.
- A static host that supports SPA history fallback.

## Install and run locally

From `frontend/`:

```sh
npm install
npm run dev
```

Local development defaults to `http://127.0.0.1:8000/api`. An ignored `.env.local` can override the value:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

The value is the API root ending in `/api`; API service paths append resource paths to it.

## Production environment

Set `VITE_API_BASE_URL` in the deployment/build environment, for example:

```dotenv
VITE_API_BASE_URL=https://your-production-api.example.com/api
```

Vite embeds `VITE_` values into the client bundle at build time. Treat them as public. The variable should contain only the API URL. Never place Gemini keys, Django secret keys, JWT signing keys, database URLs, or credentials in a frontend environment file.

If omitted in a production build, Axios uses same-origin `/api`; this requires a reverse proxy forwarding `/api/*` to Django. Localhost is used only in Vite development mode.

## Build and preview

```sh
npm run build
npm run preview
```

The build output is `frontend/dist/`. Preview serves the built output locally; it does not verify backend integration or production hosting.

## Hosting and SPA routes

The app uses `BrowserRouter` with nested paths such as `/dashboard/interviews/history`. Configure the static host to serve `index.html` for unknown frontend paths while allowing actual static assets to return normal 404s. Verify a direct request and refresh on a nested route after deployment.

The current Vite config targets the origin root (`/`). Hosting under a path prefix requires reviewed Vite `base` and router path changes; neither is configured here.

## Backend origin, CORS, and authentication

For different frontend/API origins, the Django deployment must allow the exact frontend origin and required methods/headers, including `Authorization` and `Content-Type`. Multipart uploads rely on browser-generated content type and boundary. Use HTTPS for both origins in production. Backend CORS and hosting settings were not changed or production-verified.

Authentication sends the existing JWT as a Bearer token and persists it in browser localStorage. The backend has no token-refresh endpoint. Logout calls the revocation API and clears local state even if the server cannot confirm revocation; the UI reports that outcome.

## Build and error checks

The project exposes `npm run build` and `npm run lint`. No automated frontend test framework is configured. A passing build/lint does not verify credentials, CORS, AI provider configuration, MongoDB, PDF delivery, or deployed routes; validate those against the actual deployment before release.
