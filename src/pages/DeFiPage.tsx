import React, { useState } from "react";
import { WalletState } from "../types";
import { AGL_TREASURY_ADDRESS } from "../lib/aglContracts";
import StakingComponent from "../components/StakingComponent";
import AirdropSweepTracker from "../components/AirdropSweepTracker";
import LiFiBridgeComponent from "../components/LiFiBridgeComponent";
import AIPortfolioRebalancer from "../components/AIPortfolioRebalancer";
import DexAggregatorComponent from "../components/DexAggregatorComponent";
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
  // Swap State
  const [swapFrom, setSwapFrom] = useState("ETH");
  const [swapTo, setSwapTo] = useState("AGL");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapEstim, setSwapEstim] = useState("Unavailable");
  const [swapping, setSwapping] = useState(false);
  const [onChainRate, setOnChainRate] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState<boolean>(true);


  const [defiHubTab, setDefiHubTab] = useState<"dex-aggregator" | "agl-liquidity" | "agl-polls" | "portfolio-rebalancer" | "airdrop-sweep" | "swaps-staking" | "lifi-bridge">(initialHubTab);

  // Web3 Status
  const [web3Active, setWeb3Active] = useState<boolean>(false);
  const [onWrongNetwork, setOnWrongNetwork] = useState<boolean>(false);


  const handleSwapAmountChange = (val: string) => {
    setSwapAmount(val);
    setSwapEstim("Unavailable");
  };

  // No verified AGL/ETH router is configured for this legacy swap form.
  const handleExecuteSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Swap is unavailable: this screen has no verified DEX router or live quote source. No transaction was submitted and no wallet balance was changed.", "info");
  };
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
            <span>DEX Aggregator & Multi-Routing</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold">
              5 DEXes
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

          <button
            id="tab-btn-lifi-bridge"
            type="button"
            onClick={() => setDefiHubTab("lifi-bridge")}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              defiHubTab === "lifi-bridge"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Globe className="w-4 h-4 text-purple-300" />
            <span>LI.FI Bridge & Aggregator</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold">
              LI.FI API
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-zinc-500 hidden xl:flex items-center gap-2 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Multisig Target: {AGL_TREASURY_ADDRESS.slice(0, 6)}...{AGL_TREASURY_ADDRESS.slice(-4)} (3/5 Safe)</span>
        </div>
      </div>

      {/* TAB CONTENT 0: SMART DEX AGGREGATOR */}
      {defiHubTab === "dex-aggregator" && (
        <DexAggregatorComponent
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

      {/* TAB CONTENT 2: AMM SWAPS & STAKING VAULTS */}
      {defiHubTab === "swaps-staking" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10 text-xs text-zinc-400">
            Yield recommendations are paused until the live staking tiers and supported swap routes are verified. Only contract-returned tiers and real quotes will be shown here.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUMN 1: SWAPS */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
            <div>
              <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-[#0052FF]" />
                Decentralized Swaps
              </h2>
              <p className="text-[11px] text-zinc-500 mt-1">
                Instantly route, swap, and collateralize standard Base assets using fully automated liquidity routers.
              </p>
            </div>

            <form onSubmit={handleExecuteSwap} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                  <label className="uppercase font-bold">Pay From</label>
                  <span>Bal: {swapFrom === "ETH" ? wallet.balanceEth.toFixed(4) : wallet.aglTokenBalance.toLocaleString()} {swapFrom}</span>
                </div>
                <div className="relative">
                  <input
                    id="swap-input-amount"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={swapAmount}
                    onChange={(e) => handleSwapAmountChange(e.target.value)}
                    placeholder="0.1"
                    required
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 pr-16 text-xs font-mono text-white focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs text-zinc-400 font-bold font-mono">
                    {swapFrom}
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  id="swap-toggle-direction"
                  type="button"
                  onClick={() => {
                    setSwapFrom(prev => prev === "ETH" ? "AGL" : "ETH");
                    setSwapTo(prev => prev === "AGL" ? "ETH" : "AGL");
                    setSwapAmount("");
                    setSwapEstim("0");
                  }}
                  className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-[#0052FF] hover:border-[#0052FF]/30 transition-all text-xs"
                >
                  ⇅
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">Receive To (Estimated)</label>
                <div className="relative">
                  <input
                    id="swap-estimated-output"
                    type="text"
                    value={swapEstim}
                    disabled
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl p-3 text-xs text-zinc-500 font-mono focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs text-zinc-400 font-bold font-mono">
                    {swapTo}
                  </span>
                </div>
              </div>

              <button
                id="defi-swap-submit"
                type="submit"
                disabled={true}
                className="w-full py-3 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-xs font-bold font-display text-white shadow-lg shadow-blue-500/10 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Swap unavailable — router integration required</span>
              </button>
            </form>

            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-zinc-400 space-y-2">
              <div className="flex justify-between">
                <span>Price Ticker:</span>
                <span className="text-white">{onChainRate === null ? "Unavailable" : `1 ETH = ${onChainRate.toLocaleString()} AGL`}</span>
              </div>
              <div className="flex justify-between">
                <span>Network Fee:</span>
                <span className="text-zinc-400">Unavailable until a route is quoted</span>
              </div>
              <div className="flex justify-between">
                <span>Liquidity Depth:</span>
                <span className="text-zinc-400">Not verified</span>
              </div>
            </div>
          </div>

          {/* COLUMNS 2 & 3: ADVANCED CONTRACT-INTEGRATED STAKING PORTAL */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 flex flex-col justify-between">
            <StakingComponent
              wallet={wallet}
              onRefreshWallet={onRefreshWallet}
              addTerminalLog={addTerminalLog}
              showToast={showToast}
            />
          </div>
        </div>
        </div>
      )}

      {/* TAB CONTENT 3: LI.FI CROSS-CHAIN BRIDGE & AGGREGATOR */}
      {defiHubTab === "lifi-bridge" && (
        <LiFiBridgeComponent
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          addTerminalLog={addTerminalLog}
          showToast={showToast}
        />
      )}
    </div>
  );
}
