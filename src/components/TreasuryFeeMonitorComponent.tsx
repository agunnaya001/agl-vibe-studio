import React from "react";
import { AlertTriangle, Copy, ExternalLink, ShieldCheck, Wallet } from "lucide-react";
import { AGL_TREASURY_ADDRESS } from "../lib/aglContracts";
import { WalletState } from "../types";

interface TreasuryFeeMonitorComponentProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function TreasuryFeeMonitorComponent({ wallet, showToast }: TreasuryFeeMonitorComponentProps) {
  const copyTreasuryAddress = async () => {
    try {
      await navigator.clipboard.writeText(AGL_TREASURY_ADDRESS);
      showToast("Configured treasury address copied.", "success");
    } catch {
      showToast("Clipboard access is unavailable in this browser.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-300"><ShieldCheck className="h-7 w-7" /></div>
          <div>
            <h2 className="text-xl font-bold text-white">AGL Treasury Monitor</h2>
            <p className="text-xs text-zinc-400">Base Mainnet · Read-only treasury configuration</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-amber-200">Fee accounting and automated sweeps are disabled</div>
            <p className="text-xs leading-relaxed text-zinc-300">
              The previous dashboard generated local fee accruals, hardcoded USD valuations, synthetic sweep history, and simulated dispatches. Those values were not verified blockchain activity and are no longer displayed.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400"><Wallet className="h-4 w-4" /> Configured treasury address</div>
          <div className="break-all font-mono text-sm text-white">{AGL_TREASURY_ADDRESS}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyTreasuryAddress} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"><Copy className="h-3.5 w-3.5" /> Copy address</button>
            <a href={`https://basescan.org/address/${AGL_TREASURY_ADDRESS}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/20">View on BaseScan <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase tracking-wider text-zinc-500">Fee event indexer</div><div className="mt-2 text-sm font-bold text-amber-300">Not configured</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase tracking-wider text-zinc-500">Sweep executor</div><div className="mt-2 text-sm font-bold text-amber-300">Disabled</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] uppercase tracking-wider text-zinc-500">Verified sweep receipts</div><div className="mt-2 text-sm font-bold text-white">0</div></div>
        </div>

        <div className="text-[11px] leading-relaxed text-zinc-500">
          {wallet.isConnected && wallet.address ? `Connected wallet: ${wallet.address}` : "No wallet connected."}
          {" "}To enable this monitor, index verified fee events from the relevant contracts, calculate USD values from trusted price sources, and implement a wallet-signed transfer flow with confirmed Base receipts. Automatic sweeps must remain disabled until those controls are in place.
        </div>
      </div>
    </div>
  );
}
