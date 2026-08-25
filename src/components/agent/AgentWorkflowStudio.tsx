import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Bot,
  BrainCircuit,
  Zap,
  ShieldCheck,
  Layers,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Code,
  FileCode,
  FolderGit2,
  Terminal,
  Clock,
  ShieldAlert,
  Fuel,
  Coins,
  ChevronRight,
  Info
} from "lucide-react";
import {
  AgentWorkflowTask,
  AgentWorkflowStep,
  AgentTransactionApprovalRequest,
  AgentProjectMemory,
  AgentRole
} from "../../types/agentWorkflow";
import { AgentOrchestrator } from "../../lib/agentOrchestrator";
import { AgentToolService } from "../../lib/agentTools";
import AgentStepCard from "./AgentStepCard";
import AgentSecuritySummary from "./AgentSecuritySummary";
import AgentApprovalModal from "./AgentApprovalModal";
import AgentProjectMemoryDrawer from "./AgentProjectMemoryDrawer";

interface AgentWorkflowStudioProps {
  walletAddress?: string;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: any, msg: string) => void;
}

const TEMPLATE_PROMPTS = [
  {
    title: "Launch Token on Base",
    prompt: "Launch an ERC-20 utility token named 'Agunnaya Protocol' with symbol 'AGP' and supply 10,000,000 on Base Mainnet with burnable and ownable extensions.",
    icon: Zap,
    badge: "Token Launch",
    color: "from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30"
  },
  {
    title: "Audit & Harden Smart Contract",
    prompt: "Conduct a comprehensive security audit of a DeFi staking contract with reward multipliers. Check for reentrancy, CEI violations, and flash loan vulnerabilities.",
    icon: ShieldCheck,
    badge: "Security Audit",
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30"
  },
  {
    title: "Deploy DeFi Staking Vault",
    prompt: "Create and deploy a high-yield staking pool contract where users stake Base ETH/AGL to earn 18% APY with a 7-day timelock and emergency unstake.",
    icon: Coins,
    badge: "DeFi Yield",
    color: "from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30"
  },
  {
    title: "Inspect Base On-Chain State",
    prompt: "Inspect contract address 0xEA1221b4d80a89bd8c75248fae7c176bd1854698 on Base Mainnet, verify bytecode, balance, and owner permissions.",
    icon: Layers,
    badge: "On-Chain Reader",
    color: "from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30"
  }
];

export default function AgentWorkflowStudio({
  walletAddress = "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
  showToast,
  addTerminalLog
}: AgentWorkflowStudioProps) {
  const [prompt, setPrompt] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<"base-mainnet" | "base-sepolia">("base-mainnet");
  const [activeTask, setActiveTask] = useState<AgentWorkflowTask | null>(null);
  const [activeTab, setActiveTab] = useState<"workflow" | "code" | "security" | "logs">("workflow");
  const [pendingApproval, setPendingApproval] = useState<AgentTransactionApprovalRequest | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isProjectMemoryOpen, setIsProjectMemoryOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to orchestrator task updates
  useEffect(() => {
    const unsubscribe = AgentOrchestrator.subscribeTasks((updatedTask) => {
      if (activeTask && activeTask.id === updatedTask.id) {
        setActiveTask(updatedTask);
        if (updatedTask.pendingApproval) {
          setPendingApproval(updatedTask.pendingApproval);
          setIsApprovalModalOpen(true);
        }
      }
    });
    return unsubscribe;
  }, [activeTask]);

  // Scroll logs to bottom
  useEffect(() => {
    if (activeTab === "logs") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTask?.logs, activeTab]);

  const handleStartWorkflow = async (customPrompt?: string) => {
    const textPrompt = customPrompt || prompt;
    if (!textPrompt.trim()) {
      showToast("Please enter a prompt or select a template.", "error");
      return;
    }

    try {
      showToast("Agent Orchestrator initialized...", "info");
      if (addTerminalLog) {
        addTerminalLog("system", `Agent Orchestrator: Planning autonomous multi-step workflow for "${textPrompt.slice(0, 50)}..."`);
      }

      const task = await AgentOrchestrator.createWorkflow({
        userPrompt: textPrompt,
        network: selectedNetwork,
        isDemoMode,
        walletAddress
      });

      setActiveTask(task);
      setActiveTab("workflow");

      // Auto-start execution loop
      AgentOrchestrator.runWorkflow(task.id, {
        walletAddress,
        onApprovalRequired: (approval) => {
          setPendingApproval(approval);
          setIsApprovalModalOpen(true);
          if (addTerminalLog) {
            addTerminalLog("info", `Human-in-the-Loop: Awaiting wallet transaction approval for ${approval.contractName}.`);
          }
        }
      });
    } catch (err: any) {
      showToast(err.message || "Failed to start workflow", "error");
    }
  };

  const handleApprove = async () => {
    if (!activeTask) return;
    setIsApprovalModalOpen(false);
    showToast("Transaction approved! Broadcasting to Base...", "success");
    if (addTerminalLog) {
      addTerminalLog("success", "Wallet confirmation signed. Deploying contract on-chain to Base.");
    }

    try {
      await AgentOrchestrator.approveTransaction(activeTask.id, walletAddress);
      showToast("Workflow completed on Base!", "success");
    } catch (err: any) {
      showToast(err.message || "Execution error", "error");
    }
  };

  const handleReject = () => {
    if (!activeTask) return;
    setIsApprovalModalOpen(false);
    AgentOrchestrator.rejectTransaction(activeTask.id);
    showToast("Transaction cancelled by user.", "info");
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Copied to clipboard!", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Flagship Header Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-brand-purple/40 shadow-2xl shadow-brand-purple/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand-purple/20 text-brand-purple border border-brand-purple/30 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Autonomous Multi-Step Agentic Platform
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Base Mainnet (8453) Ready
              </span>
              {isDemoMode && (
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  [DEMO / SIMULATED]
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Agentic Web3 Development Studio
            </h1>
            <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
              State-machine autonomous agents that plan, write Solidity code, run formal CEI security audits, request human wallet approval, and deploy directly to Base L2.
            </p>
          </div>

          {/* Controls & Memory Drawer Trigger */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => setIsProjectMemoryOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white flex items-center gap-2 transition"
            >
              <FolderGit2 className="w-4 h-4 text-brand-purple" />
              <span>Project Memory</span>
            </button>

            {/* Demo Mode Toggle */}
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`px-3.5 py-2.5 rounded-2xl border text-xs font-mono font-bold transition flex items-center gap-2 ${
                isDemoMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white"
              }`}
            >
              <span>Demo Mode:</span>
              <span className={isDemoMode ? "text-amber-400 font-extrabold" : "text-zinc-400"}>
                {isDemoMode ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Input Section */}
      <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Bot className="w-4 h-4 text-brand-purple" />
            Enter Web3 Natural Language Directive
          </label>

          {/* Network Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">Network:</span>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-purple"
            >
              <option value="base-mainnet">Base Mainnet (8453)</option>
              <option value="base-sepolia">Base Sepolia (84532)</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what to build on Base (e.g. 'Deploy an ERC-20 token named Agunnaya Coin with 5M supply and an on-chain fee split')..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-brand-purple transition resize-none custom-scrollbar"
          />

          <button
            onClick={() => handleStartWorkflow()}
            disabled={!prompt.trim() || activeTask?.status === "RUNNING" || activeTask?.status === "PLANNING"}
            className="absolute bottom-4 right-4 px-5 py-2.5 rounded-xl font-bold text-xs bg-brand-purple hover:bg-brand-purple/90 text-white shadow-lg shadow-brand-purple/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
          >
            {activeTask?.status === "RUNNING" || activeTask?.status === "PLANNING" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Agent Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Autonomous Agent</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Workflow Launchers */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
            Or launch pre-architected agentic workflows:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TEMPLATE_PROMPTS.map((tmpl, idx) => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(tmpl.prompt);
                    handleStartWorkflow(tmpl.prompt);
                  }}
                  className={`p-3.5 rounded-2xl border text-left bg-gradient-to-br ${tmpl.color} hover:scale-[1.02] transition duration-200 flex flex-col justify-between gap-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold opacity-80">
                      {tmpl.badge}
                    </span>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-white leading-snug">
                    {tmpl.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Task Workspace */}
      {activeTask && (
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
          {/* Active Task Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    activeTask.status === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : activeTask.status === "WAITING_FOR_APPROVAL"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      : activeTask.status === "FAILED"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-brand-purple/20 text-brand-purple border border-brand-purple/30 animate-pulse"
                  }`}
                >
                  {activeTask.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Responsible: <strong className="text-white">{activeTask.responsibleAgent}</strong>
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">{activeTask.title}</h3>
            </div>

            {/* Action Buttons if waiting for approval */}
            {activeTask.status === "WAITING_FOR_APPROVAL" && activeTask.pendingApproval && (
              <button
                onClick={() => setIsApprovalModalOpen(true)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-zinc-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 animate-bounce"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Review & Approve Transaction</span>
              </button>
            )}

            {activeTask.status === "COMPLETED" && activeTask.result?.explorerUrl && (
              <a
                href={activeTask.result.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center gap-1.5 transition"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Workflow Progress: {activeTask.progress}%</span>
              <span>
                Step {Math.min(activeTask.currentStepIndex + 1, activeTask.steps.length)} of {activeTask.steps.length}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-brand-purple to-emerald-400 transition-all duration-500 ease-out"
                style={{ width: `${activeTask.progress}%` }}
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("workflow")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === "workflow"
                  ? "border-brand-purple text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Execution Steps ({activeTask.steps.length})</span>
            </button>

            {activeTask.result?.solidityCode && (
              <button
                onClick={() => setActiveTab("code")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeTab === "code"
                    ? "border-brand-purple text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Solidity Code</span>
              </button>
            )}

            {activeTask.result?.securityReport && (
              <button
                onClick={() => setActiveTab("security")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeTab === "security"
                    ? "border-brand-purple text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Security Audit</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === "logs"
                  ? "border-brand-purple text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Real-Time Logs ({activeTask.logs.length})</span>
            </button>
          </div>

          {/* Tab 1: Execution Steps Visualizer */}
          {activeTab === "workflow" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {activeTask.steps.map((step, idx) => (
                  <AgentStepCard
                    key={step.id}
                    step={step}
                    index={idx}
                    isActive={idx === activeTask.currentStepIndex && activeTask.status === "RUNNING"}
                  />
                ))}
              </div>

              {/* Final Summary Card on Completion */}
              {activeTask.status === "COMPLETED" && activeTask.result && (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Autonomous Workflow Completed Successfully!</span>
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed">
                    {activeTask.result.summary}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Contract Address on Base
                      </span>
                      <div className="flex items-center justify-between font-mono text-xs font-bold text-white">
                        <span className="truncate max-w-[240px]">
                          {activeTask.result.contractAddress}
                        </span>
                        <button
                          onClick={() => copyToClipboard(activeTask.result!.contractAddress!, "res_addr")}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          {copiedKey === "res_addr" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Transaction Hash
                      </span>
                      <div className="flex items-center justify-between font-mono text-xs font-bold text-zinc-300">
                        <span className="truncate max-w-[240px]">
                          {activeTask.result.txHash}
                        </span>
                        <a
                          href={activeTask.result.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Solidity Code Viewer */}
          {activeTab === "code" && activeTask.result?.solidityCode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">
                  Contract: <strong className="text-white">{activeTask.result.contractName}.sol</strong>
                </span>
                <button
                  onClick={() => copyToClipboard(activeTask.result!.solidityCode!, "sol_code")}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-white flex items-center gap-1.5 transition"
                >
                  {copiedKey === "sol_code" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Solidity</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-x-auto max-h-[500px] custom-scrollbar text-xs font-mono text-emerald-300">
                <pre>{activeTask.result.solidityCode}</pre>
              </div>
            </div>
          )}

          {/* Tab 3: Security Report */}
          {activeTab === "security" && (
            <AgentSecuritySummary report={activeTask.result?.securityReport || null} />
          )}

          {/* Tab 4: Real-Time Terminal Logs */}
          {activeTab === "logs" && (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-xs space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {activeTask.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-zinc-400 shrink-0 text-[11px]">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="text-brand-purple font-semibold shrink-0">
                    [{log.agent}]:
                  </span>
                  <span
                    className={
                      log.type === "error"
                        ? "text-rose-400"
                        : log.type === "success"
                        ? "text-emerald-400"
                        : log.type === "approval"
                        ? "text-amber-300"
                        : "text-zinc-300"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Human-in-the-Loop Approval Modal */}
      <AgentApprovalModal
        isOpen={isApprovalModalOpen}
        approval={pendingApproval}
        onApprove={handleApprove}
        onReject={handleReject}
        isSimulated={activeTask?.isDemoMode}
      />

      {/* Project Memory Drawer */}
      <AgentProjectMemoryDrawer
        isOpen={isProjectMemoryOpen}
        onClose={() => setIsProjectMemoryOpen(false)}
        showToast={showToast}
      />
    </div>
  );
}
