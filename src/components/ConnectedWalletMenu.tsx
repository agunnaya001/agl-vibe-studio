import React, { useState } from "react";
import { ethers } from "ethers";
import { 
  Copy, 
  Check, 
  ExternalLink, 
  LogOut, 
  RefreshCw, 
  ShieldCheck, 
  Coins, 
  Flame, 
  AlertTriangle,
  ArrowRightLeft,
  X,
  Layers
} from "lucide-react";
import { useAGLWallet } from "../hooks/useAGLWallet";
import { BASE_MAINNET, BASE_SEPOLIA } from "../lib/chains";
import { AGL_TOKEN_ADDRESS } from "../lib/aglContracts";

interface ConnectedWalletMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubAccounts?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function ConnectedWalletMenu({
  isOpen,
  onClose,
  onOpenSubAccounts,
  showToast,
}: ConnectedWalletMenuProps) {
  const {
    address,
    walletName,
    walletIcon,
    chainId,
    chainName,
    isBaseNetwork,
    nativeBalance,
    aglTokenBalance,
    aglCredits,
    isSyncingOnChain,
    disconnectWallet,
    switchToBase,
    refreshBalances,
  } = useAGLWallet();

  const [copied, setCopied] = useState(false);

  if (!isOpen || !address) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    showToast?.("Address copied to clipboard", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    onClose();
    showToast?.("Wallet disconnected successfully", "info");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {walletIcon ? (
              <img src={walletIcon} alt={walletName} className="w-6 h-6 rounded-lg object-contain" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-brand-purple/20 flex items-center justify-center text-brand-purple text-xs font-bold">
                W
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold font-display text-white">{walletName}</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Connected Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Network Status & Warning */}
        {!isBaseNetwork ? (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Wrong Network Detected ({chainName})</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              AGL Studio operates natively on Base Mainnet. Switch networks to execute contract interactions and claim rewards.
            </p>
            <button
              onClick={switchToBase}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:opacity-95"
            >
              Switch to Base Mainnet (8453)
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-blue-300 font-bold">Base Mainnet (8453)</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Verified Node</span>
          </div>
        )}

        {/* Address Card */}
        <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            <span>Wallet Address</span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-zinc-200 font-bold truncate">
              {address}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer"
              title="Copy full address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Live Balances Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="bg-zinc-900/60 border border-white/5 p-3 rounded-2xl">
            <span className="text-[9px] text-zinc-500 block uppercase mb-1">Native ETH</span>
            <span className="text-white font-bold block truncate">
              {nativeBalance ? parseFloat(ethers.formatUnits(nativeBalance.value, nativeBalance.decimals)).toFixed(4) : "0.0000"}
            </span>
            <span className="text-[9px] text-zinc-500">Base L2</span>
          </div>

          <div className="bg-zinc-900/60 border border-white/5 p-3 rounded-2xl">
            <span className="text-[9px] text-zinc-500 block uppercase mb-1">AGL Tokens</span>
            <span className="text-purple-300 font-bold block truncate">
              {aglTokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-zinc-500">Utility Asset</span>
          </div>

          <div className="bg-zinc-900/60 border border-white/5 p-3 rounded-2xl">
            <span className="text-[9px] text-zinc-500 block uppercase mb-1">AGL Credits</span>
            <span className="text-amber-400 font-bold block truncate">
              {aglCredits.toLocaleString()}
            </span>
            <span className="text-[9px] text-zinc-500">Metering Layer</span>
          </div>
        </div>

        {/* Action Links */}
        <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs font-mono">
          <a
            href={`https://basescan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>View on BaseScan</span>
            </span>
            <span className="text-[10px] text-zinc-500">↗</span>
          </a>

          <button
            onClick={() => {
              refreshBalances();
              showToast?.("Refreshing live Base Mainnet balances...", "info");
            }}
            disabled={isSyncingOnChain}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingOnChain ? "animate-spin" : ""}`} />
              <span>Refresh On-Chain Balances</span>
            </span>
            <span className="text-[10px] text-zinc-500">Live RPC</span>
          </button>

          {onOpenSubAccounts && (
            <button
              onClick={() => {
                onClose();
                onOpenSubAccounts();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-brand-purple" />
                <span>Manage Studio Sub-Accounts</span>
              </span>
              <span className="text-[10px] text-zinc-500">Multi-Account</span>
            </button>
          )}

          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer font-bold"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Wallet</span>
            </span>
            <span className="text-[10px]">End Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
