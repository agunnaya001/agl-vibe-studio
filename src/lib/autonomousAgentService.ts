import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { AutonomousAgent, AgentExecutionRecord, TreasuryTransaction } from "../types/autonomousAgent";

const LOCAL_STORAGE_AGENTS_KEY = "agunnaya_autonomous_agents_v1";
const LOCAL_STORAGE_EXECS_KEY = "agunnaya_agent_executions_v1";

// Default initial agents with dedicated treasury wallets
const INITIAL_PRESET_AGENTS: AutonomousAgent[] = [
  {
    id: "agent-mm-alpha",
    name: "Base Liquidity Sentinel",
    symbol: "BLS-MM",
    role: "market_making",
    status: "active",
    network: "base-sepolia",
    treasury: {
      treasuryAddress: "0x385EcfdB05E3BE168565bF6F6d9C9781D925e076",
      walletType: "smart_contract",
      ethBalance: 0.35,
      aglBalance: 3500,
      tokenBalances: {
        AGL: { symbol: "AGL", balance: 3500, usdValue: 1470 },
        ETH: { symbol: "ETH", balance: 0.35, usdValue: 997.5 },
      },
      totalValuationUsd: 2467.5,
      maxDailySpendEth: 0.15,
      spentTodayEth: 0.024,
      circuitBreakerThresholdPct: 5.0,
      lastFundedAt: Date.now() - 3600000 * 24,
    },
    marketMakingConfig: {
      targetTokenAddress: "0x4ed4E862860be51a91bD9bf9f8AC5ACF26871c42",
      targetTokenSymbol: "AGL",
      poolType: "bonding_curve",
      bidSpreadPct: 1.2,
      askSpreadPct: 1.2,
      orderSizeEth: 0.05,
      rebalanceThresholdPct: 10,
      inventoryRatioEthPct: 50,
    },
    executionIntervalMinutes: 5,
    lastExecutedAt: Date.now() - 1000 * 60 * 3,
    nextExecutionAt: Date.now() + 1000 * 60 * 2,
    totalExecutions: 24,
    successfulExecutions: 24,
    failedExecutions: 0,
    totalProfitEth: 0.0084,
    gasSpentEth: 0.0028,
    netYieldApr: 34.8,
    geminiModel: "gemini-3.8-flash",
    systemDirective: "Continuous bilateral market making on Base bonding curve. Minimize inventory skew and rebalance automatically.",
    creatorAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    createdAt: Date.now() - 3600000 * 48,
  },
  {
    id: "agent-arb-beta",
    name: "Aerodrome Flash Arbitrageur",
    symbol: "AFA-ARB",
    role: "arbitrage",
    status: "active",
    network: "base-sepolia",
    treasury: {
      treasuryAddress: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      walletType: "smart_contract",
      ethBalance: 0.5,
      aglBalance: 1200,
      tokenBalances: {
        AGL: { symbol: "AGL", balance: 1200, usdValue: 504 },
        ETH: { symbol: "ETH", balance: 0.5, usdValue: 1425 },
      },
      totalValuationUsd: 1929,
      maxDailySpendEth: 0.3,
      spentTodayEth: 0.065,
      circuitBreakerThresholdPct: 4.0,
      lastFundedAt: Date.now() - 3600000 * 18,
    },
    arbitrageConfig: {
      sourcePool: "Agunnaya Bonding Curve",
      targetPool: "Aerodrome Base Slipstream",
      tokenPair: "AGL/ETH",
      minProfitMarginPct: 0.8,
      maxSlippagePct: 0.5,
      maxTradeSizeEth: 0.2,
      atomicFlashLoanEnabled: true,
    },
    executionIntervalMinutes: 3,
    lastExecutedAt: Date.now() - 1000 * 60 * 2,
    nextExecutionAt: Date.now() + 1000 * 60 * 1,
    totalExecutions: 42,
    successfulExecutions: 39,
    failedExecutions: 3,
    totalProfitEth: 0.0276,
    gasSpentEth: 0.0058,
    netYieldApr: 58.4,
    geminiModel: "gemini-3.8-flash",
    systemDirective: "Continuously scan price gaps between Agunnaya curves and Aerodrome slipstream. Execute atomic back-run arbitrage.",
    creatorAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    createdAt: Date.now() - 3600000 * 36,
  },
  {
    id: "agent-gov-gamma",
    name: "Olympus Governance Steward",
    symbol: "OGS-GOV",
    role: "governance",
    status: "active",
    network: "base-sepolia",
    treasury: {
      treasuryAddress: "0x250e76987D838a75310c34bf422ea9977E35FB7D",
      walletType: "safe_multisig",
      ethBalance: 0.2,
      aglBalance: 50000,
      tokenBalances: {
        AGL: { symbol: "AGL", balance: 50000, usdValue: 21000 },
        ETH: { symbol: "ETH", balance: 0.2, usdValue: 570 },
      },
      totalValuationUsd: 21570,
      maxDailySpendEth: 0.05,
      spentTodayEth: 0.001,
      circuitBreakerThresholdPct: 3.0,
      lastFundedAt: Date.now() - 3600000 * 72,
    },
    governanceConfig: {
      monitoredDaoAddresses: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
      votingStrategy: "ecosystem_first",
      minQuorumParticipation: 60,
      voteWeightTokens: 50000,
      autoPublishDeliberation: true,
    },
    executionIntervalMinutes: 15,
    lastExecutedAt: Date.now() - 1000 * 60 * 12,
    nextExecutionAt: Date.now() + 1000 * 60 * 3,
    totalExecutions: 8,
    successfulExecutions: 8,
    failedExecutions: 0,
    totalProfitEth: 0.0,
    gasSpentEth: 0.00072,
    netYieldApr: 0.0,
    geminiModel: "gemini-3.8-flash",
    systemDirective: "Analyze active DAO proposals for treasury impact and security parameters. Cast autonomous votes with public deliberation.",
    creatorAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    createdAt: Date.now() - 3600000 * 72,
  },
];

const INITIAL_EXECUTION_RECORDS: AgentExecutionRecord[] = [];

export class AutonomousAgentService {
  // 1. Get all agents
  static async getAgents(): Promise<AutonomousAgent[]> {
    const sanitize = (agent: AutonomousAgent): AutonomousAgent => ({
      ...agent,
      status: "paused",
      lastExecutedAt: 0,
      nextExecutionAt: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalProfitEth: 0,
      gasSpentEth: 0,
      treasury: {
        ...agent.treasury,
        treasuryAddress: "",
        walletType: "not_deployed",
        ethBalance: 0,
        aglBalance: 0,
        tokenBalances: {},
        totalValuationUsd: 0,
        spentTodayEth: 0,
        lastFundedAt: undefined
      },
      netYieldApr: 0
    });

    try {
      if (typeof window !== "undefined") {
        const agentsCol = collection(db, "autonomous_agents");
        const snapshot = await getDocs(agentsCol);
        if (!snapshot.empty) {
          const agents: AutonomousAgent[] = [];
          snapshot.forEach((docSnap) => agents.push(sanitize(docSnap.data() as AutonomousAgent)));
          localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(agents));
          return agents;
        }

        const local = localStorage.getItem(LOCAL_STORAGE_AGENTS_KEY);
        if (local) {
          const agents = (JSON.parse(local) as AutonomousAgent[]).map(sanitize);
          localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(agents));
          return agents;
        }

        const pausedPresets = INITIAL_PRESET_AGENTS.map(sanitize);
        localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(pausedPresets));
        pausedPresets.forEach((agent) => {
          setDoc(doc(db, "autonomous_agents", agent.id), agent).catch(() => {});
        });
        return pausedPresets;
      }
    } catch (error) {
      console.warn("[AutonomousAgentService] Agent config read failed:", error);
    }
    return INITIAL_PRESET_AGENTS.map(sanitize);
  }

  // 2. Save or update agent
  static async saveAgent(agent: AutonomousAgent): Promise<void> {
    try {
      const agents = await this.getAgents();
      const safeAgent: AutonomousAgent = {
        ...agent,
        status: "paused",
        lastExecutedAt: 0,
        nextExecutionAt: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalProfitEth: 0,
        gasSpentEth: 0,
        netYieldApr: 0,
        treasury: {
          ...agent.treasury,
          treasuryAddress: "",
          walletType: "not_deployed",
          ethBalance: 0,
          aglBalance: 0,
          tokenBalances: {},
          totalValuationUsd: 0,
          spentTodayEth: 0,
          lastFundedAt: undefined
        }
      };
      const idx = agents.findIndex((a) => a.id === safeAgent.id);
      if (idx >= 0) agents[idx] = safeAgent;
      else agents.unshift(safeAgent);
      localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(agents));
      await setDoc(doc(db, "autonomous_agents", safeAgent.id), safeAgent);
    } catch (e) {
      console.warn("[AutonomousAgentService] Save fallback error:", e);
    }
  }

  // 3. Delete agent
  static async deleteAgent(agentId: string): Promise<void> {
    try {
      const agents = (await this.getAgents()).filter((a) => a.id !== agentId);
      localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(agents));
      await deleteDoc(doc(db, "autonomous_agents", agentId));
    } catch (e) {
      console.warn("[AutonomousAgentService] Delete fallback error:", e);
    }
  }

  // 4. Get execution logs
  static async getExecutionRecords(): Promise<AgentExecutionRecord[]> {
    // Legacy local/Firestore execution records were generated by simulation fallbacks and are not verified.
    return [];
  }

  // 5. Add execution record
  static async logExecution(_record: AgentExecutionRecord): Promise<void> {
    throw new Error("Autonomous execution records are disabled until transaction receipts and on-chain effects are independently verified.");
  }

  // 6. Generate Dedicated Treasury Wallet via Backend
  static async generateTreasuryWallet(_network = "base-mainnet", _agentName = "Autonomous Agent") {
    throw new Error("Agent treasury wallet creation is disabled. No secure wallet deployment or key-management service is configured.");
  }

  // 7. Run on-demand autonomous cycle for an agent
  static async runCycle(_agent: AutonomousAgent): Promise<AgentExecutionRecord> {
    throw new Error("Autonomous execution is paused. No wallet-signed, receipt-verified strategy executor is configured.");
  }

  // 8. Deposit to Agent Treasury
  static async depositToTreasury(_agentId: string, _amountEth: number, _amountAgl: number): Promise<AutonomousAgent> {
    throw new Error("Agent treasury deposits are disabled until a verified treasury address, signer flow, and Base transaction receipt are configured.");
  }

  // 9. Withdraw from Agent Treasury
  static async withdrawFromTreasury(_agentId: string, _amountEth: number, _amountAgl: number): Promise<AutonomousAgent> {
    throw new Error("Agent treasury withdrawals are disabled until a verified treasury contract, signer flow, and Base transaction receipt are configured.");
  }
}
