import { isAddress } from "viem";

export const BASE_MAINNET_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

export type BaseNetwork = "mainnet" | "sepolia";

export const BASE_NETWORKS: Record<BaseNetwork, { chainId: number; label: string; explorerUrl: string }> = {
  mainnet: { chainId: BASE_MAINNET_CHAIN_ID, label: "Base Mainnet", explorerUrl: "https://basescan.org" },
  sepolia: { chainId: BASE_SEPOLIA_CHAIN_ID, label: "Base Sepolia", explorerUrl: "https://sepolia.basescan.org" },
};

export function getBaseNetwork(chainId?: number | null): BaseNetwork | null {
  if (chainId === BASE_MAINNET_CHAIN_ID) return "mainnet";
  if (chainId === BASE_SEPOLIA_CHAIN_ID) return "sepolia";
  return null;
}

export function getExplorerUrl(network: BaseNetwork, hashOrAddress: string, kind: "tx" | "address" = "tx") {
  return `${BASE_NETWORKS[network].explorerUrl}/${kind}/${hashOrAddress}`;
}

export function isValidEvmAddress(value: string) {
  return isAddress(value);
}

export function getWalletErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/user rejected|denied|rejected/i.test(message)) return "Transaction rejected in wallet.";
  if (/insufficient funds/i.test(message)) return "Insufficient native gas balance for this transaction.";
  if (/wrong network|chain/i.test(message)) return "Switch your wallet to the selected Base network and try again.";
  return "The wallet request failed. Review the request and try again.";
}

export type TransactionStatus = "idle" | "awaiting-wallet" | "pending" | "confirmed" | "rejected" | "failed";

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  idle: "Ready",
  "awaiting-wallet": "Awaiting wallet",
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  rejected: "Rejected",
  failed: "Failed",
};

export function isWriteReady(status: TransactionStatus) {
  return status === "idle" || status === "rejected" || status === "failed";
}
