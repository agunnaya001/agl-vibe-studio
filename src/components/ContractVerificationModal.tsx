import React, { useState, useEffect } from "react";
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
  CheckCheck
} from "lucide-react";
import { 
  verifyContractOnBaseScan, 
  checkContractVerificationStatus, 
  STANDARD_ERC20_SOL_SOURCE,
  VerificationResult
} from "../lib/contractVerification";

interface ContractVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
  creatorAddress?: string;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", text: string) => void;
}

export default function ContractVerificationModal({
  isOpen,
  onClose,
  contractAddress,
  tokenName = "Base Token",
  tokenSymbol = "BTKN",
  creatorAddress,
  showToast,
  addTerminalLog
}: ContractVerificationModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if contract is already verified on mount
  useEffect(() => {
    if (isOpen && contractAddress) {
      checkStatus();
    }
  }, [isOpen, contractAddress]);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await checkContractVerificationStatus(contractAddress);
      setIsAlreadyVerified(res.isVerified);
      if (res.isVerified) {
        setResult({
          success: true,
          message: `Contract ${contractAddress.slice(0, 8)}... is already verified on BaseScan!`,
          isAlreadyVerified: true,
          basescanUrl: `https://basescan.org/address/${contractAddress}#code`
        });
      }
    } catch {
      // ignore check error
    } finally {
      setIsChecking(false);
    }
  };

  const handleExecuteVerification = async () => {
    setIsVerifying(true);
    setResult(null);
    setProgressLog([]);
    setCurrentStep("Initializing BaseScan contract verification pipeline...");

    const log = (msg: string) => {
      setCurrentStep(msg);
      setProgressLog((prev) => [...prev, msg]);
      if (addTerminalLog) {
        addTerminalLog("info", `[BaseScanVerify] ${msg}`);
      }
    };

    log(`Starting verification for ${tokenName} ($${tokenSymbol}) at ${contractAddress}`);

    try {
      const res = await verifyContractOnBaseScan(
        contractAddress,
        tokenName,
        tokenSymbol,
        creatorAddress,
        STANDARD_ERC20_SOL_SOURCE,
        log
      );

      setResult(res);

      if (res.success) {
        setIsAlreadyVerified(true);
        showToast("Contract source code verified on BaseScan!", "success");
        if (addTerminalLog) {
          addTerminalLog("success", `[BaseScanVerify] Verification Successful! ${res.basescanUrl}`);
        }
      } else {
        showToast(res.message, "error");
        if (addTerminalLog) {
          addTerminalLog("error", `[BaseScanVerify] ${res.message}`);
        }
      }
    } catch (err: any) {
      console.error("Verification execution error:", err);
      const errMsg = err?.message || "Contract verification failed";
      showToast(errMsg, "error");
      setResult({
        success: false,
        message: errMsg,
        basescanUrl: `https://basescan.org/address/${contractAddress}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(STANDARD_ERC20_SOL_SOURCE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Solidity source code copied to clipboard!", "success");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-emerald-500/40 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          title="Close Modal"
        >
          ✕
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-display text-white">BaseScan Contract Verification</h2>
              {isAlreadyVerified ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold text-xs border border-blue-500/30">
                  Base Mainnet
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Verify source code on BaseScan Explorer API to grant public trust and badge.
            </p>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-zinc-900/90 p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Token Name / Symbol:</span>
            <span className="text-white font-bold text-sm block truncate">
              {tokenName} (${tokenSymbol})
            </span>
          </div>

          <div className="bg-zinc-900/90 p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Contract Address:</span>
            <span className="text-emerald-300 font-bold select-all text-[11px] block truncate">
              {contractAddress}
            </span>
          </div>

          <div className="bg-zinc-900/90 p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Solidity Compiler:</span>
            <span className="text-blue-300 font-bold text-xs block">
              v0.8.20+commit.a1b79de6
            </span>
          </div>

          <div className="bg-zinc-900/90 p-3 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Optimization / EVM:</span>
            <span className="text-purple-300 font-bold text-xs block">
              Runs: 200 (Paris EVM)
            </span>
          </div>
        </div>

        {/* SOURCE CODE DRAWER TOGGLE */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowSourceCode(!showSourceCode)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <span>Inspect Source Code Payload</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">
              {showSourceCode ? "Hide Code" : "Show Code"}
            </span>
          </button>

          {showSourceCode && (
            <div className="relative rounded-2xl bg-zinc-950 border border-white/10 p-4 font-mono text-[11px] text-emerald-300 max-h-60 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between sticky top-0 bg-zinc-950 pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  StandardERC20Token.sol
                </span>
                <button
                  onClick={copyCode}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed select-all">
                {STANDARD_ERC20_SOL_SOURCE}
              </pre>
            </div>
          )}
        </div>

        {/* PROGRESS TERMINAL LOG */}
        {isVerifying && (
          <div className="p-4 rounded-2xl bg-zinc-900 border border-emerald-500/30 space-y-2 font-mono text-xs animate-fade-in">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>BaseScan Verification Pipeline</span>
              </span>
              <span className="text-[10px] text-zinc-400">api.basescan.org</span>
            </div>
            <p className="text-blue-300 font-bold text-[11px]">{currentStep}</p>

            <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 max-h-32 overflow-y-auto space-y-1 text-[10px] text-zinc-400">
              {progressLog.map((logItem, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-500">›</span>
                  <span>{logItem}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULT NOTIFICATION */}
        {result && (
          <div
            className={`p-4 rounded-2xl border space-y-3 font-mono text-xs animate-fade-in ${
              result.success
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <span>{result.success ? "BaseScan Contract Verified!" : "Verification Issue"}</span>
              </div>
              {result.isAlreadyVerified && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                  Already Verified
                </span>
              )}
            </div>

            <p className="text-xs leading-relaxed text-zinc-200">{result.message}</p>

            {result.basescanUrl && (
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <span className="text-[10px] text-zinc-400">Direct BaseScan Link:</span>
                <a
                  href={result.basescanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 transition-all text-xs"
                >
                  <span>Open Code on BaseScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-mono text-xs transition-all cursor-pointer"
          >
            Close
          </button>

          {!isAlreadyVerified ? (
            <button
              onClick={handleExecuteVerification}
              disabled={isVerifying || isChecking}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold font-display text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying on BaseScan...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Verify Contract Code</span>
                </>
              )}
            </button>
          ) : (
            <a
              href={`https://basescan.org/address/${contractAddress}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold font-display text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Verified Contract</span>
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
