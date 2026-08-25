export type AgentRole =
  | "Planner Agent"
  | "Solidity / Code Agent"
  | "Blockchain Agent"
  | "Security Agent"
  | "Deployment Agent"
  | "Orchestrator";

export type WorkflowStatus =
  | "PENDING"
  | "PLANNING"
  | "RUNNING"
  | "WAITING_FOR_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "waiting_approval";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

export interface SecurityFinding {
  id: string;
  title: string;
  severity: SeverityLevel;
  category: string;
  location: string;
  explanation: string;
  attackScenario?: string;
  recommendation: string;
  fixedCodeSnippet?: string;
  cwe?: string;
}

export interface SecurityReport {
  overallScore: number; // 0 - 100
  summary: string;
  isSafeForDeployment: boolean;
  findings: SecurityFinding[];
  gasOptimizations: string[];
  disclaimer: string;
}

export interface ToolCallExecution {
  toolName: string;
  input: Record<string, any>;
  output?: Record<string, any> | string;
  durationMs?: number;
  error?: string;
  timestamp: number;
}

export interface AgentWorkflowStep {
  id: string;
  title: string;
  description: string;
  agent: AgentRole;
  status: StepStatus;
  toolName?: string;
  toolExecution?: ToolCallExecution;
  outputPreview?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ParameterItem {
  name: string;
  type: string;
  value: any;
  description?: string;
}

export interface DangerFlag {
  level: SeverityLevel;
  title: string;
  description: string;
}

export interface AgentTransactionApprovalRequest {
  id: string;
  taskId: string;
  network: "base-mainnet" | "base-sepolia" | "ethereum-mainnet";
  chainId: number;
  contractName: string;
  targetContractAddress?: string;
  functionName: string;
  parameters: ParameterItem[];
  valueEth: string;
  estimatedGasEth: string;
  walletAddress: string;
  expectedResult: string;
  abi?: any[];
  bytecode?: string;
  constructorArgs?: any[];
  dangerFlags?: DangerFlag[];
  solidityCode?: string;
  createdAt: number;
}

export interface AgentWorkflowResult {
  summary: string;
  actionsPerformed: string[];
  contractName?: string;
  contractAddress?: string;
  txHash?: string;
  explorerUrl?: string;
  network: string;
  chainId: number;
  solidityCode?: string;
  abi?: any[];
  securityReport?: SecurityReport;
  gasUsedEth?: string;
  isSimulated?: boolean;
  deployedAt?: number;
  errors?: string[];
}

export interface AgentWorkflowLog {
  id: string;
  timestamp: number;
  agent: AgentRole;
  type: "info" | "tool_call" | "tool_result" | "warning" | "error" | "success" | "approval";
  message: string;
  data?: any;
}

export interface AgentProjectMemory {
  id: string;
  userId?: string;
  projectName: string;
  description?: string;
  network: "base-mainnet" | "base-sepolia";
  chainId: number;
  contracts: Array<{
    name: string;
    address?: string;
    solidityCode?: string;
    abi?: any[];
    deployedAt?: number;
    txHash?: string;
    verifiedOnExplorer?: boolean;
  }>;
  tokenConfig?: {
    name: string;
    symbol: string;
    supply: string;
    decimals: number;
    initialPriceEth?: number;
    category?: string;
  };
  deploymentHistory: Array<{
    contractName: string;
    address: string;
    txHash: string;
    timestamp: number;
    network: string;
    deployer: string;
    isSimulated?: boolean;
  }>;
  tasksHistory: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AgentWorkflowTask {
  id: string;
  title: string;
  description: string;
  userPrompt: string;
  status: WorkflowStatus;
  progress: number; // 0 - 100
  currentStepIndex: number;
  responsibleAgent: AgentRole;
  steps: AgentWorkflowStep[];
  logs: AgentWorkflowLog[];
  toolsUsed: string[];
  projectId?: string;
  pendingApproval?: AgentTransactionApprovalRequest | null;
  result?: AgentWorkflowResult;
  errorInfo?: {
    code: string;
    message: string;
    recoverySuggestion?: string;
  };
  isDemoMode: boolean;
  network: "base-mainnet" | "base-sepolia";
  createdAt: number;
  updatedAt: number;
}

export interface AgentActivityItem {
  id: string;
  taskId: string;
  taskTitle: string;
  agent: AgentRole;
  action: string;
  toolName: string;
  status: "running" | "success" | "failure" | "waiting";
  timestamp: number;
  durationMs?: number;
  details?: string;
  isDemo?: boolean;
}
