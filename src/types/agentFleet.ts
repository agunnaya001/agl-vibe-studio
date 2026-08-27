export type FleetAgentType =
  | "liquidity_rebalancer"
  | "security_sentinel"
  | "yield_harvester"
  | "deflation_burner"
  | "dao_consensus_swarm"
  | "custom_watcher";

export type FleetAgentStatus = "IDLE" | "RUNNING" | "PAUSED" | "TRIGGERED" | "ERROR" | "COMPLETED";

export type TriggerType = "interval" | "gas_floor" | "price_threshold" | "contract_event" | "yield_profitability";

export interface FleetAgentTriggerConfig {
  type: TriggerType;
  intervalSeconds: number; // e.g. 10, 15, 30, 60
  gasFloorGwei?: number; // e.g. execute when Base gas < 0.05 gwei
  priceThresholdUsd?: number; // e.g. target token price
  contractAddress?: string;
  minYieldApy?: number;
  conditionDescription: string;
}

export interface FleetSafetyBounds {
  maxGasPerTxEth: string;
  dailyGasBudgetEth: string;
  maxSlippagePercent: number;
  requireHumanApprovalAboveEth?: string;
  dryRunMode: boolean; // Simulation vs real execution
}

export interface FleetActionLog {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: number;
  type: "tick" | "trigger_matched" | "action_executed" | "skipped" | "error" | "warning";
  summary: string;
  details?: string;
  txHash?: string;
  gasCostEth?: string;
  metricsDiff?: Record<string, any>;
}

export interface BackgroundFleetAgent {
  id: string;
  name: string;
  description: string;
  type: FleetAgentType;
  status: FleetAgentStatus;
  network: "base-mainnet" | "base-sepolia";
  targetContract?: string;
  contractName?: string;
  triggerConfig: FleetAgentTriggerConfig;
  safetyBounds: FleetSafetyBounds;
  createdAt: number;
  lastRunAt?: number;
  nextRunAt?: number;
  totalRuns: number;
  successfulActions: number;
  failedActions: number;
  totalGasSpentEth: string;
  estimatedValueGeneratedUsd: string;
  logs: FleetActionLog[];
  strategyCodeSnippet?: string;
  isSimulated: boolean;
  avatarIcon: string;
  badgeColor: string;
  labId?: string; // If spawned from a lab
}

export interface HandsOnLabStep {
  stepNumber: number;
  title: string;
  description: string;
  explanation: string;
  codeSnippet: string;
  codeLanguage: "solidity" | "typescript" | "json";
  keyTakeaways: string[];
}

export interface HandsOnFleetLab {
  id: string;
  labNumber: number;
  title: string;
  subtitle: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedMinutes: number;
  category: "DeFi Automation" | "Security Sentinels" | "Yield Strategies" | "DAO Governance" | "Token Deflation";
  overview: string;
  architectureDiagram: string[];
  learningObjectives: string[];
  steps: HandsOnLabStep[];
  defaultAgentConfig: Partial<BackgroundFleetAgent>;
  productionCodeTemplate: string;
  tags: string[];
}
