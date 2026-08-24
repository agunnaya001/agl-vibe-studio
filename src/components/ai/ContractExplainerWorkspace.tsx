import React, { useState } from "react";
import { 
  BrainCircuit, 
  Search, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  HelpCircle, 
  Send, 
  RefreshCw, 
  Code2, 
  Radio, 
  Layers, 
  Zap, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  MessageSquare
} from "lucide-react";
import { 
  ContractExplanationReport, 
  NetworkKey, 
  SUPPORTED_NETWORKS 
} from "../../types/aiSuite";
import { AIService } from "../../lib/aiSuiteService";

const POPULAR_CONTRACTS = [
  {
    name: "Base Native USDC (Circle)",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    network: "base-mainnet" as NetworkKey
  },
  {
    name: "AGL Token (Agunnaya Labs)",
    address: "0x3F8a1B92003c20058bA524d4eAc32204c3D66F48",
    network: "base-mainnet" as NetworkKey
  },
  {
    name: "Uniswap V3 SwapRouter02 (Base)",
    address: "0x2626664c2603336E57B271c5C0b26F421741e481",
    network: "base-mainnet" as NetworkKey
  }
];

interface ContractExplainerProps {
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
  selectedNetwork?: NetworkKey;
}

export default function ContractExplainerWorkspace({
  showToast,
  selectedNetwork = "base-mainnet"
}: ContractExplainerProps) {
  const [address, setAddress] = useState<string>(POPULAR_CONTRACTS[0].address);
  const [network, setNetwork] = useState<NetworkKey>(selectedNetwork);
  const [solidityCode, setSolidityCode] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [report, setReport] = useState<ContractExplanationReport | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "functions" | "events" | "state" | "qa">("overview");
  
  // Interactive Q&A Assistant state
  const [qaInput, setQaInput] = useState<string>("");
  const [isAskingQa, setIsAskingQa] = useState<boolean>(false);
  const [qaHistory, setQaHistory] = useState<{ question: string; answer: string; timestamp: number }[]>([]);

  // Explain contract
  const handleExplainContract = async () => {
    if (!address.trim() && !solidityCode.trim()) {
      showToast?.("Enter a contract address or paste Solidity code", "error");
      return;
    }

    setIsExplaining(true);
    setReport(null);
    setQaHistory([]);

    try {
      showToast?.(`Deconstructing smart contract on ${SUPPORTED_NETWORKS[network].name}...`, "info");
      const result = await AIService.explainContract({
        address: address.trim() || undefined,
        solidityCode: solidityCode.trim() || undefined,
        network,
      });

      setReport(result);
      showToast?.(`Explained ${result.contractName}: ${result.functions.length} functions, ${result.events.length} events!`, "success");
    } catch (err: any) {
      showToast?.(err.message || "Failed to analyze contract", "error");
    } finally {
      setIsExplaining(false);
    }
  };

  // Ask interactive question
  const handleAskQuestion = async (customQ?: string) => {
    const question = customQ || qaInput;
    if (!report || !question.trim()) return;

    setIsAskingQa(true);
    try {
      const answer = await AIService.askContractQuestion({
        question: question.trim(),
        report,
        network,
      });

      setQaHistory((prev) => [
        ...prev,
        { question: question.trim(), answer, timestamp: Date.now() }
      ]);
      setQaInput("");
    } catch (err: any) {
      showToast?.(err.message || "Failed to get answer", "error");
    } finally {
      setIsAskingQa(false);
    }
  };

  return (
    <div id="ai-contract-explainer-workspace" className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/80 border border-brand-purple/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-brand-purple/20 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/10">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide font-display">AGL Contract Explainer</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Contract Intelligence Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Instant breakdown of any EVM contract: functions, permissions, events, state changes & interactive Q&A
            </p>
          </div>
        </div>

        {/* Network Selector */}
        <div className="flex items-center gap-2">
          <select
            id="explainer-network-select"
            value={network}
            onChange={(e) => setNetwork(e.target.value as NetworkKey)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-200 font-mono focus:outline-none focus:border-brand-purple"
          >
            {Object.values(SUPPORTED_NETWORKS).map((n) => (
              <option key={n.key} value={n.key}>
                {n.name} ({n.chainId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Query Bar & Presets */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              id="explainer-address-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter contract address (0x...)"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-brand-purple"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          </div>

          <button
            id="btn-explain-contract"
            onClick={handleExplainContract}
            disabled={isExplaining || (!address.trim() && !solidityCode.trim())}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-brand-purple hover:from-blue-500 hover:to-brand-purple/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExplaining ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing ABI & Bytecode...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Explain Contract</span>
              </>
            )}
          </button>
        </div>

        {/* Popular Contracts Quick Selection */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 text-[11px]">Popular Contracts on Base:</span>
          {POPULAR_CONTRACTS.map((c) => (
            <button
              key={c.name}
              onClick={() => {
                setAddress(c.address);
                setNetwork(c.network);
                showToast?.(`Selected ${c.name}`, "info");
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-[11px] text-zinc-300 font-mono transition-all"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results View */}
      {isExplaining && (
        <div className="p-12 rounded-2xl bg-zinc-950/60 border border-blue-500/30 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
          <div className="p-4 rounded-2xl bg-blue-500/20 text-blue-400 animate-spin">
            <RefreshCw className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">Deconstructing Smart Contract Architecture</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Extracting function signatures, state variables, access control modifiers, and safety rules...
            </p>
          </div>
        </div>
      )}

      {report && !isExplaining && (
        <div className="p-6 rounded-2xl bg-zinc-950/90 border border-white/10 space-y-6">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{report.contractName}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-mono">
                  {SUPPORTED_NETWORKS[report.network]?.name || report.network}
                </span>
                {report.overview.isUpgradable && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-mono">
                    Proxy ({report.overview.proxyType || "Upgradable"})
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{report.address}</p>
            </div>

            {/* Quick Security Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                report.securityHighlights.hasMintCapability ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                Mint: {report.securityHighlights.hasMintCapability ? "YES" : "NO"}
              </span>
              <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                report.securityHighlights.hasPauseCapability ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-zinc-900 text-zinc-400 border-white/10"
              }`}>
                Pausable: {report.securityHighlights.hasPauseCapability ? "YES" : "NO"}
              </span>
              <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                report.securityHighlights.hasBlacklist ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-zinc-900 text-zinc-400 border-white/10"
              }`}>
                Blacklist: {report.securityHighlights.hasBlacklist ? "YES" : "NO"}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-white/5 pb-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "overview" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Contract Overview
            </button>
            <button
              onClick={() => setActiveTab("functions")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "functions" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Functions ({report.functions.length})
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "events" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Events ({report.events.length})
            </button>
            <button
              onClick={() => setActiveTab("state")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "state" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              State Storage ({report.stateVariables.length})
            </button>
            <button
              onClick={() => setActiveTab("qa")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "qa" ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask Assistant
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                <span className="font-bold text-white block">What this contract does:</span>
                <p className="text-zinc-300 leading-relaxed">{report.overview.whatItDoes}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <span className="font-bold text-blue-400">Core Purpose:</span>
                  <p className="text-zinc-300">{report.overview.purpose}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <span className="font-bold text-brand-purple">Ownership & Roles:</span>
                  <p className="text-zinc-300">{report.overview.ownershipStructure}</p>
                </div>
              </div>

              {/* FAQ Prompts */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-brand-purple/20 space-y-2">
                <span className="font-bold text-zinc-200">Recommended Questions to Ask:</span>
                <div className="flex flex-wrap gap-2">
                  {report.faqSuggestions.map((faq, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveTab("qa");
                        handleAskQuestion(faq);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-brand-purple/20 border border-white/10 hover:border-brand-purple/40 text-zinc-300 text-xs transition-all"
                    >
                      💬 {faq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FUNCTIONS */}
          {activeTab === "functions" && (
            <div className="space-y-3">
              {report.functions.map((fn, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-white">{fn.name}</span>
                      <span className="text-zinc-500">({fn.signature})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-zinc-300">
                        {fn.visibility}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-400">
                        {fn.mutability}
                      </span>
                      {fn.isPayable && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400">
                          payable
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1">
                    <div>
                      <span className="text-zinc-500 block">State Changes:</span>
                      <span className="text-zinc-300">{fn.stateChanges}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Required Permissions:</span>
                      <span className="text-zinc-300">{fn.requiredPermissions}</span>
                    </div>
                  </div>

                  {fn.potentialRisks && fn.potentialRisks !== "None" && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                      ⚠️ Potential Risk: {fn.potentialRisks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: EVENTS */}
          {activeTab === "events" && (
            <div className="space-y-3">
              {report.events.map((ev, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-emerald-400">event {ev.name}</span>
                    <span className="text-[10px] text-zinc-500">{ev.parameters.length} indexed parameters</span>
                  </div>
                  <p className="text-zinc-300 text-[11px]">{ev.purpose}</p>
                  <span className="text-zinc-500 text-[10px] block">Trigger Condition: {ev.triggerCondition}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: STATE VARIABLES */}
          {activeTab === "state" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.stateVariables.map((st, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-white">{st.name}</span>
                    <span className="text-zinc-400 text-[10px]">{st.type}</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">{st.purpose}</p>
                  <span className="text-zinc-500 text-[10px] font-mono">{st.visibility} • {st.mutability}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: ASK ASSISTANT Q&A */}
          {activeTab === "qa" && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {qaHistory.length === 0 ? (
                  <div className="p-6 rounded-xl bg-zinc-900/40 border border-dashed border-white/10 text-center text-xs text-zinc-400">
                    Ask any question about this contract (e.g. "How do I stake?", "Who owns this contract?", "Can owner mint more tokens?").
                  </div>
                ) : (
                  qaHistory.map((item, idx) => (
                    <div key={idx} className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-white font-semibold flex items-center gap-2">
                        <span>💬</span>
                        <span>{item.question}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-200 leading-relaxed">
                        {item.answer}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                  placeholder="Ask a question about this contract..."
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
                />
                <button
                  onClick={() => handleAskQuestion()}
                  disabled={isAskingQa || !qaInput.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isAskingQa ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
