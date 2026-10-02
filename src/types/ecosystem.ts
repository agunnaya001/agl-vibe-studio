export type MarketplaceCategory =
  | "ai_agents"
  | "web3_agents"
  | "dapps"
  | "smart_contracts"
  | "plugins"
  | "workflows"
  | "game_modules"
  | "developer_tools"
  | "apis"
  | "components";

export type VerificationStatus = "verified_official" | "community_verified" | "unverified" | "audited";

export interface MarketplaceItem {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: MarketplaceCategory;
  logoUrl?: string;
  bannerUrl?: string;
  creatorAddress: string;
  creatorName: string;
  version: string;
  baseNetwork: "Base Mainnet" | "Base Sepolia";
  creditsCost: number; // 0 for free
  priceEth?: number;
  contractAddress?: string;
  downloadUrl?: string;
  demoUrl?: string;
  githubUrl?: string;
  docsUrl?: string;
  tags: string[];
  verificationStatus: VerificationStatus;
  isSeedOrDemo: boolean; // Explicitly distinguishes demo/seed from live production data
  installsCount: number;
  activeUsersCount: number;
  rating: number; // 0 - 5.0
  reviewsCount: number;
  createdAt: number;
  updatedAt: number;
  features?: string[];
  compatibility?: string[];
}

export type AppCategory = 
  | "DeFi & Yield"
  | "AI & Autonomous Agents"
  | "Gaming & Metaverse"
  | "NFTs & Collectibles"
  | "DAO & Governance"
  | "Developer Tooling"
  | "Social & Community"
  | "Infrastructure";

export interface PublishedApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: AppCategory;
  logoUrl: string;
  screenshots: string[];
  bannerUrl?: string;
  developerAddress: string;
  developerName: string;
  launchUrl: string;
  githubUrl?: string;
  docsUrl?: string;
  contractAddresses: Array<{ label: string; address: string; explorerUrl: string }>;
  baseNetwork: "Base Mainnet" | "Base Sepolia";
  verificationStatus: VerificationStatus;
  isSeedOrDemo: boolean;
  totalTransactions?: number;
  uniqueUsersCount?: number;
  tvlEth?: number;
  builtWithAglBadge: boolean;
  version: string;
  createdAt: number;
  updatedAt: number;
}

export type SpecializedAgentRole =
  | "solidity_auditor"
  | "base_contract_analyst"
  | "dao_proposal_agent"
  | "treasury_analysis_agent"
  | "token_analytics_agent"
  | "game_economy_agent"
  | "contract_explainer"
  | "deployment_assistant";

export interface AgentToolConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredCredits: number;
  requiresSigning: boolean; // If true, requires explicit wallet confirmation
  rateLimitPerMinute: number;
}

export interface SpecializedAgent {
  id: string;
  name: string;
  symbol: string;
  role: SpecializedAgentRole;
  description: string;
  creatorAddress: string;
  version: string;
  isPublishedToMarketplace: boolean;
  systemPrompt: string;
  tools: AgentToolConfig[];
  permissions: {
    canQueryBaseRpc: boolean;
    canAnalyzeBytecode: boolean;
    canReadTreasuryState: boolean;
    canDraftProposals: boolean;
    canSuggestTransactions: boolean; // CANNOT execute silently; must request user signature
    maxEthPerProposedTx: number;
  };
  pricing: {
    creditsPerQuery: number;
    feeEthPerSpecializedAudit: number;
  };
  safetyControls: {
    sandboxSimulationFirst: boolean;
    requireSignConfirmation: boolean; // Always true
    maxExecutionTimeSeconds: number;
  };
  queryCount: number;
  auditsPerformedCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface BuilderActivityBadge {
  id: string;
  title: string;
  description: string;
  category: "deployment" | "security" | "publishing" | "governance" | "credits";
  iconName: string;
  earnedAt?: number;
  isEarned: boolean;
  verifiableProof?: string;
}

export interface BuilderIdentity {
  walletAddress: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  websiteUrl?: string;
  githubUsername?: string;
  twitterHandle?: string;
  joinedAt: number;
  isVerifiedDeveloper: boolean;
  // Verifiable activity counts derived from real Studio / Base actions
  applicationsCreatedCount: number;
  applicationsPublishedCount: number;
  contractsDeployedCount: number;
  agentsCreatedCount: number;
  agentsPublishedCount: number;
  auditsPerformedCount: number;
  totalStudioCreditsConsumed: number;
  daoProposalsVotedCount: number;
  badges: BuilderActivityBadge[];
}

export type BountyStatus = "open" | "in_review" | "awarded" | "closed";

export interface BountySubmission {
  id: string;
  bountyId: string;
  applicantAddress: string;
  applicantName: string;
  submissionUrl: string;
  githubPrUrl?: string;
  contractAddress?: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  reviewedAt?: number;
}

export interface EcosystemBounty {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  rewardEth: number;
  rewardAgl: number;
  rewardUsdEquivalent?: number;
  deadlineTimestamp: number;
  status: BountyStatus;
  creatorAddress: string;
  creatorOrg: string;
  category: "Smart Contracts" | "AI Agents" | "Frontend & UI" | "Security Audit" | "Documentation" | "Integrations" | "Developer Tooling";
  daoProposalReference?: string;
  submissionsCount: number;
  winnerAddress?: string;
  isTreasuryFunded: boolean;
  createdAt: number;
}

export interface EcosystemMetrics {
  timestamp: number;
  aglToken: {
    name: string;
    symbol: string;
    contractAddress: string;
    network: string;
    chainId: number;
    totalSupplyFormatted: string;
    verifiedHoldersCount: number | "UNAVAILABLE";
    circulatingSupply: string;
    baseScanUrl: string;
  };
  studio: {
    registeredBuildersCount: number;
    totalProjectsCount: number;
    deployedContractsCount: number;
    publishedAppsCount: number;
    publishedAgentsCount: number;
    creditsConsumedTotal: number;
    activeUsersCount: number;
  };
  governance: {
    daoGovernorAddress: string;
    timelockAddress: string;
    votesWrapperAddress: string;
    totalProposalsCount: number;
    activeProposalsCount: number;
    executedProposalsCount: number;
    totalVotesCastCount: number;
  };
  gamefi: {
    registeredGamesCount: number;
    activePlayersCount: number;
    championNftsMintedCount: number;
    totalPvpBattlesCount: number;
  };
}
