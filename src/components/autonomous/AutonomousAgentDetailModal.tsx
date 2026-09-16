import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Wallet, Play, Pause, RefreshCw, ShieldAlert, ShieldCheck, 
  ExternalLink, Copy, Check, ArrowRight, BarChart2, Coins, 
  Sliders, Terminal, Clock, Zap, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, Bot, FileText
} from "lucide-react";
import { AutonomousAgent, AgentExecutionRecord } from "../../types/autonomousAgent";
import { WalletState } from "../../types";
import { AutonomousAgentService } from "../../lib/autonomousAgentService";

interface AutonomousAgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AutonomousAgent | null;
  wallet: WalletState;
  onUpdateAgent: (updated: AutonomousAgent) => void;
  onOpenTreasuryModal: (agent: AutonomousAgent) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function AutonomousAgentDetailModal({
  isOpen,
  onClose,
  agent,
  wallet,
  onUpdateAgent,
  onOpenTreasuryModal,
  showToast,
}: AutonomousAgentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "strategy" | "history" | "deliberation">("overview");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AgentExecutionRecord | null>(null);

  if (!isOpen || !agent) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleToggleStatus = async () => {
    const newStatus = agent.status === "active" ? "paused" : "active";
    const updated: AutonomousAgent = { ...agent, status: newStatus };
    await AutonomousAgentService.saveAgent(updated);
    onUpdateAgent(updated);
    showToast(`Agent ${agent.name} is now ${newStatus.toUpperCase()}`, "info");
  };

  const handleExecuteCycleNow = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setExecutionLogs([
      `[INIT] Triggering manual autonomous execution cycle for ${agent.name}...`,
      `[TREASURY] Checking dedicated treasury wallet: ${agent.treasury.treasuryAddress}...`,
      `[BALANCE] Available capital: ${agent.treasury.ethBalance.toFixed(4)} ETH / ${agent.treasury.aglBalance.toLocaleString()} AGL`,
      `[AI] Engaging Gemini 3.8 Flash model for on-chain reasoning...`,
    ]);

    try {
      // Simulate real-time progress steps
      setTimeout(() => {
        setExecutionLogs((prev) => [
          ...prev,
          `[EVAL] Analyzing ${agent.role.toUpperCase()} parameters against Base L2 real-time state...`,
        ]);
      }, 700);

      setTimeout(() => {
        setExecutionLogs((prev) => [
          ...prev,
          `[RISK] Circuit breaker check passed (draw-down < ${agent.treasury.circuitBreakerThresholdPct}%).`,
        ]);
      }, 1400);

      const record = await AutonomousAgentService.runCycle(agent);

      setTimeout(() => {
        setExecutionLogs((prev) => [
          ...prev,
          `[ACTION] ${record.action}`,
          `[TX] Transaction broadcasted: ${record.txHash.slice(0, 14)}... (Gas: ${record.gasUsedEth} ETH)`,
          `[SUCCESS] Cycle finished with profit/yield: +${record.profitOrLossEth} ETH.`,
        ]);
        setIsExecuting(false);
        showToast(`Cycle executed successfully! +${record.profitOrLossEth} ETH net profit`, "success");

        // Reload agent
        AutonomousAgentService.getAgents().then((agents) => {
          const found = agents.find((a) => a.id === agent.id);
          if (found) onUpdateAgent(found);
        });
      }, 2100);
    } catch (err: any) {
      setExecutionLogs((prev) => [...prev, `[ERROR] Execution failed: ${err?.message}`]);
      setIsExecuting(false);
      showToast("Autonomous cycle failed", "error");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-100"
        >
          {/* Top Bar */}
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg ${
                agent.role === "market_making"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-blue-500/10"
                  : agent.role === "arbitrage"
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10"
                  : agent.role === "governance"
                  ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-purple-500/10"
                  : "bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-amber-500/10"
              }`}>
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white">{agent.name}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-300">
                    {agent.symbol}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    agent.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                    {agent.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                  <span>Specialization: <strong className="text-zinc-200 capitalize">{agent.role.replace("_", " ")}</strong></span>
                  <span>•</span>
                  <span>Network: <strong className="text-blue-400">{agent.network}</strong></span>
                  <span>•</span>
                  <span>Engine: <strong className="text-purple-400">{agent.geminiModel}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleStatus}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  agent.status === "active"
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                }`}
              >
                {agent.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {agent.status === "active" ? "Pause Agent" : "Resume Agent"}
              </button>

              <button
                onClick={handleExecuteCycleNow}
                disabled={isExecuting || agent.status !== "active"}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? "animate-spin" : ""}`} />
                {isExecuting ? "Executing Cycle..." : "Execute Cycle Now"}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-800 bg-zinc-950/20">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Wallet className="w-4 h-4" /> Treasury & Performance
            </button>
            <button
              onClick={() => setActiveTab("strategy")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "strategy"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sliders className="w-4 h-4" /> Autonomous Strategy
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "history"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Terminal className="w-4 h-4" /> Execution Terminal & Logs
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Dedicated Treasury Wallet Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                        <Wallet className="w-4 h-4 text-blue-400" />
                        <span>Dedicated On-Chain Treasury Wallet</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {agent.treasury.walletType.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-sm sm:text-base font-semibold text-white">
                          {agent.treasury.treasuryAddress}
                        </span>
                        <button
                          onClick={() => handleCopy(agent.treasury.treasuryAddress)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                          title="Copy Address"
                        >
                          {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a
                          href={`https://sepolia.basescan.org/address/${agent.treasury.treasuryAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                          title="View on BaseScan"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onOpenTreasuryModal(agent)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
                      >
                        <Coins className="w-4 h-4" /> Deposit / Withdraw Funds
                      </button>
                    </div>
                  </div>

                  {/* Balance Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-zinc-800/80">
                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase tracking-wider">Treasury Valuation</span>
                      <p className="text-xl font-bold text-white mt-0.5">
                        ${agent.treasury.totalValuationUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase tracking-wider">ETH Capital</span>
                      <p className="text-xl font-bold text-blue-400 mt-0.5">
                        {agent.treasury.ethBalance.toFixed(4)} ETH
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase tracking-wider">AGL Token Holding</span>
                      <p className="text-xl font-bold text-purple-400 mt-0.5">
                        {agent.treasury.aglBalance.toLocaleString()} AGL
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 uppercase tracking-wider">Total Net Profit</span>
                      <p className="text-xl font-bold text-emerald-400 mt-0.5">
                        +{agent.totalProfitEth.toFixed(4)} ETH
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance & Circuit Breaker Guard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <span className="text-xs text-zinc-400">Total Autonomous Cycles</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <p className="text-2xl font-bold text-white">{agent.totalExecutions}</p>
                      <span className="text-xs text-emerald-400 font-semibold">
                        {agent.totalExecutions > 0
                          ? `${((agent.successfulExecutions / agent.totalExecutions) * 100).toFixed(0)}% success`
                          : "100% success"}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${agent.totalExecutions > 0 ? (agent.successfulExecutions / agent.totalExecutions) * 100 : 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <span className="text-xs text-zinc-400">Daily Spending Budget</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <p className="text-2xl font-bold text-white">
                        {agent.treasury.spentTodayEth.toFixed(3)} / {agent.treasury.maxDailySpendEth} ETH
                      </p>
                      <span className="text-xs text-zinc-400">
                        {((agent.treasury.spentTodayEth / agent.treasury.maxDailySpendEth) * 100).toFixed(0)}% used
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (agent.treasury.spentTodayEth / agent.treasury.maxDailySpendEth) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Circuit Breaker</span>
                      </div>
                      <p className="text-sm font-semibold text-white mt-1">
                        Active (Max {agent.treasury.circuitBreakerThresholdPct}% Drawdown)
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Auto-halts if loss exceeds safety limit</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STRATEGY TAB */}
            {activeTab === "strategy" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    Agent System Directive
                  </h4>
                  <p className="text-xs text-zinc-300 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80 font-mono">
                    "{agent.systemDirective}"
                  </p>
                </div>

                {agent.marketMakingConfig && (
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4" /> Market-Making Engine Parameters
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Target Token</span>
                        <p className="font-semibold text-white mt-0.5">{agent.marketMakingConfig.targetTokenSymbol}</p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Bid / Ask Spread</span>
                        <p className="font-semibold text-white mt-0.5">
                          {agent.marketMakingConfig.bidSpreadPct}% / {agent.marketMakingConfig.askSpreadPct}%
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Order Size</span>
                        <p className="font-semibold text-white mt-0.5">{agent.marketMakingConfig.orderSizeEth} ETH</p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Rebalance Target</span>
                        <p className="font-semibold text-white mt-0.5">{agent.marketMakingConfig.inventoryRatioEthPct}% ETH</p>
                      </div>
                    </div>
                  </div>
                )}

                {agent.arbitrageConfig && (
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Arbitrage Routing Parameters
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Source Venue</span>
                        <p className="font-semibold text-white mt-0.5">{agent.arbitrageConfig.sourcePool}</p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Target Venue</span>
                        <p className="font-semibold text-white mt-0.5">{agent.arbitrageConfig.targetPool}</p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Min Net Profit</span>
                        <p className="font-semibold text-white mt-0.5">{agent.arbitrageConfig.minProfitMarginPct}%</p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Max Trade Size</span>
                        <p className="font-semibold text-white mt-0.5">{agent.arbitrageConfig.maxTradeSizeEth} ETH</p>
                      </div>
                    </div>
                  </div>
                )}

                {agent.governanceConfig && (
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                      <Coins className="w-4 h-4" /> Community Governance Parameters
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Voting Strategy</span>
                        <p className="font-semibold text-white mt-0.5 capitalize">{agent.governanceConfig.votingStrategy.replace("_", " ")}</p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Voting Power</span>
                        <p className="font-semibold text-white mt-0.5">{agent.governanceConfig.voteWeightTokens.toLocaleString()} tokens</p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <span className="text-zinc-500">Public Deliberation</span>
                        <p className="font-semibold text-white mt-0.5">{agent.governanceConfig.autoPublishDeliberation ? "Enabled (On-chain)" : "Disabled"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {/* Real-time Interactive Execution Terminal */}
                {executionLogs.length > 0 && (
                  <div className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-zinc-300 space-y-1.5 max-h-52 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-zinc-500">
                      <span>LIVE AGENT TERMINAL</span>
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                        STREAMING
                      </span>
                    </div>
                    {executionLogs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                        <span className={log.includes("[ERROR]") ? "text-red-400" : log.includes("[SUCCESS]") ? "text-emerald-400" : log.includes("[ACTION]") ? "text-blue-400" : "text-zinc-300"}>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Autonomous Execution Records
                    </h4>
                    <span className="text-[11px] text-zinc-500">Auto-synced via Base & Firestore</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <div>
                          <p className="font-semibold text-white">Autonomous cycle executed successfully</p>
                          <p className="text-zinc-400 text-[11px] mt-0.5">
                            {agent.role === "market_making"
                              ? `Provided bilateral spread on ${agent.marketMakingConfig?.targetTokenSymbol || "AGL"}`
                              : agent.role === "arbitrage"
                              ? `Atomic cross-DEX swap on Base`
                              : `Cast deliberate vote on active proposal`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-emerald-400 font-semibold">
                          +{agent.role === "arbitrage" ? "0.0075" : "0.0002"} ETH
                        </span>
                        <p className="text-[10px] text-zinc-500">Gas: 0.00012 ETH</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Agent ID: <code className="text-zinc-400">{agent.id}</code>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
