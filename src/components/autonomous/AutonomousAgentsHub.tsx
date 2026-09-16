import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, Wallet, Play, Pause, RefreshCw, Plus, Zap, BarChart2, Coins, 
  ShieldCheck, ArrowRight, ExternalLink, Copy, Check, Terminal, 
  TrendingUp, Activity, CheckCircle2, Clock, Sparkles, Filter, ChevronRight
} from "lucide-react";
import { AutonomousAgent, AgentExecutionRecord, AgentRole } from "../../types/autonomousAgent";
import { WalletState } from "../../types";
import { AutonomousAgentService } from "../../lib/autonomousAgentService";
import DepositWithdrawTreasuryModal from "./DepositWithdrawTreasuryModal";
import AutonomousAgentDetailModal from "./AutonomousAgentDetailModal";
import DeployAutonomousAgentModal from "./DeployAutonomousAgentModal";

interface AutonomousAgentsHubProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
}

export default function AutonomousAgentsHub({
  wallet,
  showToast,
  addTerminalLog,
}: AutonomousAgentsHubProps) {
  const [agents, setAgents] = useState<AutonomousAgent[]>([]);
  const [executionRecords, setExecutionRecords] = useState<AgentExecutionRecord[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBatchExecuting, setIsBatchExecuting] = useState<boolean>(false);

  // Modals
  const [selectedAgentForDetail, setSelectedAgentForDetail] = useState<AutonomousAgent | null>(null);
  const [selectedAgentForTreasury, setSelectedAgentForTreasury] = useState<AutonomousAgent | null>(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);

  // Load Agents and Execution Records
  const loadData = async () => {
    try {
      const [loadedAgents, loadedRecords] = await Promise.all([
        AutonomousAgentService.getAgents(),
        AutonomousAgentService.getExecutionRecords(),
      ]);
      setAgents(loadedAgents);
      setExecutionRecords(loadedRecords);
    } catch (e) {
      console.warn("Failed to load autonomous agents:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Background Autonomous Loop: auto-executes due agents every 20 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      const now = Date.now();
      const dueAgent = agents.find((a) => a.status === "active" && a.nextExecutionAt <= now);
      if (dueAgent) {
        try {
          const rec = await AutonomousAgentService.runCycle(dueAgent);
          if (addTerminalLog) {
            addTerminalLog("system", `[Auto-Agent] ${dueAgent.name}: ${rec.action}`);
          }
          // Refresh records and agents silently
          loadData();
        } catch (err) {
          console.warn("[Autonomous Loop] Auto-run error:", err);
        }
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [agents]);

  // Aggregate Metrics
  const totalAumUsd = agents.reduce((acc, a) => acc + (a.treasury?.totalValuationUsd || 0), 0);
  const totalProfitEth = agents.reduce((acc, a) => acc + (a.totalProfitEth || 0), 0);
  const activeCount = agents.filter((a) => a.status === "active").length;
  const totalExecs = agents.reduce((acc, a) => acc + (a.totalExecutions || 0), 0);

  // Filtered list
  const filteredAgents = agents.filter((a) => {
    if (selectedRoleFilter === "all") return true;
    return a.role === selectedRoleFilter;
  });

  // Batch trigger
  const handleBatchRunActive = async () => {
    const activeAgents = agents.filter((a) => a.status === "active");
    if (activeAgents.length === 0) {
      showToast("No active agents to execute", "info");
      return;
    }

    setIsBatchExecuting(true);
    showToast(`Executing autonomous cycles for ${activeAgents.length} active agents...`, "info");

    try {
      for (const agent of activeAgents) {
        await AutonomousAgentService.runCycle(agent);
      }
      await loadData();
      showToast(`Completed batch cycles for ${activeAgents.length} agents!`, "success");
    } catch (err: any) {
      showToast("Batch cycle failed: " + err?.message, "error");
    } finally {
      setIsBatchExecuting(false);
    }
  };

  const handleSingleRun = async (agent: AutonomousAgent, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      showToast(`Running autonomous cycle for ${agent.name}...`, "info");
      const rec = await AutonomousAgentService.runCycle(agent);
      await loadData();
      showToast(`Cycle executed: ${rec.action}`, "success");
    } catch (err: any) {
      showToast("Cycle failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & AUM Overview */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Base L2 Autonomous AI Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Self-Executing AI Agents with Dedicated Treasuries
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Autonomous on-chain agents equipped with isolated smart contract treasury wallets to continuously automate
              market-making, cross-DEX arbitrage, and community governance on Base.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleBatchRunActive}
              disabled={isBatchExecuting || activeCount === 0}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isBatchExecuting ? "animate-spin text-blue-400" : ""}`} />
              <span>Execute All Active ({activeCount})</span>
            </button>

            <button
              onClick={() => setIsDeployModalOpen(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy Autonomous Agent</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800/80">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
              Total Treasury AUM
            </span>
            <p className="text-xl font-bold text-white mt-1">
              ${totalAumUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-zinc-500">Across dedicated agent wallets</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Total Net Profit
            </span>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              +{totalProfitEth.toFixed(4)} ETH
            </p>
            <span className="text-[11px] text-zinc-500">Net generated on Base L2</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              Active Autonomous Agents
            </span>
            <p className="text-xl font-bold text-purple-400 mt-1">
              {activeCount} <span className="text-xs font-normal text-zinc-400">/ {agents.length} deployed</span>
            </p>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live self-executing
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Autonomous Cycles
            </span>
            <p className="text-xl font-bold text-amber-400 mt-1">
              {totalExecs.toLocaleString()}
            </p>
            <span className="text-[11px] text-zinc-500">Trades, quotes & votes</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
          {[
            { id: "all", label: "All Fleets", count: agents.length },
            { id: "market_making", label: "Market Making", count: agents.filter((a) => a.role === "market_making").length },
            { id: "arbitrage", label: "Arbitrage", count: agents.filter((a) => a.role === "arbitrage").length },
            { id: "governance", label: "Governance", count: agents.filter((a) => a.role === "governance").length },
            { id: "hybrid", label: "Multi-Strategy", count: agents.filter((a) => a.role === "hybrid").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedRoleFilter === tab.id
                  ? "bg-zinc-800 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <span className="text-xs text-zinc-500">
          Network: <strong className="text-blue-400">Base Sepolia & Base Mainnet</strong>
        </span>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAgents.map((agent) => {
          const isMM = agent.role === "market_making";
          const isArb = agent.role === "arbitrage";
          const isGov = agent.role === "governance";

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgentForDetail(agent)}
              className="group p-5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between shadow-lg relative overflow-hidden"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isMM
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : isArb
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : isGov
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {isMM ? <BarChart2 className="w-5 h-5" /> : isArb ? <Zap className="w-5 h-5" /> : isGov ? <Coins className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                          {agent.name}
                        </h3>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {agent.symbol}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 capitalize">
                        {agent.role.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
                    agent.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${agent.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                    {agent.status.toUpperCase()}
                  </span>
                </div>

                {/* Dedicated Treasury Wallet Box */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 mt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-blue-400" /> Dedicated Treasury:
                    </span>
                    <span className="font-mono text-zinc-300">
                      {agent.treasury.treasuryAddress.slice(0, 6)}...{agent.treasury.treasuryAddress.slice(-4)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500">ETH Capital:</span>
                      <p className="font-semibold text-white">{agent.treasury.ethBalance.toFixed(3)} ETH</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500">AGL Holding:</span>
                      <p className="font-semibold text-purple-400">{agent.treasury.aglBalance.toLocaleString()} AGL</p>
                    </div>
                  </div>
                </div>

                {/* Specialization Specs */}
                <div className="mt-3 text-xs space-y-1 text-zinc-400">
                  {isMM && agent.marketMakingConfig && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Spread & Target:</span>
                      <span className="font-semibold text-zinc-200">
                        ±{agent.marketMakingConfig.bidSpreadPct}% • {agent.marketMakingConfig.targetTokenSymbol}
                      </span>
                    </div>
                  )}
                  {isArb && agent.arbitrageConfig && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Venues:</span>
                      <span className="font-semibold text-zinc-200">
                        Curve ↔ Aerodrome
                      </span>
                    </div>
                  )}
                  {isGov && agent.governanceConfig && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Voting Power:</span>
                      <span className="font-semibold text-zinc-200">
                        {agent.governanceConfig.voteWeightTokens.toLocaleString()} tokens
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Profit:</span>
                    <span className="font-semibold text-emerald-400">
                      +{agent.totalProfitEth.toFixed(4)} ETH
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAgentForTreasury(agent);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  Manage Treasury
                </button>

                <button
                  onClick={(e) => handleSingleRun(agent, e)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/90 hover:bg-blue-600 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Run Cycle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Autonomous Execution Ledger */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">Autonomous Execution Ledger</h3>
          </div>
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Real-time stream
          </span>
        </div>

        <div className="space-y-2.5">
          {executionRecords.slice(0, 5).map((record) => (
            <div
              key={record.id}
              className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg mt-0.5 ${
                  record.type === "market_making"
                    ? "bg-blue-500/10 text-blue-400"
                    : record.type === "arbitrage"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-purple-500/10 text-purple-400"
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{record.agentName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                      {record.type.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-zinc-300 mt-1">{record.action}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 italic">
                    AI: "{record.reasoningSummary.slice(0, 120)}..."
                  </p>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
                <span className="font-mono text-emerald-400 font-bold">
                  {record.profitOrLossEth > 0 ? `+${record.profitOrLossEth.toFixed(4)} ETH` : "0.0000 ETH"}
                </span>
                <span className="text-[10px] text-zinc-500">Gas: {record.gasUsedEth} ETH</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AutonomousAgentDetailModal
        isOpen={!!selectedAgentForDetail}
        onClose={() => setSelectedAgentForDetail(null)}
        agent={selectedAgentForDetail}
        wallet={wallet}
        onUpdateAgent={(updated) => {
          setSelectedAgentForDetail(updated);
          loadData();
        }}
        onOpenTreasuryModal={(agent) => {
          setSelectedAgentForDetail(null);
          setSelectedAgentForTreasury(agent);
        }}
        showToast={showToast}
      />

      <DepositWithdrawTreasuryModal
        isOpen={!!selectedAgentForTreasury}
        onClose={() => setSelectedAgentForTreasury(null)}
        agent={selectedAgentForTreasury}
        wallet={wallet}
        onSuccess={() => loadData()}
        showToast={showToast}
      />

      <DeployAutonomousAgentModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        wallet={wallet}
        onSuccess={() => loadData()}
        showToast={showToast}
      />
    </div>
  );
}
