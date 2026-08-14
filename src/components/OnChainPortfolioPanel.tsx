import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  RefreshCw,
  ExternalLink,
  Loader2,
  Coins,
  BadgeCheck,
  Radio,
  AlertCircle
} from "lucide-react";
import { fetchWalletPortfolio, WalletPortfolio } from "../lib/tokenFactory";
import { WalletState } from "../types";

interface OnChainPortfolioPanelProps {
  wallet: WalletState;
  addTerminalLog?: (
    type: "info" | "success" | "error" | "buy" | "sell" | "system",
    text: string
  ) => void;
}

function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatBalance(value: number): string {
  if (value === 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value < 0.0001) return value.toExponential(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function OnChainPortfolioPanel({ wallet, addTerminalLog }: OnChainPortfolioPanelProps) {
  const [portfolio, setPortfolio] = useState<WalletPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const loadPortfolio = useCallback(async () => {
    if (!wallet.address) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchWalletPortfolio(wallet.address);
      setPortfolio(result);
      setLastSynced(Date.now());
      addTerminalLog?.(
        "success",
        `[Portfolio] Live scan complete: ${result.holdings.length} holding(s) across ${result.scannedTokenCount} factory token(s) | ${result.nativeEth} ETH`
      );
    } catch (err: any) {
      const msg = err?.message || "Failed to read on-chain portfolio";
      setError(msg);
      addTerminalLog?.("error", `[Portfolio] ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [wallet.address, addTerminalLog]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const holdings = portfolio?.holdings ?? [];

  return (
    <section
      id="dashboard-onchain-portfolio"
      aria-label="Live on-chain portfolio"
      className="glass-panel rounded-2xl border border-emerald-500/20 bg-zinc-900/30 p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            Live On-Chain Portfolio
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono font-bold">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> BASE MAINNET
            </span>
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Real balances read directly from Base for{" "}
            <span className="font-mono text-zinc-300">{shortAddr(wallet.address)}</span>
            {lastSynced && (
              <span className="text-zinc-600">
                {" "}· synced {new Date(lastSynced).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={loadPortfolio}
          disabled={isLoading}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-zinc-300 font-mono text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Scanning…" : "Refresh"}
        </button>
      </div>

      {/* Native + summary stats */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Native ETH</span>
          <p className="mt-1 font-mono text-lg font-bold text-white">
            {portfolio ? Number(portfolio.nativeEth).toFixed(4) : wallet.balanceEth.toFixed(4)}
            <span className="text-emerald-400 text-xs ml-1">ETH</span>
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Token Holdings</span>
          <p className="mt-1 font-mono text-lg font-bold text-brand-purple">{holdings.length}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/5 col-span-2 md:col-span-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Created by You</span>
          <p className="mt-1 font-mono text-lg font-bold text-emerald-400">{portfolio?.createdCount ?? 0}</p>
        </div>
      </div>

      {/* Holdings list */}
      <div className="relative z-10 mt-4">
        {isLoading && !portfolio ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-zinc-400 font-mono">Reading Base Mainnet factory registry…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-xs text-red-300 font-mono max-w-sm">{error}</p>
            <button
              type="button"
              onClick={loadPortfolio}
              className="mt-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-[11px] hover:bg-red-500/20 transition-all"
            >
              Retry scan
            </button>
          </div>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Coins className="w-7 h-7 text-zinc-600" />
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              No factory token balances found for this wallet yet. Deploy a token or buy one on the
              launchpad and it will appear here live.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {holdings.map((h) => (
              <li
                key={h.address}
                className="p-3.5 bg-zinc-950/80 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono text-[11px] font-bold text-emerald-300 shrink-0">
                    {h.symbol.slice(0, 4).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white font-display truncate">{h.name}</span>
                      {h.isCreator && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold shrink-0">
                          <BadgeCheck className="w-2.5 h-2.5" /> Creator
                        </span>
                      )}
                    </div>
                    <a
                      href={`https://basescan.org/token/${h.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-500 font-mono hover:text-emerald-400 transition-colors flex items-center gap-1 w-fit"
                    >
                      {shortAddr(h.address)}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold text-white">{formatBalance(h.balanceNum)}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{h.symbol}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
