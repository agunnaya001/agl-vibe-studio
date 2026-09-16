export type VentureGrantTier = "seed_catalyst" | "growth_velocity" | "ecosystem_unicorn";

export type GrantStatus = "applied" | "in_review" | "approved" | "active" | "graduated" | "rejected";

export type MilestoneStatus = "locked" | "verifiable" | "claimed";

export interface MilestoneTranche {
  id: string;
  trancheNumber: number;
  title: string;
  description: string;
  percentage: number; // e.g. 30 (for 30%)
  amountEth: number;
  amountAgl: number;
  status: MilestoneStatus;
  verificationRequirement: string;
  metricType: "contract_deployment" | "holders_threshold" | "volume_threshold" | "bonding_curve_graduation" | "security_audit";
  metricTargetValue: number | string;
  currentMetricValue: number | string;
  verifiedAt?: number;
  txHash?: string;
}

export interface CoInvestmentSpec {
  matchingLpEth: number;
  protocolOwnershipPct: number;
  vestingWeeks: number;
  polVaultAddress: string;
  status: "pending" | "co_invested" | "harvesting";
  coInvestedAt?: number;
  lpTxHash?: string;
  lpTokensMinted?: string;
  yieldAccruedEth?: number;
}

export interface VentureInvestmentMemo {
  investmentScore: number; // 0-100
  recommendation: "STRONG_CO_INVEST" | "SEED_GRANT_RECOMMENDED" | "CONDITIONAL_APPROVAL" | "REVISE_MILESTONES";
  executiveSummary: string;
  strengths: string[];
  risks: string[];
  tokenomicsHealthScore: number; // 0-100
  securityAuditScore: number; // 0-100
  marketTractionScore: number; // 0-100
  liquidityDampingStrategy: string;
  projectedProtocolRoi: string;
  suggestedMilestoneTargets: string[];
  generatedAt: number;
}

export interface VentureGrant {
  id: string;
  grantNumber: string; // e.g. "AVG-042"
  projectId: string;
  projectName: string;
  projectSymbol: string;
  contractAddress: string;
  creatorAddress: string;
  category: "defi" | "ai" | "utility" | "gamefi" | "infrastructure";
  tier: VentureGrantTier;
  tierName: string;
  totalGrantEth: number;
  totalGrantAgl: number;
  coInvestmentEth: number;
  disbursedEth: number;
  disbursedAgl: number;
  milestones: MilestoneTranche[];
  coInvestment: CoInvestmentSpec;
  status: GrantStatus;
  aiMemo?: VentureInvestmentMemo;
  daoProposalId?: string;
  governanceState?: "approved_by_dao" | "committee_fast_tracked" | "pending_vote";
  createdAt: number;
  updatedAt: number;
  currentRoiPct?: number;
  protocolLpAccruedEth?: number;
}

export interface StudioDeveloperProject {
  id: string;
  name: string;
  symbol: string;
  address: string;
  creator: string;
  launchType: "bonding_curve" | "token_factory" | "ai_dapp" | "gamefi";
  tvlEth: number;
  volume24hEth: number;
  marketCapUsd: number;
  bondingCurveProgressPct: number;
  holdersCount: number;
  transactionsCount: number;
  auditScore: number;
  isVerified: boolean;
  grantEligibleTier: VentureGrantTier | null;
  activeGrantId?: string;
  logoUrl: string;
  description: string;
  rank: number;
}

export interface VentureTreasuryState {
  totalTreasuryEth: number;
  ventureFundEth: number;
  ventureFundAgl: number;
  totalGrantsDisbursedEth: number;
  totalCoInvestedLpEth: number;
  portfolioValuationUsd: number;
  portfolioRoiPct: number;
  activeGrantCount: number;
  supportedProjectsCount: number;
  polFeeYieldEth: number;
  treasuryContractAddress: string;
  ventureGrantsContractAddress: string;
  allocationBreakdown: {
    seedGrantsEth: number;
    growthRoundsEth: number;
    unicornRoundsEth: number;
    polLiquidityEth: number;
    unallocatedReserveEth: number;
  };
}
