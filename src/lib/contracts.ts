import { ethers } from "ethers";

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export type BaseNetwork = "base" | "base-sepolia";

export const BASE_NETWORKS = {
  base: {
    id: 8453,
    name: "Base Mainnet",
    rpcUrl: env.VITE_BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
  },
  "base-sepolia": {
    id: 84532,
    name: "Base Sepolia",
    rpcUrl: env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
  },
} as const;

export const AGL_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

export const BONDING_CURVE_ABI = [
  "function buy(address token, uint256 minTokens) payable returns (uint256 tokensOut)",
  "function sell(address token, uint256 tokenAmount, uint256 minEthOut) returns (uint256 ethOut)",
  "function quoteBuy(address token, uint256 ethIn) view returns (uint256 tokensOut)",
  "function quoteSell(address token, uint256 tokenAmount) view returns (uint256 ethOut)",
  "event Buy(address indexed buyer, address indexed token, uint256 ethIn, uint256 tokensOut)",
  "event Sell(address indexed seller, address indexed token, uint256 tokensIn, uint256 ethOut)",
] as const;

export function getNetwork(): BaseNetwork {
  return env.VITE_BASE_NETWORK === "base-sepolia" ? "base-sepolia" : "base";
}

export function getContractAddresses(network: BaseNetwork = getNetwork()) {
  const prefix = network === "base" ? "VITE_BASE_MAINNET" : "VITE_BASE_SEPOLIA";
  return {
    aglToken: env[`${prefix}_AGL_TOKEN_ADDRESS`] || "",
    bondingCurve: env[`${prefix}_BONDING_CURVE_ADDRESS`] || "",
  };
}

export function isAddressConfigured(address: string): boolean {
  return Boolean(address && ethers.isAddress(address) && address !== ethers.ZeroAddress);
}

export function getExplorerTxUrl(hash: string, network: BaseNetwork = getNetwork()): string {
  return `${BASE_NETWORKS[network].explorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string, network: BaseNetwork = getNetwork()): string {
  return `${BASE_NETWORKS[network].explorerUrl}/address/${address}`;
}
