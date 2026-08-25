import React, { useState } from "react";
import { 
  AgentWorkflowStep, 
  AgentRole 
} from "../../types/agentWorkflow";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Wrench, 
  Bot, 
  BrainCircuit, 
  ShieldCheck, 
  Layers, 
  Send,
  Zap
} from "lucide-react";

interface AgentStepCardProps {
  key?: React.Key;
  step: AgentWorkflowStep;
  index: number;
  isActive: boolean;
}

const AGENT_META: Record<AgentRole, { icon: any; badgeClass: string; borderClass: string; colorText: string }> = {
  "Planner Agent": {
    icon: BrainCircuit,
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    borderClass: "border-purple-500/30",
    colorText: "text-purple-400",
  },
  "Solidity / Code Agent": {
    icon: Zap,
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    borderClass: "border-blue-500/30",
    colorText: "text-blue-400",
  },
  "Security Agent": {
    icon: ShieldCheck,
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    borderClass: "border-emerald-500/30",
    colorText: "text-emerald-400",
  },
  "Blockchain Agent": {
    icon: Layers,
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    borderClass: "border-amber-500/30",
    colorText: "text-amber-400",
  },
  "Deployment Agent": {
    icon: Send,
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    borderClass: "border-rose-500/30",
    colorText: "text-rose-400",
  },
  "Orchestrator": {
    icon: Bot,
    badgeClass: "bg-brand-purple/10 text-brand-purple border-brand-purple/20",
    borderClass: "border-brand-purple/30",
    colorText: "text-brand-purple",
  },
};

export default function AgentStepCard({ step, index, isActive }: AgentStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = AGENT_META[step.agent] || AGENT_META["Orchestrator"];
  const AgentIcon = meta.icon;

  const renderStatus = () => {
    switch (step.status) {
      case "completed":
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case "running":
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-purple bg-brand-purple/10 px-2.5 py-1 rounded-full border border-brand-purple/30 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Executing
          </span>
        );
      case "waiting_approval":
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Awaiting Approval
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-zinc-800/40 px-2.5 py-1 rounded-full border border-zinc-700/40">
            Pending
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-200 border ${
        isActive
          ? "bg-zinc-900/90 border-brand-purple/50 shadow-lg shadow-brand-purple/10"
          : step.status === "completed"
          ? "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700"
          : "bg-zinc-950/40 border-zinc-800/40 opacity-70"
      }`}
    >
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        {/* Step Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Step Number Circle */}
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                step.status === "completed"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : step.status === "running"
                  ? "bg-brand-purple text-white shadow-md shadow-brand-purple/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              {index + 1}
            </div>

            {/* Title & Agent */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white tracking-tight">{step.title}</h4>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1 ${meta.badgeClass}`}>
                  <AgentIcon className="w-3 h-3" />
                  {step.agent}
                </span>
                {step.toolName && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700/60 flex items-center gap-1">
                    <Wrench className="w-2.5 h-2.5 text-zinc-400" />
                    {step.toolName}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{step.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderStatus()}
            {(step.toolExecution || step.error) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Inspect Tool Call"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Error message if failed */}
        {step.error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            <strong>Error:</strong> {step.error}
          </div>
        )}

        {/* Expandable Tool Execution Details */}
        {expanded && step.toolExecution && (
          <div className="mt-2 pt-3 border-t border-zinc-800/80 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Tool: {step.toolExecution.toolName}</span>
              {step.toolExecution.durationMs !== undefined && (
                <span>Duration: {step.toolExecution.durationMs}ms</span>
              )}
            </div>
            {step.toolExecution.output && (
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 text-zinc-300 overflow-x-auto max-h-48 custom-scrollbar">
                <pre>{typeof step.toolExecution.output === "string" ? step.toolExecution.output : JSON.stringify(step.toolExecution.output, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
