export type AutonomousAgentRole = "market_making" | "arbitrage" | "governance" | "hybrid";
export type AgentRole = AutonomousAgentRole;
export type AgentStatus = "active" | "paused" | "executing" | "error";

export interface MarketMakingConfig {
  targetTokenAddress: string;
  targetTokenSymbol: string;
  poolType: "bonding_curve" | "uniswap_v3" | "aerodrome";
  bidSpreadPct: number; // e.g. 1.2%
  askSpreadPct: number; // e.g. 1.2%
  orderSizeEth: number; // e.g. 0.05 ETH
  rebalanceThresholdPct: number; // e.g. 10%
  inventoryRatioEthPct: number; // e.g. 50% target ETH vs Token
}

export interface ArbitrageConfig {
  sourcePool: string; // e.g. "Agunnaya Bonding Curve"
  targetPool: string; // e.g. "Aerodrome Base"
  tokenPair: string; // e.g. "AGL/ETH"
  minProfitMarginPct: number; // e.g. 0.8%
  maxSlippagePct: number; // e.g. 0.5%
  maxTradeSizeEth: number; // e.g. 0.2 ETH
  atomicFlashLoanEnabled: boolean;
}

export interface GovernanceConfig {
  monitoredDaoAddresses: string[];
  votingStrategy: "conservative" | "growth" | "ecosystem_first" | "treasury_protective";
  minQuorumParticipation: number;
  voteWeightTokens: number;
  autoPublishDeliberation: boolean;
  delegationAddress?: string;
}

export interface AgentTreasuryWallet {
  treasuryAddress: string;
  walletType: "smart_contract" | "derived_key" | "safe_multisig";
  ethBalance: number;
  aglBalance: number;
  tokenBalances: Record<string, { symbol: string; balance: number; usdValue: number }>;
  totalValuationUsd: number;
  maxDailySpendEth: number;
  spentTodayEth: number;
  circuitBreakerThresholdPct: number; // e.g. 5% max draw-down before auto-pause
  lastFundedAt?: number;
}
export type AgentTreasury = AgentTreasuryWallet;

export interface AutonomousAgent {
  id: string;
  name: string;
  symbol: string;
  role: AgentRole;
  status: AgentStatus;
  network: "base-mainnet" | "base-sepolia";
  treasury: AgentTreasuryWallet;
  marketMakingConfig?: MarketMakingConfig;
  arbitrageConfig?: ArbitrageConfig;
  governanceConfig?: GovernanceConfig;
  executionIntervalMinutes: number; // e.g. 1, 5, 15, 60 min
  lastExecutedAt: number;
  nextExecutionAt: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalProfitEth: number;
  gasSpentEth: number;
  netYieldApr: number;
  geminiModel: string;
  systemDirective: string;
  creatorAddress: string;
  createdAt: number;
}

export interface AgentExecutionRecord {
  id: string;
  agentId: string;
  agentName: string;
  type: "market_making" | "arbitrage" | "governance";
  timestamp: number;
  status: "success" | "skipped" | "failed";
  action: string;
  reasoningSummary: string;
  txHash: string;
  gasUsedEth: number;
  profitOrLossEth: number;
  details?: Record<string, any>;
}

export interface TreasuryTransaction {
  id: string;
  agentId: string;
  type: "deposit" | "withdrawal" | "trade_inflow" | "trade_outflow" | "gas_fee";
  amountEth: number;
  tokenSymbol: string;
  from: string;
  to: string;
  timestamp: number;
  txHash: string;
}

export interface ExecutionCycleResult {
  success: boolean;
  actionExecuted: string;
  reasoning: string;
  gasEstimateEth: number;
  profitEstimateEth: number;
  txHash?: string;
  newBalanceEth: number;
  newBalanceAgl: number;
  logs: string[];
}
