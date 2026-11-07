# AGL-9 — Architecture and dual-host deployment baseline

## Scope

This document records the initial repository review for AGL Studio running across Vercel and Google Cloud Run. It is a baseline and remediation plan, not proof that either live deployment has been tested.

## Repository facts observed

- Frontend: React 19, TypeScript, Vite 6.
- Backend: Express 4 in `server.ts`.
- Build: `vite build` plus esbuild bundles the Express server to `dist/server.cjs`.
- Runtime requirement: Node.js >= 22.
- Wallet stack: Wagmi 3, Viem 2, Ethers 6; Base Mainnet and Base Sepolia are configured.
- Authentication: Firebase Auth plus Better Auth.
- Data: Firebase Firestore.
- AI: Google GenAI SDK, with server-side Express routes.
- `/health` and related health endpoints are implemented in `server.ts`.

## Dual-host deployment model to validate

### Vercel

Use Vercel for the Vite frontend/static assets unless the existing Vercel project is intentionally configured with a supported serverless adapter for the Express API. A Vite build alone does not deploy the Express routes.

If the frontend calls the Cloud Run API, configure a single production API base URL and verify CORS, cookies/auth callbacks, and allowed origins for the production Vercel domain.

### Google Cloud Run

Use Cloud Run for the long-running Express API and server-side AI/auth routes. Build the server bundle and run the generated artifact. Configure secrets through Google Secret Manager or Cloud Run secret environment variables; do not bake credentials into the image.

The repository currently has no root `Dockerfile`, `cloudbuild.yaml`, or `app.yaml` at the paths checked during this review. Confirm whether Cloud Run is deployed from source/buildpacks or from an external build pipeline before adding deployment manifests.

## Findings requiring remediation or confirmation

1. **Start-script/build-artifact mismatch:** `package.json` builds `dist/server.cjs`, but the current `start` script is `node server.ts`. Align the production start command with the artifact actually produced, then verify on the same Node runtime used by Cloud Run.
2. **Better Auth fallback secret:** `src/lib/auth.ts` contains a hard-coded fallback value for `BETTER_AUTH_SECRET`. Production must require a strong, unique secret supplied through the deployment secret manager. Remove insecure fallback behavior only after confirming the configured secrets on both production environments.
3. **Environment parity:** `.env.example` documents server-only credentials and frontend WalletConnect variables together. Separate public build-time variables from server-only secrets and maintain distinct Vercel and Cloud Run environment inventories.
4. **API routing:** Vercel frontend and Cloud Run API need an explicit, documented API origin and a deliberate CORS/auth-cookie policy. Verify auth callback URLs and trusted origins on both hosts.
5. **Production checks:** Verify `/health`, frontend loading, AI API calls, authentication, Firestore access, wallet connection, Base reads, and transaction preparation independently on staging before production changes.

## Environment handling rules

- Never expose `GEMINI_API_KEY`, `BETTER_AUTH_SECRET`, deployer private keys, or other server credentials in `VITE_*` variables or browser bundles.
- Treat Firebase web configuration and WalletConnect project IDs as client-side configuration, not as substitutes for backend authorization.
- Do not store deployer private keys in Vercel client/build variables. If deployment signing is required, use a dedicated isolated signer and secret manager.
- Use separate staging and production credentials where supported.

## Acceptance checklist for AGL-9

- [ ] Record the Vercel project name, production domain, build command, output directory, and configured API origin.
- [ ] Record the Cloud Run service name, region, revision, runtime, build source, and health URL.
- [ ] Align the production start command with the generated server artifact.
- [ ] Remove hard-coded authentication-secret fallback after confirming secret configuration.
- [ ] Document public versus server-only environment variables for each host.
- [ ] Verify CORS, trusted origins, auth callback URLs, and cookie behavior across both hosts.
- [ ] Run frontend and backend build/type checks.
- [ ] Run staging smoke tests before production rollout.
- [ ] Document rollback procedure for each host.

## Change policy

This baseline intentionally makes no runtime or production configuration changes. Apply code and deployment changes in small reviewed commits, validate staging first, and preserve existing working Studio functionality.
