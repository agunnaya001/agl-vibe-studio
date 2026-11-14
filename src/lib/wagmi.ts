import { http, createConfig, fallback } from "wagmi";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import type { Transport } from "viem";
import { Attribution } from "ox/erc8021";
import {
  ARBITRUM_ONE,
  AVALANCHE_C_CHAIN,
  BASE_MAINNET,
  BASE_SEPOLIA,
  BNB_SMART_CHAIN,
  ETHEREUM_MAINNET,
  OPTIMISM_MAINNET,
  POLYGON_POS,
  SUPPORTED_CHAINS,
  ZORA_MAINNET,
  type SupportedChainConfig,
} from "./chains";

/**
 * Base Builder Code Attribution (ERC-8021)
 * Builder Code: bc_btb1rzza
 */
export const BUILDER_CODE = "bc_btb1rzza";

export const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
});

// Vite only exposes client-side variables prefixed with VITE_. Never ship a fallback ID.
export const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
export const isWalletConnectConfigured = WALLETCONNECT_PROJECT_ID.length > 0;

/**
 * Centralized Wagmi Configuration with Base-First Priority
 * Enables EIP-6963 Multi-Injected Discovery, Coinbase Wallet & WalletConnect
 */
const chainTransport = (chain: SupportedChainConfig) => {
  const configuredUrls =
    chain.id === BASE_MAINNET.id
      ? ["https://mainnet.base.org", "https://base.llamarpc.com", "https://1rpc.io/base"]
      : chain.id === BASE_SEPOLIA.id
        ? ["https://sepolia.base.org", "https://base-sepolia.public.blastapi.io"]
        : chain.rpcUrls.default.http;

  return fallback(
    configuredUrls.map((url) =>
      http(url, { retryCount: 2, retryDelay: 500, timeout: 10_000 }),
    ),
  );
};

const transports = {
  [BASE_MAINNET.id]: chainTransport(BASE_MAINNET),
  [ETHEREUM_MAINNET.id]: chainTransport(ETHEREUM_MAINNET),
  [ARBITRUM_ONE.id]: chainTransport(ARBITRUM_ONE),
  [OPTIMISM_MAINNET.id]: chainTransport(OPTIMISM_MAINNET),
  [POLYGON_POS.id]: chainTransport(POLYGON_POS),
  [BNB_SMART_CHAIN.id]: chainTransport(BNB_SMART_CHAIN),
  [AVALANCHE_C_CHAIN.id]: chainTransport(AVALANCHE_C_CHAIN),
  [ZORA_MAINNET.id]: chainTransport(ZORA_MAINNET),
  [BASE_SEPOLIA.id]: chainTransport(BASE_SEPOLIA),
} satisfies Record<(typeof SUPPORTED_CHAINS)[number]["id"], Transport>;

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
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
    ...(isWalletConnectConfigured
      ? [
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
        ]
      : []),
  ],
  transports,
  dataSuffix: DATA_SUFFIX,
});

export { DATA_SUFFIX as ERC8021_DATA_SUFFIX };
