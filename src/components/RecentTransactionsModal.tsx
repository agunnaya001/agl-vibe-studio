import React, { useState, useEffect, useCallback } from "react";
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Code, 
  Rocket, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Layers, 
  Filter, 
  Search, 
  Zap,
  ShieldCheck,
  Coins
} from "lucide-react";
import { useAGLWallet } from "../hooks/useAGLWallet";
import { AGL_TOKEN_ADDRESS, AGL_TREASURY_ADDRESS, AGL_DAO_GOVERNOR_ADDRESS } from "../lib/aglContracts";

export interface OnChainTransaction {
  hash: string;
  blockNumber: string | number;
  timeStamp: number;
  from: string;
  to: string;
  value: string;
  valueEth: number;
  gasUsed: string;
  gasPrice: string;
  gasFeeEth: number;
  isError: boolean;
  status: "confirmed" | "failed";
  functionName?: string;
  type: "send" | "receive" | "contract_call" | "token_transfer" | "deploy";
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimal?: number;
  tokenContract?: string;
  explorerUrl: string;
}

interface RecentTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAddress?: string;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function RecentTransactionsModal({
  isOpen,
  onClose,
  targetAddress,
  showToast,
}: RecentTransactionsModalProps) {
  const { address: connectedAddress, chainId, isConnected } = useAGLWallet();
  
  // Use passed address or fallback to connected wallet address
  const activeAddress = targetAddress || connectedAddress || "";

  const [searchAddress, setSearchAddress] = useState<string>(activeAddress);
  const [transactions, setTransactions] = useState<OnChainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<"all" | "send" | "receive" | "contract_call" | "token_transfer">("all");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [apiSource, setApiSource] = useState<string>("BaseScan & Etherscan V2");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sync search address when target or connected address changes
  useEffect(() => {
    if (isOpen) {
      const addrToUse = targetAddress || connectedAddress || "";
      setSearchAddress(addrToUse);
      if (addrToUse) {
        fetchTransactions(addrToUse);
      }
    }
  }, [isOpen, targetAddress, connectedAddress]);

  // Lock document body scroll on mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const fetchTransactions = useCallback(async (addr: string) => {
    if (!addr || !addr.startsWith("0x") || addr.length !== 42) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const targetChainId = chainId ? String(chainId) : "8453";
      const res = await fetch(`/api/wallet/transactions?address=${encodeURIComponent(addr)}&chainId=${targetChainId}&limit=10`);
      const data = await res.json();

      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        setLastFetchedAt(Date.now());
        if (data.source) setApiSource(data.source);
      } else {
        setTransactions([]);
        setFetchError(data.error || "No transactions found or API rate limit reached.");
      }
    } catch (err: any) {
      console.warn("Failed to fetch on-chain activities:", err);
      setFetchError(err.message || "Failed to reach BaseScan API");
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: "hash" | "addr") => {
    navigator.clipboard.writeText(text);
    if (type === "hash") {
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(null), 2000);
    } else {
      setCopiedAddr(text);
      setTimeout(() => setCopiedAddr(null), 2000);
    }
    showToast?.("Copied to clipboard", "info");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      fetchTransactions(searchAddress.trim());
    }
  };

  const handlePresetSelect = (presetAddr: string, label: string) => {
    setSearchAddress(presetAddr);
    fetchTransactions(presetAddr);
    showToast?.(`Loaded recent transactions for ${label}`, "info");
  };

  // Format relative timestamp
  const formatTimeAgo = (unixSec: number) => {
    const diff = Math.floor(Date.now() / 1000) - unixSec;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatFullDate = (unixSec: number) => {
    return new Date(unixSec * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const shorten = (addr?: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === "all") return true;
    if (filterType === "send") return tx.type === "send";
    if (filterType === "receive") return tx.type === "receive";
    if (filterType === "contract_call") return tx.type === "contract_call" || tx.type === "deploy";
    if (filterType === "token_transfer") return tx.tokenSymbol !== "ETH";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono text-xs">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white shadow-md shadow-brand-purple/20">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-display text-white">Recent On-Chain Activity</h2>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                  Last 10 Base Actions
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Verified via {apiSource} on Base Mainnet (8453)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTransactions(searchAddress)}
              disabled={isLoading || !searchAddress}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Recent Transactions"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-brand-blue" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Address Search & Quick Preset Bar */}
        <div className="space-y-2 shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter Base wallet or contract address (0x...)"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-brand-purple transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchAddress}
              className="px-4 py-2 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold rounded-xl hover:opacity-95 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? "Querying..." : "Scan"}
            </button>
          </form>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            <span className="text-zinc-500">Quick Presets:</span>
            {connectedAddress && (
              <button
                onClick={() => handlePresetSelect(connectedAddress, "Connected Wallet")}
                className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5 cursor-pointer"
              >
                My Connected Wallet
              </button>
            )}
            <button
              onClick={() => handlePresetSelect(AGL_TOKEN_ADDRESS, "$AGL Contract")}
              className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-purple-300 border border-purple-500/20 cursor-pointer"
            >
              $AGL Token
            </button>
            <button
              onClick={() => handlePresetSelect(AGL_TREASURY_ADDRESS, "AGL Treasury")}
              className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-emerald-500/20 cursor-pointer"
            >
              Protocol Treasury
            </button>
            <button
              onClick={() => handlePresetSelect(AGL_DAO_GOVERNOR_ADDRESS, "DAO Governor")}
              className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-blue-300 border border-blue-500/20 cursor-pointer"
            >
              DAO Governor
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 shrink-0">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterType === "all"
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType("send")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterType === "send"
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setFilterType("receive")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterType === "receive"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Received
            </button>
            <button
              onClick={() => setFilterType("contract_call")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterType === "contract_call"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Contracts
            </button>
          </div>

          {lastFetchedAt && (
            <span className="text-[10px] text-zinc-500 shrink-0">
              Synced {formatTimeAgo(Math.floor(lastFetchedAt / 1000))}
            </span>
          )}
        </div>

        {/* Transaction Cards List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {isLoading ? (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-blue mx-auto" />
              <p className="text-zinc-400 text-xs">Querying BaseScan on-chain ledger...</p>
            </div>
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx) => {
              const isSend = tx.type === "send";
              const isReceive = tx.type === "receive";
              const isContract = tx.type === "contract_call" || tx.type === "deploy";

              return (
                <div
                  key={tx.hash}
                  className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-white/15 transition-all space-y-2 group"
                >
                  {/* Top Row: Type, Status, Timestamp, Explorer */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Action Icon */}
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isSend
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : isReceive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {isSend ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : isReceive ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : tx.type === "deploy" ? (
                          <Rocket className="w-3.5 h-3.5" />
                        ) : (
                          <Code className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">
                          {tx.functionName || (isSend ? "Outgoing Transfer" : isReceive ? "Incoming Transfer" : "Contract Interaction")}
                        </span>
                        <span className="text-[10px] text-zinc-500 block truncate" title={formatFullDate(tx.timeStamp)}>
                          {formatTimeAgo(tx.timeStamp)} • Block #{tx.blockNumber}
                        </span>
                      </div>
                    </div>

                    {/* Value & Status */}
                    <div className="text-right shrink-0">
                      <span
                        className={`font-bold block ${
                          isReceive
                            ? "text-emerald-400"
                            : isSend
                            ? "text-rose-400"
                            : "text-zinc-200"
                        }`}
                      >
                        {isReceive ? "+" : isSend ? "-" : ""}
                        {tx.valueEth > 0
                          ? `${tx.valueEth.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${tx.tokenSymbol || 'ETH'}`
                          : "0.00 ETH"}
                      </span>
                      <div className="flex items-center justify-end gap-1 text-[10px]">
                        {tx.status === "confirmed" ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Confirmed
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-0.5">
                            <XCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Addresses, Gas Fee, Explorer link */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500">From:</span>
                        <span>{shorten(tx.from)}</span>
                        <button
                          onClick={() => handleCopy(tx.from, "addr")}
                          className="text-zinc-500 hover:text-white"
                          title="Copy From Address"
                        >
                          {copiedAddr === tx.from ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500">To:</span>
                        <span>{shorten(tx.to)}</span>
                        <button
                          onClick={() => handleCopy(tx.to, "addr")}
                          className="text-zinc-500 hover:text-white"
                          title="Copy To Address"
                        >
                          {copiedAddr === tx.to ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {tx.gasFeeEth > 0 && (
                        <span className="text-zinc-500 hidden sm:inline">
                          Fee: {tx.gasFeeEth.toFixed(6)} ETH
                        </span>
                      )}

                      <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        title="View transaction on BaseScan"
                      >
                        <span>BaseScan</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-900/30 border border-white/5 text-center space-y-3">
              <History className="w-8 h-8 text-zinc-600 mx-auto" />
              <div>
                <p className="text-zinc-300 font-bold text-xs">No On-Chain Activity Found</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {fetchError || `This address (${shorten(searchAddress)}) has no indexed transactions on Base Mainnet yet.`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handlePresetSelect(AGL_TOKEN_ADDRESS, "$AGL Token")}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs cursor-pointer"
                >
                  View $AGL Activity
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real-time Base Mainnet cryptographic indexing</span>
          </div>

          <a
            href={`https://basescan.org/address/${searchAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue hover:underline flex items-center gap-1"
          >
            <span>Full BaseScan Ledger</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
