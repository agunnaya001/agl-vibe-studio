import React, { useState } from "react";
import { 
  Zap, 
  Sparkles, 
  Layers, 
  FolderTree, 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Send, 
  RefreshCw, 
  Rocket, 
  CheckCircle2, 
  Code2, 
  Cpu, 
  Database, 
  Globe, 
  ExternalLink,
  MessageSquare,
  FileCheck
} from "lucide-react";
import { 
  GeneratedDAppProject, 
  GeneratedFile, 
  NetworkKey, 
  SUPPORTED_NETWORKS 
} from "../../types/aiSuite";
import { AIService } from "../../lib/aiSuiteService";

const DAPP_PRESETS = [
  {
    title: "AGL Staking & Yield Vault",
    prompt: "Build a high-yield staking dApp on Base where users stake AGL tokens to earn compound reward yield, featuring an automated reward distributor, emergency unstaking, and an APY multiplier based on lockup duration."
  },
  {
    title: "Bonding Curve Token Launchpad",
    prompt: "Create an autonomous bonding curve token launchpad on Base where creators launch fair-launch meme/utility tokens with zero upfront liquidity, dynamic linear buy/sell pricing, and automatic graduation to Uniswap."
  },
  {
    title: "DAO Governance & Quadratic Voting",
    prompt: "Build a full-featured DAO voting dApp on Base where token holders propose on-chain governance actions, vote using quadratic voting, and automatically execute timelocked treasury transactions."
  },
  {
    title: "Decentralized Prediction Market",
    prompt: "Build a binary prediction market dApp on Base where users buy YES/NO outcome shares on crypto/tech events with automated market maker pricing, oracle resolution, and instant payout claiming."
  }
];

interface DAppGeneratorProps {
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
  selectedNetwork?: NetworkKey;
  onNavigateTab?: (tab: string) => void;
}

export default function DAppGeneratorWorkspace({
  showToast,
  selectedNetwork = "base-mainnet",
  onNavigateTab
}: DAppGeneratorProps) {
  const [prompt, setPrompt] = useState<string>(DAPP_PRESETS[0].prompt);
  const [network, setNetwork] = useState<NetworkKey>(selectedNetwork);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isIterating, setIsIterating] = useState<boolean>(false);
  const [project, setProject] = useState<GeneratedDAppProject | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"code" | "architecture" | "deployment" | "chat">("code");
  const [chatMessage, setChatMessage] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Generate initial dApp project
  const handleGenerateDApp = async () => {
    if (!prompt.trim()) {
      showToast?.("Please enter a description for your dApp", "error");
      return;
    }

    setIsGenerating(true);
    setProject(null);

    try {
      showToast?.("Gemini 3.7 synthesizing full-stack dApp architecture...", "info");
      const generated = await AIService.generateDApp({
        prompt: prompt.trim(),
        network,
      });

      setProject(generated);
      if (generated.files.length > 0) {
        setSelectedFilePath(generated.files[0].path);
      }
      showToast?.(`Generated full-stack dApp: ${generated.title} with ${generated.files.length} files!`, "success");
    } catch (err: any) {
      showToast?.(err.message || "Failed to generate dApp project", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Conversational Iteration
  const handleIterateDApp = async (customInstruction?: string) => {
    const instruction = customInstruction || chatMessage;
    if (!project || !instruction.trim()) return;

    setIsIterating(true);
    try {
      showToast?.(`Applying modification: "${instruction}"...`, "info");
      const updated = await AIService.iterateDApp({
        project,
        userModification: instruction.trim(),
      });

      setProject(updated);
      setChatMessage("");
      showToast?.("Project successfully updated!", "success");
    } catch (err: any) {
      showToast?.(err.message || "Failed to modify project", "error");
    } finally {
      setIsIterating(false);
    }
  };

  // Currently selected file
  const selectedFile = project?.files.find(f => f.path === selectedFilePath) || project?.files[0];

  // Download all files as a bundled file / script
  const handleDownloadProject = () => {
    if (!project) return;
    const bundleText = project.files.map(f => `// =========================================================================\n// File: ${f.path} (${f.language})\n// Description: ${f.description}\n// =========================================================================\n\n${f.content}\n\n`).join("\n");
    const blob = new Blob([bundleText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-agl-project.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.("Project files downloaded successfully!", "success");
  };

  return (
    <div id="ai-dapp-generator-workspace" className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/80 border border-brand-purple/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-brand-purple/20 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide font-display">AGL dApp Generator</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Natural Language → Full-Stack Web3
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Generates complete Solidity contracts, unit tests, React frontends, and Base deployment scripts with conversational refinement
            </p>
          </div>
        </div>

        {/* Network Selector */}
        <div className="flex items-center gap-2">
          <select
            id="dapp-network-select"
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

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompt Input & Presets */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                Describe Your dApp
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Base L2 Native</span>
            </div>

            <textarea
              id="dapp-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="e.g. Build a staking dApp on Base where users stake AGL and earn rewards with lockup multipliers..."
              className="w-full p-3 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple resize-none"
            />

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-400 block">Or Choose a Blueprint:</span>
              <div className="grid grid-cols-1 gap-1.5">
                {DAPP_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    onClick={() => {
                      setPrompt(preset.prompt);
                      showToast?.(`Selected "${preset.title}"`, "info");
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-brand-purple/30 text-left text-xs transition-all"
                  >
                    <span className="font-semibold text-zinc-200 block">{preset.title}</span>
                    <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{preset.prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              id="btn-generate-dapp"
              onClick={handleGenerateDApp}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-brand-purple hover:from-amber-400 hover:to-brand-purple/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Full Project Architecture...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Generate Full dApp Project</span>
                </>
              )}
            </button>
          </div>

          {/* Conversational Modifier Box (Active when project generated) */}
          {project && (
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-brand-purple/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MessageSquare className="w-4 h-4 text-brand-purple" />
                <span>Conversational Project Iteration</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Modify only specific components without breaking existing working contracts.
              </p>

              {/* Quick Modification Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Add a leaderboard",
                  "Change reward token to AGL",
                  "Add NFT staking",
                  "Add Base Sepolia testing",
                  "Add emergency pause"
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleIterateDApp(chip)}
                    disabled={isIterating}
                    className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-[10px] text-zinc-300 transition-all disabled:opacity-50"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleIterateDApp()}
                  placeholder="e.g. Add an APY boost for 30-day locks..."
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
                />
                <button
                  onClick={() => handleIterateDApp()}
                  disabled={isIterating || !chatMessage.trim()}
                  className="px-3 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isIterating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-File Explorer & Project Viewer */}
        <div className="lg:col-span-8 space-y-4">
          {!project && !isGenerating && (
            <div className="h-full min-h-[500px] p-8 rounded-2xl bg-zinc-950/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <FolderTree className="w-12 h-12" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-white">Full-Stack dApp Generator Ready</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enter your prompt or select a blueprint on the left. Gemini will generate complete Solidity contracts, unit tests, React frontends, and Base deployment scripts.
                </p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="h-full min-h-[500px] p-8 rounded-2xl bg-zinc-950/60 border border-amber-500/30 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
              <div className="p-4 rounded-2xl bg-amber-500/20 text-amber-400 animate-spin">
                <RefreshCw className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Generating Multi-Tier Web3 Application</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Writing OpenZeppelin smart contracts, hardhat deployment scripts, and responsive React/Tailwind frontend components...
                </p>
              </div>
            </div>
          )}

          {project && !isGenerating && (
            <div className="p-5 rounded-2xl bg-zinc-950/90 border border-white/10 space-y-4">
              {/* Project Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{project.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-purple/20 text-brand-purple font-mono font-bold">
                      {project.files.length} Files
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{project.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-download-dapp-bundle"
                    onClick={handleDownloadProject}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    Download Bundle
                  </button>

                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("token-factory")}
                      className="px-3 py-1.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      Launch in Token Factory
                    </button>
                  )}
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex gap-2 border-b border-white/5 pb-2">
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "code" ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Source Files ({project.files.length})
                </button>
                <button
                  onClick={() => setActiveTab("architecture")}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "architecture" ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Architecture Specs
                </button>
                <button
                  onClick={() => setActiveTab("deployment")}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "deployment" ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Rocket className="w-3.5 h-3.5" />
                  Base Deploy Guide
                </button>
              </div>

              {/* Tab 1: Source Files & Code Viewer */}
              {activeTab === "code" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* File Tree */}
                  <div className="md:col-span-4 p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold font-mono text-zinc-500 px-2 block mb-2">
                      Project Files
                    </span>
                    {project.files.map((file) => {
                      const isSelected = file.path === selectedFile?.path;
                      return (
                        <button
                          key={file.path}
                          onClick={() => setSelectedFilePath(file.path)}
                          className={`w-full p-2 rounded-lg text-left text-xs font-mono flex items-center gap-2 transition-all ${
                            isSelected ? "bg-brand-purple/20 text-brand-purple font-bold border border-brand-purple/30" : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <FileCode className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{file.filename}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Code Editor Preview */}
                  <div className="md:col-span-8 space-y-2">
                    {selectedFile && (
                      <div>
                        <div className="flex items-center justify-between p-2.5 rounded-t-xl bg-zinc-900 border-t border-x border-white/10 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-white font-semibold truncate">{selectedFile.path}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-zinc-300 font-mono">
                              {selectedFile.language}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedFile.content);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 flex items-center gap-1 transition-all"
                          >
                            {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            Copy File
                          </button>
                        </div>

                        <pre className="p-4 rounded-b-xl bg-zinc-950 border border-white/10 font-mono text-xs text-zinc-200 leading-relaxed overflow-x-auto max-h-[420px] overflow-y-auto">
                          {selectedFile.content}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Architecture Specs */}
              {activeTab === "architecture" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                    <span className="font-bold text-brand-purple flex items-center gap-1.5">
                      <Globe className="w-4 h-4" /> Frontend Architecture
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{project.architecture.frontend}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" /> Smart Contract Hierarchy
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{project.architecture.smartContracts}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Database className="w-4 h-4" /> Blockchain Indexing & Events
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{project.architecture.blockchainIndexing}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" /> Authentication & Security
                    </span>
                    <p className="text-zinc-300 leading-relaxed">{project.architecture.authentication}</p>
                  </div>
                </div>
              )}

              {/* Tab 3: Base Deployment Guide */}
              {activeTab === "deployment" && (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-3 text-xs">
                  <span className="font-bold text-white block">Step-by-Step Base Deployment Guide</span>
                  <div className="space-y-2">
                    {project.deployInstructions.map((instruction, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-950 border border-white/5">
                        <span className="px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple font-mono font-bold text-[10px]">
                          Step {idx + 1}
                        </span>
                        <span className="text-zinc-300 font-mono text-[11px]">{instruction}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
