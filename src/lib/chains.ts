import { defineChain } from "viem";
import { base as wagmiBase, baseSepolia as wagmiBaseSepolia } from "viem/chains";

export interface SupportedChainConfig {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  testnet: boolean;
  hexChainId: `0x${string}`;
  badgeLabel: string;
  isPrimary: boolean;
}

/**
 * Base Mainnet Primary Configuration
 * Chain ID: 8453 (0x2105)
 */
export const BASE_MAINNET: SupportedChainConfig = {
  id: 8453,
  name: "Base",
  network: "base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        "https://mainnet.base.org",
        "https://base.llamarpc.com",
        "https://base-mainnet.public.blastapi.io",
        "https://1rpc.io/base"
      ],
    },
    public: {
      http: [
        "https://mainnet.base.org",
        "https://base.llamarpc.com",
        "https://base-mainnet.public.blastapi.io"
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://basescan.org",
    },
  },
  testnet: false,
  hexChainId: "0x2105",
  badgeLabel: "Base Mainnet",
  isPrimary: true,
};

/**
 * Base Sepolia Sandbox Configuration
 * Chain ID: 84532 (0x14a34)
 */
export const BASE_SEPOLIA: SupportedChainConfig = {
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        "https://sepolia.base.org",
        "https://base-sepolia.public.blastapi.io"
      ],
    },
    public: {
      http: [
        "https://sepolia.base.org"
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan Sepolia",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
  hexChainId: "0x14a34",
  badgeLabel: "Base Sepolia (Testnet)",
  isPrimary: false,
};

export const SUPPORTED_CHAINS: SupportedChainConfig[] = [BASE_MAINNET, BASE_SEPOLIA];

export const PRIMARY_CHAIN = BASE_MAINNET;

export function getChainConfig(chainId?: number): SupportedChainConfig {
  if (!chainId) return PRIMARY_CHAIN;
  const found = SUPPORTED_CHAINS.find(c => c.id === chainId);
  return found || PRIMARY_CHAIN;
}

export function isSupportedChain(chainId?: number): boolean {
  if (!chainId) return false;
  return SUPPORTED_CHAINS.some(c => c.id === chainId);
}

export function isBaseMainnet(chainId?: number): boolean {
  return chainId === 8453;
}
