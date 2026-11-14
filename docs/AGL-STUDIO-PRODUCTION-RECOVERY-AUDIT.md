# AGL Studio Production Recovery Audit

**Repository:** `agunnaya001/agl-vibe-studio`  
**Production domain:** `https://aglstudio.xyz`  
**Audit base:** `main` at `fed8c5c97f61893f5399ef970a56327fc752bee6`  
**Recovery branch:** `recovery/agl-studio-production-audit`  
**Status:** Initial static source audit; runtime verification and full test pass remain pending.

## Executive summary

The current source contains multiple competing implementations for staking, overlapping AI navigation routes, and fallback/demo behavior that can present simulated output as successful AI or financial activity. The immediate priority is to remove misleading success states, establish one canonical source for each financial capability, and verify each AI route against its server endpoint and configured provider.

No production branch or live deployment was changed during this audit.

## Confirmed findings

### P0 — Vercel frontend had no serverless handler for the Express API

- The repository had a Vite frontend and an Express backend in `server.ts`, but no Vercel `api/` function entrypoint. The build generated `dist/server.cjs`, which does not by itself expose Express routes on Vercel.
- AI suites, credits, LI.FI proxy, wallet transaction history and other `/api/*` calls could therefore fail on the Vercel static deployment even when the frontend loaded.
- The recovery branch now exports the Express app, prevents it from calling `listen()` inside Vercel Functions, and adds `api/[...path].ts` as a catch-all Node function for the existing API routes. Cloud Run/container startup remains enabled outside Vercel.
- This needs a Vercel preview deployment test before it can be considered fixed.

### P0 — Legacy swap form did not execute a swap

- The old DeFi swap handler sent native ETH directly to the AGL ERC-20 contract address, or transferred AGL to the dead address, then credited the browser wallet with a fabricated exchange output.
- It derived the displayed “spot price” from `creditsPerAGL()`, which is a compute-credit conversion and not a DEX quote.
- The legacy swap form is now disabled until a supported quote source and verified router are integrated.

### P0 — Financial UI can report simulated staking as real

- `src/pages/StakingVaultPage.tsx` seeds two sample positions when local storage is empty.
- It increments displayed rewards every second in browser state.
- Stake, claim and unstake handlers use nested timeouts and local wallet/database updates instead of signing and confirming the configured staking contract.
- It contains hardcoded APY, TVL and AGL/USD values.
- This is not authoritative on-chain staking data and must not be displayed as real deposits or rewards.

### P0 — Duplicate staking surfaces conflict

- Sidebar exposes both `defi` (“Staking & Swaps”) and `staking-vault` (“Automated Staking Vaults”).
- `DeFiPage.tsx` separately implements staking against the AGL staking contract.
- `StakingVaultPage.tsx` implements a second, incompatible local simulation.
- Consolidate to one canonical on-chain staking implementation; do not migrate or invent positions from local storage.

### P0 — AGL Credits UI called methods absent from the declared ABI

- The old credits page called `creditsPerAGL`, `totalAGLBurned`, `aglToken`, and `purchaseCredits`, while the checked-in ABI exposes `creditsPerAgl`, `creditPriceEth`, `getCreditBalance`, `burnAglForCredits`, and `buyCreditsWithEth`.
- The credits page now reads the declared methods and uses the Wagmi connector for approval/burn/purchase transactions, with confirmed receipt checks and no sandbox path.
- The contract has no spend/debit method. AI feature usage therefore remains an off-chain Firestore ledger; the wallet model now tracks on-chain granted credits separately so refreshing the contract balance does not restore consumed application credits.

### P0 — Additional DeFi modules contained simulated financial activity

- The old DEX aggregator generated local quotes, changed local balances, and simulated swaps. It has been removed. The primary swap tab now uses LI.FI live quotes on Base only, requires the connected wallet address, refreshes transaction data before signing, and requires a successful receipt. Cross-chain routing is disabled until chain-specific token lists are implemented.
- The old LI.FI component generated fallback quotes and synthetic transaction hashes, and could fall back to a direct transfer when transaction data was missing. These fallbacks have been removed; execution now requires a valid LI.FI transaction request and a successful Base receipt.
- The old liquidity-pool page created local demo pools and synthetic LP balances. It is now a read-only unavailable state until real pool/factory contracts and LP-token ABIs are configured.
- The old airdrop monitor contained static balances/eligibility and a simulated treasury sweep. It now reads ETH/AGL balances from Base RPC, marks eligibility unverified, and disables sweep actions.
- The old portfolio rebalancer used hardcoded prices, synthetic USDC/staking balances, and local-only execution. It is now read-only until trusted price feeds and contract-backed positions exist.
- The governance poll component is explicitly labelled off-chain; it does not submit AgunnayaDAO Governor proposals or represent on-chain voting power.
- The token burner used synthetic burn receipts and local history. Burn actions are disabled, hardcoded valuations are removed, and unverified legacy records are hidden.
- The autonomous agent service generated random treasury addresses, simulated trades/votes, fake transaction hashes, and hardcoded treasury balances. Agent configurations are now paused, treasury addresses/balances are cleared from the UI, execution endpoints return 501, and legacy execution records are hidden.
- The background fleet now starts idle and runs read-only checks only; old local metrics and execution logs are sanitized.
- The batch token transfer page no longer fabricates token balances, gas estimates, or transaction hashes. It provides local input validation only; batch execution remains disabled.

### P0 — Staking ABI does not match the previous UI

- The checked-in `AGL_STAKING_ABI` declares `getUserStakes`, `calculateReward`, `claimRewards`, `stake(amount, lockPeriodDays)`, and `unstake(stakeIndex)`.
- The former UI called different selectors, including `positionCount`, `getPosition`, `pendingReward`, `paused`, `tiers`, and `emergencyWithdraw`, which are absent from the declared ABI.
- The staking workspace now performs read-only calls using functions present in the checked-in ABI. APR is shown as a raw contract value because its units are not documented. All staking writes remain disabled pending verification of the deployed Base contract source and ABI.

### P0 — Fake staking and dividend activity

- The active staking component contained a 30-second local auto-compound loop, simulated weekly ETH/AGL dividends, and static weekly pool/payout claims.
- The legacy staking page seeded local positions, incremented rewards in the browser, and simulated deposits/claims.
- The duplicate legacy staking page has been removed from navigation and source. Its historical route now resolves to the canonical DeFi staking workspace.
- Auto-compounding and weekly dividend claims are disabled until the deployed contracts expose verified methods and a real distribution source.

### P1 — AI route duplication and misleading fallback behavior

- The five core AI workspaces (auditor, dApp generator, contract explainer, on-chain agent, game builder) are all mounted through `AISuitePage`.
- Sidebar additionally lists the suite hub and standalone entries for those same workspaces; these routes all render the same page with different initial tabs. This is overlapping navigation, not five independent applications.
- `AISuitePage.tsx` currently declares seven workspace tabs (orchestrator, auditor, dApp, explainer, on-chain agent, game builder, chatbot) while the banner says “5 AI Modules”.
- `server/aiSuiteRoutes.ts` returns a deterministic static audit when the Gemini audit call fails. This can be useful as a clearly labelled static scan, but must not be represented as an AI audit.
- The dApp generation endpoint returned a generated-looking template project with HTTP 200 when model generation failed. It now returns an explicit provider error instead.
- The on-chain agent has a server-side RPC context lookup followed by Gemini; errors are returned as 500. The client must display provider/RPC errors clearly and not imply it has verified unavailable data.
- The game builder uses a local random coinflip demo and virtual balance. It must be clearly separated from real on-chain gameplay and never described as a transaction or provably fair outcome.

### P1 — Unsupported model aliases and inconsistent AI provider paths

- Chat UI and API routes referenced unsupported model IDs such as `gemini-4-carbon` and `gemini-4-argon`, while autonomous agent routes referenced retired Gemini 2.0 models.
- The chat UI now uses documented model IDs and keeps Carbon/Argon as role profiles rather than invented model identifiers.
- Several server endpoints and client helpers returned fabricated token proposals, rebalance plans, contract code, or email drafts after provider failure. These now return explicit provider errors.
- Autonomous wallet/transaction endpoints generated simulated transaction hashes and synthetic wallet operations. They are now fail-closed until secure custody, approval and receipt verification exist.

### P1 — Gemini provider configuration is unsafe/incomplete

- `server/geminiHelper.ts` substitutes a placeholder API key when `GEMINI_API_KEY` is absent.
- Model fallback names are hardcoded in the server, including model IDs that may not be enabled for the connected account.
- AI endpoints need a startup/configuration health check, validated environment configuration, supported-model selection, structured provider error reporting, and no fabricated success payloads.
- Never expose secrets in client code or logs.

### P1 — Contract identity inconsistency

- `src/components/ai/ContractExplainerWorkspace.tsx` had an AGL Token preset at `0x3F8a1B92003c20058bA524d4eAc32204c3D66F48`, inconsistent with the canonical AGL token address `0xEA1221B4d80A89BD8C75248Fae7c176BD1854698`.
- The preset now imports the canonical token address constant. Deployed bytecode and the staking ABI still require independent Base Mainnet verification.

### P1 — DeFi price source is not a price oracle

- `DeFiPage.tsx` derives an “AGL/ETH” rate from `creditsPerAGL()` on the AGL Credits contract and applies a hardcoded arithmetic formula.
- Credits conversion is not a DEX spot price. This value must not be labelled as a market price or used to quote swaps.
- On RPC failure the page substitutes a hardcoded rate and hardcoded total staked value. These must become explicit unavailable/error states.
- The page includes sandbox-mode branches; real financial actions must fail closed unless a real signer, correct chain, correct contract and confirmed transaction are available.

## Initial remediation plan

1. Establish a verified contract registry for Base Mainnet (chain ID 8453), including AGL token, AGL Credits, AGL staking, governance and any supported DEX/router contracts. Verify deployed bytecode and ABI/function selectors before enabling writes.
2. Make one shared wallet/provider layer authoritative for all pages; require connected account and Base chain for writes.
3. Verify the deployed AGL staking contract and ABI against Base Mainnet. The current component uses the checked-in ABI for read-only calls; enable writes only after function signatures, lock rules, APR units and receipt handling are confirmed. Local demo positions, reward accrual, auto-compounding and simulated deposits/claims have been removed/disabled.
4. Replace the disabled swap form with a real supported quote source and verified router. Show no quote when unavailable. Never infer market price from credits conversion.
5. Consolidate AI navigation around one hub with five distinct core workspaces. Keep optional chatbot/orchestrator clearly labelled as separate additional tools, without duplicate sidebar entries.
6. Remove generated-looking AI fallback success responses. Return actionable HTTP errors when provider access, quota, model permission or parsing fails. Clearly label static analysis if retained.
7. Correct contract presets against a canonical manifest; verify deployed bytecode and all read/write selectors before enabling financial actions.
8. Add unit/integration tests for route mapping, API contracts, error states, wallet chain gating, contract read/write flows and absence of fake financial success.
9. Run typecheck, production build, server build and route smoke tests; then review the Vercel preview before any production promotion.

## Safety rules

- Never modify `main` directly.
- Never delete or overwrite a deployed contract or migrate user positions based on local demo data.
- Never fabricate balances, APY, TVL, token prices, audit results, transaction hashes or confirmations.
- Never sign, submit or execute transactions without an explicit wallet action and user confirmation.
- Treat the current branch as an isolated recovery workspace until build and preview validation pass.

## Changes made on recovery branch so far

- Canonical AI hub navigation; duplicate standalone AI links removed.
- Added a Vercel catch-all serverless function for the existing Express API and guarded container startup so Vercel imports do not open a second listening socket.
- Gemini model IDs and server-side API key validation corrected.
- False-success AI fallbacks removed from the audited endpoints.
- Duplicate simulated staking page removed; legacy route aliases the canonical DeFi workspace.
- Active staking component now uses the Wagmi connector provider for signer access and Base RPC for reads; simulated positions, compounding, and dividend claims are removed/disabled.
- Legacy swap route is disabled because no verified router/quote source is configured.
- Autonomous execution endpoints are fail-closed pending secure execution infrastructure.

## Verification still required

- Confirm the Vercel preview function responds successfully for `/api/ai/gateway-status`, `/api/ai/chat`, `/api/lifi/quote`, and contract read endpoints. Confirm the Express API routes run in Vercel Node Functions with the required environment variables.

- Full runtime test of all five AI workspaces and their API endpoints.
- Verify server registration and production environment variables, including Gemini provider access.
- Verify contract addresses, ABIs and deployed bytecode against Base Mainnet.
- Verify all navigation IDs and route fallbacks.
- Verify all DeFi tabs and transaction receipts with a test wallet.
- Confirm Vercel preview deployment and production parity.
