# Base44 Dev Environment Notes

## Running the app

- `docker compose -f docker-compose.base44.yml up -d` — starts the full app on host port 3000.
- Single service `web` (node:22): installs deps then runs `npm run dev` (`tsx server.ts`), which starts an Express server with Vite middleware in dev mode. Frontend and API share one origin — no CORS or proxy needed.

## Key quirks

- **Do NOT use plain `npm install`** — it fails with ERESOLVE (hardhat-toolbox@5 peer-dep conflict: hardhat-chai-matchers wants hardhat-ethers@^3, repo pins @4). The canonical lockfile is `bun.lock`; the container installs with `bun install` (lenient peer deps) and runs the dev server with node/tsx. `package-lock.json` is stale in this regard.
- `vite.config.ts` sets `server.host: true` + `allowedHosts: true` — required so the preview proxy hostname isn't blocked. Keep these.
- `DISABLE_HMR` must stay unset, or Vite file-watching/HMR turns off.
- Frontend edits hot-reload via Vite HMR. Backend edits (`server.ts`, `server/*`) do NOT auto-restart (`tsx` has no watcher) — run `docker compose -f docker-compose.base44.yml restart web` after server-side changes.
- Dependencies persist in the `node_modules` docker volume; image is a plain node:22 runtime with the repo bind-mounted — never use a prebuilt app image.

## Secrets

- Delivered by the platform to `/run/base44/app.env` (listed last in compose `env_file`, overriding `.env.base44-defaults` placeholders).
- `GEMINI_API_KEY` — powers all AI endpoints (builder, agent chat, image/video). Without it the app still boots; AI routes return fallback responses.
- Optional: `LIFI_API_KEY`, `ETHERSCAN_API_KEY`/`BASESCAN_API_KEY` (bridge/verification rate limits), `BETTER_AUTH_SECRET` (token signing; code has a dev default).
- Firebase config is committed (`firebase-applet-config.json`) and runs in offline/fallback mode — nothing to provision.

## Verification

- `curl -sf http://localhost:3000/api/health` → `{"status":"active",...}`
- `curl -sf -H "Host: any.example.com" http://localhost:3000/` must return HTML (external-host check).
- `curl -s http://localhost:3000/src/main.tsx` should return transformed dev source, not 404 — proves live-source serving.
