export type NetworkKey = "base-mainnet" | "base-sepolia" | "ethereum-mainnet";

export interface NetworkInfo {
  key: NetworkKey;
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  symbol: string;
  isTestnet: boolean;
}

export const SUPPORTED_NETWORKS: Record<NetworkKey, NetworkInfo> = {
  "base-mainnet": {
    key: "base-mainnet",
    chainId: 8453,
    name: "Base Mainnet",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    symbol: "ETH",
    isTestnet: false
  },
  "base-sepolia": {
    key: "base-sepolia",
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    symbol: "ETH",
    isTestnet: true
  },
  "ethereum-mainnet": {
    key: "ethereum-mainnet",
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    symbol: "ETH",
    isTestnet: false
  }
};

// ==========================================
// 1. AI SECURITY AUDITOR TYPES
// ==========================================

export type SeverityLevel = "Critical" | "High" | "Medium" | "Low" | "Informational";
export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface AuditFinding {
  id: string;
  title: string;
  severity: SeverityLevel;
  category: string;
  location: string;
  snippet?: string;
  explanation: string;
  attackScenario: string;
  recommendation: string;
  fixedCode?: string;
  confidence: ConfidenceLevel;
  cwe?: string;
  impactScore?: number;
}

export interface GasOptimizationItem {
  title: string;
  location: string;
  description: string;
  estimatedSavings: string;
  remedyCode?: string;
}

export interface SecurityAuditReport {
  id: string;
  contractName: string;
  targetNetwork: NetworkKey;
  contractAddress?: string;
  compilerVersion: string;
  overallScore: number; // 0 - 100
  riskSummary: string;
  verifiedOnChain: boolean;
  totalFindings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  findings: AuditFinding[];
  gasOptimizations: GasOptimizationItem[];
  architectureNotes: string;
  ceiPadCompliant: boolean;
  timestamp: number;
}

// ==========================================
// 2. DAPP GENERATOR TYPES
// ==========================================

export interface GeneratedFile {
  path: string;
  filename: string;
  language: "solidity" | "typescript" | "javascript" | "json" | "markdown" | "css";
  category: "contract" | "test" | "frontend" | "deployment" | "config" | "architecture";
  content: string;
  description: string;
}

export interface DAppArchitecture {
  summary: string;
  frontend: string;
  smartContracts: string;
  backendApi?: string;
  database?: string;
  blockchainIndexing: string;
  authentication: string;
}

export interface GeneratedDAppProject {
  id: string;
  title: string;
  description: string;
  category: string;
  targetNetwork: NetworkKey;
  architecture: DAppArchitecture;
  files: GeneratedFile[];
  dependencies: Record<string, string>;
  deployInstructions: string[];
  conversationHistory: {
    role: "user" | "assistant";
    message: string;
    timestamp: number;
  }[];
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// 3. CONTRACT EXPLAINER TYPES
// ==========================================

export interface FunctionExplanation {
  name: string;
  signature: string;
  visibility: "public" | "external" | "internal" | "private";
  mutability: "pure" | "view" | "nonpayable" | "payable";
  isPayable: boolean;
  parameters: {
    name: string;
    type: string;
    description: string;
  }[];
  returnValues: {
    name?: string;
    type: string;
    description: string;
  }[];
  stateChanges: string;
  requiredPermissions: string;
  potentialRisks: string;
  estimatedGas?: string;
}

export interface EventExplanation {
  name: string;
  parameters: {
    name: string;
    type: string;
    indexed: boolean;
    description: string;
  }[];
  triggerCondition: string;
  purpose: string;
}

export interface StateVariableExplanation {
  name: string;
  type: string;
  visibility: string;
  purpose: string;
  mutability: "constant" | "immutable" | "mutable";
}

export interface ContractExplanationReport {
  address: string;
  network: NetworkKey;
  contractName: string;
  overview: {
    whatItDoes: string;
    purpose: string;
    mainComponents: string[];
    dependencies: string[];
    ownershipStructure: string;
    isUpgradable: boolean;
    proxyType?: string;
  };
  functions: FunctionExplanation[];
  events: EventExplanation[];
  stateVariables: StateVariableExplanation[];
  securityHighlights: {
    hasMintCapability: boolean;
    hasBlacklist: boolean;
    hasPauseCapability: boolean;
    adminPrivileges: string;
  };
  faqSuggestions: string[];
}

// ==========================================
// 4. ONCHAIN AGENT & TRANSACTION SAFETY TYPES
// ==========================================

export interface TokenBalanceItem {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  balanceFormatted: string;
  usdValue?: string;
  decimals: number;
}

export interface DecodedTransactionItem {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueEth: string;
  gasPriceGwei: string;
  status: "success" | "failed" | "pending";
  methodName?: string;
  decodedInput?: string;
  timestamp?: number;
  revertReason?: string;
  explanation?: string;
}

export interface TransactionSafetyPreFlight {
  targetContract: string;
  targetContractName?: string;
  functionName: string;
  functionSignature: string;
  parameters: {
    name: string;
    type: string;
    value: string;
    interpretation?: string;
  }[];
  valueEth: string;
  estimatedGas: string;
  tokenTransfers: {
    token: string;
    amount: string;
    recipient: string;
  }[];
  dangerFlags: {
    level: "critical" | "warning" | "info";
    title: string;
    description: string;
  }[];
  plainEnglishExplanation: string;
  requiresExplicitSignature: boolean;
}

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  dataEvidence?: any;
  txPreFlight?: TransactionSafetyPreFlight;
}

// ==========================================
// 5. WEB3 GAME BUILDER TYPES
// ==========================================

export interface GameDesignDocument {
  title: string;
  tagline: string;
  genre: string;
  mechanics: string;
  rules: string[];
  playerFlow: string[];
  rewardEconomy: {
    tokenSymbol: string;
    entryFee: string;
    winPayoutFormula: string;
    houseEdgeBps: number;
    antiCheatVRF: string;
  };
  winConditions: string[];
  lossConditions: string[];
}

export interface GeneratedWeb3GameProject {
  id: string;
  title: string;
  prompt: string;
  targetNetwork: NetworkKey;
  gameDesign: GameDesignDocument;
  files: GeneratedFile[];
  leaderboardSchema: {
    columns: string[];
    rankingCriteria: string;
  };
  playableDemoState: {
    gameType: "coinflip" | "dice" | "slots" | "pvp-arena" | "custom";
    defaultBet: string;
    tokenReward: string;
  };
  conversationHistory: {
    role: "user" | "assistant";
    message: string;
    timestamp: number;
  }[];
  createdAt: number;
  updatedAt: number;
}
