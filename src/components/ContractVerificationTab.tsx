import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Code, 
  FileCode, 
  Copy, 
  Check, 
  Terminal, 
  Sparkles,
  Search,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight,
  AlertCircle,
  FileText,
  User,
  Zap,
  CheckCheck,
  Download
} from "lucide-react";
import { 
  verifyContractOnBaseScan, 
  checkContractVerificationStatus, 
  encodeConstructorArguments,
  STANDARD_ERC20_SOL_SOURCE,
  VerificationResult 
} from "../lib/contractVerification";
import { WalletState } from "../types";

export interface OnChainTokenItem {
  address: string;
  creator?: string;
  name?: string;
  symbol?: string;
  isLoadingDetails?: boolean;
}

interface ContractVerificationTabProps {
  tokenList: OnChainTokenItem[];
  createdTokenAddress?: string | null;
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", text: string) => void;
  onRefreshTokens?: () => void;
}

export const ContractVerificationTab: React.FC<ContractVerificationTabProps> = ({
  tokenList,
  createdTokenAddress,
  wallet,
  showToast,
  addTerminalLog,
  onRefreshTokens
}) => {
  // Input Form States
  const [targetAddress, setTargetAddress] = useState<string>(createdTokenAddress || "");
  const [tokenName, setTokenName] = useState<string>("Base Token");
  const [tokenSymbol, setTokenSymbol] = useState<string>("BTKN");
  const [creatorAddress, setCreatorAddress] = useState<string>(wallet.address || "");
  const [compilerVersion, setCompilerVersion] = useState<string>("v0.8.20+commit.a1b79de6");
  const [optimizationRuns, setOptimizationRuns] = useState<string>("200");

  // Verification Processing States
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isVerifiedStatus, setIsVerifiedStatus] = useState<boolean | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  
  // Real-time Pipeline Tracking States
  const [pipelineStep, setPipelineStep] = useState<number>(0); // 0: Idle, 1: Checking, 2: Encoding, 3: Submitting, 4: Polling, 5: Complete/Error
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<Array<{ timestamp: string; text: string; type: "info" | "success" | "error" }>>([]);
  
  // View states
  const [showSourceModal, setShowSourceModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedArgs, setCopiedArgs] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Sync when createdTokenAddress changes from parent component
  useEffect(() => {
    if (createdTokenAddress && createdTokenAddress.startsWith("0x")) {
      setTargetAddress(createdTokenAddress);
      // Find token in tokenList if available
      const found = tokenList.find(t => t.address.toLowerCase() === createdTokenAddress.toLowerCase());
      if (found) {
        if (found.name) setTokenName(found.name);
        if (found.symbol) setTokenSymbol(found.symbol);
        if (found.creator) setCreatorAddress(found.creator);
      }
    }
  }, [createdTokenAddress, tokenList]);

  // Sync connected wallet address if creator field is empty
  useEffect(() => {
    if (wallet.address && !creatorAddress) {
      setCreatorAddress(wallet.address);
    }
  }, [wallet.address]);

  // Computed encoded constructor arguments hex
  const encodedConstructorArgs = useMemo(() => {
    if (!targetAddress || !targetAddress.startsWith("0x")) return "";
    return encodeConstructorArguments(tokenName, tokenSymbol, creatorAddress || wallet.address);
  }, [tokenName, tokenSymbol, creatorAddress, wallet.address, targetAddress]);

  // Helper logger
  const appendLog = (text: string, type: "info" | "success" | "error" = "info") => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp: timeStr, text, type }]);
    if (addTerminalLog) {
      addTerminalLog(type === "error" ? "error" : type === "success" ? "success" : "info", `[BaseScan] ${text}`);
    }
  };

  // Quick Status Check Function
  const handleCheckStatus = async (overrideAddr?: string) => {
    const addr = overrideAddr || targetAddress;
    if (!addr || !addr.startsWith("0x")) {
      showToast("Please enter a valid ERC20 contract address.", "error");
      return;
    }

    setIsChecking(true);
    appendLog(`Querying BaseScan API for verification status of ${addr.slice(0, 10)}...`, "info");

    try {
      const res = await checkContractVerificationStatus(addr);
      setIsVerifiedStatus(res.isVerified);

      if (res.isVerified) {
        setPipelineStep(5);
        setProgressPercent(100);
        appendLog(`Contract ${addr} is ALREADY VERIFIED on BaseScan!`, "success");
        setVerificationResult({
          success: true,
          message: `Contract source code is verified on BaseScan. Compiler: ${res.compilerVersion || "v0.8.20"}`,
          isAlreadyVerified: true,
          basescanUrl: `https://basescan.org/address/${addr}#code`
        });
        showToast("Contract is verified on BaseScan!", "success");
      } else {
        appendLog(`Contract ${addr} is not yet verified on BaseScan. Ready for verification.`, "info");
        showToast("Contract is not verified yet. Click 'Verify Contract' to verify.", "info");
      }
    } catch (err: any) {
      appendLog(`Error checking BaseScan status: ${err?.message || "Check failed"}`, "error");
    } finally {
      setIsChecking(false);
    }
  };

  // Main Execute Verification Pipeline Function
  const handleExecuteVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!targetAddress || !targetAddress.startsWith("0x")) {
      showToast("Please enter a valid smart contract address to verify.", "error");
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setIsVerifiedStatus(null);
    setLogs([]);
    setPipelineStep(1);
    setProgressPercent(15);

    appendLog(`Starting BaseScan Contract Verification Pipeline for ${tokenName} ($${tokenSymbol})`, "info");
    appendLog(`Target Contract Address: ${targetAddress}`, "info");

    try {
      // Step 1: Pre-check status
      appendLog("Step 1/4: Checking existing BaseScan verification status...", "info");
      const checkRes = await checkContractVerificationStatus(targetAddress);

      if (checkRes.isVerified) {
        setPipelineStep(5);
        setProgressPercent(100);
        setIsVerifiedStatus(true);
        appendLog(`Contract ${targetAddress} is ALREADY VERIFIED on BaseScan!`, "success");
        const successRes: VerificationResult = {
          success: true,
          message: `Contract is already verified on BaseScan! Compiler: ${checkRes.compilerVersion || "v0.8.20"}`,
          isAlreadyVerified: true,
          basescanUrl: `https://basescan.org/address/${targetAddress}#code`
        };
        setVerificationResult(successRes);
        showToast("Contract is already verified on BaseScan!", "success");
        setIsVerifying(false);
        return;
      }

      // Step 2: Encode Constructor Arguments
      setPipelineStep(2);
      setProgressPercent(35);
      appendLog("Step 2/4: Encoding ABI Constructor Arguments...", "info");
      appendLog(`Constructor Params: name="${tokenName}", symbol="${tokenSymbol}", owner="${creatorAddress || wallet.address || "0x6EF504..."}"`, "info");
      appendLog(`Encoded Hex Payload: 0x${encodedConstructorArgs.slice(0, 32)}...`, "info");

      // Step 3: Submit Verification Request
      setPipelineStep(3);
      setProgressPercent(60);
      appendLog("Step 3/4: Submitting Solidity Source Code payload to BaseScan Verification API...", "info");

      const resultRes = await verifyContractOnBaseScan(
        targetAddress,
        tokenName,
        tokenSymbol,
        creatorAddress || wallet.address,
        STANDARD_ERC20_SOL_SOURCE,
        (statusMsg: string) => {
          appendLog(statusMsg, "info");
          if (statusMsg.includes("Polling status")) {
            setPipelineStep(4);
            setProgressPercent(80);
          }
        }
      );

      // Step 4: Final Evaluation
      setPipelineStep(5);
      setProgressPercent(100);
      setVerificationResult(resultRes);

      if (resultRes.success) {
        setIsVerifiedStatus(true);
        appendLog(`Verification SUCCESSFUL! Contract verified on BaseScan.`, "success");
        appendLog(`BaseScan Source URL: ${resultRes.basescanUrl}`, "success");
        showToast("Contract verified on BaseScan successfully!", "success");
      } else {
        setIsVerifiedStatus(false);
        appendLog(`Verification failed: ${resultRes.message}`, "error");
        showToast(`Verification failed: ${resultRes.message}`, "error");
      }
    } catch (err: any) {
      console.error("Verification execution error:", err);
      const errMsg = err?.message || "An error occurred during verification.";
      setPipelineStep(5);
      setProgressPercent(100);
      setIsVerifiedStatus(false);
      appendLog(`Verification Exception: ${errMsg}`, "error");
      setVerificationResult({
        success: false,
        message: errMsg,
        basescanUrl: `https://basescan.org/address/${targetAddress}`
      });
      showToast(`Verification error: ${errMsg}`, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  // Copy helpers
  const handleCopySourceCode = () => {
    navigator.clipboard.writeText(STANDARD_ERC20_SOL_SOURCE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast("Solidity source code copied to clipboard!", "success");
  };

  const handleCopyConstructorArgs = () => {
    navigator.clipboard.writeText(`0x${encodedConstructorArgs}`);
    setCopiedArgs(true);
    setTimeout(() => setCopiedArgs(false), 2000);
    showToast("Encoded constructor arguments copied to clipboard!", "success");
  };

  const handleExportLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join("\n");
    const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `basescan_verification_log_${targetAddress.slice(0, 8)}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Verification log exported!", "success");
  };

  // Filter tokens list
  const filteredTokenList = useMemo(() => {
    if (!searchFilter.trim()) return tokenList;
    const q = searchFilter.toLowerCase();
    return tokenList.filter(
      t =>
        t.address.toLowerCase().includes(q) ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.symbol && t.symbol.toLowerCase().includes(q))
    );
  }, [tokenList, searchFilter]);

  return (
    <div id="contract-verification-tab" className="space-y-8 animate-fade-in">
      
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-zinc-950 to-teal-950/60 border border-emerald-500/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                BaseScan API Direct Pipeline
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30">
                Solidity v0.8.20 Single-File
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              BaseScan Contract Verification Engine
            </h1>

            <p className="text-zinc-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              Verify smart contract source code on BaseScan in real-time. Automated ABI encoding, OpenZeppelin standard matching, and BaseScan compiler status polling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-view-solidity-source"
              onClick={() => setShowSourceModal(true)}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Code className="w-4 h-4 text-emerald-400" />
              <span>Inspect ERC20 Source</span>
            </button>

            {onRefreshTokens && (
              <button
                id="btn-refresh-verification-tokens"
                onClick={onRefreshTokens}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <span>Refresh Tokens</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS / COMPILER STATS */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-white/5 space-y-0.5">
            <span className="text-[9px] text-zinc-500 uppercase font-bold block">Compiler Version</span>
            <span className="text-xs font-bold text-emerald-300 truncate block">v0.8.20+commit.a1b79de6</span>
          </div>
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-white/5 space-y-0.5">
            <span className="text-[9px] text-zinc-500 uppercase font-bold block">Optimization & Runs</span>
            <span className="text-xs font-bold text-blue-300">Enabled (200 Runs)</span>
          </div>
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-white/5 space-y-0.5">
            <span className="text-[9px] text-zinc-500 uppercase font-bold block">EVM Target & License</span>
            <span className="text-xs font-bold text-purple-300">Paris / MIT</span>
          </div>
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-white/5 space-y-0.5">
            <span className="text-[9px] text-zinc-500 uppercase font-bold block">Registered Factory Tokens</span>
            <span className="text-xs font-bold text-amber-300">{tokenList.length} Tokens</span>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUMN 1: VERIFICATION FORM (7 COLS) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-white/10 bg-zinc-950 space-y-6 shadow-xl relative">
          
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-white">Verification Parameters</h2>
                <p className="text-xs text-zinc-400">Configure parameters for automated BaseScan contract compilation</p>
              </div>
            </div>

            {isVerifiedStatus !== null && (
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                isVerifiedStatus 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}>
                {isVerifiedStatus ? "Verified on BaseScan" : "Unverified Contract"}
              </span>
            )}
          </div>

          {/* Quick Token Selection List */}
          {tokenList.length > 0 && (
            <div className="space-y-2 pt-1 pb-3 border-b border-white/5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                ⚡ Select Newly Deployed Factory Token:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {tokenList.map((tok, idx) => {
                  const isSelected = targetAddress.toLowerCase() === tok.address.toLowerCase();
                  return (
                    <button
                      key={tok.address + idx}
                      type="button"
                      id={`select-verify-token-${idx}`}
                      onClick={() => {
                        setTargetAddress(tok.address);
                        if (tok.name) setTokenName(tok.name);
                        if (tok.symbol) setTokenSymbol(tok.symbol);
                        if (tok.creator) setCreatorAddress(tok.creator);
                        handleCheckStatus(tok.address);
                      }}
                      className={`text-[10px] px-2.5 py-1.5 rounded-xl border font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                          : "bg-zinc-900 border-white/10 text-zinc-300 hover:border-emerald-500/40 hover:text-white"
                      }`}
                    >
                      <Layers className="w-3 h-3 text-emerald-400" />
                      <span>{tok.name || `Token #${idx + 1}`} (${tok.symbol || "CTKN"})</span>
                      <span className="opacity-60 text-[9px]">{tok.address.slice(0, 6)}...</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleExecuteVerification} className="space-y-4">
            
            {/* Target Contract Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center justify-between">
                <span>Smart Contract Address</span>
                <span className="text-[10px] text-zinc-500 font-mono">Base Mainnet Contract</span>
              </label>
              <div className="relative">
                <input
                  id="input-verification-address"
                  type="text"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  className="w-full pl-4 pr-24 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  id="btn-check-status-direct"
                  onClick={() => handleCheckStatus()}
                  disabled={isChecking || !targetAddress}
                  className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-[10px] font-mono font-bold border border-white/10 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  <span>Check Status</span>
                </button>
              </div>
            </div>

            {/* Token Name & Symbol Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 font-display">Token Name</label>
                <input
                  id="input-verification-name"
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. Agunnaya Sovereign Token"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 font-display">Token Symbol</label>
                <input
                  id="input-verification-symbol"
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. AGLS"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>
            </div>

            {/* Creator / Initial Owner Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center justify-between">
                <span>Creator / Initial Owner Address</span>
                <span className="text-[10px] text-zinc-500 font-mono">Passed to constructor(_initialOwner)</span>
              </label>
              <div className="relative">
                <input
                  id="input-verification-creator"
                  type="text"
                  value={creatorAddress}
                  onChange={(e) => setCreatorAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                {wallet.address && (
                  <button
                    type="button"
                    onClick={() => setCreatorAddress(wallet.address)}
                    className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/30"
                  >
                    Use Wallet
                  </button>
                )}
              </div>
            </div>

            {/* Encoded Constructor Arguments Live Preview */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <Code className="w-3.5 h-3.5" /> Encoded ABI Constructor Payload:
                </span>
                <button
                  type="button"
                  onClick={handleCopyConstructorArgs}
                  disabled={!encodedConstructorArgs}
                  className="hover:text-white text-zinc-400 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {copiedArgs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedArgs ? "Copied" : "Copy Hex"}</span>
                </button>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5 font-mono text-[10px] text-emerald-300/80 break-all select-all max-h-20 overflow-y-auto">
                {encodedConstructorArgs ? `0x${encodedConstructorArgs}` : "Enter contract details to calculate ABI hex..."}
              </div>
            </div>

            {/* Submit Verification Button */}
            <button
              type="submit"
              id="btn-trigger-basescan-verification"
              disabled={isVerifying || !targetAddress}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm font-display flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Verifying Contract on BaseScan...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <span>Verify Contract on BaseScan</span>
                </>
              )}
            </button>
          </form>

          {/* Verification Result Banner */}
          {verificationResult && (
            <div className={`p-4 rounded-2xl border space-y-3 animate-fade-in ${
              verificationResult.success
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/50 text-rose-300"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs font-display">
                  {verificationResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <span>{verificationResult.success ? "Contract Verified on BaseScan!" : "Verification Issue Encountered"}</span>
                </div>

                {verificationResult.basescanUrl && (
                  <a
                    href={verificationResult.basescanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-[10px] flex items-center gap-1 transition-all"
                  >
                    <span>View BaseScan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <p className="text-xs font-mono leading-relaxed opacity-90">
                {verificationResult.message}
              </p>
            </div>
          )}
        </div>

        {/* COLUMN 2: REAL-TIME VERIFICATION PROGRESS & LOGS (5 COLS) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/10 bg-zinc-950 space-y-5 shadow-xl flex flex-col justify-between">
          
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-white">Live Verification Pipeline</h2>
                  <p className="text-xs text-zinc-400">Real-time status tracking & compiler logs</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportLogs}
                disabled={logs.length === 0}
                className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-emerald-500/40 text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                title="Export Log File"
              >
                <Download className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            {/* Animated Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Pipeline Completion:</span>
                <span className="font-bold text-emerald-400">{progressPercent}%</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Step-by-Step Stepper Timeline */}
            <div className="space-y-2.5 font-mono text-xs">
              {[
                { step: 1, title: "1. Query BaseScan Status", desc: "Check existing contract registration" },
                { step: 2, title: "2. Encode ABI Constructor", desc: "Prepare StandardERC20 parameters" },
                { step: 3, title: "3. Submit Source Payload", desc: "Send Solidity v0.8.20 code to BaseScan" },
                { step: 4, title: "4. Poll Compiler Output", desc: "Awaiting bytecode compilation match" }
              ].map((st) => {
                const isActive = pipelineStep === st.step;
                const isDone = pipelineStep > st.step || (pipelineStep === 5 && verificationResult?.success);
                
                return (
                  <div 
                    key={st.step}
                    className={`p-2.5 rounded-xl border transition-all flex items-start gap-3 ${
                      isDone
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                        : isActive
                        ? "bg-blue-950/30 border-blue-500/50 text-blue-300 animate-pulse"
                        : "bg-zinc-900/50 border-white/5 text-zinc-500"
                    }`}
                  >
                    <div className="pt-0.5">
                      {isDone ? (
                        <CheckCheck className="w-4 h-4 text-emerald-400" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[9px] font-bold">
                          {st.step}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs">{st.title}</div>
                      <div className="text-[10px] opacity-70">{st.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-time Log Feed Console */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase font-bold">
                <span>Compiler Terminal Stream:</span>
                {logs.length > 0 && (
                  <button
                    onClick={() => setLogs([])}
                    className="hover:text-white transition-colors"
                  >
                    Clear Feed
                  </button>
                )}
              </div>

              <div className="bg-zinc-950 p-3 rounded-2xl border border-white/10 font-mono text-[11px] h-44 overflow-y-auto space-y-1 pr-1">
                {logs.length === 0 ? (
                  <div className="text-zinc-600 italic py-12 text-center text-xs">
                    Ready to initiate verification. Click "Verify Contract" to start stream.
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`leading-relaxed ${
                        log.type === "error"
                          ? "text-rose-400 font-bold"
                          : log.type === "success"
                          ? "text-emerald-300 font-bold"
                          : "text-zinc-300"
                      }`}
                    >
                      <span className="text-zinc-600 text-[10px] mr-1.5">[{log.timestamp}]</span>
                      <span>{log.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5 text-xs font-mono">
            <div className="text-zinc-300 font-bold flex items-center gap-1.5 font-display">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>BaseScan Trust Verification</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Verifying contract source code publishes standard ABI and green checkmarks on BaseScan, enabling users to interact safely with deployed factory tokens.
            </p>
          </div>
        </div>

      </div>

      {/* SECTION 3: ALL DEPLOYED FACTORY TOKENS VERIFICATION STATUS GRID */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 bg-zinc-950 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Factory Tokens Verification Directory
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                {tokenList.length} Total Tokens
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Verify any factory token on BaseScan with a single click.
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by address or symbol..."
              className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5" />
          </div>
        </div>

        {filteredTokenList.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-zinc-900/40 rounded-2xl border border-white/5">
            <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs font-mono text-zinc-400">No factory tokens found matching filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTokenList.map((item, idx) => {
              const isCurrentSelected = targetAddress.toLowerCase() === item.address.toLowerCase();

              return (
                <div
                  key={item.address + idx}
                  className={`p-4 rounded-2xl bg-zinc-900/80 border transition-all space-y-3 ${
                    isCurrentSelected 
                      ? "border-emerald-500/60 bg-emerald-950/10 shadow-lg shadow-emerald-500/10" 
                      : "border-white/10 hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold font-mono text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="font-bold font-display text-white text-xs block">
                          {item.name || `Token #${idx + 1}`}
                        </span>
                        {item.symbol && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                            ${item.symbol}
                          </span>
                        )}
                      </div>
                    </div>

                    <a
                      href={`https://basescan.org/address/${item.address}#code`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                      title="View on BaseScan"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                    </a>
                  </div>

                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5 font-mono text-[11px] space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold block">Contract Address:</span>
                    <span className="text-zinc-200 font-bold truncate block select-all">{item.address}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      id={`btn-verify-card-${idx}`}
                      onClick={() => {
                        setTargetAddress(item.address);
                        if (item.name) setTokenName(item.name);
                        if (item.symbol) setTokenSymbol(item.symbol);
                        if (item.creator) setCreatorAddress(item.creator);
                        handleExecuteVerification();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-mono font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Contract</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SOLIDITY SOURCE CODE INSPECTION MODAL */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-zinc-950 border border-emerald-500/40 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setShowSourceModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center justify-between border-b border-white/10 pb-4 pr-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Code className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">StandardERC20Token.sol Source</h3>
                  <p className="text-xs text-zinc-400">OpenZeppelin compliant Solidity v0.8.20 source code</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopySourceCode}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "Copied" : "Copy Source"}</span>
              </button>
            </div>

            <div className="bg-zinc-900 p-4 rounded-2xl border border-white/10 font-mono text-xs text-emerald-300/90 overflow-x-auto max-h-[450px] leading-relaxed">
              <pre>{STANDARD_ERC20_SOL_SOURCE}</pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSourceModal(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono font-bold text-xs border border-white/10"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
