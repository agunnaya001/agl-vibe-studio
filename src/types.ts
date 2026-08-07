export interface SocialLinks {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  creatorFeesEarned: number;
  currentPrice: number; // in ETH
  supply: number; // current minted supply
  maxSupply: number; // e.g. 1,000,000,000
  marketCap: number; // currentPrice * supply
  reserveEth: number; // ETH locked in bonding curve
  volume24h: number; // mock 24h trading volume
  category: "meme" | "defi" | "ai" | "utility" | "gamefi";
  logoUrl: string;
  socials: SocialLinks;
  isVerified: boolean;
  vestingWeeks: number;
  referralRewardsPct: number;
  createdAt: number; // Timestamp
  implementation?: string; // Proxy implementation address
}

export interface NFTItem {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  traits: Array<{ trait_type: string; value: string }>;
}

export interface NFTCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  mintPrice: number; // in ETH
  currentSupply: number;
  maxSupply: number;
  royaltyFee: number; // e.g. 5%
  isRevealed: boolean;
  isVerified: boolean;
  imageUrl: string;
  items: NFTItem[];
  socials: SocialLinks;
  createdAt: number;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  creator: string;
  status: "Active" | "Passed" | "Defeated" | "Executed";
  votesFor: number;
  votesAgainst: number;
  endTime: number; // Timestamp
  executed: boolean;
}

export interface DAO {
  contractAddress: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  governanceTokenAddress: string;
  treasuryBalanceEth: number;
  memberCount: number;
  proposals: Proposal[];
  createdAt: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  aglReward: number;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  unlocked: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user: string;
  xp: number;
  score: number;
}

export interface BattlePassTier {
  level: number;
  xpRequired: number;
  rewardName: string;
  rewardType: "token" | "badge" | "nft";
  unlocked: boolean;
}

export interface GameFiProject {
  contractAddress: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  prizePoolEth: number;
  activeSeasons: number;
  missions: Mission[];
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  battlePass: BattlePassTier[];
  createdAt: number;
}

export interface AIAgent {
  id: string;
  name: string;
  symbol: string;
  description: string;
  contractAddress: string;
  creator: string;
  tokenPrice: number; // in ETH
  usageFeeEth: number; // Fee to trigger the agent
  lifetimeRevenueEth: number;
  queryCount: number;
  systemPrompt: string;
  tone?: "professional" | "witty" | "concise" | "friendly" | "analytical";
  responseLength?: "short" | "medium" | "long";
  personalityBehaviors?: string[];
  avatarUrl: string;
  aglRewardDiscounts: boolean;
  backedByAglLiquidity?: boolean;
  aglLiquidityBoosted?: number;
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
  createdAt: number;
}

export interface StakingPool {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: string;
  apr: number; // APR % e.g. 45
  tvlEth: number;
  stakedBalance: number;
  earnedRewards: number;
  lockPeriodDays: number;
}

export interface SubAccount {
  id: string;
  label: string;
  address: string;
  walletType: "metamask" | "coinbase" | "walletconnect" | "smart";
  balanceEth: number;
  aglTokenBalance: number;
  aglCredits: number;
  isSmartAccount: boolean;
  isActive: boolean;
  createdAt: number;
}

export interface WalletState {
  isConnected: boolean;
  address: string;
  balanceEth: number;
  walletType: "metamask" | "coinbase" | "walletconnect" | "smart" | null;
  isSmartAccount: boolean;
  sponsoredGasEth: number; // Mock AA gas sponsorship
  aglTokenBalance: number; // Native utility token Agunnaya Labs Token
  aglCredits: number; // Computational credits earned via on-chain AGL burning
  aglLiquidityStaked?: number;
  subAccounts?: SubAccount[];
}

export interface Activity {
  id: string;
  type: "buy" | "sell" | "create" | "mint" | "vote" | "stake" | "achievement" | "deployment" | "referral" | "burn";
  tokenSymbol: string;
  tokenAddress: string;
  user: string;
  amount: number;
  ethValue: number;
  timestamp: number;
  details: string;
}

export interface ReferralRecord {
  code: string; // custom referral code or address
  ownerAddress: string;
  totalReferredCount: number;
  totalFeesGeneratedEth: number;
  unclaimedRewardsAgl: number;
  claimedRewardsAgl: number;
}

export interface ReferralPayout {
  id: string;
  referredUser: string;
  txType: string; // "swap" | "trade" | "mint"
  feeEth: number;
  rewardAgl: number;
  timestamp: number;
}

export interface PriceAlert {
  id: string;
  userId: string;
  tokenAddress: string;
  tokenSymbol: string;
  targetPrice: number; // Spot price in ETH
  condition: "above" | "below";
  status: "active" | "triggered";
  createdAt: number;
  triggeredAt: number | null;
}

export interface AgentServiceConnection {
  id: string;
  providerName: string;
  issuer: string;
  description: string;
  connectedAt: number;
  capabilities: Array<{
    name: string;
    description: string;
    approvalStrength: "session" | "webauthn" | "always";
  }>;
  status: "active" | "revoked";
}

export interface BatchTransferRecord {
  id: string;
  txHash: string;
  tokenSymbol: string;
  tokenAddress: string;
  totalAmount: number;
  recipientCount: number;
  recipients: Array<{ address: string; amount: number; txHash?: string }>;
  senderAddress: string;
  timestamp: number;
  status: "completed" | "failed" | "partial";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed" | "in-progress";
  priority: "low" | "medium" | "high";
  dueDate: number;
  createdAt: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  mcpServerId?: string;
}

export interface MCPServer {
  id: string;
  name: string;
  type: "stdio" | "sse" | "http";
  endpoint: string;
  status: "connected" | "disconnected" | "testing";
  latencyMs: number;
  description: string;
  category: "search" | "crypto" | "database" | "developer" | "ai" | "workspace";
  capabilities: string[];
  tools: MCPTool[];
  connectedAt: number;
  icon?: string;
  version?: string;
}

export interface AGLLiquidityPair {
  id: string;
  pairSymbol: string; // e.g. "AGL/ETH", "AGL/USDC"
  tokenA: { symbol: string; name: string; address: string; logoUrl?: string };
  tokenB: { symbol: string; name: string; address: string; logoUrl?: string };
  reserveA: number; // Reserve of Token A (AGL)
  reserveB: number; // Reserve of Token B
  totalSupplyLP: number;
  volume24hUsd: number;
  apr: number; // % yield APY
  fee03PctCollectedEth: number;
  isVerified: boolean;
  createdAt: number;
}

export interface AGLPollOption {
  id: string;
  label: string;
  votes: number;
  voters: string[];
}

export interface AGLPoll {
  id: string;
  title: string;
  description: string;
  category: "pair" | "fee" | "grant" | "param";
  pairSymbol?: string;
  options: AGLPollOption[];
  totalVotes: number;
  status: "active" | "passed" | "expired";
  endTime: number;
  creator: string;
  createdAt: number;
}

