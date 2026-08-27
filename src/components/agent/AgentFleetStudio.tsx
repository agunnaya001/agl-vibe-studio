import React, { useState, useEffect } from "react";
import { 
  BackgroundFleetAgent, 
  FleetActionLog, 
  HandsOnFleetLab, 
  FleetAgentType 
} from "../../types/agentFleet";
import { AGENT_FLEET_LABS } from "../../data/agentFleetLabs";
import { BackgroundFleetManager } from "../../lib/backgroundAgentFleet";
import AgentFleetCard from "./AgentFleetCard";
import AgentFleetLabViewer from "./AgentFleetLabViewer";
import { 
  Zap, 
  Bot, 
  BookOpen, 
  PlusCircle, 
  Activity, 
  Play, 
  Pause, 
  ShieldCheck, 
  Coins, 
  Flame, 
  BrainCircuit, 
  Sparkles, 
  Rocket, 
  Clock, 
  CheckCircle2, 
  Layers, 
  ExternalLink, 
  Sliders, 
  ArrowRight,
  RefreshCw,
  Terminal,
  Trash2,
  Download
} from "lucide-react";

interface AgentFleetStudioProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function AgentFleetStudio({ showToast }: AgentFleetStudioProps) {
  const [activeTab, setActiveTab] = useState<"fleet" | "labs" | "spawner" | "logs">("fleet");
  const [agents, setAgents] = useState<BackgroundFleetAgent[]>([]);
  const [logs, setLogs] = useState<FleetActionLog[]>([]);
  const [selectedLab, setSelectedLab] = useState<HandsOnFleetLab | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");

  // Custom Spawner Form State
  const [spawnerName, setSpawnerName] = useState("");
  const [spawnerDescription, setSpawnerDescription] = useState("");
  const [spawnerType, setSpawnerType] = useState<FleetAgentType>("liquidity_rebalancer");
  const [spawnerInterval, setSpawnerInterval] = useState(15);
  const [spawnerGasFloor, setSpawnerGasFloor] = useState<number | undefined>(0.04);
  const [spawnerContract, setSpawnerContract] = useState("");
  const [spawnerDryRun, setSpawnerDryRun] = useState(true);
  const [spawnerNetwork, setSpawnerNetwork] = useState<"base-mainnet" | "base-sepolia">("base-mainnet");

  // Subscribe to background fleet engine
  useEffect(() => {
    const unsubFleet = BackgroundFleetManager.subscribeFleet((updatedAgents) => {
      setAgents([...updatedAgents]);
    });

    const unsubLogs = BackgroundFleetManager.subscribeLogs(() => {
      setLogs([...BackgroundFleetManager.getLogs()]);
    });

    setLogs(BackgroundFleetManager.getLogs());

    return () => {
      unsubFleet();
      unsubLogs();
    };
  }, []);

  const metrics = BackgroundFleetManager.getFleetMetricsSummary();

  const handlePauseAll = () => {
    agents.forEach((a) => BackgroundFleetManager.setAgentStatus(a.id, "PAUSED"));
    showToast("Paused all background agent fleets.", "info");
  };

  const handleResumeAll = () => {
    agents.forEach((a) => BackgroundFleetManager.setAgentStatus(a.id, "RUNNING"));
    showToast("Resumed all background agent fleets.", "success");
  };

  const handleDeployLabAgent = (agent: BackgroundFleetAgent) => {
    BackgroundFleetManager.registerAgent(agent);
    setActiveTab("fleet");
    setSelectedLab(null);
  };

  const handleSpawnCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spawnerName.trim()) {
      showToast("Please provide an agent name", "error");
      return;
    }

    const created = BackgroundFleetManager.addCustomAgent({
      name: spawnerName,
      description: spawnerDescription || "Custom background autonomous worker on Base",
      type: spawnerType,
      intervalSeconds: spawnerInterval,
      gasFloorGwei: spawnerGasFloor,
      targetContract: spawnerContract,
      dryRunMode: spawnerDryRun,
      network: spawnerNetwork
    });

    showToast(`🚀 Spawned custom agent '${created.name}' in background!`, "success");
    setSpawnerName("");
    setSpawnerDescription("");
    setSpawnerContract("");
    setActiveTab("fleet");
  };

  const handleClearLogs = () => {
    BackgroundFleetManager.clearLogs();
    showToast("Cleared background fleet audit logs.", "info");
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `agl_fleet_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Exported fleet audit logs JSON.", "success");
  };

  const filteredAgents = agents.filter((a) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "RUNNING") return a.status === "RUNNING";
    if (selectedFilter === "PAUSED") return a.status === "PAUSED";
    return a.type === selectedFilter;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Telemetry Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-brand-purple/30 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand-purple/20 text-brand-purple border border-brand-purple/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Autonomous Fleet Engine
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {metrics.activeCount} Workers Active in Background
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-800 text-zinc-300">
                Base L2 Network
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Background Agent Fleets & Hands-On Labs
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
              Build, test, and deploy autonomous AI workers that run persistently in the background to automate DEX liquidity rebalancing, 24/7 security watchdogs, gas-optimized yield compounding, and multi-agent governance swarms.
            </p>
          </div>

          {/* Master Actions */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {metrics.activeCount > 0 ? (
              <button
                onClick={handlePauseAll}
                className="px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 transition"
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause All</span>
              </button>
            ) : (
              <button
                onClick={handleResumeAll}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-2 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume All</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedLab(null);
                setActiveTab("spawner");
              }}
              className="px-4 py-2.5 rounded-2xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-brand-purple/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Spawn Custom Worker</span>
            </button>
          </div>
        </div>

        {/* Real-Time Telemetry Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/80 font-mono">
          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              Active Fleets
            </span>
            <span className="text-lg font-bold text-white">
              {metrics.activeCount} <span className="text-xs text-zinc-400 font-normal">/ {metrics.totalAgents} total</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              Automated Actions
            </span>
            <span className="text-lg font-bold text-emerald-400">
              {metrics.totalActions}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              Gas Spent on Base
            </span>
            <span className="text-lg font-bold text-brand-purple">
              {metrics.totalGasEth} ETH
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/60">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              Yield & Value Generated
            </span>
            <span className="text-lg font-bold text-amber-300">
              ${metrics.totalValueUsd}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedLab(null);
              setActiveTab("fleet");
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "fleet" && !selectedLab
                ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Active Fleets ({agents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("labs")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "labs" || selectedLab
                ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4 text-brand-purple" />
            <span>Hands-On Labs ({AGENT_FLEET_LABS.length})</span>
          </button>

          <button
            onClick={() => {
              setSelectedLab(null);
              setActiveTab("spawner");
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "spawner" && !selectedLab
                ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Fleet Spawner</span>
          </button>

          <button
            onClick={() => {
              setSelectedLab(null);
              setActiveTab("logs");
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "logs" && !selectedLab
                ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Telemetry & Audit Stream ({logs.length})</span>
          </button>
        </div>

        {activeTab === "fleet" && (
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-zinc-500 mr-1">Filter:</span>
            {["ALL", "RUNNING", "PAUSED", "liquidity_rebalancer", "security_sentinel", "yield_harvester"].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-2.5 py-1 rounded-xl text-[11px] transition ${
                  selectedFilter === filter
                    ? "bg-brand-purple/20 text-brand-purple font-bold border border-brand-purple/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {filter.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View: Selected Hands-On Lab */}
      {selectedLab ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedLab(null)}
            className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition"
          >
            ← Back to Hands-On Labs Catalog
          </button>

          <AgentFleetLabViewer
            lab={selectedLab}
            onDeployToFleet={handleDeployLabAgent}
            showToast={showToast}
          />
        </div>
      ) : activeTab === "fleet" ? (
        /* View 1: Active Fleets Grid */
        <div className="space-y-6">
          {filteredAgents.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
              <Bot className="w-12 h-12 text-zinc-600 mx-auto animate-bounce" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Matching Fleet Workers Found</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Launch a pre-configured background agent from our Hands-On Labs or construct a custom worker using the Fleet Spawner.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab("labs")}
                  className="px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Explore Hands-On Labs</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <AgentFleetCard
                  key={agent.id}
                  agent={agent}
                  showToast={showToast}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "labs" ? (
        /* View 2: Hands-On Labs Catalog */
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Interactive Hands-On Labs & Fleet Blueprints</h2>
            <p className="text-xs text-zinc-400">
              Master the architecture of autonomous Web3 agents on Base at your own pace with step-by-step code tutorials and live sandboxes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENT_FLEET_LABS.map((lab) => (
              <div
                key={lab.id}
                className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-brand-purple/50 transition duration-200 flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                      Lab #{lab.labNumber}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {lab.difficulty} • ~{lab.estimatedMinutes}m
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-brand-purple transition">
                    {lab.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                    {lab.subtitle}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {lab.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedLab(lab)}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Launch Guided Lab</span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-purple" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === "spawner" ? (
        /* View 3: Fleet Spawner & Custom Builder */
        <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Spawn Custom Autonomous Fleet Agent</h2>
            <p className="text-xs text-zinc-400">
              Configure scheduled triggers, safety boundaries, and target contracts on Base.
            </p>
          </div>

          <form onSubmit={handleSpawnCustomAgent} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-300 font-semibold block">
                Agent Worker Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Aerodrome Slippage Rebalancer #02"
                value={spawnerName}
                onChange={(e) => setSpawnerName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-300 font-semibold block">
                Operational Description
              </label>
              <textarea
                rows={2}
                placeholder="Describe what conditions trigger this agent..."
                value={spawnerDescription}
                onChange={(e) => setSpawnerDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-300 font-semibold block">
                  Agent Strategy Archetype
                </label>
                <select
                  value={spawnerType}
                  onChange={(e) => setSpawnerType(e.target.value as FleetAgentType)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-purple font-mono"
                >
                  <option value="liquidity_rebalancer">DEX Liquidity Rebalancer</option>
                  <option value="security_sentinel">Security Sentinel & Watchdog</option>
                  <option value="yield_harvester">Yield Harvester & Compounder</option>
                  <option value="deflation_burner">Multicall Deflation Burner</option>
                  <option value="dao_consensus_swarm">DAO Consensus Quorum Swarm</option>
                  <option value="custom_watcher">Custom Autonomous Watcher</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-300 font-semibold block">
                  Network Target
                </label>
                <select
                  value={spawnerNetwork}
                  onChange={(e) => setSpawnerNetwork(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-purple font-mono"
                >
                  <option value="base-mainnet">Base Mainnet (Chain ID 8453)</option>
                  <option value="base-sepolia">Base Sepolia Sandbox (Chain ID 84532)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-300 font-semibold block">
                  Execution Interval (Seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={spawnerInterval}
                  onChange={(e) => setSpawnerInterval(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-purple font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-300 font-semibold block">
                  Gas Price Floor Ceiling (Gwei)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.04"
                  value={spawnerGasFloor || ""}
                  onChange={(e) => setSpawnerGasFloor(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-purple font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-300 font-semibold block">
                Target Contract Address (Optional)
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={spawnerContract}
                onChange={(e) => setSpawnerContract(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
              />
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Execution Mode</span>
                <span className="text-[11px] text-zinc-400">
                  {spawnerDryRun ? "Simulated execution (zero gas cost)" : "Live transactions on Base"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSpawnerDryRun(!spawnerDryRun)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition ${
                  spawnerDryRun
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {spawnerDryRun ? "Dry-Run Simulation" : "Live On-Chain Mode"}
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20 transition"
              >
                <Rocket className="w-4 h-4 text-amber-300" />
                <span>Launch Agent Daemon to Background</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* View 4: Real-time Telemetry & Audit Stream */
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Live Telemetry & On-Chain Audit Stream</h3>
              <p className="text-xs text-zinc-400">
                Continuous real-time audit log of all trigger evaluations, flash swaps, and automated transactions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLogs}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 text-xs font-mono flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Stream</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar font-mono text-xs">
            {logs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                No telemetry recorded yet. Background fleet daemons will log ticks automatically.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    log.type === "action_executed"
                      ? "bg-emerald-950/20 border-emerald-500/30"
                      : log.type === "error"
                      ? "bg-rose-950/20 border-rose-500/30"
                      : "bg-zinc-950 border-zinc-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.agentName}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.type === "action_executed"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : log.type === "error"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {log.type.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-zinc-200">{log.summary}</p>

                  {log.details && (
                    <p className="text-zinc-400 text-[11px] mt-1">{log.details}</p>
                  )}

                  {log.txHash && (
                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-zinc-900">
                      <span className="text-zinc-400">Gas: {log.gasCostEth || "0.00008"} ETH</span>
                      <a
                        href={`https://basescan.org/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-purple hover:underline flex items-center gap-1"
                      >
                        <span>BaseScan: {log.txHash.slice(0, 10)}...{log.txHash.slice(-8)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
