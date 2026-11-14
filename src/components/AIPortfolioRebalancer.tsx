import React from "react";
import { AlertTriangle, ArrowLeftRight, Lock, RefreshCw, Sparkles, Wallet } from "lucide-react";
import { WalletState } from "../types";

interface AIPortfolioRebalancerProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "showToast" | "info") => void;
  onNavigateTab?: (tab: "airdrop-sweep" | "swaps-staking" | "lifi-bridge") => void;
}

export default function AIPortfolioRebalancer({ wallet, onRefreshWallet, addTerminalLog, showToast, onNavigateTab }: AIPortfolioRebalancerProps) {
  const explainUnavailable = () => {
    const message = "Portfolio rebalancing is paused until verified ETH/AGL price feeds, on-chain staking positions, and token balances are connected. No AI strategy, balance change, or transaction was created.";
    showToast(message, "info");
    addTerminalLog("info", message);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 text-purple-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Portfolio Rebalancer</h2>
            <p className="text-xs text-zinc-400">Base Mainnet · Read-only integration status</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-amber-200">Rebalancing is not yet safe to enable</div>
            <p className="text-xs leading-relaxed text-zinc-300">
              The previous implementation used hardcoded ETH/AGL prices, a fabricated USDC balance, browser-stored staking positions, and simulated swap/stake/bridge actions. Those values and actions were not authoritative. They have been removed from this workspace.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400"><Wallet className="h-4 w-4" /> Wallet ETH balance</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{Number(wallet.balanceEth || 0).toFixed(6)} ETH</div>
            <p className="mt-1 text-[10px] text-zinc-500">Wallet balance only. USD value is unavailable.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400"><Wallet className="h-4 w-4" /> Wallet AGL balance</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{Number(wallet.aglTokenBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} AGL</div>
            <p className="mt-1 text-[10px] text-zinc-500">Wallet balance only. No market price is assumed.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">USD valuation</div>
            <div className="mt-1 text-sm font-semibold text-zinc-300">Unavailable</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Staked AGL positions</div>
            <div className="mt-1 text-sm font-semibold text-zinc-300">Not read by this module</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">USDC balance</div>
            <div className="mt-1 text-sm font-semibold text-zinc-300">Not verified</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => { onRefreshWallet(); explainUnavailable(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800">
            <RefreshCw className="h-4 w-4" /> Refresh wallet balances
          </button>
          <button type="button" onClick={() => onNavigateTab?.("lifi-bridge")} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/20">
            <ArrowLeftRight className="h-4 w-4" /> Open LI.FI Base Swap
          </button>
          <button type="button" onClick={() => onNavigateTab?.("swaps-staking")} className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/20">
            <Lock className="h-4 w-4" /> Open AGL Staking
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-zinc-500">
          To enable this module, connect a trusted price source for every asset, query all wallet and staking positions from Base, calculate portfolio weights from verified valuations, and require a fresh quote plus explicit wallet confirmation for every proposed transaction.
        </p>
      </div>
    </div>
  );
}
