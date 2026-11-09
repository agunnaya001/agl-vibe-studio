# AGL-10 — Universal EVM Wallet Connectivity

## Scope
Deliver reliable EIP-1193 wallet connectivity for AGL Studio using Wagmi/Viem, EIP-6963 multi-provider discovery, injected browser wallets, Coinbase Wallet, and WalletConnect. Base Mainnet (8453) is the primary network; Base Sepolia (84532) remains available for testing.

## Repository baseline (read-only review)
- `src/lib/wagmi.ts` configures Wagmi with Base and Base Sepolia, `multiInjectedProviderDiscovery: true`, injected, Coinbase Wallet, and WalletConnect connectors.
- `src/main.tsx` correctly mounts `WagmiProvider` and `QueryClientProvider`.
- `src/hooks/useEIP6963.ts` maintains a shared EIP-6963 announcement store and exposes a rescan action.
- `src/hooks/useAGLWallet.ts` wraps connect/disconnect, chain switching, account state, message signing, and balance refresh.
- `src/components/UniversalWalletModal.tsx` exposes discovered providers, WalletConnect, Coinbase Wallet, and generic injected connection options.

## Findings to validate and remediate
1. **EIP-6963 provider selection:** `connectWithProvider` currently matches discovered providers to Wagmi connectors by id/name heuristics, then falls back to the first injected connector. Confirm that a selected provider always connects to that exact provider; never silently connect a different wallet.
2. **Coinbase selection:** `connectCoinbase` falls back to a generic injected connector if the Coinbase connector is not found. Replace this misleading fallback with an explicit actionable error.
3. **WalletConnect configuration:** `wagmi.ts` has a hard-coded fallback project ID. Keep the project ID as public client configuration, but require an explicitly configured `VITE_WALLETCONNECT_PROJECT_ID` (and document the deployment variable); show a clear disabled/error state if absent. Do not treat it as a private secret.
4. **Account and chain changes:** Verify Wagmi remains the single source of truth for account, chain, connect, and disconnect state. Ensure persisted UI state is reconciled on account changes and disconnects.
5. **Wallet type assumptions:** Avoid defaulting unknown connectors to a MetaMask label/type. Persist the actual connector id/name or a neutral `injected` type.
6. **Duplicate balance reads:** The hook uses Wagmi `useBalance` and a separate ethers JSON-RPC read for native ETH. Consolidate or document the reason so UI state cannot diverge.

## Acceptance and verification checklist
- [ ] Selecting each EIP-6963 wallet connects to that exact announced provider.
- [ ] Generic injected connection works when only a standard EIP-1193 provider exists.
- [ ] Coinbase button connects only through Coinbase Wallet and reports unavailable configuration accurately.
- [ ] WalletConnect works on desktop and mobile with a configured project ID; missing configuration gives a clear error.
- [ ] Account changes update the displayed address and balances.
- [ ] Chain changes are reflected; unsupported chains show a clear state and Base switching works.
- [ ] Disconnect clears connected state without deleting unrelated user data.
- [ ] No seed phrase or private key is requested, collected, transmitted, or stored.
- [ ] TypeScript check and production build pass; wallet flows are exercised on Base Sepolia before Base Mainnet release.

## Change policy
This document records a source review only. No wallet code, secrets, environment variables, or production deployment settings were changed as part of the baseline review. Implement fixes in this feature branch, validate on Base Sepolia, and deploy only after explicit review.
