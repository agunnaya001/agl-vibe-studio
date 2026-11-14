import React, { useState } from "react";
import { WalletState } from "../types";
import { AGL_TREASURY_ADDRESS } from "../lib/aglContracts";
import StakingComponent from "../components/StakingComponent";
import AirdropSweepTracker from "../components/AirdropSweepTracker";
import LiFiBridgeComponent from "../components/LiFiBridgeComponent";
import AIPortfolioRebalancer from "../components/AIPortfolioRebalancer";
import AGLLiquidityPoolsComponent from "../components/AGLLiquidityPoolsComponent";
import AGLPollsGovernanceComponent from "../components/AGLPollsGovernanceComponent";
import { 
  ArrowLeftRight, 
  Landmark, 
  Lock, 
  Unlock,
  Coins, 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  HelpCircle, 
  Activity,
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Zap,
  Globe,
  PieChart,
  Droplets,
  Vote
} from "lucide-react";

interface DeFiPageProps {
  wallet: WalletState;
  initialHubTab?: "dex-aggregator" | "agl-liquidity" | "agl-polls" | "portfolio-rebalancer" | "airdrop-sweep" | "swaps-staking" | "lifi-bridge";
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}


export default function DeFiPage({ wallet, initialHubTab = "dex-aggregator", onRefreshWallet, addTerminalLog, showToast }: DeFiPageProps) {
  const [defiHubTab, setDefiHubTab] = useState<"dex-aggregator" | "agl-liquidity" | "agl-polls" | "portfolio-rebalancer" | "airdrop-sweep" | "swaps-staking" | "lifi-bridge">(initialHubTab);

  return (
    <div id="defi-suite-root" className="space-y-6 animate-fade-in">
      {/* DEFI HUB SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-zinc-950/80 border border-white/10 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="tab-btn-dex-aggregator"
            type="button"
            onClick={() => setDefiHubTab("dex-aggregator")}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              defiHubTab === "dex-aggregator"
                ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>LI.FI Swap & Bridge</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold">
              Live Quotes
            </span>
          </button>

          <button
            id="tab-btn-agl-liquidity"
            type="button"
            onClick={() => setDefiHubTab("agl-liquidity")}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              defiHubTab === "agl-liquidity"
                ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Droplets className="w-4 h-4 text-emerald-400" />
            <span>AGL Liquidity Pairs</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
              0.3% Fee
            </span>
          </button>

          <button
            id="tab-btn-agl-polls"
            type="button"
            onClick={() => setDefiHubTab("agl-polls")}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              defiHubTab === "agl-polls"
                ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Vote className="w-4 h-4 text-brand-purple" />
            <span>AGL Governance Polls</span>
            <span className="px-2 py-0.5 rounded-full bg-brand-purple/20 text-purple-300 text-[9px] font-bold">
              DAO
            </span>
          </button>

          <button
            id="tab-btn-portfolio-rebalancer"
            type="button"
            onClick={() => setDefiHubTab("portfolio-rebalancer")}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              defiHubTab === "portfolio-rebalancer"
                ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Portfolio Rebalancer</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
              AI Yield
            </span>
          </button>

          <button
            id="tab-btn-airdrop-sweep"
            type="button"
            onClick={() => setDefiHubTab("airdrop-sweep")}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              defiHubTab === "airdrop-sweep"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Landmark className="w-4 h-4 text-purple-300" />
            <span>Airdrop & Treasury Sweep</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
              Base Mainnet
            </span>
          </button>

          <button
            id="tab-btn-swaps-staking"
            type="button"
            onClick={() => setDefiHubTab("swaps-staking")}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              defiHubTab === "swaps-staking"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-300" />
            <span>AMM Swaps & Staking Vaults</span>
          </button>


        </div>

        <div className="text-[11px] font-mono text-zinc-500 hidden xl:flex items-center gap-2 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Treasury: {AGL_TREASURY_ADDRESS.slice(0, 6)}...{AGL_TREASURY_ADDRESS.slice(-4)}</span>
        </div>
      </div>

      {/* TAB CONTENT 0: LIVE LI.FI SWAP & BRIDGE */}
      {(defiHubTab === "dex-aggregator" || defiHubTab === "lifi-bridge") && (
        <LiFiBridgeComponent
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          addTerminalLog={addTerminalLog}
          showToast={showToast}
        />
      )}

      {/* TAB CONTENT 0B: AGL LIQUIDITY PAIRS */}
      {defiHubTab === "agl-liquidity" && (
        <AGLLiquidityPoolsComponent
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          showToast={showToast}
          addTerminalLog={addTerminalLog}
        />
      )}

      {/* TAB CONTENT 0C: AGL GOVERNANCE POLLS */}
      {defiHubTab === "agl-polls" && (
        <AGLPollsGovernanceComponent
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          showToast={showToast}
          addTerminalLog={addTerminalLog}
        />
      )}

      {/* TAB CONTENT 1: AI PORTFOLIO REBALANCER */}
      {defiHubTab === "portfolio-rebalancer" && (
        <AIPortfolioRebalancer
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          addTerminalLog={addTerminalLog}
          showToast={showToast}
          onNavigateTab={(tab) => setDefiHubTab(tab)}
        />
      )}

      {/* TAB CONTENT 1: AIRDROP STATUS & TREASURY SWEEP TRACKER */}
      {defiHubTab === "airdrop-sweep" && (
        <AirdropSweepTracker
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          addTerminalLog={addTerminalLog}
          showToast={showToast}
        />
      )}

      {/* TAB CONTENT 2: CANONICAL AGL STAKING */}
      {defiHubTab === "swaps-staking" && (
        <StakingComponent
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          addTerminalLog={addTerminalLog}
          showToast={showToast}
        />
      )}

}
    </div>
  );
}
