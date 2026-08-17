import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Plus,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles,
  Zap,
  Info,
  Loader2,
  FileSpreadsheet,
  CheckCheck,
  Fuel,
  RefreshCw,
  Terminal,
  Clock,
  ArrowRight
} from "lucide-react";
import { WalletState } from "../types";
import { createTokenOnChain, TOKEN_FACTORY_ADDRESS } from "../lib/tokenFactory";

export interface BatchTokenItem {
  id: string;
  name: string;
  symbol: string;
  supply?: string;
  category?: string;
  description?: string;
  status: "pending" | "ready" | "invalid" | "deploying" | "success" | "error" | "skipped";
  errorMessage?: string;
  txHash?: string;
  contractAddress?: string;
  deployDurationMs?: number;
  createdAt: number;
}

interface BatchTokenDeployerProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onOpenConnectWallet: () => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", text: string) => void;
  onRefreshFactoryList?: () => void;
  onSelectAuditToken?: (address: string, name?: string) => void;
  onSelectVerifyToken?: (address: string, name?: string, symbol?: string) => void;
}

const DEMO_CSV_PROJECTS = `TokenName,TokenSymbol,InitialSupply,Category,Description
CyberPulse AI,CYBER,10000000,AI & Data,Autonomous compute token for decentralized AI models
QuantumDex Hub,QDEX,50000000,DeFi,Next-gen hybrid liquidity AMM routing token on Base
BasePanda Meme,BPAN,1000000000,Memes,Community-driven community reward coin on Base L2
AeroNova Protocol,AERO,25000000,Infrastructure,High throughput cross-chain payload relayer
NeuralVault DAO,NVAULT,1000000,Governance,Autonomous treasury & yield staking governance asset`;

export default function BatchTokenDeployer({
  wallet,
  showToast,
  onOpenConnectWallet,
  addTerminalLog,
  onRefreshFactoryList,
  onSelectAuditToken,
  onSelectVerifyToken
}: BatchTokenDeployerProps) {
  // Input State
  const [csvText, setCsvText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queue State
  const [tokenQueue, setTokenQueue] = useState<BatchTokenItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemSymbol, setNewItemSymbol] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("DeFi");

  // Execution State
  const [executionMode, setExecutionMode] = useState<"simulated" | "live">("simulated");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  // Filter & View State
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Parse raw text or CSV into TokenQueue items
  const parseCsvIntoQueue = (raw: string, append: boolean = false) => {
    if (!raw.trim()) {
      showToast("CSV input is empty.", "info");
      return;
    }

    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const parsedItems: BatchTokenItem[] = [];
    let startIdx = 0;

    // Check if first line is a header
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes("tokenname") || 
      firstLineLower.includes("name") || 
      firstLineLower.includes("symbol") ||
      firstLineLower.includes("token_name")
    ) {
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      // Support comma or semicolon or tab
      const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length === 0 || !cols[0]) continue;

      const name = cols[0] || "";
      let symbol = (cols[1] || "").toUpperCase();
      const supply = cols[2] || "1,000,000";
      const category = cols[3] || "General";
      const description = cols[4] || "";

      // Fallback symbol derivation if only name is provided
      if (!symbol && name) {
        symbol = name
          .split(/\s+/)
          .map(w => w[0])
          .join("")
          .slice(0, 6)
          .toUpperCase() || "TKN";
      }

      const isValid = name.length >= 2 && symbol.length >= 2 && symbol.length <= 11;

      parsedItems.push({
        id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        symbol,
        supply,
        category,
        description,
        status: isValid ? "ready" : "invalid",
        errorMessage: !isValid ? "Invalid name (<2 chars) or symbol (<2 or >10 chars)" : undefined,
        createdAt: Date.now()
      });
    }

    if (parsedItems.length === 0) {
      showToast("No valid token entries could be parsed from input.", "error");
      return;
    }

    setTokenQueue(prev => append ? [...prev, ...parsedItems] : parsedItems);
    showToast(`Successfully imported and queued ${parsedItems.length} token(s)!`, "success");
    if (addTerminalLog) {
      addTerminalLog("info", `[BatchDeployer] Parsed ${parsedItems.length} tokens into deployment queue.`);
    }
  };

  // Handle Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvText(text);
        parseCsvIntoQueue(text, false);
      }
    };
    reader.readAsText(file);
  };

  // Add individual item to queue
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemSymbol.trim()) {
      showToast("Please enter both a Token Name and Symbol.", "error");
      return;
    }

    const cleanSymbol = newItemSymbol.trim().toUpperCase();
    const cleanName = newItemName.trim();
    const isValid = cleanName.length >= 2 && cleanSymbol.length >= 2 && cleanSymbol.length <= 11;

    const newItem: BatchTokenItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      symbol: cleanSymbol,
      category: newItemCategory,
      supply: "1,000,000",
      status: isValid ? "ready" : "invalid",
      errorMessage: !isValid ? "Symbol must be 2-10 characters." : undefined,
      createdAt: Date.now()
    };

    setTokenQueue(prev => [...prev, newItem]);
    setNewItemName("");
    setNewItemSymbol("");
    showToast(`Added ${cleanName} ($${cleanSymbol}) to batch queue!`, "success");
  };

  // Remove item from queue
  const handleRemoveItem = (id: string) => {
    setTokenQueue(prev => prev.filter(item => item.id !== id));
  };

  // Clear entire queue
  const handleClearQueue = () => {
    if (isDeploying) {
      showToast("Cannot clear queue while deployment is running.", "error");
      return;
    }
    setTokenQueue([]);
    setCsvText("");
    setCurrentIndex(-1);
    showToast("Batch deployment queue cleared.", "info");
  };

  // Helper copy to clipboard
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [key]: false }));
    }, 2000);
    showToast("Copied to clipboard!", "success");
  };

  // Deterministic address generation for simulated rollout
  const generateSimulatedContractAddress = (name: string, symbol: string, index: number) => {
    let hash = 0;
    const combined = `0xBaseMainnet_${name}_${symbol}_${index}_${Date.now()}`;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    const tail = Math.random().toString(16).substring(2, 34);
    return `0x${hex}${tail}`.toLowerCase().slice(0, 42);
  };

  const generateSimulatedTxHash = (index: number) => {
    const p1 = Math.random().toString(16).substring(2, 18);
    const p2 = Math.random().toString(16).substring(2, 18);
    const p3 = Math.random().toString(16).substring(2, 18);
    const p4 = Math.random().toString(16).substring(2, 18);
    return `0x${p1}${p2}${p3}${p4}`;
  };

  // Batch Execution Engine
  const executeBatchDeployment = async () => {
    const readyItems = tokenQueue.filter(item => item.status === "ready" || item.status === "error" || item.status === "pending");
    
    if (readyItems.length === 0) {
      showToast("No valid tokens found in the queue to deploy.", "error");
      return;
    }

    if (executionMode === "live" && !wallet.isConnected) {
      showToast("Please connect your Web3 wallet to execute on-chain batch deployment.", "info");
      onOpenConnectWallet();
      return;
    }

    setIsDeploying(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    if (addTerminalLog) {
      addTerminalLog("system", `[BatchDeployer] Starting ${executionMode.toUpperCase()} batch deployment for ${readyItems.length} token(s)...`);
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < tokenQueue.length; i++) {
      if (isCancelledRef.current) {
        if (addTerminalLog) addTerminalLog("info", "[BatchDeployer] Batch deployment cancelled by user.");
        break;
      }

      // Check pause
      while (isPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (isCancelledRef.current) break;
      }

      const item = tokenQueue[i];
      if (item.status === "success") {
        continue; // skip already deployed
      }

      if (item.status === "invalid") {
        continue; // skip invalid
      }

      setCurrentIndex(i);

      // Set status to deploying
      setTokenQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: "deploying" } : q));

      const startTime = Date.now();
      if (addTerminalLog) {
        addTerminalLog("info", `[BatchDeployer] (${i + 1}/${tokenQueue.length}) Deploying "${item.name}" ($${item.symbol}) on Base Mainnet...`);
      }

      try {
        if (executionMode === "live") {
          // Live on-chain invocation
          const result = await createTokenOnChain(item.name, item.symbol);
          const duration = Date.now() - startTime;

          setTokenQueue(prev => prev.map((q, idx) => idx === i ? {
            ...q,
            status: "success",
            contractAddress: result.newTokenAddress,
            txHash: result.txHash,
            deployDurationMs: duration
          } : q));

          successCount++;
          if (addTerminalLog) {
            addTerminalLog("success", `[BatchDeployer] Deployed ${item.name}! Address: ${result.newTokenAddress} (Tx: ${result.txHash.slice(0, 10)}...) in ${(duration / 1000).toFixed(1)}s`);
          }
        } else {
          // High-speed Simulated Studio Pipeline (deterministic simulated deployment with 700ms realistic delay)
          await new Promise(resolve => setTimeout(resolve, 750));

          const simAddress = generateSimulatedContractAddress(item.name, item.symbol, i);
          const simTxHash = generateSimulatedTxHash(i);
          const duration = Date.now() - startTime;

          setTokenQueue(prev => prev.map((q, idx) => idx === i ? {
            ...q,
            status: "success",
            contractAddress: simAddress,
            txHash: simTxHash,
            deployDurationMs: duration
          } : q));

          successCount++;
          if (addTerminalLog) {
            addTerminalLog("success", `[BatchDeployer] [SIMULATED] Deployed ${item.name} ($${item.symbol}) -> Contract: ${simAddress} (Gas Sponsored)`);
          }
        }
      } catch (err: any) {
        console.error(`Batch deployment error on token ${item.name}:`, err);
        const errMsg = err?.message || "Transaction rejected or execution reverted.";
        failCount++;

        setTokenQueue(prev => prev.map((q, idx) => idx === i ? {
          ...q,
          status: "error",
          errorMessage: errMsg
        } : q));

        if (addTerminalLog) {
          addTerminalLog("error", `[BatchDeployer] Failed to deploy "${item.name}": ${errMsg}`);
        }
      }
    }

    setIsDeploying(false);
    setCurrentIndex(-1);

    if (onRefreshFactoryList) {
      onRefreshFactoryList();
    }

    if (successCount > 0) {
      showToast(`Batch deployment completed! ${successCount} token(s) launched successfully.`, "success");
    }
    if (failCount > 0) {
      showToast(`${failCount} token(s) failed or encountered errors.`, "error");
    }
  };

  // Toggle pause
  const handleTogglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    isPausedRef.current = next;
    showToast(next ? "Batch deployment paused." : "Resuming batch deployment...", "info");
  };

  // Cancel
  const handleCancelDeployment = () => {
    isCancelledRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    showToast("Stopping batch deployment after current task completes...", "info");
  };

  // Export Results as CSV
  const handleExportResultsCsv = () => {
    if (tokenQueue.length === 0) {
      showToast("No queue data to export.", "info");
      return;
    }

    const headers = ["ID", "TokenName", "TokenSymbol", "Category", "Supply", "Status", "ContractAddress", "TxHash", "ExecutionTimeMs", "Error"];
    const rows = tokenQueue.map(item => [
      `"${item.id}"`,
      `"${item.name}"`,
      `"${item.symbol}"`,
      `"${item.category || ""}"`,
      `"${item.supply || ""}"`,
      `"${item.status}"`,
      `"${item.contractAddress || ""}"`,
      `"${item.txHash || ""}"`,
      `"${item.deployDurationMs || 0}"`,
      `"${item.errorMessage || ""}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `agunnaya_batch_tokens_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Batch deployment CSV report downloaded!", "success");
  };

  // Export Results as JSON
  const handleExportResultsJson = () => {
    if (tokenQueue.length === 0) {
      showToast("No queue data to export.", "info");
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      factoryAddress: TOKEN_FACTORY_ADDRESS,
      chain: "Base Mainnet (8453)",
      totalQueued: tokenQueue.length,
      successful: tokenQueue.filter(t => t.status === "success").length,
      failed: tokenQueue.filter(t => t.status === "error").length,
      tokens: tokenQueue
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `agunnaya_batch_tokens_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Batch deployment JSON report exported!", "success");
  };

  // Filtered Queue
  const filteredQueue = tokenQueue.filter(item => {
    const matchesFilter = filterStatus === "all" || item.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      item.name.toLowerCase().includes(q) || 
      item.symbol.toLowerCase().includes(q) ||
      (item.contractAddress && item.contractAddress.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const totalTokens = tokenQueue.length;
  const successfulTokens = tokenQueue.filter(i => i.status === "success").length;
  const failedTokens = tokenQueue.filter(i => i.status === "error").length;
  const readyTokens = tokenQueue.filter(i => i.status === "ready" || i.status === "pending").length;
  const progressPercent = totalTokens > 0 ? Math.round((successfulTokens / totalTokens) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* SECTION HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-zinc-950 border border-blue-500/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <UploadCloud className="w-3 h-3 text-blue-400" />
                CSV Batch Engine
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                Automated Queue Pipeline
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Gas Optimized Base L2
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="w-7 h-7 text-[#0052FF]" />
              Batch Token Launchpad
            </h2>

            <p className="text-zinc-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              Upload token lists via CSV or paste raw comma-separated values to automatically queue and deploy multiple ERC20 tokens in a single streamlined session on Base Mainnet.
            </p>
          </div>

          {/* QUICK STATS PILLS */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-panel p-3 rounded-2xl border border-white/10 text-center min-w-[100px]">
              <span className="block text-[10px] uppercase font-bold text-zinc-500">In Queue</span>
              <span className="text-lg font-mono font-bold text-white">{totalTokens}</span>
            </div>
            <div className="glass-panel p-3 rounded-2xl border border-emerald-500/20 text-center min-w-[100px]">
              <span className="block text-[10px] uppercase font-bold text-emerald-400">Deployed</span>
              <span className="text-lg font-mono font-bold text-emerald-300">{successfulTokens}</span>
            </div>
            <div className="glass-panel p-3 rounded-2xl border border-blue-500/20 text-center min-w-[110px]">
              <span className="block text-[10px] uppercase font-bold text-blue-400">Est. Base Gas</span>
              <span className="text-lg font-mono font-bold text-blue-300">
                {readyTokens > 0 ? `~${(readyTokens * 0.00004).toFixed(4)} ETH` : "0 ETH"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP CONFIGURATION GRID: CSV DROPZONE & MANUAL ITEM INPUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CSV DRAG & DROP + TEXTAREA (7 COLS) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-white/10 space-y-4 bg-zinc-950/70 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold font-display text-white">1. Upload or Paste CSV Data</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCsvText(DEMO_CSV_PROJECTS);
                  parseCsvIntoQueue(DEMO_CSV_PROJECTS, false);
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-blue-400" />
                Load Demo CSV (5 Projects)
              </button>
              {csvText && (
                <button
                  type="button"
                  onClick={() => {
                    setCsvText("");
                  }}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-mono transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* DROP ZONE */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
              dragActive 
                ? "border-[#0052FF] bg-[#0052FF]/10" 
                : "border-white/10 hover:border-white/20 bg-zinc-900/40 hover:bg-zinc-900/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-300">
                Drag & drop your <span className="text-blue-400 font-mono">.csv</span> or <span className="text-purple-400 font-mono">.txt</span> file here, or click to browse
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">
                Format: <code className="text-zinc-400">TokenName, TokenSymbol, InitialSupply, Category, Description</code>
              </p>
            </div>
          </div>

          {/* TEXTAREA FOR DIRECT CSV INPUT */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 font-display flex items-center justify-between">
              <span>Direct CSV Content</span>
              <span className="text-[10px] text-zinc-500 font-mono">Header row is optional</span>
            </label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Example:\nCyberPulse AI, CYBER, 10000000, AI, Autonomous model\nQuantumDex, QDEX, 50000000, DeFi, Hybrid AMM\nBasePanda, BPAN, 1000000000, Meme, Community Coin`}
              className="w-full p-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#0052FF] leading-relaxed"
            />
          </div>

          {/* PARSE & QUEUE ACTION BUTTONS */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => parseCsvIntoQueue(csvText, false)}
                disabled={!csvText.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0052FF]/90 text-white font-bold text-xs font-display flex items-center gap-2 transition-all shadow-lg shadow-[#0052FF]/20 disabled:opacity-50 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Replace Queue with CSV</span>
              </button>
              <button
                type="button"
                onClick={() => parseCsvIntoQueue(csvText, true)}
                disabled={!csvText.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs font-display flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Append to Queue</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const sampleBlob = new Blob([DEMO_CSV_PROJECTS], { type: "text/csv" });
                const sampleUrl = URL.createObjectURL(sampleBlob);
                const a = document.createElement("a");
                a.href = sampleUrl;
                a.download = "sample_tokens_template.csv";
                a.click();
                URL.revokeObjectURL(sampleUrl);
                showToast("Sample CSV Template downloaded!", "info");
              }}
              className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-all"
            >
              <Download className="w-3 h-3" />
              <span>Get CSV Template</span>
            </button>
          </div>
        </div>

        {/* MANUAL ENTRY & DEPLOYMENT CONTROLLER (5 COLS) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/10 space-y-5 bg-zinc-950/70 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold font-display text-white">2. Add Single Token to Queue</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Manual Entry</span>
            </div>

            <form onSubmit={handleAddManualItem} className="space-y-3 pt-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 font-display">Token Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Apex Protocol"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#0052FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 font-display">Symbol</label>
                  <input
                    type="text"
                    value={newItemSymbol}
                    onChange={(e) => setNewItemSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. APEX"
                    maxLength={10}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs uppercase focus:outline-none focus:border-[#0052FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 font-display">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#0052FF]"
                  >
                    <option value="DeFi">DeFi</option>
                    <option value="AI & Data">AI & Data</option>
                    <option value="Memes">Memes</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Governance">Governance</option>
                    <option value="RWA">RWA</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!newItemName.trim() || !newItemSymbol.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs font-display flex items-center justify-center gap-1.5 transition-all border border-white/10 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Token to Batch Queue</span>
              </button>
            </form>
          </div>

          {/* EXECUTION MODE TOGGLE & LAUNCH CONTROL */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-display text-zinc-300 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                Deployment Pipeline Mode
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {executionMode === "simulated" ? "⚡ Sandbox Fast Execution" : "🌐 Live Web3 Contract Calls"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-950 border border-white/5">
              <button
                type="button"
                onClick={() => setExecutionMode("simulated")}
                className={`py-2 px-3 rounded-lg text-xs font-bold font-display transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  executionMode === "simulated"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulated Sandbox</span>
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode("live")}
                className={`py-2 px-3 rounded-lg text-xs font-bold font-display transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  executionMode === "live"
                    ? "bg-[#0052FF] text-white shadow-md shadow-[#0052FF]/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Live On-Chain (Base)</span>
              </button>
            </div>

            {/* MAIN LAUNCH / CONTROL BUTTONS */}
            <div className="flex items-center gap-2 pt-1">
              {!isDeploying ? (
                <button
                  type="button"
                  id="start-batch-deployment-btn"
                  onClick={executeBatchDeployment}
                  disabled={tokenQueue.length === 0 || readyTokens === 0}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-display flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch Batch ({readyTokens} Pending Tokens)</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="flex-1 py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs font-display flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-600/20 cursor-pointer"
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{isPaused ? "Resume" : "Pause"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelDeployment}
                    className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-display flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUEUE & DEPLOYMENT TABLE SECTION */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 bg-zinc-950/80 shadow-2xl">
        {/* TABLE HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display text-white">Batch Deployment Queue</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono font-bold text-xs border border-blue-500/20">
                  {tokenQueue.length} Total Item(s)
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Inspect deployment statuses, generated contracts, and transaction receipts on Base Mainnet.
              </p>
            </div>
          </div>

          {/* EXPORT & ACTION CONTROLS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportResultsCsv}
              disabled={tokenQueue.length === 0}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportResultsJson}
              disabled={tokenQueue.length === 0}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={handleClearQueue}
              disabled={tokenQueue.length === 0 || isDeploying}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-mono text-rose-300 hover:text-rose-200 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Queue</span>
            </button>
          </div>
        </div>

        {/* PROGRESS BAR IF DEPLOYING */}
        {(isDeploying || successfulTokens > 0) && (
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5">
                {isDeploying && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                <span>Progress: {successfulTokens} / {totalTokens} Deployed</span>
              </span>
              <span className="font-bold text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-950 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-[#0052FF] via-purple-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* FILTERS & SEARCH */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {["all", "ready", "deploying", "success", "error", "invalid"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-mono capitalize transition-all cursor-pointer ${
                  filterStatus === st
                    ? "bg-white/10 text-white font-bold border border-white/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {st} ({st === "all" ? tokenQueue.length : tokenQueue.filter(i => i.status === st).length})
              </button>
            ))}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queued tokens or addresses..."
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#0052FF] w-full md:w-64"
          />
        </div>

        {/* QUEUE TABLE */}
        {tokenQueue.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-white/5 space-y-3">
            <div className="p-3 rounded-full bg-zinc-800 text-zinc-400 w-12 h-12 mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold font-display text-white">Batch Queue is Empty</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Upload a CSV file, paste token data, or load the demo project preset above to begin queuing automated multi-token deployments.
            </p>
            <button
              type="button"
              onClick={() => {
                setCsvText(DEMO_CSV_PROJECTS);
                parseCsvIntoQueue(DEMO_CSV_PROJECTS, false);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-brand-purple/20 hover:bg-brand-purple/30 border border-brand-purple/40 text-purple-300 text-xs font-mono font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Load 5 Demo Tokens Now</span>
            </button>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900/20 text-zinc-400 text-xs font-mono">
            No queued tokens match filter "{filterStatus}".
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] font-bold border-b border-white/10">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Token Details</th>
                  <th className="p-3.5">Category & Supply</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Deployed Contract / Tx</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-zinc-950/60">
                {filteredQueue.map((item, idx) => {
                  const isCurrent = currentIndex === tokenQueue.findIndex(q => q.id === item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/5 transition-all ${
                        isCurrent ? "bg-blue-500/10 border-l-2 border-blue-500" : ""
                      }`}
                    >
                      {/* INDEX */}
                      <td className="p-3.5 text-zinc-500 font-bold">
                        {idx + 1}
                      </td>

                      {/* TOKEN DETAILS */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{item.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                              ${item.symbol}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-zinc-400 truncate max-w-xs font-sans">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* CATEGORY & SUPPLY */}
                      <td className="p-3.5 text-zinc-400">
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-white/5 text-[10px] text-zinc-300">
                            {item.category || "General"}
                          </span>
                          <span className="block text-[10px] text-zinc-500 font-mono">
                            {item.supply || "1,000,000"} tokens
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="p-3.5">
                        {item.status === "ready" && (
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Ready in Queue
                          </span>
                        )}
                        {item.status === "pending" && (
                          <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[10px] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {item.status === "deploying" && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold inline-flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Deploying...
                          </span>
                        )}
                        {item.status === "success" && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Deployed ({((item.deployDurationMs || 0) / 1000).toFixed(1)}s)
                          </span>
                        )}
                        {item.status === "error" && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                        {item.status === "invalid" && (
                          <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            Invalid Parameters
                          </span>
                        )}
                      </td>

                      {/* DEPLOYED CONTRACT / TX */}
                      <td className="p-3.5">
                        {item.contractAddress ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-300 font-bold text-[11px] truncate max-w-[140px]">
                                {item.contractAddress.slice(0, 8)}...{item.contractAddress.slice(-6)}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.contractAddress!, `addr_${item.id}`)}
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                                title="Copy Address"
                              >
                                {copiedMap[`addr_${item.id}`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                              <a
                                href={`https://basescan.org/address/${item.contractAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-all"
                                title="View on BaseScan"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {item.txHash && (
                              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <span>Tx:</span>
                                <a
                                  href={`https://basescan.org/tx/${item.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-zinc-300 hover:underline truncate max-w-[120px]"
                                >
                                  {item.txHash.slice(0, 10)}...
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">Not deployed yet</span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.contractAddress ? (
                            <>
                              {onSelectAuditToken && (
                                <button
                                  type="button"
                                  onClick={() => onSelectAuditToken(item.contractAddress!, item.name)}
                                  className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] transition-all flex items-center gap-1"
                                  title="Run Security Audit"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                                  <span className="hidden sm:inline">Audit</span>
                                </button>
                              )}
                              {onSelectVerifyToken && (
                                <button
                                  type="button"
                                  onClick={() => onSelectVerifyToken(item.contractAddress!, item.name, item.symbol)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] transition-all flex items-center gap-1"
                                  title="Verify on BaseScan"
                                >
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="hidden sm:inline">Verify</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isDeploying}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-all disabled:opacity-40"
                              title="Remove from Queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
