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

### P1 — AI route duplication and misleading fallback behavior

- The five core AI workspaces (auditor, dApp generator, contract explainer, on-chain agent, game builder) are all mounted through `AISuitePage`.
- Sidebar additionally lists the suite hub and standalone entries for those same workspaces; these routes all render the same page with different initial tabs. This is overlapping navigation, not five independent applications.
- `AISuitePage.tsx` currently declares seven workspace tabs (orchestrator, auditor, dApp, explainer, on-chain agent, game builder, chatbot) while the banner says “5 AI Modules”.
- `server/aiSuiteRoutes.ts` returns a deterministic static audit when the Gemini audit call fails. This can be useful as a clearly labelled static scan, but must not be represented as an AI audit.
- The dApp generation endpoint returns a generated-looking template project with HTTP 200 when model generation fails. This is a false-success path and must return an explicit provider error instead.
- The on-chain agent has a server-side RPC context lookup followed by Gemini; errors are returned as 500. The client must display provider/RPC errors clearly and not imply it has verified unavailable data.
- The game builder uses a local random coinflip demo and virtual balance. It must be clearly separated from real on-chain gameplay and never described as a transaction or provably fair outcome.

### P1 — Gemini provider configuration is unsafe/incomplete

- `server/geminiHelper.ts` substitutes a placeholder API key when `GEMINI_API_KEY` is absent.
- Model fallback names are hardcoded in the server, including model IDs that may not be enabled for the connected account.
- AI endpoints need a startup/configuration health check, validated environment configuration, supported-model selection, structured provider error reporting, and no fabricated success payloads.
- Never expose secrets in client code or logs.

### P1 — Contract identity inconsistency

- `src/components/ai/ContractExplainerWorkspace.tsx` has an AGL Token preset at `0x3F8a1B92003c20058bA524d4eAc32204c3D66F48`.
- The known AGL token address used elsewhere in the app is `0xEA1221B4d80A89BD8C75248Fae7c176BD1854698`.
- Verify against BaseScan and the canonical deployment manifest before replacing any contract references. Preset must never point to a different token while labelling it AGL.

### P1 — DeFi price source is not a price oracle

- `DeFiPage.tsx` derives an “AGL/ETH” rate from `creditsPerAGL()` on the AGL Credits contract and applies a hardcoded arithmetic formula.
- Credits conversion is not a DEX spot price. This value must not be labelled as a market price or used to quote swaps.
- On RPC failure the page substitutes a hardcoded rate and hardcoded total staked value. These must become explicit unavailable/error states.
- The page includes sandbox-mode branches; real financial actions must fail closed unless a real signer, correct chain, correct contract and confirmed transaction are available.

## Initial remediation plan

1. Establish a verified contract registry for Base Mainnet (chain ID 8453), including AGL token, AGL Credits, AGL staking, governance and any supported DEX/router contracts. Verify deployed bytecode and ABI/function selectors before enabling writes.
2. Make one shared wallet/provider layer authoritative for all pages; require connected account and Base chain for writes.
3. Consolidate staking into one implementation backed by the deployed AGL staking contract. Remove seeded demo positions, local reward accrual and simulated deposits/claims.
4. Replace swap pricing with a real supported quote source and show no quote when unavailable. Never infer market price from credits conversion.
5. Consolidate AI navigation around one hub with five distinct core workspaces. Keep optional chatbot/orchestrator clearly labelled as separate additional tools, without duplicate sidebar entries.
6. Remove generated-looking AI fallback success responses. Return actionable HTTP errors when provider access, quota, model permission or parsing fails. Clearly label static analysis if retained.
7. Correct and verify all contract presets against a canonical manifest.
8. Add unit/integration tests for route mapping, API contracts, error states, wallet chain gating, contract read/write flows and absence of fake financial success.
9. Run typecheck, production build, server build and route smoke tests; then review the Vercel preview before any production promotion.

## Safety rules

- Never modify `main` directly.
- Never delete or overwrite a deployed contract or migrate user positions based on local demo data.
- Never fabricate balances, APY, TVL, token prices, audit results, transaction hashes or confirmations.
- Never sign, submit or execute transactions without an explicit wallet action and user confirmation.
- Treat the current branch as an isolated recovery workspace until build and preview validation pass.

## Verification still required

- Full runtime test of all five AI workspaces and their API endpoints.
- Verify server registration and production environment variables, including Gemini provider access.
- Verify contract addresses, ABIs and deployed bytecode against Base Mainnet.
- Verify all navigation IDs and route fallbacks.
- Verify all DeFi tabs and transaction receipts with a test wallet.
- Confirm Vercel preview deployment and production parity.
