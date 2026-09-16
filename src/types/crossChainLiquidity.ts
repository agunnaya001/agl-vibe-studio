export type SupportedCrossChainId = 10 | 42161 | 130 | 137 | 8453;

export interface CrossChainNetworkConfig {
  chainId: SupportedCrossChainId;
  name: string;
  shortName: string;
  key: string;
  category: "superchain" | "arbitrum-nitro" | "unichain-defi" | "polygon-pos" | "base-hub";
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  explorerUrl: string;
  logoUrl: string;
  averageBlockTimeSec: number;
  averageGasGwei: number;
  liFiSupported: boolean;
  supportedBridges: string[];
  factoryAddress: string;
  bondingCurveRouterAddress: string;
  unifiedPoolAddress: string;
  status: "active" | "degraded" | "maintenance";
}

export interface CrossChainDeploymentChainStatus {
  chainId: SupportedCrossChainId;
  chainName: string;
  shortName: string;
  status: "pending" | "ready" | "deploying" | "deployed" | "failed";
  txHash?: string;
  deployedAddress?: string;
  bondingCurveAddress?: string;
  gasEstimatedNative: string;
  gasEstimatedUsd: string;
  explorerUrl?: string;
  error?: string;
  verifiedAt?: number;
}

export interface CrossChainDeploymentPlan {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  logoUrl?: string;
  category: string;
  maxSupply: number;
  basePriceEth: number;
  slopeEth: number;
  creatorAddress: string;
  salt: string;
  deterministicAddress: string;
  bytecodeHash: string;
  chains: CrossChainDeploymentChainStatus[];
  unifiedLiquidityEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UnifiedChainReserve {
  chainId: SupportedCrossChainId;
  chainName: string;
  shortName: string;
  reserveEth: number;
  volume24hEth: number;
  sharePct: number;
  lastSyncBlock: number;
  isActive: boolean;
}

export interface UnifiedBondingCurvePool {
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  tokenLogo?: string;
  tokenAddress: string;
  globalSupply: number;
  maxSupply: number;
  globalSpotPriceEth: number;
  totalReserveEth: number;
  totalReserveUsd: number;
  volume24hUsd: number;
  reservesByChain: Record<number, UnifiedChainReserve>;
  liFiBridgeVolume24hUsd: number;
  rebalanceCount: number;
  lastRebalanceTimestamp: number;
  priceDisparityIndexPct: number;
}

export interface LiFiCrossChainRouteStep {
  type: "swap" | "bridge" | "contract_call";
  tool: string;
  toolLogo?: string;
  description: string;
  fromChain: string;
  toChain: string;
  durationSec: number;
}

export interface LiFiCrossChainSwapQuote {
  quoteId: string;
  fromChainId: number;
  toChainId: number;
  fromChainName: string;
  toChainName: string;
  fromToken: {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    logoUrl?: string;
  };
  toToken: {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    logoUrl?: string;
  };
  fromAmount: string;
  toAmount: string;
  bondingCurveMintAmount: string;
  effectiveSpotPriceEth: number;
  priceImpactPct: number;
  estimatedDurationSeconds: number;
  bridgeTool: string;
  bridgeToolLogo: string;
  feeCostsUsd: string;
  gasCostsUsd: string;
  minimumReceived: string;
  steps: LiFiCrossChainRouteStep[];
  isSimulated?: boolean;
}

export interface CrossChainRebalanceRecord {
  id: string;
  sourceChainId: SupportedCrossChainId;
  targetChainId: SupportedCrossChainId;
  sourceChainName: string;
  targetChainName: string;
  amountEth: number;
  reason: "reserve_parity" | "arbitrage_damping" | "liquidity_drawdown" | "manual_relay";
  bridgeProvider: string;
  txHash: string;
  timestamp: number;
  status: "completed" | "in_flight" | "scheduled";
}
