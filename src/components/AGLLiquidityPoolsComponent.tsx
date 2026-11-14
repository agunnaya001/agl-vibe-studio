import React from "react";
import { AlertTriangle, Droplets, Lock, Wallet } from "lucide-react";
import { WalletState } from "../types";

interface AGLLiquidityPoolsComponentProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
}

export default function AGLLiquidityPoolsComponent({ wallet, onRefreshWallet, showToast, addTerminalLog }: AGLLiquidityPoolsComponentProps) {
  const explainUnavailable = () => {
    const message = "Liquidity operations are disabled: no verified AGL LP factory, pool contracts, or LP-token ABI are configured in this application. No transaction was submitted.";
    showToast(message, "info");
    addTerminalLog?.("info", message);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            <Droplets className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AGL Liquidity Pools</h2>
            <p className="text-xs text-zinc-400">Base Mainnet · LP positions and pool operations</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-amber-200">Liquidity integration not verified</div>
            <p className="text-xs leading-relaxed text-zinc-300">
              The previous interface created local demo pools, synthetic LP balances, and generated token addresses in browser state. Those records were not blockchain liquidity positions. This recovery build no longer displays or modifies those simulated positions.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400"><Wallet className="h-4 w-4" /> Connected wallet AGL balance</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{Number(wallet.aglTokenBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} AGL</div>
            <p className="mt-1 text-[10px] text-zinc-500">Wallet balance only; not an LP position.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400"><Wallet className="h-4 w-4" /> Connected wallet ETH balance</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{Number(wallet.balanceEth || 0).toFixed(6)} ETH</div>
            <p className="mt-1 text-[10px] text-zinc-500">Wallet balance only; not pool liquidity.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" disabled className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-500 cursor-not-allowed">
            <Lock className="h-4 w-4" /> Add Liquidity — unavailable
          </button>
          <button type="button" disabled className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-500 cursor-not-allowed">
            <Lock className="h-4 w-4" /> Remove Liquidity — unavailable
          </button>
          <button type="button" onClick={() => { onRefreshWallet(); explainUnavailable(); }} className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800">
            Refresh wallet balances
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-zinc-500">
          To enable liquidity operations, first register and verify the actual Base pool/factory addresses, token pair, LP token, router ABI, and add/remove-liquidity methods. Then test quote, allowance, receipt, and LP-balance reads against Base Mainnet.
        </p>
      </div>
    </div>
  );
}
