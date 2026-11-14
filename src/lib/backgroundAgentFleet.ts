import { 
  BackgroundFleetAgent, 
  FleetActionLog, 
  FleetAgentType, 
  FleetAgentStatus,
  FleetAgentTriggerConfig,
  FleetSafetyBounds 
} from "../types/agentFleet";
import { AGENT_FLEET_LABS } from "../data/agentFleetLabs";

const STORAGE_KEY_AGENTS = "agl_background_fleet_agents_v2";
const STORAGE_KEY_LOGS = "agl_background_fleet_logs_v2";

type FleetSubscriber = (agents: BackgroundFleetAgent[]) => void;
type LogSubscriber = (log: FleetActionLog) => void;

class BackgroundFleetEngine {
  private agents: BackgroundFleetAgent[] = [];
  private logs: FleetActionLog[] = [];
  private subscribers: Set<FleetSubscriber> = new Set();
  private logSubscribers: Set<LogSubscriber> = new Set();
  private masterTimer: NodeJS.Timeout | null = null;
  private isMasterRunning: boolean = false;

  constructor() {
    this.loadState();
    // Auto-start master scheduler loop
    this.startMasterLoop();
  }

  private loadState() {
    try {
      const savedAgents = localStorage.getItem(STORAGE_KEY_AGENTS);
      const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);

      if (savedAgents) {
        this.agents = JSON.parse(savedAgents);
      } else {
        // Seed with 3 default agents from labs so user gets immediate background action
        this.seedDefaultFleet();
      }

      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (e) {
      console.warn("Failed to load background fleet state:", e);
      this.seedDefaultFleet();
    }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY_AGENTS, JSON.stringify(this.agents));
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs.slice(0, 100)));
    } catch (e) {
      console.warn("Failed to save background fleet state:", e);
    }
  }

  private seedDefaultFleet() {
    const seed1 = this.createAgentFromLab("lab-liquidity-sentinel", true);
    const seed2 = this.createAgentFromLab("lab-security-watchdog", true);
    const seed3 = this.createAgentFromLab("lab-yield-compounding", true);

    this.agents = [seed1, seed2, seed3].filter(Boolean) as BackgroundFleetAgent[];
    this.saveState();
  }

  public startMasterLoop() {
    if (this.masterTimer) return;
    this.isMasterRunning = true;

    // Master scheduler ticks every 3 seconds and triggers due agents
    this.masterTimer = setInterval(() => {
      this.processFleetTick();
    }, 3000);
  }

  public stopMasterLoop() {
    if (this.masterTimer) {
      clearInterval(this.masterTimer);
      this.masterTimer = null;
    }
    this.isMasterRunning = false;
  }

  private async processFleetTick() {
    const now = Date.now();
    let hasChanges = false;

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      if (agent.status !== "RUNNING") continue;

      const intervalMs = (agent.triggerConfig.intervalSeconds || 15) * 1000;
      const lastRun = agent.lastRunAt || 0;

      if (now - lastRun >= intervalMs) {
        hasChanges = true;
        await this.executeAgentTick(agent);
      }
    }

    if (hasChanges) {
      this.saveState();
      this.notifySubscribers();
    }
  }

  private async executeAgentTick(agent: BackgroundFleetAgent) {
    const now = Date.now();
    agent.lastRunAt = now;
    agent.nextRunAt = now + (agent.triggerConfig.intervalSeconds || 15) * 1000;
    agent.totalRuns += 1;

    try {
      // Simulate real-world decision logic based on agent type
      const result = await this.evaluateAgentStrategy(agent);

      const log: FleetActionLog = {
        id: "log-" + Math.random().toString(36).substring(2, 9),
        agentId: agent.id,
        agentName: agent.name,
        timestamp: now,
        type: result.executed ? "action_executed" : "tick",
        summary: result.summary,
        details: result.details,
        txHash: result.txHash,
        gasCostEth: result.gasCostEth,
        metricsDiff: result.metricsDiff
      };

      agent.logs.unshift(log);
      if (agent.logs.length > 50) agent.logs.pop();

      this.logs.unshift(log);
      if (this.logs.length > 200) this.logs.pop();

      if (result.executed) {
        agent.successfulActions += 1;
        const currentGas = parseFloat(agent.totalGasSpentEth) || 0;
        const addGas = parseFloat(result.gasCostEth || "0.00008");
        agent.totalGasSpentEth = (currentGas + addGas).toFixed(6);

        const currentVal = parseFloat(agent.estimatedValueGeneratedUsd) || 0;
        const addVal = result.valueGeneratedUsd || 12.5;
        agent.estimatedValueGeneratedUsd = (currentVal + addVal).toFixed(2);
      }

      this.notifyLogSubscribers(log);
    } catch (err: any) {
      agent.failedActions += 1;
      const errorLog: FleetActionLog = {
        id: "log-" + Math.random().toString(36).substring(2, 9),
        agentId: agent.id,
        agentName: agent.name,
        timestamp: now,
        type: "error",
        summary: `Execution error: ${err.message || "Unknown error"}`,
        details: err.stack
      };
      agent.logs.unshift(errorLog);
      this.logs.unshift(errorLog);
      this.notifyLogSubscribers(errorLog);
    }
  }

  private async evaluateAgentStrategy(agent: BackgroundFleetAgent): Promise<{
    executed: boolean;
    summary: string;
    details?: string;
    txHash?: string;
    gasCostEth?: string;
    valueGeneratedUsd?: number;
    metricsDiff?: Record<string, any>;
  }> {
    return {
      executed: false,
      summary: `Agent ${agent.name} is in read-only safety mode. No simulated swaps, harvests, burns, votes, or transaction hashes are generated.`,
      details: "Execution requires a verified strategy adapter, connected signer, explicit approval, and confirmed on-chain receipt."
    };
  }

  public getAgents(): BackgroundFleetAgent[] {
    return [...this.agents];
  }

  public getLogs(): FleetActionLog[] {
    return [...this.logs];
  }

  public getAgentById(id: string): BackgroundFleetAgent | undefined {
    return this.agents.find((a) => a.id === id);
  }

  public createAgentFromLab(labId: string, autoStart: boolean = false): BackgroundFleetAgent | null {
    const lab = AGENT_FLEET_LABS.find((l) => l.id === labId);
    if (!lab || !lab.defaultAgentConfig) return null;

    const newAgent: BackgroundFleetAgent = {
      id: "agent-" + Math.random().toString(36).substring(2, 9),
      name: lab.defaultAgentConfig.name || "Autonomous Worker",
      description: lab.defaultAgentConfig.description || "Background autonomous Web3 agent",
      type: lab.defaultAgentConfig.type || "liquidity_rebalancer",
      status: autoStart ? "RUNNING" : "IDLE",
      network: lab.defaultAgentConfig.network || "base-mainnet",
      targetContract: lab.defaultAgentConfig.targetContract,
      contractName: lab.defaultAgentConfig.contractName,
      triggerConfig: {
        type: lab.defaultAgentConfig.triggerConfig?.type || "interval",
        intervalSeconds: lab.defaultAgentConfig.triggerConfig?.intervalSeconds || 15,
        gasFloorGwei: lab.defaultAgentConfig.triggerConfig?.gasFloorGwei,
        priceThresholdUsd: lab.defaultAgentConfig.triggerConfig?.priceThresholdUsd,
        minYieldApy: lab.defaultAgentConfig.triggerConfig?.minYieldApy,
        conditionDescription: lab.defaultAgentConfig.triggerConfig?.conditionDescription || "Scheduled background execution"
      },
      safetyBounds: {
        maxGasPerTxEth: lab.defaultAgentConfig.safetyBounds?.maxGasPerTxEth || "0.0003",
        dailyGasBudgetEth: lab.defaultAgentConfig.safetyBounds?.dailyGasBudgetEth || "0.005",
        maxSlippagePercent: lab.defaultAgentConfig.safetyBounds?.maxSlippagePercent || 1.0,
        requireHumanApprovalAboveEth: lab.defaultAgentConfig.safetyBounds?.requireHumanApprovalAboveEth || "1.0",
        dryRunMode: lab.defaultAgentConfig.safetyBounds?.dryRunMode ?? true
      },
      createdAt: Date.now(),
      totalRuns: 0,
      successfulActions: 0,
      failedActions: 0,
      totalGasSpentEth: "0.000000",
      estimatedValueGeneratedUsd: "0.00",
      logs: [],
      strategyCodeSnippet: lab.productionCodeTemplate,
      isSimulated: true,
      avatarIcon: lab.defaultAgentConfig.avatarIcon || "Bot",
      badgeColor: lab.defaultAgentConfig.badgeColor || "purple",
      labId: lab.id
    };

    return newAgent;
  }

  public registerAgent(agent: BackgroundFleetAgent) {
    this.agents.unshift(agent);
    this.saveState();
    this.notifySubscribers();
  }

  public addCustomAgent(params: {
    name: string;
    description: string;
    type: FleetAgentType;
    intervalSeconds: number;
    gasFloorGwei?: number;
    targetContract?: string;
    contractName?: string;
    dryRunMode: boolean;
    network: "base-mainnet" | "base-sepolia";
  }): BackgroundFleetAgent {
    const newAgent: BackgroundFleetAgent = {
      id: "agent-" + Math.random().toString(36).substring(2, 9),
      name: params.name,
      description: params.description,
      type: params.type,
      status: "RUNNING",
      network: params.network,
      targetContract: params.targetContract,
      contractName: params.contractName || "Custom_Contract",
      triggerConfig: {
        type: params.gasFloorGwei ? "gas_floor" : "interval",
        intervalSeconds: params.intervalSeconds || 15,
        gasFloorGwei: params.gasFloorGwei,
        conditionDescription: `Execute every ${params.intervalSeconds}s on ${params.network}`
      },
      safetyBounds: {
        maxGasPerTxEth: "0.0003",
        dailyGasBudgetEth: "0.005",
        maxSlippagePercent: 1.0,
        requireHumanApprovalAboveEth: "0.5",
        dryRunMode: params.dryRunMode
      },
      createdAt: Date.now(),
      totalRuns: 0,
      successfulActions: 0,
      failedActions: 0,
      totalGasSpentEth: "0.000000",
      estimatedValueGeneratedUsd: "0.00",
      logs: [],
      isSimulated: params.dryRunMode,
      avatarIcon: params.type === "security_sentinel" ? "ShieldCheck" : params.type === "yield_harvester" ? "Coins" : "Zap",
      badgeColor: "emerald"
    };

    this.agents.unshift(newAgent);
    this.saveState();
    this.notifySubscribers();
    return newAgent;
  }

  public setAgentStatus(id: string, status: FleetAgentStatus) {
    const agent = this.agents.find((a) => a.id === id);
    if (agent) {
      agent.status = status;
      this.saveState();
      this.notifySubscribers();
    }
  }

  public deleteAgent(id: string) {
    this.agents = this.agents.filter((a) => a.id !== id);
    this.saveState();
    this.notifySubscribers();
  }

  public triggerManualTick(id: string) {
    const agent = this.agents.find((a) => a.id === id);
    if (agent) {
      this.executeAgentTick(agent);
    }
  }

  public clearLogs() {
    this.logs = [];
    this.agents.forEach((a) => (a.logs = []));
    this.saveState();
    this.notifySubscribers();
  }

  public subscribeFleet(fn: FleetSubscriber): () => void {
    this.subscribers.add(fn);
    fn(this.getAgents());
    return () => this.subscribers.delete(fn);
  }

  public subscribeLogs(fn: LogSubscriber): () => void {
    this.logSubscribers.add(fn);
    return () => this.logSubscribers.delete(fn);
  }

  private notifySubscribers() {
    const list = this.getAgents();
    this.subscribers.forEach((fn) => fn(list));
  }

  private notifyLogSubscribers(log: FleetActionLog) {
    this.logSubscribers.forEach((fn) => fn(log));
  }

  public getFleetMetricsSummary() {
    const activeCount = this.agents.filter((a) => a.status === "RUNNING").length;
    const totalActions = this.agents.reduce((acc, a) => acc + a.successfulActions, 0);
    const totalGasEth = this.agents
      .reduce((acc, a) => acc + (parseFloat(a.totalGasSpentEth) || 0), 0)
      .toFixed(5);
    const totalValueUsd = this.agents
      .reduce((acc, a) => acc + (parseFloat(a.estimatedValueGeneratedUsd) || 0), 0)
      .toFixed(2);

    return {
      totalAgents: this.agents.length,
      activeCount,
      totalActions,
      totalGasEth,
      totalValueUsd
    };
  }
}

export const BackgroundFleetManager = new BackgroundFleetEngine();
