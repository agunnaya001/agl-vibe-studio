import { http, createConfig, fallback } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";
import { BASE_MAINNET, BASE_SEPOLIA } from "./chains";

/**
 * Base Builder Code Attribution (ERC-8021)
 * Builder Code: bc_btb1rzza
 */
export const BUILDER_CODE = "bc_btb1rzza";

export const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
});

// WalletConnect Project ID from environment variable (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID / VITE_WALLETCONNECT_PROJECT_ID)
export const WALLETCONNECT_PROJECT_ID = 
  (typeof import.meta !== "undefined" && ((import.meta as any).env?.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID)) ||
  (typeof process !== "undefined" && (process.env?.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env?.VITE_WALLETCONNECT_PROJECT_ID)) ||
  "3fcc6bba6f1de962d911bb5b5c3dba68";

/**
 * Centralized Wagmi Configuration with Base-First Priority
 * Enables EIP-6963 Multi-Injected Discovery, Coinbase Wallet & WalletConnect
 */
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: "Agunnaya Labs Studio",
      appLogoUrl: "https://aglstudio.xyz/favicon.ico",
      preference: "all",
    }),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: "Agunnaya Labs Studio",
        description: "Operating Layer & Ecosystem Hub for Agunnaya Labs on Base Mainnet",
        url: "https://aglstudio.xyz",
        icons: ["https://aglstudio.xyz/favicon.ico"],
      },
    }),
  ],
  transports: {
    [base.id]: fallback([
      http("https://mainnet.base.org"),
      http("https://base.llamarpc.com"),
      http("https://base-mainnet.public.blastapi.io"),
      http("https://1rpc.io/base"),
    ]),
    [baseSepolia.id]: fallback([
      http("https://sepolia.base.org"),
      http("https://base-sepolia.public.blastapi.io"),
    ]),
  },
  dataSuffix: DATA_SUFFIX,
});

export { DATA_SUFFIX as ERC8021_DATA_SUFFIX };
