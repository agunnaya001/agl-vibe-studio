import React, { useState } from "react";
import { 
  ShieldCheck, 
  Zap, 
  BrainCircuit, 
  Bot, 
  Gamepad2, 
  Sparkles, 
  Cpu, 
  Activity,
  Layers,
  Terminal
} from "lucide-react";
import SecurityAuditorWorkspace from "../components/ai/SecurityAuditorWorkspace";
import DAppGeneratorWorkspace from "../components/ai/DAppGeneratorWorkspace";
import ContractExplainerWorkspace from "../components/ai/ContractExplainerWorkspace";
import OnchainAgentWorkspace from "../components/ai/OnchainAgentWorkspace";
import GameBuilderWorkspace from "../components/ai/GameBuilderWorkspace";
import AgentWorkflowStudio from "../components/agent/AgentWorkflowStudio";
import { NetworkKey } from "../types/aiSuite";

interface AISuitePageProps {
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
  initialSubTab?: "orchestrator" | "auditor" | "dapp" | "explainer" | "agent" | "game";
  walletAddress?: string;
  onNavigateTab?: (tab: string) => void;
}

export default function AISuitePage({
  showToast = () => {},
  initialSubTab = "orchestrator",
  walletAddress,
  onNavigateTab
}: AISuitePageProps) {
  const [activeWorkspace, setActiveWorkspace] = useState<"orchestrator" | "auditor" | "dapp" | "explainer" | "agent" | "game">(initialSubTab);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>("base-mainnet");

  const WORKSPACES = [
    {
      id: "orchestrator" as const,
      name: "Agent Orchestrator",
      badge: "Autonomous Dev",
      description: "End-to-end autonomous multi-step Web3 development, formal audits & Base deployment",
      icon: Sparkles,
      color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      activeTabClass: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-brand-purple/30",
    },
    {
      id: "auditor" as const,
      name: "Security Auditor",
      badge: "Institutional Audit",
      description: "Solidity vulnerability detection, formal CEI verification & exploit remediation",
      icon: ShieldCheck,
      color: "text-brand-purple border-brand-purple/30 bg-brand-purple/10",
      activeTabClass: "bg-brand-purple text-white shadow-lg shadow-brand-purple/20",
    },
    {
      id: "dapp" as const,
      name: "dApp Generator",
      badge: "Prompt → Full Stack",
      description: "Generate complete contracts, React frontends & Base deployment scripts",
      icon: Zap,
      color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      activeTabClass: "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/20",
    },
    {
      id: "explainer" as const,
      name: "Contract Explainer",
      badge: "Intelligence Engine",
      description: "Deconstruct any EVM contract into functions, state, events & interactive Q&A",
      icon: BrainCircuit,
      color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      activeTabClass: "bg-blue-600 text-white shadow-lg shadow-blue-500/20",
    },
    {
      id: "agent" as const,
      name: "Onchain AI Agent",
      badge: "Autonomous Assistant",
      description: "Live wallet inspector, transaction decoder & pre-flight safety inspector",
      icon: Bot,
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      activeTabClass: "bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/20",
    },
    {
      id: "game" as const,
      name: "Game Builder",
      badge: "Web3 GameFi",
      description: "Prompt-to-game generator with verifiable VRF contracts and playable live arena",
      icon: Gamepad2,
      color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
      activeTabClass: "bg-rose-600 text-white shadow-lg shadow-rose-500/20",
    },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner / Suite Overview */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-brand-purple/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-brand-purple/20 text-brand-purple border border-brand-purple/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini 3.7 Flash Engine
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Base L2 Native
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              AGL Gemini Web3 AI Suite
            </h1>

            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Institutional-grade smart contract auditing, prompt-driven dApp synthesis, EVM bytecode deconstruction, autonomous on-chain assistance, and GameFi generation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-center min-w-[90px]">
              <div className="text-lg font-mono font-bold text-brand-purple">5</div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">AI Modules</div>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-center min-w-[90px]">
              <div className="text-lg font-mono font-bold text-emerald-400">20+</div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Vulnerabilities</div>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-center min-w-[90px]">
              <div className="text-lg font-mono font-bold text-blue-400">Base L2</div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Target Network</div>
            </div>
          </div>
        </div>

        {/* Workspace Tab Selector Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-6 mt-6 border-t border-white/10">
          {WORKSPACES.map((ws) => {
            const Icon = ws.icon;
            const isActive = activeWorkspace === ws.id;
            return (
              <button
                key={ws.id}
                id={`btn-workspace-${ws.id}`}
                onClick={() => setActiveWorkspace(ws.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isActive
                    ? ws.activeTabClass
                    : "bg-zinc-900/60 hover:bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-2 rounded-xl border ${isActive ? "bg-white/20 border-white/30 text-white" : ws.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono uppercase font-bold opacity-80">{ws.badge}</span>
                </div>
                <div>
                  <div className="text-xs font-bold truncate">{ws.name}</div>
                  <div className={`text-[10px] line-clamp-1 mt-0.5 ${isActive ? "text-white/80" : "text-zinc-500"}`}>
                    {ws.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Workspace Container */}
      <div className="transition-all duration-300">
        {activeWorkspace === "orchestrator" && (
          <AgentWorkflowStudio
            walletAddress={walletAddress}
            showToast={showToast}
          />
        )}

        {activeWorkspace === "auditor" && (
          <SecurityAuditorWorkspace
            showToast={showToast}
            selectedNetwork={selectedNetwork}
          />
        )}

        {activeWorkspace === "dapp" && (
          <DAppGeneratorWorkspace
            showToast={showToast}
            selectedNetwork={selectedNetwork}
            onNavigateTab={onNavigateTab}
          />
        )}

        {activeWorkspace === "explainer" && (
          <ContractExplainerWorkspace
            showToast={showToast}
            selectedNetwork={selectedNetwork}
          />
        )}

        {activeWorkspace === "agent" && (
          <OnchainAgentWorkspace
            showToast={showToast}
            selectedNetwork={selectedNetwork}
            walletAddress={walletAddress}
          />
        )}

        {activeWorkspace === "game" && (
          <GameBuilderWorkspace
            showToast={showToast}
            selectedNetwork={selectedNetwork}
            walletAddress={walletAddress}
          />
        )}
      </div>
    </div>
  );
}
