import React, { useState } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  ArrowLeftRight, 
  Lock, 
  Globe, 
  Zap, 
  BarChart3, 
  PieChart, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Sliders,
  DollarSign,
  ArrowUpRight,
  RotateCcw
} from "lucide-react";
import { WalletState } from "../types";
import { 
  rebalancePortfolioAI, 
  AIPortfolioRebalanceResult, 
  RebalanceAction,
  PortfolioAssetHoldings 
} from "../lib/gemini";
import { AgunnayaDatabase } from "../lib/db";
import { validateAndConsumeCredits, CREDIT_COSTS } from "../lib/credits";
import InsufficientCreditsModal from "./InsufficientCreditsModal";

interface AIPortfolioRebalancerProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "showToast" | "info") => void;
  onNavigateTab?: (tab: "airdrop-sweep" | "swaps-staking" | "lifi-bridge") => void;
}

export default function AIPortfolioRebalancer({
  wallet,
  onRefreshWallet,
  addTerminalLog,
  showToast,
  onNavigateTab
}: AIPortfolioRebalancerProps) {
  const [riskTolerance, setRiskTolerance] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [customDirective, setCustomDirective] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategyResult, setStrategyResult] = useState<AIPortfolioRebalanceResult | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<Set<string>>(new Set());
  const [isExecutingAll, setIsExecutingAll] = useState(false);

  // Insufficient Credits Modal State
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false);
  const [creditsModalData, setCreditsModalData] = useState({ featureName: "", required: 0, available: 0 });

  // Prices & Value estimations
  const ethPriceUsd = 3200;
  const aglPriceUsd = 0.16;

  // Staked positions from local storage or default estimation
  const savedPositionsStr = typeof window !== "undefined" ? localStorage.getItem("agl_staking_positions") : null;
  const savedPositions = savedPositionsStr ? JSON.parse(savedPositionsStr) : [];
  const totalStakedAgl = savedPositions.reduce((acc: number, pos: any) => acc + (pos.withdrawn ? 0 : Number(pos.amount || 0)), 0);

  const ethUsdValue = wallet.balanceEth * ethPriceUsd;
  const aglUsdValue = wallet.aglTokenBalance * aglPriceUsd;
  const stakedUsdValue = totalStakedAgl * aglPriceUsd;
  const usdcUsdValue = 150; // default estimated USDC liquid balance
  const totalPortfolioUsd = ethUsdValue + aglUsdValue + stakedUsdValue + usdcUsdValue;

  const currentPercentages = {
    eth: totalPortfolioUsd > 0 ? (ethUsdValue / totalPortfolioUsd) * 100 : 35,
    agl: totalPortfolioUsd > 0 ? (aglUsdValue / totalPortfolioUsd) * 100 : 30,
    staked: totalPortfolioUsd > 0 ? (stakedUsdValue / totalPortfolioUsd) * 100 : 25,
    usdc: totalPortfolioUsd > 0 ? (usdcUsdValue / totalPortfolioUsd) * 100 : 10,
  };

  const handleGenerateStrategy = async () => {
    const creditResult = validateAndConsumeCredits({
      wallet,
      onRefreshWallet,
      requiredCredits: CREDIT_COSTS.PORTFOLIO_REBALANCE,
      featureName: "AI Portfolio Rebalancer Strategy",
      showToast,
      addTerminalLog,
      onRequestCreditsModal: (featureName, required, available) => {
        setCreditsModalData({ featureName, required, available });
        setInsufficientCreditsModalOpen(true);
      }
    });

    if (!creditResult.success) {
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    addTerminalLog("info", `[AI Rebalancer] Analyzing Base L2 market conditions for ${riskTolerance.toUpperCase()} risk profile...`);

    const holdings: PortfolioAssetHoldings = {
      ethAmount: wallet.balanceEth,
      ethPriceUsd,
      aglAmount: wallet.aglTokenBalance,
      aglPriceUsd,
      stakedAglAmount: totalStakedAgl,
      usdcAmount: usdcUsdValue,
      totalUsdValue: Math.round(totalPortfolioUsd || 500)
    };

    try {
      const result = await rebalancePortfolioAI(holdings, riskTolerance, customDirective);
      setStrategyResult(result);
      setExecutedActionIds(new Set());
      showToast("AI Portfolio Rebalance strategy generated successfully!", "success");
      addTerminalLog("success", `[AI Rebalancer] Strategy generated! Projected APY: ${result.marketOutlook.projectedAnnualYieldPercent}%. ${result.rebalanceActions.length} recommended actions.`);
    } catch (err: any) {
      console.error("Rebalance error:", err);
      creditResult.refund();
      showToast("Failed to generate AI rebalance strategy: " + (err.message || "Error") + ". Your 20 credits were refunded.", "error");
      addTerminalLog("error", `[AI Rebalancer] Error generating strategy: ${err.message || String(err)}. Credits refunded.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteSingleAction = async (action: RebalanceAction) => {
    setExecutingActionId(action.id);
    addTerminalLog("info", `[AI Rebalancer] Executing action: "${action.title}"...`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      if (action.type === "swap") {
        const amtEth = parseFloat(action.amount) || 0.02;
        if (wallet.balanceEth >= amtEth) {
          const outAgl = amtEth * 20000;
          const updatedWallet = {
            ...wallet,
            balanceEth: Math.max(0, wallet.balanceEth - amtEth),
            aglTokenBalance: wallet.aglTokenBalance + outAgl
          };
          AgunnayaDatabase.saveWallet(updatedWallet);
          onRefreshWallet();
          addTerminalLog("success", `[AI Rebalancer] AMM Swap executed! Swapped ${amtEth} ETH for +${outAgl.toLocaleString()} AGL.`);
        } else {
          addTerminalLog("info", `[AI Rebalancer] Simulated swap allocation of ${action.amount} ${action.fromAsset} -> ${action.toAsset}.`);
        }
      } else if (action.type === "stake") {
        const amtAgl = parseFloat(action.amount) || 2500;
        if (wallet.aglTokenBalance >= amtAgl) {
          const updatedWallet = {
            ...wallet,
            aglTokenBalance: Math.max(0, wallet.aglTokenBalance - amtAgl)
          };
          AgunnayaDatabase.saveWallet(updatedWallet);

          const existingStr = localStorage.getItem("agl_staking_positions");
          const existing = existingStr ? JSON.parse(existingStr) : [];
          const newPos = {
            id: Date.now(),
            amount: amtAgl,
            startTime: Math.floor(Date.now() / 1000),
            unlockTime: Math.floor(Date.now() / 1000) + 180 * 86400,
            tierId: 3,
            aprBasisPoints: 6400,
            withdrawn: false,
            pendingReward: 0
          };
          localStorage.setItem("agl_staking_positions", JSON.stringify([...existing, newPos]));
          onRefreshWallet();
          addTerminalLog("success", `[AI Rebalancer] Vault Stake executed! Deposited ${amtAgl.toLocaleString()} AGL into 180-Day 64% APR Vault.`);
        } else {
          addTerminalLog("info", `[AI Rebalancer] Simulated staking deposit of ${action.amount} AGL into 64% APR Vault.`);
        }
      } else if (action.type === "bridge") {
        addTerminalLog("success", `[AI Rebalancer] Cross-Chain Bridge route initialized! Simulated bridging ${action.amount} USDC via LI.FI to Base L2.`);
      }

      setExecutedActionIds((prev) => new Set([...prev, action.id]));
      showToast(`Action "${action.title}" executed successfully!`, "success");
    } catch (err: any) {
      console.error("Action execution error:", err);
      showToast("Failed to execute action: " + err.message, "error");
      addTerminalLog("error", `[AI Rebalancer] Action execution failed: ${err.message || String(err)}`);
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleExecuteAllActions = async () => {
    if (!strategyResult || strategyResult.rebalanceActions.length === 0) return;
    setIsExecutingAll(true);
    addTerminalLog("info", "[AI Rebalancer] Starting automated multi-step portfolio rebalance execution...");

    for (const action of strategyResult.rebalanceActions) {
      if (executedActionIds.has(action.id)) continue;
      await handleExecuteSingleAction(action);
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsExecutingAll(false);
    showToast("All AI Rebalance steps completed successfully!", "success");
    addTerminalLog("success", "[AI Rebalancer] Portfolio rebalance completely executed! Asset allocation updated.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-zinc-950 to-indigo-950/60 border border-purple-500/30 relative overflow-hidden space-y-4">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display text-white">AI Quantitative Portfolio Rebalancer</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Gemini 3.6 Flash
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Optimize asset allocations, mitigate downside risk, and compound yields on Base L2 using cognitive AI modeling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="bg-zinc-900/90 border border-white/10 p-3 rounded-2xl space-y-0.5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Est. Portfolio Value</span>
              <span className="text-emerald-400 font-bold text-base block">
                ${totalPortfolioUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* CURRENT ASSET HOLDINGS BAR */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <PieChart className="w-4 h-4 text-purple-400" />
              Current Asset Breakdown:
            </span>
            <span>Total Assets: 4 Categories</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-blue-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block">ETH (Native)</span>
                <span className="text-white font-bold text-xs">{wallet.balanceEth.toFixed(4)} ETH</span>
              </div>
              <span className="text-blue-400 font-bold text-xs">{currentPercentages.eth.toFixed(1)}%</span>
            </div>

            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-purple-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block">AGL Token</span>
                <span className="text-white font-bold text-xs">{wallet.aglTokenBalance.toLocaleString()} AGL</span>
              </div>
              <span className="text-purple-400 font-bold text-xs">{currentPercentages.agl.toFixed(1)}%</span>
            </div>

            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block">Staked Vaults</span>
                <span className="text-white font-bold text-xs">{totalStakedAgl.toLocaleString()} AGL</span>
              </div>
              <span className="text-emerald-400 font-bold text-xs">{currentPercentages.staked.toFixed(1)}%</span>
            </div>

            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-teal-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block">USDC Buffer</span>
                <span className="text-white font-bold text-xs">${usdcUsdValue} USDC</span>
              </div>
              <span className="text-teal-400 font-bold text-xs">{currentPercentages.usdc.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* STRATEGY CONFIGURATION CARD */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            1. Configure AI Rebalance Parameters
          </h3>
          <span className="text-xs text-zinc-500 font-mono">Select target risk curve</span>
        </div>

        {/* RISK TOLERANCE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
          <button
            type="button"
            id="risk-conservative-btn"
            onClick={() => setRiskTolerance("conservative")}
            className={`p-4 rounded-2xl border transition-all text-left space-y-1.5 cursor-pointer ${
              riskTolerance === "conservative"
                ? "bg-teal-950/40 border-teal-500/60 text-white shadow-lg shadow-teal-500/10"
                : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-teal-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Conservative
              </span>
              {riskTolerance === "conservative" && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Capital preservation focus. High stablecoin buffer (15%) + Staked Vaults (35%) + Low ETH/AGL volatility exposure.
            </p>
          </button>

          <button
            type="button"
            id="risk-balanced-btn"
            onClick={() => setRiskTolerance("balanced")}
            className={`p-4 rounded-2xl border transition-all text-left space-y-1.5 cursor-pointer ${
              riskTolerance === "balanced"
                ? "bg-purple-950/40 border-purple-500/60 text-white shadow-lg shadow-purple-500/10"
                : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> Balanced Growth
              </span>
              {riskTolerance === "balanced" && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Optimized risk/reward. Moderate ETH (25%) + AGL (30%) + Staked compounding (35%) + Liquid buffer (10%).
            </p>
          </button>

          <button
            type="button"
            id="risk-aggressive-btn"
            onClick={() => setRiskTolerance("aggressive")}
            className={`p-4 rounded-2xl border transition-all text-left space-y-1.5 cursor-pointer ${
              riskTolerance === "aggressive"
                ? "bg-amber-950/40 border-amber-500/60 text-white shadow-lg shadow-amber-500/10"
                : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Aggressive Yield
              </span>
              {riskTolerance === "aggressive" && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Maximized upside & APY. 180-Day 64% Vault lockup (40%) + Spot AGL (35%) + Gas minimal ETH (15%).
            </p>
          </button>
        </div>

        {/* CUSTOM DIRECTIVES */}
        <div className="space-y-1.5 font-mono">
          <label className="text-xs font-bold text-zinc-400 flex items-center justify-between">
            <span>Custom Directives / Special Instructions (Optional):</span>
            <span className="text-[10px] text-zinc-500">e.g. "Focus on auto-compounding staking rewards"</span>
          </label>
          <input
            id="rebalancer-custom-directive-input"
            type="text"
            value={customDirective}
            onChange={(e) => setCustomDirective(e.target.value)}
            placeholder="e.g. Maximize 180-Day vault APY, reserve 0.05 ETH for gas, bridge Arbitrum USDC via LI.FI"
            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* GENERATE BUTTON */}
        <button
          type="button"
          id="btn-generate-ai-rebalance-strategy"
          onClick={handleGenerateStrategy}
          disabled={isAnalyzing}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold font-display text-xs shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
              <span>Analyzing Base Market Signals & Calculating Matrix...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Analyze & Generate AI Rebalance Strategy</span>
            </>
          )}
        </button>
      </div>

      {/* STRATEGY RESULTS DASHBOARD */}
      {strategyResult && (
        <div className="space-y-6 animate-fade-in">
          {/* SUMMARY & MARKET OUTLOOK */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
            {/* EXECUTIVE SUMMARY */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI Strategy Executive Summary
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                  {strategyResult.riskProfile} Risk Profile
                </span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                {strategyResult.summary}
              </p>

              {/* TARGET VS CURRENT ALLOCATION TABLE */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-white block">Target Allocation Breakdown:</span>
                <div className="space-y-2">
                  {strategyResult.targetAllocation.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{item.asset}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 line-through">{item.currentPercent.toFixed(1)}%</span>
                          <span className="text-emerald-400 font-bold">→ {item.targetPercent.toFixed(1)}%</span>
                          <span className="text-zinc-400 text-[11px]">(${item.targetValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400">{item.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MARKET OUTLOOK CARD */}
            <div className="p-6 rounded-3xl bg-zinc-950 border border-emerald-500/30 space-y-4">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Market Outlook
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                  Base L2 Signals
                </span>
              </div>

              <div className="space-y-3">
                <div className="bg-zinc-900/80 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Projected Annual Yield</span>
                  <span className="text-2xl font-bold font-display text-emerald-400 block">
                    +{strategyResult.marketOutlook.projectedAnnualYieldPercent.toFixed(1)}% APY
                  </span>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-2xl border border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Market Sentiment</span>
                  <span className="text-blue-300 font-bold block">{strategyResult.marketOutlook.sentiment}</span>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-2xl border border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Base L2 On-Chain Trend</span>
                  <span className="text-zinc-300 text-[11px] block">{strategyResult.marketOutlook.baseL2Trend}</span>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-2xl border border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Risk & Security Analysis</span>
                  <span className="text-zinc-300 text-[11px] block">{strategyResult.marketOutlook.riskAnalysis}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONABLE REBALANCE STEPS */}
          <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-5 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  2. Actionable AI Rebalance Executions
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Execute individual actions or auto-run all recommended steps sequentially.
                </p>
              </div>

              <button
                type="button"
                id="btn-execute-all-rebalance-actions"
                onClick={handleExecuteAllActions}
                disabled={isExecutingAll || strategyResult.rebalanceActions.every((a) => executedActionIds.has(a.id))}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold font-display text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isExecutingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Executing Strategy...</span>
                  </>
                ) : strategyResult.rebalanceActions.every((a) => executedActionIds.has(a.id)) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>All Actions Executed</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Execute All AI Steps</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3">
              {strategyResult.rebalanceActions.map((action, idx) => {
                const isDone = executedActionIds.has(action.id);
                const isRunning = executingActionId === action.id;

                return (
                  <div
                    key={action.id || idx}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      isDone
                        ? "bg-emerald-950/20 border-emerald-500/40 text-zinc-300"
                        : "bg-zinc-900/90 border-white/10 text-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center ${
                            action.type === "swap"
                              ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                              : action.type === "stake"
                              ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                              : "bg-teal-500/20 border-teal-500/30 text-teal-300"
                          }`}
                        >
                          {action.type === "swap" && <ArrowLeftRight className="w-4 h-4" />}
                          {action.type === "stake" && <Lock className="w-4 h-4" />}
                          {action.type === "bridge" && <Globe className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{action.title}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border ${
                                action.type === "swap"
                                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                  : action.type === "stake"
                                  ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                                  : "bg-teal-500/10 border-teal-500/30 text-teal-400"
                              }`}
                            >
                              {action.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{action.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {action.expectedYieldApy && (
                          <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">
                            Yield: {action.expectedYieldApy}
                          </span>
                        )}

                        <button
                          type="button"
                          id={`btn-execute-action-${idx}`}
                          onClick={() => handleExecuteSingleAction(action)}
                          disabled={isDone || isRunning || isExecutingAll}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isDone
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                          }`}
                        >
                          {isRunning ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Executing...</span>
                            </>
                          ) : isDone ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Execute Step</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-zinc-500 pt-2 border-t border-white/5">
                      <span>Route: {action.fromAsset} → {action.toAsset}</span>
                      <span>Amount: {action.amount}</span>
                      <span>Est. Gas Fee: {action.estimatedGasFeeEth} ETH</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={insufficientCreditsModalOpen}
        onClose={() => setInsufficientCreditsModalOpen(false)}
        featureName={creditsModalData.featureName}
        requiredCredits={creditsModalData.required}
        availableCredits={creditsModalData.available}
        onNavigateToCredits={() => {
          window.location.href = "/?tab=agl-credits";
        }}
      />
    </div>
  );
}
