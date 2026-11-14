# AGL Studio Production Readiness

**Repository:** `agunnaya001/agl-vibe-studio`  
**Working branch:** `recovery/agl-studio-v0-audit`  
**Product stack:** React 19, TypeScript, Vite, Express, Wagmi/Viem, Firebase/Firestore, Vercel Functions  
**Assessment:** Recovery work improves fail-closed behavior and adds EVM chain selection, but this source tree is **not verified as production-ready**. Do not merge or deploy until the blockers below are addressed and tested.

## Architecture and completed recovery work

- The browser app is a Vite/React SPA. `server.ts` provides Express APIs, and `api/[...path].ts` exposes the Express app as a Vercel Function.
- The wallet uses Wagmi/Viem connectors for injected EIP-1193, EIP-6963 discovery, Coinbase Wallet, and optional WalletConnect. A WalletConnect project ID is required for that connector.
- The network registry now uses maintained Viem chain definitions for Base (8453, primary), Ethereum (1), Arbitrum One (42161), Optimism (10), Polygon PoS (137), BNB Smart Chain (56), Avalanche C-Chain (43114), Zora (7777777), and Base Sepolia (84532). Wagmi exposes explicit wallet-approved switching, bounded RPC retries/timeouts, and active-chain native-balance reads.
- The active chain registry deliberately reports health as unverified. AGL-specific contract capabilities and contract deployment are disabled in the registry for every chain; the configured Base contract addresses are not automatically copied to other chains.
- Historical recovery changes removed or disabled audited simulated financial behavior: seeded governance proposals and vote totals, synthetic transaction outcomes and gas/oracle data, local simulated staking rewards, unsupported governance writes, fake AI fallback payloads, and several unverified DeFi actions. These changes generally prefer unavailable/error states over fabricated values.
- Off-chain community polls are labeled non-binding. The service worker now bypasses API, credentialed, authorization-bearing, no-store, and cross-origin requests instead of placing them in Cache Storage.

## Feature status

| Area | Status | Evidence and limitations |
| --- | --- | --- |
| EVM network configuration | PARTIAL | All requested EVM mainnets plus Base Sepolia are in Wagmi/Viem and exposed in the network selector. Public RPC reachability, limits, latency, and chain health have not been measured. |
| Wallet connectivity | PARTIAL | Existing Wagmi connectors and EIP-6963 discovery remain. WalletConnect is conditional on `VITE_WALLETCONNECT_PROJECT_ID`. No real wallet, WalletConnect QR, rejection, or mobile in-app-browser test was run in this recovery. |
| Native balances | PARTIAL | Wagmi reads the active chain and the wallet panel labels it. No portfolio aggregation is implemented or claimed. |
| AGL token, staking, DAO, and credits contracts | BLOCKED for production writes | Existing app contract code is Base-oriented. Deployed bytecode, ABI selectors, events, roles, and transaction behavior were not independently verified during this work. Staking/governance actions remain fail-closed where the recovery audit found their write path unverified. |
| Gas and transaction history | PARTIAL | Synthetic oracle values and transaction-success records were removed in the audited flows. Live values depend on provider/RPC availability and are not fully runtime-verified. |
| Solidity development/deployment | NOT VERIFIED | A complete compiler, bytecode deployment, verification, and receipt workflow across all configured networks was not exercised. Registry deployment capability remains disabled. |
| AI providers | PARTIAL | Server-side Gemini/Gateway code and typed/error behavior were repaired in the targeted recovery. Gemini media routes require server `GEMINI_API_KEY`; provider credentials, models, quota, and every route were not runtime-verified. |
| AI credits/billing | BLOCKED for production charging | Persistent credit ownership, transaction confirmation, and duplicate-processing protections require end-to-end security and database verification. Do not treat client state as authoritative billing. |
| Database/auth/security | PARTIAL | Firebase/Firestore and Better Auth code exist. Firestore rules, production authorization, wallet ownership proofs, all API routes, rate limits, and access controls were not comprehensively penetration-tested. No destructive migrations were run. |
| PWA/offline | PARTIAL | The app has a manifest and service worker. API responses are now excluded from caching. Icon validity, offline operation, update lifecycle, and authenticated response behavior still need device testing. |
| Performance | BLOCKED pending optimization verification | A previous build reported a vendor chunk around 4.15 MB. No before/after bundle analysis or demonstrated chunk reduction was completed. |

## Contract configuration

The source contains Base addresses for AGL token, credits, staking, wAGL votes, Governor, and Timelock in `src/lib/aglContracts.ts`. Their presence in source is **not** proof of deployment or verification. The existing source metadata includes `isVerified` flags, but this recovery did not independently establish explorer verification or compare deployed bytecode and selectors. Do not enable an AGL write based only on those flags or reuse these addresses on another chain.

## Runtime configuration

Variables referenced in source include:

- `GEMINI_API_KEY` — server-only Gemini access, including media routes.
- `AI_GATEWAY_API_KEY` — optional Gateway/server routing path.
- `LIFI_API_KEY` — optional LI.FI access/rate-limit configuration.
- `ETHERSCAN_API_KEY` / `BASESCAN_API_KEY` — explorer verification and related routes.
- `VITE_WALLETCONNECT_PROJECT_ID` — public WalletConnect project identifier; do not use it for secrets.
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_URL`, `BETTER_AUTH_API_KEY` — Better Auth configuration as used by the server/auth module.
- `RPC_URL` / `BASE_RPC_URL` — deployment-script RPC configuration. Do not put private RPC credentials in browser-exposed `VITE_` variables.
- `PRIVATE_KEY` — deployment scripts only; never expose or commit a real value, and do not use for ordinary app signing.

The checked-in `.env.example` contains placeholders, not confirmation that corresponding services are connected or configured. Do not infer runtime availability from an example file.

## Security and release blockers

1. Independently verify every Base contract address against Base Mainnet: chain ID, deployed bytecode, source/ABI, selectors, events, permissions, ownership, and relevant transaction behavior.
2. Review every client and API path that reads or changes wallet balances, credits, treasury data, or user-owned data. Enforce server authorization and user scoping; verify Firestore rules and wallet-signature ownership before trusting an address.
3. Exercise every configured RPC and network switch with a test wallet. Confirm unsupported networks and RPC failures fail safely, and ensure chain provenance is clear on every balance and transaction view.
4. Complete no-money testnet/simulation coverage for staking, governance, credits, deployment, receipt validation, duplicate transaction handling, and provider failure cases before enabling writes.
5. Run a full API/auth/database security review, including rate limiting, CORS, input validation, production error redaction, and logs.
6. Test PWA install, offline fallback, service-worker updates, and authenticated response isolation on real mobile browsers and wallet browsers.
7. Analyze and reduce the previously reported large vendor bundle; verify initial route chunks and functional lazy loading.
8. Deploy only to a preview after review and exercise the Vercel Function/API endpoints there. No deployment was performed as part of this recovery.

## Verification record

For the earlier targeted repair, the recorded results were `npm run lint` (passed; script runs `tsc --noEmit`), `npx tsc --noEmit` (passed), `npm run build` (passed), and `git diff --check` (passed). The production build emitted third-party Rollup annotation warnings and large-chunk warnings, with a largest vendor chunk reported near 4.15 MB. Governance browser smoke testing showed an empty proposal list, but the preview later intermittently rendered blank, so the unavailable-state banner was not consistently verified.

The current multichain, Header, balance-labeling, and service-worker changes require fresh full validation. No real financial transaction, merge, or production deployment is authorized by this document.
