import { HandsOnFleetLab } from "../types/agentFleet";

export const AGENT_FLEET_LABS: HandsOnFleetLab[] = [
  {
    id: "lab-liquidity-sentinel",
    labNumber: 1,
    title: "Autonomous Liquidity Sentinel & DEX Rebalancer Fleet",
    subtitle: "Build a continuous background agent that monitors Base DEX pools and rebalances reserves upon slippage spikes.",
    difficulty: "Intermediate",
    estimatedMinutes: 15,
    category: "DeFi Automation",
    overview: "In this lab, you will design and launch an autonomous background worker on Base that polls Uniswap v3/Aerodrome pool reserves every 15 seconds. When reserve ratio divergence exceeds your tolerance threshold, the agent calculates the optimal rebalance route, checks gas profitability, and executes flash rebalancing transactions.",
    architectureDiagram: [
      "1. Periodic Background Poll (Timer / Block Event Loop)",
      "2. Query On-Chain Pool Reserves (Uniswap v3 / Aerodrome)",
      "3. Compute Spot Price Divergence vs External Oracle",
      "4. If Imbalance > 1.25%: Calculate Optimal Swap Depth",
      "5. Gas Cost Check: Verify Profit > 2x Base Gas Cost",
      "6. Execute Rebalance MultiCall & Emit Telemetry Log"
    ],
    learningObjectives: [
      "Understand continuous asynchronous agent loops in Web3 environments",
      "Calculate constant-product ($x \\cdot y = k$) and concentrated liquidity imbalances",
      "Implement profitability gates to prevent gas griefing on Base L2",
      "Deploy and supervise a live background agent daemon"
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Define the Agent Polling Loop & State Machine",
        description: "Set up the TypeScript background daemon tick function that queries RPC nodes on Base without blocking the main UI thread.",
        explanation: "Background Web3 agents operate as asynchronous finite-state machines (FSM). On each tick, the worker transitions from IDLE -> SCANNING -> EVALUATING -> EXECUTING -> LOGGING.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 1: Agent Daemon Loop Architecture
export class LiquiditySentinelWorker {
  private intervalMs: number = 15000;
  private isRunning: boolean = false;
  private poolAddress: string = "0x4C36388bE6F516203777f66a8775f053531b2A77"; // AGL/WETH Pool

  public async tick(): Promise<AgentActionReport> {
    // 1. Fetch live reserves from Base Mainnet RPC
    const reserves = await this.fetchPoolReserves(this.poolAddress);
    
    // 2. Calculate current ratio and price deviation
    const deviation = this.calculateSlippage(reserves.reserve0, reserves.reserve1);
    
    if (deviation.percent > 1.5) {
      return await this.executeRebalance(deviation);
    }
    return { status: "IDLE", message: "Reserves balanced within 1.5% tolerance." };
  }
}`,
        keyTakeaways: [
          "Decouple state reads from transaction writes to conserve RPC rate limits.",
          "Use configurable tolerance bands to avoid thrashing during high volatility."
        ]
      },
      {
        stepNumber: 2,
        title: "Implement the On-Chain Rebalance Contract Interface",
        description: "Write the Solidity interface and execution payload for flash swapping and reserve adjustment.",
        explanation: "The agent interacts with a smart contract that accepts rebalance directives with slippage limits and recipient addresses.",
        codeLanguage: "solidity",
        codeSnippet: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IDexRouter {
    function exactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external returns (uint256 amountOut);
}

contract AutonomousRebalancer is Ownable {
    IDexRouter public immutable router;
    uint256 public maxSlippageBps = 50; // 0.5%

    constructor(address _router) Ownable(msg.sender) {
        router = IDexRouter(_router);
    }

    function executeRebalance(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external onlyOwner returns (uint256 amountOut) {
        IERC20(tokenIn).approve(address(router), amountIn);
        return router.exactInputSingle(tokenIn, tokenOut, 3000, address(this), amountIn, minAmountOut);
    }
}`,
        keyTakeaways: [
          "Restrict write methods to authorized agent worker addresses using Ownable or AccessControl.",
          "Always enforce minimum output amounts (minAmountOut) to prevent front-running / MEV sandwich attacks."
        ]
      },
      {
        stepNumber: 3,
        title: "Safety Guardrails: Gas Ceiling & Slippage Controls",
        description: "Add automated safety triggers that halt agent execution if network gas exceeds 0.1 Gwei or total daily spend reaches limit.",
        explanation: "Autonomous agents must never burn infinite gas during chain congestion. Hardcoded budget parameters protect treasury reserves.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 3: Safety Guardrails
public async validateSafety(estimatedGasEth: number, slippageBps: number): Promise<boolean> {
  const currentBaseGasGwei = await this.getBaseGasPrice();
  
  if (currentBaseGasGwei > 0.08) {
    console.warn("Gas too high for rebalance: " + currentBaseGasGwei + " gwei");
    return false;
  }
  if (slippageBps > 200) { // > 2% slippage cap
    console.error("Slippage exceeds agent safety bound");
    return false;
  }
  return true;
}`,
        keyTakeaways: [
          "Always check L1 data availability fee component on Base L2.",
          "Record every state decision in transparent agent telemetry logs."
        ]
      }
    ],
    defaultAgentConfig: {
      name: "DEX Liquidity Sentinel #01",
      description: "Continuous automated liquidity & pool reserve rebalancer on Base Mainnet",
      type: "liquidity_rebalancer",
      status: "IDLE",
      network: "base-mainnet",
      targetContract: "0x4C36388bE6F516203777f66a8775f053531b2A77",
      contractName: "UniswapV3_AGL_Pool",
      avatarIcon: "Zap",
      badgeColor: "emerald",
      triggerConfig: {
        type: "interval",
        intervalSeconds: 15,
        gasFloorGwei: 0.05,
        conditionDescription: "Trigger rebalance when pool reserve deviation > 1.5% and gas < 0.05 gwei"
      },
      safetyBounds: {
        maxGasPerTxEth: "0.00035",
        dailyGasBudgetEth: "0.005",
        maxSlippagePercent: 1.0,
        requireHumanApprovalAboveEth: "0.5",
        dryRunMode: true
      }
    },
    productionCodeTemplate: `// Production Autonomous Sentinel Daemon
import { ethers } from "ethers";

export async function runSentinelDaemon(agentConfig: any) {
  console.log("Starting " + agentConfig.name + " on Base Mainnet...");
  setInterval(async () => {
    try {
      // 1. Fetch reserves
      // 2. Check deviation
      // 3. Dispatch transaction
    } catch (err) {
      console.error("Sentinel tick failed:", err);
    }
  }, agentConfig.triggerConfig.intervalSeconds * 1000);
}`,
    tags: ["Uniswap v3", "Liquidity", "DEX", "Automated Swaps", "Base L2"]
  },
  {
    id: "lab-security-watchdog",
    labNumber: 2,
    title: "Autonomous Reentrancy & Exploit Watchdog Agent",
    subtitle: "Deploy a 24/7 security sentinel that monitors contract state diffs, anomalous withdrawal volumes, and triggers automated circuit breakers.",
    difficulty: "Advanced",
    estimatedMinutes: 20,
    category: "Security Sentinels",
    overview: "Learn how to build a background security watchdog that monitors high-value contracts on Base. The agent scans block transaction receipts for unexpected flash-loan balance spikes, storage slot anomalies, or rapid ownership transfers, and automatically triggers an on-chain emergency pause or sends high-priority webhook alerts.",
    architectureDiagram: [
      "1. Subscribe to Base Block Stream / Filter Logs",
      "2. Filter Target Contract Events (Withdraw, Transfer, OwnershipTransferred)",
      "3. Compute Withdrawal Velocity ($Amount / BlockTime$)",
      "4. Detect Anomaly: > 50 ETH Outflow in 1 Block or Reentrancy Signature",
      "5. Automatic Circuit-Breaker: Call emergencyPause() with multi-sig key",
      "6. Broadcast Alert to Discord / Telegram Webhook"
    ],
    learningObjectives: [
      "Stream and decode contract log events using Base RPC filters",
      "Detect CEI (Checks-Effects-Interactions) anomalies in near real-time",
      "Implement cryptographic multi-agent emergency pause mechanisms",
      "Configure automated alerting webhooks with incident payload snapshots"
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Subscribe to Block Logs & Event Stream",
        description: "Configure the background agent listener for specific contract events (e.g. large Withdrawals or Transfer events).",
        explanation: "Security agents should subscribe to contract event topics or poll recent blocks with chunked filters to avoid RPC rate limiting.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 1: Real-Time Event Filter Sentinel
export class ContractSecurityWatchdog {
  private targetAddress = "0xEA1221b4d80a89bd8c75248fae7c176bd1854698"; // Staking Vault
  private maxAllowedOutflowEth = 10.0;

  public async scanRecentBlock(blockNumber: number) {
    const logs = await provider.getLogs({
      address: this.targetAddress,
      fromBlock: blockNumber - 3,
      toBlock: blockNumber
    });

    for (const log of logs) {
      const parsed = this.parseVaultEvent(log);
      if (parsed.name === "EmergencyWithdraw" || parsed.amountEth > this.maxAllowedOutflowEth) {
        await this.triggerEmergencyResponse(parsed);
      }
    }
  }
}`,
        keyTakeaways: [
          "Use indexed event topics for sub-millisecond filtering.",
          "Keep historical buffer of recent blocks to detect multi-tx attack sequences."
        ]
      },
      {
        stepNumber: 2,
        title: "Automated On-Chain Emergency Pause Contract",
        description: "Deploy an emergency sentinel receiver that allows authorized agent keys to trigger temporary circuit breakers.",
        explanation: "Contracts should implement OpenZeppelin Pausable with an agent role specifically dedicated to emergency pausing without administrative withdrawal rights.",
        codeLanguage: "solidity",
        codeSnippet: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SafeVaultWithSentinel is Pausable, AccessControl {
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event CircuitBreakerTriggered(address indexed sentinel, string reason);

    constructor(address _sentinel) {
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(SENTINEL_ROLE, _sentinel);
    }

    /// @notice Agent can ONLY pause, cannot unpause or withdraw
    function emergencyPause(string calldata reason) external onlyRole(SENTINEL_ROLE) {
        _pause();
        emit CircuitBreakerTriggered(msg.sender, reason);
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}`,
        keyTakeaways: [
          "Principle of Least Privilege: Sentinel can pause but CANNOT unpause or withdraw funds.",
          "Reduces attack surface if the agent's signing key is ever compromised."
        ]
      },
      {
        stepNumber: 3,
        title: "Automated Incident Alerting Webhook",
        description: "Format rich incident diagnostics with transaction hash, block number, attacker address, and BaseScan link.",
        explanation: "Alert payloads give human operators full contextual data for instant verification and incident response.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 3: Diagnostic Incident Payload Dispatch
public async dispatchSecurityAlert(incident: SecurityIncident): Promise<void> {
  const payload = {
    title: "🚨 CRITICAL: Automated Circuit Breaker Triggered on Base",
    contract: incident.contractAddress,
    anomaly: incident.reason,
    outflowVolume: incident.amountEth + " ETH",
    txHash: incident.txHash,
    explorerUrl: "https://basescan.org/tx/" + incident.txHash,
    status: "VAULT_PAUSED_SUCCESSFULLY"
  };
  await fetch("https://api.agunnaya.org/webhooks/security-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}`,
        keyTakeaways: [
          "Provide actionable incident data to minimize response time for human multi-sig signers.",
          "Store tamper-proof diagnostic logs locally and in decentralized storage."
        ]
      }
    ],
    defaultAgentConfig: {
      name: "Security Sentinel & Reentrancy Watchdog",
      description: "24/7 autonomous monitoring for anomalous withdrawals and flash-loan exploits on Base",
      type: "security_sentinel",
      status: "IDLE",
      network: "base-mainnet",
      targetContract: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698",
      contractName: "Agunnaya_Staking_Vault",
      avatarIcon: "ShieldAlert",
      badgeColor: "rose",
      triggerConfig: {
        type: "contract_event",
        intervalSeconds: 10,
        conditionDescription: "Trigger emergency response if block outflow > 5.0 ETH or reentrancy flag detected"
      },
      safetyBounds: {
        maxGasPerTxEth: "0.0005",
        dailyGasBudgetEth: "0.008",
        maxSlippagePercent: 0.5,
        requireHumanApprovalAboveEth: "0.0", // Instant execution for emergency pause
        dryRunMode: true
      }
    },
    productionCodeTemplate: `// Security Watchdog Daemon Template
export async function startSecurityWatchdog(vaultAddress: string, sentinelKey: string) {
  console.log("Watchdog active on " + vaultAddress);
  // Polling / WebSocket stream loop
}`,
    tags: ["Security", "Exploit Detection", "Pausable", "Circuit Breakers", "BaseScan"]
  },
  {
    id: "lab-yield-compounding",
    labNumber: 3,
    title: "Gas-Optimized Autonomous Yield Compounding Vault Agent",
    subtitle: "Construct an agent that tracks accumulated staking rewards and executes compounding when Yield > 3x Gas Cost.",
    difficulty: "Intermediate",
    estimatedMinutes: 12,
    category: "Yield Strategies",
    overview: "Compound interest is only effective when compounding transactions don't eat into yields through high gas costs. In this lab, you will build an autonomous background harvester that calculates the mathematical breakeven curve for auto-compounding $AGL staking rewards on Base.",
    architectureDiagram: [
      "1. Poll Pending Staking Rewards (pendingRewards() on Vault)",
      "2. Query Current Base L2 Gas Price (Execution + L1 Calldata Cost)",
      "3. Evaluate Economic Viability: $PendingYield > K \\times GasCost$",
      "4. If Viable: Execute claimAndRestake() Transaction",
      "5. Update User APY & Log Harvest Yield Metrics"
    ],
    learningObjectives: [
      "Formulate the optimal compounding frequency equation $t^* = \\sqrt{\\frac{2 C}{r Y}}$",
      "Build gas-efficient batch reward claiming contracts on Base",
      "Schedule autonomous compounding tasks without human manual intervention",
      "Track net cumulative yield vs gas spent in real-time"
    ],
    steps: [
      {
        stepNumber: 1,
        title: "The Compounding Optimization Formula",
        description: "Understand the mathematical model that balances compounding frequency against gas overhead.",
        explanation: "Frequent compounding increases effective APY via exponential growth $(1 + r/n)^n$, but each harvest incurs a fixed transaction cost $C$. The optimal compounding interval is $n^* = \\sqrt{\\frac{r \\cdot Y}{2 C}}$.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 1: Yield Profitability Evaluation
export function isCompoundingProfitable(
  pendingYieldEth: number,
  estimatedGasEth: number,
  multiplier: number = 3.0
): { profitable: boolean; netYieldEth: number; roiRatio: number } {
  const gasThreshold = estimatedGasEth * multiplier;
  const profitable = pendingYieldEth > gasThreshold;
  const netYieldEth = pendingYieldEth - estimatedGasEth;
  const roiRatio = pendingYieldEth / (estimatedGasEth || 0.00001);

  return { profitable, netYieldEth, roiRatio };
}`,
        keyTakeaways: [
          "Never harvest if gas costs exceed 33% of the harvested yield.",
          "Base L2 ultra-low gas makes micro-compounding viable compared to Ethereum L1."
        ]
      },
      {
        stepNumber: 2,
        title: "Solidity Auto-Compounder Contract",
        description: "Implement the single-transaction `compoundRewards()` function that claims and immediately deposits back into the pool.",
        explanation: "Combining claim and stake into a single contract call saves over 45,000 gas units per execution.",
        codeLanguage: "solidity",
        codeSnippet: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStakingVault {
    function earned(address account) external view returns (uint256);
    function getReward() external;
    function stake(uint256 amount) external;
}

contract AutoCompounder {
    IStakingVault public immutable stakingVault;
    address public immutable rewardToken;

    event Compounded(address indexed executor, uint256 yieldHarvested, uint256 timestamp);

    constructor(address _vault, address _rewardToken) {
        stakingVault = IStakingVault(_vault);
        rewardToken = _rewardToken;
    }

    /// @notice Harvests rewards and stakes in one atomic transaction
    function compound() external returns (uint256 harvested) {
        uint256 pending = stakingVault.earned(address(this));
        require(pending > 0, "No pending yield");

        stakingVault.getReward();
        stakingVault.stake(pending);

        emit Compounded(msg.sender, pending, block.timestamp);
        return pending;
    }
}`,
        keyTakeaways: [
          "Atomic batching prevents tokens from lingering in contract balances between transactions.",
          "Emits structured telemetry events for background indexers."
        ]
      },
      {
        stepNumber: 3,
        title: "Agent Scheduling & Background Execution",
        description: "Integrate the worker into the background fleet runner with an interval trigger.",
        explanation: "The agent runs every 60 seconds, reads pending yield, validates profitability, and dispatches the compound transaction.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 3: Scheduled Compounder Worker
export async function tickYieldHarvester(agent: BackgroundFleetAgent) {
  const pendingYield = await fetchPendingYield(agent.targetContract);
  const gasEstimate = await estimateGasCost("compound()");

  const check = isCompoundingProfitable(pendingYield, gasEstimate);
  if (check.profitable) {
    const tx = await dispatchCompoundTx(agent.targetContract);
    recordActionSuccess(agent.id, tx.hash, check.netYieldEth);
  }
}`,
        keyTakeaways: [
          "Automate repetitive DeFi maintenance without paying third-party keeper fees.",
          "Keep complete audit logs of every compound cycle."
        ]
      }
    ],
    defaultAgentConfig: {
      name: "Auto-Yield Harvester & Compounding Daemon",
      description: "Automated compounder that restakes $AGL rewards whenever Yield > 3x Gas Cost on Base",
      type: "yield_harvester",
      status: "IDLE",
      network: "base-mainnet",
      targetContract: "0x7890aBcD1234567890aBcD1234567890aBcD1234",
      contractName: "AGL_HighYield_Vault",
      avatarIcon: "Coins",
      badgeColor: "purple",
      triggerConfig: {
        type: "yield_profitability",
        intervalSeconds: 30,
        minYieldApy: 12.0,
        conditionDescription: "Trigger auto-compound when accrued rewards > 0.005 ETH and Yield > 3x Base Gas"
      },
      safetyBounds: {
        maxGasPerTxEth: "0.0002",
        dailyGasBudgetEth: "0.003",
        maxSlippagePercent: 0.5,
        dryRunMode: true
      }
    },
    productionCodeTemplate: `// Yield Harvester Production Template
export class YieldHarvesterDaemon {
  // Auto-compounding strategy loop
}`,
    tags: ["Yield Farming", "Auto-Compound", "Staking", "Gas Optimization", "Base L2"]
  },
  {
    id: "lab-dao-consensus-swarm",
    labNumber: 4,
    title: "Multi-Agent Consensus Swarm for Autonomous DAO Governance",
    subtitle: "Architect a 3-agent Byzantine consensus swarm that evaluates DAO proposals, performs AI risk checks, and casts cryptographic votes.",
    difficulty: "Advanced",
    estimatedMinutes: 25,
    category: "DAO Governance",
    overview: "Explore the cutting edge of Web3 autonomous governance. You will build a multi-agent swarm comprising a **Financial Risk Sentinel**, **Code Security Auditor**, and **Strategic Alignment Evaluator**. When a new on-chain DAO proposal is submitted, the three agents independently evaluate the proposal payload, debate through a consensus protocol, and cast collective votes when 2/3 quorum is achieved.",
    architectureDiagram: [
      "1. DAO Proposal Created Event Detected on Governor Contract",
      "2. Swarm Fan-Out: Dispatch Proposal Payload to 3 Specialized Agents",
      "3. Agent 1 (Risk Sentinel): Simulates Treasury Impact & Liquidity Drain",
      "4. Agent 2 (Security Sentinel): Formal Audit of Target Calldata & Bytecode",
      "5. Agent 3 (Strategy Sentinel): Verifies Alignment with DAO Constitution",
      "6. Byzantine Quorum Aggregation: 2 of 3 Consensus Required",
      "7. Execute castVoteWithReason() on Base Governor Contract"
    ],
    learningObjectives: [
      "Implement multi-agent consensus protocols with BFT (Byzantine Fault Tolerance)",
      "Decode arbitrary proposal calldata for automatic security vulnerability detection",
      "Integrate Governor Alpha / OpenZeppelin Governor vote casting interfaces",
      "Create explainable governance vote logs with transparent AI reasoning"
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Swarm Architecture & Agent Personas",
        description: "Define the three autonomous specialized agent roles and their evaluation criteria.",
        explanation: "Dividing governance evaluation across independent specialized agents prevents cognitive bias and ensures comprehensive risk coverage.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 1: Multi-Agent Swarm Personas
export interface SwarmVote {
  agentRole: "FINANCIAL_RISK" | "SECURITY_AUDIT" | "STRATEGIC_ALIGNMENT";
  decision: "FOR" | "AGAINST" | "ABSTAIN";
  confidenceScore: number; // 0 - 100
  reasoning: string;
}

export class GovernanceSwarm {
  public async evaluateProposal(proposalId: string, calldata: string): Promise<SwarmVote[]> {
    const [riskVote, secVote, stratVote] = await Promise.all([
      this.runFinancialRiskAnalysis(calldata),
      this.runCodeSecurityAnalysis(calldata),
      this.runStrategicAlignmentCheck(calldata)
    ]);
    return [riskVote, secVote, stratVote];
  }
}`,
        keyTakeaways: [
          "Parallel evaluation reduces latency from minutes to seconds.",
          "Each agent evaluates proposals using domain-specific heuristics and prompt directives."
        ]
      },
      {
        stepNumber: 2,
        title: "Consensus Aggregation & Quorum Threshold",
        description: "Aggregate individual agent votes using super-majority quorum logic (2 out of 3 required).",
        explanation: "If two or more agents vote FOR with confidence > 75%, the swarm reaches consensus to support the proposal on-chain.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 2: Quorum Aggregator
export function computeSwarmConsensus(votes: SwarmVote[]): {
  finalVote: 0 | 1 | 2; // 0=Against, 1=For, 2=Abstain
  consensusReached: boolean;
  aggregateReason: string;
} {
  const forVotes = votes.filter(v => v.decision === "FOR");
  const againstVotes = votes.filter(v => v.decision === "AGAINST");

  if (forVotes.length >= 2) {
    return {
      finalVote: 1,
      consensusReached: true,
      aggregateReason: "Swarm Consensus (2/3 FOR): " + forVotes.map(v => v.agentRole + " approved").join(", ")
    };
  }
  return {
    finalVote: 0,
    consensusReached: true,
    aggregateReason: "Swarm Rejected Proposal due to risk flags."
  };
}`,
        keyTakeaways: [
          "Deterministic vote resolution guarantees auditability and reproducible governance decisions.",
          "Reasons are submitted directly on-chain via castVoteWithReason()."
        ]
      },
      {
        stepNumber: 3,
        title: "On-Chain Vote Dispatch to Base Governor",
        description: "Submit the consensus vote to the OpenZeppelin Governor contract on Base.",
        explanation: "The agent signs the vote transaction with explanation string encoded in the receipt.",
        codeLanguage: "solidity",
        codeSnippet: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGovernor {
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) external returns (uint256 weight);
}

contract SwarmVoteExecutor {
    IGovernor public immutable governor;
    address public immutable swarmSigner;

    constructor(address _governor, address _swarmSigner) {
        governor = IGovernor(_governor);
        swarmSigner = _swarmSigner;
    }

    function executeSwarmVote(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) external returns (uint256) {
        require(msg.sender == swarmSigner, "Unauthorized");
        return governor.castVoteWithReason(proposalId, support, reason);
    }
}`,
        keyTakeaways: [
          "Enables 24/7 DAO participation without governance fatigue for token holders.",
          "Creates public on-chain transparency for every AI-driven vote."
        ]
      }
    ],
    defaultAgentConfig: {
      name: "DAO Consensus Swarm (3-Agent Quorum)",
      description: "Autonomous 3-agent BFT consensus swarm evaluating and voting on Base DAO proposals",
      type: "dao_consensus_swarm",
      status: "IDLE",
      network: "base-mainnet",
      targetContract: "0x3333444455556666777788889999000011112222",
      contractName: "Agunnaya_DAO_Governor",
      avatarIcon: "BrainCircuit",
      badgeColor: "amber",
      triggerConfig: {
        type: "contract_event",
        intervalSeconds: 30,
        conditionDescription: "Trigger swarm evaluation whenever ProposalCreated event is detected on Governor"
      },
      safetyBounds: {
        maxGasPerTxEth: "0.0004",
        dailyGasBudgetEth: "0.005",
        maxSlippagePercent: 0.0,
        requireHumanApprovalAboveEth: "10.0",
        dryRunMode: true
      }
    },
    productionCodeTemplate: `// Multi-Agent Swarm Production Runner
export class DaoSwarmOrchestrator {
  // 3-agent consensus governance daemon
}`,
    tags: ["DAO", "Governance", "Multi-Agent", "Consensus", "AI Voting"]
  },
  {
    id: "lab-deflation-burner",
    labNumber: 5,
    title: "Scheduled Multicall Batch Burner & Deflation Automator",
    subtitle: "Automate scheduled ERC-20 batch burns using canonical Multicall3 during low-gas windows on Base.",
    difficulty: "Beginner",
    estimatedMinutes: 10,
    category: "Token Deflation",
    overview: "Token burn operations reduce circulating supply and boost scarcity, but manual burning is tedious and gas-inefficient. In this lab, you will deploy a background deflation worker that collects accumulated protocol fees, waits for Base gas prices to drop below 0.03 Gwei, and executes a batch multicall burn to the dead address (`0x000...dEaD`).",
    architectureDiagram: [
      "1. Accumulate Protocol Fees & Fee Split Tokens",
      "2. Monitor Base Gas Oracle (Wait for Gas < 0.03 Gwei)",
      "3. Construct Multicall3 Batch Payload: [burn(TokenA), burn(TokenB), burn(TokenC)]",
      "4. Execute Atomic Batch Burn Transaction to 0x0000...dEaD",
      "5. Generate Cryptographic Proof of Burn Certificate & Update Leaderboard"
    ],
    learningObjectives: [
      "Batch multiple contract calls into a single transaction using Multicall3",
      "Schedule opportunistic executions based on gas price floors",
      "Verify permanent token supply deflation on BaseScan",
      "Emit cryptographic proof of burn records for public auditability"
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Multicall3 Batch Construction",
        description: "Aggregate multiple token burn calls into an atomic multicall payload.",
        explanation: "Using Multicall3 (`0xcA11bde05977b3631167028862bE2a173976CA11`) allows the agent to burn 5 different tokens in a single transaction, saving up to 60% gas.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 1: Multicall3 Burn Batching
import { Interface } from "ethers";

const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export function buildBatchBurnCall(tokens: Array<{ address: string; amount: string }>) {
  const iface = new Interface(ERC20_ABI);
  
  return tokens.map(t => ({
    target: t.address,
    allowFailure: false,
    callData: iface.encodeFunctionData("transfer", [DEAD_ADDRESS, t.amount])
  }));
}`,
        keyTakeaways: [
          "Batching multiple transactions amortizes base execution overhead.",
          "Setting allowFailure: false guarantees all burns succeed atomically or revert."
        ]
      },
      {
        stepNumber: 2,
        title: "Gas Floor Trigger & Execution Timing",
        description: "Configure the background agent to wait for optimal network conditions on Base.",
        explanation: "Base gas prices drop during off-peak hours. The agent waits until gas < 0.03 Gwei before triggering.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 2: Opportunistic Gas-Floor Gate
export async function shouldExecuteBatchBurn(gasFloorGwei: number = 0.03): Promise<boolean> {
  const gasPrice = await provider.getFeeData();
  const currentGwei = Number(gasPrice.gasPrice) / 1e9;
  
  console.log("Current Base Gas: " + currentGwei + " Gwei (Floor: " + gasFloorGwei + ")");
  return currentGwei <= gasFloorGwei;
}`,
        keyTakeaways: [
          "Maximize capital efficiency by scheduling non-time-critical maintenance during gas troughs.",
          "Prevents wasting treasury funds on high gas fees."
        ]
      },
      {
        stepNumber: 3,
        title: "Proof of Burn Generation & Leaderboard Sync",
        description: "Save burn receipts with transaction hash, block number, and total deflation volume.",
        explanation: "The agent records proof of burn certificates directly to local database and triggers live leaderboard updates.",
        codeLanguage: "typescript",
        codeSnippet: `// Step 3: Record Proof of Burn
export function generateProofOfBurnRecord(txHash: string, tokensBurned: any[]) {
  return {
    certificateId: "BURN-" + Date.now(),
    txHash,
    burnedAt: Date.now(),
    tokens: tokensBurned,
    nullAddress: DEAD_ADDRESS,
    explorerUrl: "https://basescan.org/tx/" + txHash,
    status: "CONFIRMED_ON_CHAIN"
  };
}`,
        keyTakeaways: [
          "Cryptographic receipts allow token communities to verify real deflation.",
          "Syncs automatically with the Agunnaya Burn Leaderboard."
        ]
      }
    ],
    defaultAgentConfig: {
      name: "Automated Batch Deflation Burner",
      description: "Opportunistic gas-floor batch burner executing Multicall3 burns to 0x000...dEaD on Base",
      type: "deflation_burner",
      status: "IDLE",
      network: "base-mainnet",
      targetContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
      contractName: "Canonical_Multicall3",
      avatarIcon: "Flame",
      badgeColor: "orange",
      triggerConfig: {
        type: "gas_floor",
        intervalSeconds: 20,
        gasFloorGwei: 0.03,
        conditionDescription: "Trigger batch burn when accumulated fees > $50 and Base gas < 0.03 gwei"
      },
      safetyBounds: {
        maxGasPerTxEth: "0.00025",
        dailyGasBudgetEth: "0.004",
        maxSlippagePercent: 0.0,
        dryRunMode: true
      }
    },
    productionCodeTemplate: `// Multicall Batch Burner Production Template
export class BatchBurnerDaemon {
  // Automated batch burn daemon
}`,
    tags: ["Multicall3", "Token Burn", "Deflation", "Gas Optimization", "Base L2"]
  }
];
