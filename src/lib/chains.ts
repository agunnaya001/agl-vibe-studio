import type { Chain } from "viem";
import {
  arbitrum,
  avalanche,
  base,
  baseSepolia,
  bsc,
  mainnet,
  optimism,
  polygon,
  zora,
} from "viem/chains";

export interface SupportedChainConfig extends Chain {
  hexChainId: `0x${string}`;
  badgeLabel: string;
  logoLabel: string;
  isPrimary: boolean;
  networkHealth: "unverified";
  features: {
    nativeBalance: true;
    gasEstimate: true;
    aglContracts: false;
    contractDeployment: false;
  };
}

function registerChain(chain: Chain, badgeLabel: string, logoLabel: string, isPrimary = false): SupportedChainConfig {
  return {
    ...chain,
    hexChainId: `0x${chain.id.toString(16)}`,
    badgeLabel,
    logoLabel,
    isPrimary,
    networkHealth: "unverified",
    features: {
      nativeBalance: true,
      gasEstimate: true,
      aglContracts: false,
      contractDeployment: false,
    },
  };
}

export const BASE_MAINNET = registerChain(base, "Base Mainnet", "BASE", true);
export const ETHEREUM_MAINNET = registerChain(mainnet, "Ethereum Mainnet", "ETH");
export const ARBITRUM_ONE = registerChain(arbitrum, "Arbitrum One", "ARB");
export const OPTIMISM_MAINNET = registerChain(optimism, "Optimism Mainnet", "OP");
export const POLYGON_POS = registerChain(polygon, "Polygon PoS", "POL");
export const BNB_SMART_CHAIN = registerChain(bsc, "BNB Smart Chain", "BNB");
export const AVALANCHE_C_CHAIN = registerChain(avalanche, "Avalanche C-Chain", "AVAX");
export const ZORA_MAINNET = registerChain(zora, "Zora Mainnet", "ZORA");
export const BASE_SEPOLIA = registerChain(baseSepolia, "Base Sepolia (Testnet)", "BASE");

export const SUPPORTED_CHAINS = [
  BASE_MAINNET,
  ETHEREUM_MAINNET,
  ARBITRUM_ONE,
  OPTIMISM_MAINNET,
  POLYGON_POS,
  BNB_SMART_CHAIN,
  AVALANCHE_C_CHAIN,
  ZORA_MAINNET,
  BASE_SEPOLIA,
] as const;

export const PRIMARY_CHAIN = BASE_MAINNET;

export function getChainConfig(chainId?: number): SupportedChainConfig | undefined {
  if (!chainId) return undefined;
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
}

export function isSupportedChain(chainId?: number): boolean {
  return Boolean(chainId && SUPPORTED_CHAINS.some((chain) => chain.id === chainId));
}

export function isBaseMainnet(chainId?: number): boolean {
  return chainId === BASE_MAINNET.id;
}
