import React, { useState, useEffect } from "react";
import { 
  BackgroundFleetAgent, 
  FleetActionLog 
} from "../../types/agentFleet";
import { 
  Play, 
  Pause, 
  Trash2, 
  RotateCw, 
  ExternalLink, 
  Zap, 
  ShieldAlert, 
  Coins, 
  Flame, 
  BrainCircuit, 
  Bot, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Fuel, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Terminal
} from "lucide-react";
import { BackgroundFleetManager } from "../../lib/backgroundAgentFleet";

interface AgentFleetCardProps {
  key?: React.Key;
  agent: BackgroundFleetAgent;
  onSelect?: (agent: BackgroundFleetAgent) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function AgentFleetCard({
  agent,
  onSelect,
  showToast
}: AgentFleetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [secondsUntilNext, setSecondsUntilNext] = useState<number>(0);

  // Countdown timer for next scheduled run
  useEffect(() => {
    if (agent.status !== "RUNNING") {
      setSecondsUntilNext(0);
      return;
    }

    const interval = setInterval(() => {
      if (agent.nextRunAt) {
        const remaining = Math.max(0, Math.ceil((agent.nextRunAt - Date.now()) / 1000));
        setSecondsUntilNext(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [agent.nextRunAt, agent.status]);

  const handleToggleStatus = () => {
    if (agent.status === "RUNNING") {
      BackgroundFleetManager.setAgentStatus(agent.id, "PAUSED");
      showToast(`Paused agent '${agent.name}'`, "info");
    } else {
      BackgroundFleetManager.setAgentStatus(agent.id, "RUNNING");
      showToast(`Started agent '${agent.name}'`, "success");
    }
  };

  const handleManualTick = () => {
    BackgroundFleetManager.triggerManualTick(agent.id);
    showToast(`Manual tick triggered for '${agent.name}'`, "info");
  };

  const handleDelete = () => {
    BackgroundFleetManager.deleteAgent(agent.id);
    showToast(`Removed agent '${agent.name}' from fleet`, "info");
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case "liquidity_rebalancer":
        return Zap;
      case "security_sentinel":
        return ShieldAlert;
      case "yield_harvester":
        return Coins;
      case "deflation_burner":
        return Flame;
      case "dao_consensus_swarm":
        return BrainCircuit;
      default:
        return Bot;
    }
  };

  const IconComponent = getAgentIcon(agent.type);

  return (
    <div
      className={`p-5 rounded-3xl border transition duration-200 space-y-4 ${
        agent.status === "RUNNING"
          ? "bg-zinc-900/80 border-brand-purple/40 shadow-lg shadow-brand-purple/5"
          : "bg-zinc-950/70 border-zinc-800"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              agent.status === "RUNNING"
                ? "bg-brand-purple/20 border-brand-purple/40 text-brand-purple"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                  agent.status === "RUNNING"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    agent.status === "RUNNING" ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                  }`}
                />
                {agent.status}
              </span>

              <span className="text-[10px] font-mono text-zinc-400">
                {agent.network === "base-mainnet" ? "Base Mainnet" : "Base Sepolia"}
              </span>

              {agent.safetyBounds.dryRunMode && (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  Simulated
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
              {agent.name}
            </h4>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleManualTick}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
            title="Trigger Immediate Tick"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleToggleStatus}
            className={`p-2 rounded-xl transition ${
              agent.status === "RUNNING"
                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
            }`}
            title={agent.status === "RUNNING" ? "Pause Agent" : "Start Agent"}
          >
            {agent.status === "RUNNING" ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          <button
            onClick={handleDelete}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition"
            title="Delete Agent"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-400 line-clamp-2">
        {agent.description}
      </p>

      {/* Trigger & Countdown Bar */}
      <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-brand-purple" />
          <span>Interval: {agent.triggerConfig.intervalSeconds}s</span>
        </div>

        {agent.status === "RUNNING" ? (
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Next tick in {secondsUntilNext}s
          </span>
        ) : (
          <span className="text-zinc-500">Daemon Paused</span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            Actions
          </span>
          <span className="text-xs font-bold text-white">
            {agent.successfulActions} <span className="text-zinc-400 font-normal">/ {agent.totalRuns}</span>
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            Gas Spent
          </span>
          <span className="text-xs font-bold text-emerald-400">
            {agent.totalGasSpentEth} ETH
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            Value / Yield
          </span>
          <span className="text-xs font-bold text-amber-300">
            ${agent.estimatedValueGeneratedUsd}
          </span>
        </div>
      </div>

      {/* Expandable Logs Section */}
      <div className="border-t border-zinc-800/80 pt-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-white py-1 transition"
        >
          <span className="flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-brand-purple" />
            <span>Recent Daemon Logs ({agent.logs.length})</span>
          </span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar font-mono text-[11px]">
            {agent.logs.length === 0 ? (
              <p className="text-zinc-500 py-2 text-center">No logs generated yet. Agent is standing by.</p>
            ) : (
              agent.logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-xl bg-zinc-950 border border-zinc-900 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span
                      className={`font-semibold ${
                        log.type === "action_executed"
                          ? "text-emerald-400"
                          : log.type === "error"
                          ? "text-rose-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {log.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-zinc-300 leading-snug">{log.summary}</p>
                  {log.txHash && (
                    <div className="flex items-center gap-1 text-[10px] text-brand-purple">
                      <span>Tx: {log.txHash.slice(0, 10)}...{log.txHash.slice(-8)}</span>
                      <a
                        href={`https://basescan.org/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center"
                      >
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
