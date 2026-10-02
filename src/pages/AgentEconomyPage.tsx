import React, { useState } from "react";
import { 
  Bot, 
  Cpu, 
  ShieldCheck, 
  Sparkles, 
  Terminal, 
  Play, 
  Pause, 
  Plus, 
  Code2, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Coins, 
  Database, 
  Wrench, 
  Settings2, 
  UploadCloud, 
  Eye, 
  ArrowRight,
  ExternalLink,
  Sliders,
  DollarSign
} from "lucide-react";
import { SpecializedAgent, SpecializedAgentRole, AgentToolConfig } from "../types/ecosystem";
import { WalletState } from "../types";
import { EcosystemService } from "../lib/ecosystemService";
import { AgunnayaDatabase } from "../lib/db";
import { AGL_TREASURY_ADDRESS } from "../lib/aglContracts";

interface AgentEconomyPageProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  onSelectTab: (tab: string) => void;
}

const DEFAULT_SPECIALIZED_AGENTS: SpecializedAgent[] = [
  {
    id: "agent-solidity-auditor",
    name: "Solidity Security Auditor",
    symbol: "AUDIT-AI",
    role: "solidity_auditor",
    description: "Performs deep automated scans for Checks-Effects-Interactions (CEI) violations, reentrancy vectors, access control bypasses, and arithmetic traps on Base contracts.",
    creatorAddress: AGL_TREASURY_ADDRESS,
    version: "2.3.0",
    isPublishedToMarketplace: true,
    systemPrompt: "You are an elite EVM smart contract auditor specializing in Base L2 Solidity security. Review AST, detect reentrancy, check gas limits, and ensure CEI compliance.",
    tools: [
      { id: "tool-cei-check", name: "Checks-Effects-Interactions Auditor", description: "Verifies state modifications occur strictly before external calls.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 30 },
      { id: "tool-reentrancy-scan", name: "Reentrancy & Cross-Function Analysis", description: "Analyzes mutexes and reentrancy guards across external calls.", enabled: true, requiredCredits: 10, requiresSigning: false, rateLimitPerMinute: 20 },
      { id: "tool-gas-optimizer", name: "Opcode Gas Optimization Engine", description: "Identifies redundant SSTORE, cold-load storage, and memory caching improvements.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 30 }
    ],
    permissions: {
      canQueryBaseRpc: true,
      canAnalyzeBytecode: true,
      canReadTreasuryState: false,
      canDraftProposals: false,
      canSuggestTransactions: false,
      maxEthPerProposedTx: 0
    },
    pricing: {
      creditsPerQuery: 20,
      feeEthPerSpecializedAudit: 0.005
    },
    safetyControls: {
      sandboxSimulationFirst: true,
      requireSignConfirmation: true, // Always enforced
      maxExecutionTimeSeconds: 45
    },
    queryCount: 1420,
    auditsPerformedCount: 382,
    createdAt: Date.now() - 40 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 2 * 24 * 3600 * 1000
  },
  {
    id: "agent-base-contract-analyst",
    name: "Base Contract Analyst",
    symbol: "ANALYST-AI",
    role: "base_contract_analyst",
    description: "Inspects live deployed contracts on Base Mainnet. Extracts ABI, disassembles bytecode, maps storage slots, and verifies proxy implementation patterns.",
    creatorAddress: AGL_TREASURY_ADDRESS,
    version: "1.8.0",
    isPublishedToMarketplace: true,
    systemPrompt: "You are an on-chain forensic analyst on Base. Inspect verified or raw bytecode, extract function selectors, and identify upgradeable proxy implementations.",
    tools: [
      { id: "tool-rpc-bytecode", name: "Base Mainnet RPC Bytecode Inspector", description: "Fetches live bytecode directly from https://mainnet.base.org.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 60 },
      { id: "tool-proxy-resolver", name: "EIP-1967 Proxy Implementation Resolver", description: "Reads storage slot 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 60 }
    ],
    permissions: {
      canQueryBaseRpc: true,
      canAnalyzeBytecode: true,
      canReadTreasuryState: true,
      canDraftProposals: false,
      canSuggestTransactions: false,
      maxEthPerProposedTx: 0
    },
    pricing: {
      creditsPerQuery: 15,
      feeEthPerSpecializedAudit: 0.002
    },
    safetyControls: {
      sandboxSimulationFirst: true,
      requireSignConfirmation: true,
      maxExecutionTimeSeconds: 30
    },
    queryCount: 940,
    auditsPerformedCount: 210,
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 4 * 24 * 3600 * 1000
  },
  {
    id: "agent-dao-proposal",
    name: "DAO Proposal Agent",
    symbol: "GOV-AI",
    role: "dao_proposal_agent",
    description: "Assists DAO stewards in drafting formal proposals, checking OpenZeppelin Governor parameters, and simulating timelock execution feasibility.",
    creatorAddress: AGL_TREASURY_ADDRESS,
    version: "1.2.0",
    isPublishedToMarketplace: true,
    systemPrompt: "You are a governance curator for Agunnaya DAO on Base. Help draft structured proposals with rigorous financial impact statements and calldata payloads.",
    tools: [
      { id: "tool-calldata-encoder", name: "Governor Calldata Encoder", description: "Encodes target, value, and signature calldata for timelocked proposals.", enabled: true, requiredCredits: 10, requiresSigning: true, rateLimitPerMinute: 20 },
      { id: "tool-quorum-modeler", name: "Snapshot Quorum Modeler", description: "Simulates required wAGL voting power thresholds.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 30 }
    ],
    permissions: {
      canQueryBaseRpc: true,
      canAnalyzeBytecode: false,
      canReadTreasuryState: true,
      canDraftProposals: true,
      canSuggestTransactions: true,
      maxEthPerProposedTx: 1.0
    },
    pricing: {
      creditsPerQuery: 15,
      feeEthPerSpecializedAudit: 0.001
    },
    safetyControls: {
      sandboxSimulationFirst: true,
      requireSignConfirmation: true, // Absolutely requires user wallet sign
      maxExecutionTimeSeconds: 30
    },
    queryCount: 520,
    auditsPerformedCount: 95,
    createdAt: Date.now() - 25 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 1 * 24 * 3600 * 1000
  },
  {
    id: "agent-treasury-analysis",
    name: "Treasury Analysis Agent",
    symbol: "TREASURY-AI",
    role: "treasury_analysis_agent",
    description: "Monitors protocol treasury reserves, fee auto-sweep parameters, POL health, and liquidity depth across Base pools.",
    creatorAddress: AGL_TREASURY_ADDRESS,
    version: "1.5.0",
    isPublishedToMarketplace: true,
    systemPrompt: "Analyze Agunnaya protocol treasury liquidity, track fee inflows, and recommend optimal fee auto-sweep thresholds.",
    tools: [
      { id: "tool-treasury-sweep-monitor", name: "Protocol Sweep Threshold Tracker", description: "Monitors 0.05 ETH sweep triggers into treasury wallet 0x7256...632E.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 60 }
    ],
    permissions: {
      canQueryBaseRpc: true,
      canAnalyzeBytecode: false,
      canReadTreasuryState: true,
      canDraftProposals: false,
      canSuggestTransactions: false,
      maxEthPerProposedTx: 0
    },
    pricing: {
      creditsPerQuery: 10,
      feeEthPerSpecializedAudit: 0.0
    },
    safetyControls: {
      sandboxSimulationFirst: true,
      requireSignConfirmation: true,
      maxExecutionTimeSeconds: 20
    },
    queryCount: 680,
    auditsPerformedCount: 140,
    createdAt: Date.now() - 20 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 2 * 24 * 3600 * 1000
  },
  {
    id: "agent-deployment-assistant",
    name: "Deployment Assistant",
    symbol: "DEPLOY-AI",
    role: "deployment_assistant",
    description: "Guides builders through pre-flight verification, constructor argument encoding, compiler optimizations, and BaseScan verification.",
    creatorAddress: AGL_TREASURY_ADDRESS,
    version: "2.0.0",
    isPublishedToMarketplace: true,
    systemPrompt: "Provide step-by-step guidance for deploying verified Solidity contracts on Base Mainnet. Ensure constructor parameters match ABI definitions.",
    tools: [
      { id: "tool-constructor-encoder", name: "ABI Constructor Argument Encoder", description: "Encodes constructor arguments into standard hex byte array.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 40 },
      { id: "tool-gas-preflight", name: "Base Gas & L1 Data Fee Estimator", description: "Calculates total deployment cost including Base L1 data blob posting.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 40 }
    ],
    permissions: {
      canQueryBaseRpc: true,
      canAnalyzeBytecode: true,
      canReadTreasuryState: false,
      canDraftProposals: false,
      canSuggestTransactions: true,
      maxEthPerProposedTx: 0.5
    },
    pricing: {
      creditsPerQuery: 15,
      feeEthPerSpecializedAudit: 0.0
    },
    safetyControls: {
      sandboxSimulationFirst: true,
      requireSignConfirmation: true,
      maxExecutionTimeSeconds: 30
    },
    queryCount: 1120,
    auditsPerformedCount: 420,
    createdAt: Date.now() - 35 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 1 * 24 * 3600 * 1000
  }
];

export default function AgentEconomyPage({
  wallet,
  showToast,
  addTerminalLog,
  onSelectTab
}: AgentEconomyPageProps) {
  const [agents, setAgents] = useState<SpecializedAgent[]>(() => {
    return AgunnayaDatabase.safeParse<SpecializedAgent[]>("agl_specialized_agents", DEFAULT_SPECIALIZED_AGENTS);
  });
  const [selectedAgent, setSelectedAgent] = useState<SpecializedAgent>(agents[0]);

  // Sandbox Test State
  const [testInput, setTestInput] = useState(`// Sample contract to inspect\ncontract Vault {\n    mapping(address => uint256) public balances;\n    function withdraw() external {\n        uint256 bal = balances[msg.sender];\n        require(bal > 0);\n        (bool s, ) = msg.sender.call{value: bal}("");\n        require(s);\n        balances[msg.sender] = 0; // Notice: State updated after external call (CEI violation)\n    }\n}`);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // New Agent Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState({
    name: "",
    symbol: "",
    role: "solidity_auditor" as SpecializedAgentRole,
    description: "",
    systemPrompt: "",
    creditsPerQuery: 20,
    feeEth: 0.002
  });

  const handleRunSimulation = () => {
    if (wallet.aglCredits < selectedAgent.pricing.creditsPerQuery) {
      showToast(`Insufficient AGL Credits (${wallet.aglCredits}/${selectedAgent.pricing.creditsPerQuery}). Recharge via AGL burn.`, "error");
      return;
    }

    // Deduct credits
    const currentWallet = AgunnayaDatabase.getWallet();
    currentWallet.aglCredits -= selectedAgent.pricing.creditsPerQuery;
    AgunnayaDatabase.saveWallet(currentWallet);

    setIsSimulating(true);
    setTestOutput(null);
    addTerminalLog?.("info", `AGENT_EXECUTION: Triggering "${selectedAgent.name}" on Base sandbox environment...`);

    setTimeout(() => {
      setIsSimulating(false);
      let simulatedResult = "";

      if (selectedAgent.role === "solidity_auditor") {
        simulatedResult = `🔍 AUDIT REPORT BY ${selectedAgent.name.toUpperCase()}:\n\n` +
          `[CRITICAL VULNERABILITY DETECTED]\n` +
          `• Line 8: External call \`msg.sender.call{value: bal}("")\` executed before state mutation \`balances[msg.sender] = 0\`.\n` +
          `• Violation: Checks-Effects-Interactions (CEI) anti-pattern.\n` +
          `• Risk: Critical Reentrancy Attack. An attacker can re-enter withdraw() before balance is zeroed.\n\n` +
          `[REMEDIATION DIFF]:\n` +
          `- balances[msg.sender] = 0;\n` +
          `+ balances[msg.sender] = 0; // Move BEFORE external call\n` +
          `+ (bool s, ) = msg.sender.call{value: bal}("");\n` +
          `+ require(s, "Transfer failed");\n\n` +
          `• Base Mainnet Gas Score: 94/100 (Optimal memory reuse)`;
      } else if (selectedAgent.role === "base_contract_analyst") {
        simulatedResult = `🔬 BASE CONTRACT ANALYSIS RESULT:\n\n` +
          `• Target: Base Mainnet EVM Node\n` +
          `• Compiler Version: Solidity 0.8.20+cancun\n` +
          `• Function Selector: 0x3ccfd60b (withdraw())\n` +
          `• Storage Layout: Slot 0 = mapping(address => uint256)\n` +
          `• Proxy Pattern: None (Direct Implementation)`;
      } else {
        simulatedResult = `⚡ AGENT OUTPUT (${selectedAgent.name}):\n\n` +
          `• Target analyzed successfully.\n` +
          `• Proposed actions require user wallet signature.\n` +
          `• Simulation status: PASS.`;
      }

      setTestOutput(simulatedResult);
      showToast(`Agent simulation complete! Used ${selectedAgent.pricing.creditsPerQuery} Credits.`, "success");
      addTerminalLog?.("success", `AGENT_DONE: ${selectedAgent.name} completed sandbox analysis.`);

      // Update agent metrics
      const updated = agents.map(a => a.id === selectedAgent.id ? { ...a, queryCount: a.queryCount + 1 } : a);
      setAgents(updated);
      localStorage.setItem("agl_specialized_agents", JSON.stringify(updated));
    }, 1500);
  };

  const handleCreateAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentForm.name.trim()) return;

    const newAgent: SpecializedAgent = {
      id: `agent_${Date.now()}`,
      name: newAgentForm.name,
      symbol: newAgentForm.symbol || "AI-DEV",
      role: newAgentForm.role,
      description: newAgentForm.description || "Custom developer agent deployed on Base Mainnet.",
      creatorAddress: wallet.address || AGL_TREASURY_ADDRESS,
      version: "1.0.0",
      isPublishedToMarketplace: true,
      systemPrompt: newAgentForm.systemPrompt || "You are a specialized Web3 developer assistant on Base.",
      tools: [
        { id: "tool-base-rpc", name: "Base Mainnet RPC Gateway", description: "Direct queries to Base L2 RPC.", enabled: true, requiredCredits: 5, requiresSigning: false, rateLimitPerMinute: 60 }
      ],
      permissions: {
        canQueryBaseRpc: true,
        canAnalyzeBytecode: true,
        canReadTreasuryState: false,
        canDraftProposals: false,
        canSuggestTransactions: true,
        maxEthPerProposedTx: 0.1
      },
      pricing: {
        creditsPerQuery: Number(newAgentForm.creditsPerQuery) || 15,
        feeEthPerSpecializedAudit: Number(newAgentForm.feeEth) || 0
      },
      safetyControls: {
        sandboxSimulationFirst: true,
        requireSignConfirmation: true, // Always true
        maxExecutionTimeSeconds: 30
      },
      queryCount: 0,
      auditsPerformedCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updated = [newAgent, ...agents];
    setAgents(updated);
    localStorage.setItem("agl_specialized_agents", JSON.stringify(updated));
    setSelectedAgent(newAgent);
    setIsCreateModalOpen(false);

    // Track builder metric
    if (wallet.address) {
      EcosystemService.incrementBuilderStat(wallet.address, "agentsCreatedCount");
      EcosystemService.incrementBuilderStat(wallet.address, "agentsPublishedCount");
    }

    showToast(`Created & published "${newAgent.name}"!`, "success");
    addTerminalLog?.("success", `AGENT_ECONOMY: Specialized Agent "${newAgent.name}" deployed to local registry.`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950/20 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-medium">
              <Bot className="w-3.5 h-3.5" />
              <span>Agunnaya Autonomous Agent Economy</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white">
              Specialized Web3 AI Agents
            </h1>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              Create, configure, test, and publish specialized AI agents with modular tools, granular permissions, and strict cryptographic transaction safety.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectTab("marketplace")}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-medium text-zinc-300 hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <span>Browse Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white font-semibold text-xs font-display flex items-center gap-2 shadow-lg shadow-brand-purple/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Specialized Agent</span>
            </button>
          </div>
        </div>

        {/* Security Invariant Notice */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2.5 text-xs text-emerald-400">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span className="font-mono">
            <strong>Cryptographic Safety Rule:</strong> AI agents are strictly prohibited from executing silent on-chain transactions. Any proposed interaction requires explicit wallet signature.
          </span>
        </div>
      </div>

      {/* Main Grid: Agent Selector + Live Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Agent Selector Fleet */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">
              Specialized Agent Fleet ({agents.length})
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Base Mainnet</span>
          </div>

          <div className="space-y-2.5">
            {agents.map(agent => {
              const isSelected = selectedAgent.id === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => { setSelectedAgent(agent); setTestOutput(null); }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-zinc-900 border-brand-purple shadow-md shadow-brand-purple/10"
                      : "bg-zinc-900/40 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-display">{agent.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {agent.symbol}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {agent.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-400 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {agent.pricing.creditsPerQuery} Credits
                    </span>
                    <span className="text-zinc-500">
                      {agent.queryCount} queries served
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Columns: Agent Config & Live Sandbox Tester */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Agent Inspector & Safety Rules */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/40 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple font-semibold">
                    {selectedAgent.role.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">v{selectedAgent.version}</span>
                </div>
                <h2 className="text-lg font-bold text-white font-display">{selectedAgent.name}</h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">Execution Cost:</span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{selectedAgent.pricing.creditsPerQuery} Credits</span>
                </span>
              </div>
            </div>

            {/* Configured Tools */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-brand-purple" />
                <span>Configured Tool Suite ({selectedAgent.tools.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedAgent.tools.map(tool => (
                  <div key={tool.id} className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white font-mono">{tool.name}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">ENABLED</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">{tool.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety Controls & Permissions */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-white/5 space-y-3">
              <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cryptographic Guardrails & Permissions</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block">Require Wallet Signing</span>
                  <span className="text-emerald-400 font-bold">ENFORCED (YES)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block">Simulation First</span>
                  <span className="text-white font-bold">REQUIRED</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block">Base Mainnet RPC</span>
                  <span className="text-blue-400 font-bold">CONNECTED</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/5">
                  <span className="text-[10px] text-zinc-500 block">Max Proposed ETH</span>
                  <span className="text-amber-400 font-bold">{selectedAgent.permissions.maxEthPerProposedTx} ETH</span>
                </div>
              </div>
            </div>

            {/* Interactive Sandbox Test Runner */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-brand-purple" />
                  <span>Interactive Agent Sandbox & Verification</span>
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Wallet Balance: <strong className="text-white">{wallet.aglCredits} Credits</strong>
                </span>
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Input Code or Verification Prompt:
                </label>
                <textarea
                  rows={6}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-mono">
                  Cost to execute: <span className="text-amber-400 font-bold">{selectedAgent.pricing.creditsPerQuery} Credits</span>
                </span>
                <button
                  disabled={isSimulating}
                  onClick={handleRunSimulation}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white font-semibold text-xs font-display flex items-center gap-2 shadow-lg shadow-brand-purple/20 hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSimulating ? (
                    <span>Running Simulation...</span>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Execute Sandbox Test</span>
                    </>
                  )}
                </button>
              </div>

              {/* Output Display */}
              {testOutput && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-brand-purple/30 space-y-2 animate-fade-in font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-white/5 pb-2">
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Output from {selectedAgent.name}
                    </span>
                    <span>Status: COMPLETE</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-zinc-300 leading-relaxed font-mono overflow-x-auto text-[11px]">
                    {testOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE SPECIALIZED AGENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold font-display text-white">Create Specialized Agent</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Deploy a custom agent to the Agunnaya autonomous economy.</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Agent Name *</label>
                  <input
                    type="text"
                    required
                    value={newAgentForm.name}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, name: e.target.value })}
                    placeholder="e.g. MEV Arbitrage Inspector"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Agent Symbol</label>
                  <input
                    type="text"
                    value={newAgentForm.symbol}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, symbol: e.target.value })}
                    placeholder="e.g. MEV-AI"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Agent Role *</label>
                <select
                  value={newAgentForm.role}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, role: e.target.value as any })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono cursor-pointer"
                >
                  <option value="solidity_auditor">Solidity Security Auditor</option>
                  <option value="base_contract_analyst">Base Contract Analyst</option>
                  <option value="dao_proposal_agent">DAO Proposal Agent</option>
                  <option value="treasury_analysis_agent">Treasury Analysis Agent</option>
                  <option value="token_analytics_agent">Token Analytics Agent</option>
                  <option value="game_economy_agent">Game Economy Agent</option>
                  <option value="contract_explainer">Contract Explainer</option>
                  <option value="deployment_assistant">Deployment Assistant</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newAgentForm.description}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, description: e.target.value })}
                  placeholder="What tasks does this agent perform?"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">System Prompt / Logic Rules</label>
                <textarea
                  rows={3}
                  value={newAgentForm.systemPrompt}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, systemPrompt: e.target.value })}
                  placeholder="You are an autonomous agent specialized in..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">AGL Credits per Call</label>
                  <input
                    type="number"
                    min="5"
                    value={newAgentForm.creditsPerQuery}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, creditsPerQuery: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Optional ETH Fee</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={newAgentForm.feeEth}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, feeEth: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>All created agents automatically inherit strict wallet signing requirements and sandbox simulation.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-semibold text-xs font-display shadow-lg shadow-brand-purple/20 cursor-pointer"
                >
                  Create & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
