import React, { useState, useMemo } from "react";
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Percent, 
  Zap, 
  Coins, 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Info, 
  ShieldCheck,
  Award
} from "lucide-react";

interface APYCalculatorProps {
  userAglBalance?: number;
  onChainRate?: number; // e.g., 20000 AGL = 1 ETH
  stakingTiers?: Array<{
    id: number;
    name: string;
    durationDays: number;
    apr: number; // percentage, e.g. 8.0 for 8%
    aprBps: number;
  }>;
  onApplyToStake?: (amount: string, tierId: number) => void;
}

export default function APYCalculator({
  userAglBalance = 0,
  onChainRate = 20000,
  stakingTiers = [
    { id: 0, name: "30-Day Lock", durationDays: 30, apr: 8.0, aprBps: 800 },
    { id: 1, name: "60-Day Lock", durationDays: 60, apr: 12.5, aprBps: 1250 },
    { id: 2, name: "90-Day Lock", durationDays: 90, apr: 18.0, aprBps: 1800 },
    { id: 3, name: "180-Day Lock", durationDays: 180, apr: 25.0, aprBps: 2500 },
    { id: 4, name: "365-Day Lock", durationDays: 365, apr: 35.0, aprBps: 3500 }
  ],
  onApplyToStake
}: APYCalculatorProps) {
  // Inputs
  const [stakeAmount, setStakeAmount] = useState<string>("5000");
  const [selectedTierId, setSelectedTierId] = useState<number>(0);
  const [customDays, setCustomDays] = useState<number>(30);
  const [compoundingFreq, setCompoundingFreq] = useState<"none" | "monthly" | "weekly" | "daily">("daily");
  const [priceMultiplier, setPriceMultiplier] = useState<number>(1.0); // 1x, 1.5x, 2x, 5x price projection

  // Base ETH price in USD for USD value conversion (approx $3,100 / ETH)
  const ethPriceUsd = 3100;
  // AGL Price in USD = (1 / onChainRate) * ethPriceUsd
  const aglPriceUsd = (1 / (onChainRate || 20000)) * ethPriceUsd;
  const projectedAglPriceUsd = aglPriceUsd * priceMultiplier;

  // Sync custom days when tier changes
  const activeTier = useMemo(() => {
    return stakingTiers.find(t => t.id === selectedTierId) || stakingTiers[0];
  }, [selectedTierId, stakingTiers]);

  const currentApr = activeTier.apr; // e.g. 8.0%

  // Calculation Logic
  const calculations = useMemo(() => {
    const principal = parseFloat(stakeAmount) || 0;
    const days = activeTier.durationDays;
    const r = currentApr / 100; // decimal rate e.g. 0.08

    // Compounding frequency n (compounds per year)
    let n = 0;
    if (compoundingFreq === "monthly") n = 12;
    else if (compoundingFreq === "weekly") n = 52;
    else if (compoundingFreq === "daily") n = 365;

    // Effective APY calculation
    let effectiveApy = currentApr;
    if (n > 0) {
      effectiveApy = (Math.pow(1 + r / n, n) - 1) * 100;
    }

    // Time fraction in years
    const timeInYears = days / 365;

    // Final Total Balance
    let totalAgl = principal;
    if (n === 0) {
      // Simple Interest: P * (1 + r * t)
      totalAgl = principal * (1 + r * timeInYears);
    } else {
      // Compound Interest: P * (1 + r / n)^(n * t)
      totalAgl = principal * Math.pow(1 + r / n, n * timeInYears);
    }

    const netAglYield = Math.max(0, totalAgl - principal);
    const dailyAglYield = days > 0 ? netAglYield / days : 0;
    const monthlyAglYield = dailyAglYield * 30;

    // USD Equivalents
    const initialUsdValue = principal * aglPriceUsd;
    const netYieldUsdValue = netAglYield * projectedAglPriceUsd;
    const totalUsdValue = totalAgl * projectedAglPriceUsd;
    const netRoiPct = initialUsdValue > 0 ? ((totalUsdValue - initialUsdValue) / initialUsdValue) * 100 : 0;

    return {
      principal,
      days,
      apr: currentApr,
      effectiveApy,
      netAglYield,
      dailyAglYield,
      monthlyAglYield,
      totalAgl,
      initialUsdValue,
      netYieldUsdValue,
      totalUsdValue,
      netRoiPct
    };
  }, [stakeAmount, activeTier, currentApr, compoundingFreq, aglPriceUsd, projectedAglPriceUsd]);

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-950/80 space-y-6 shadow-2xl animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold font-display text-white">Interactive Staking APY Calculator</h2>
            <span className="text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase">
              Base Vault Simulator
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans mt-1">
            Simulate real-time compound yield returns across active AGL lockup tiers before committing funds on-chain.
          </p>
        </div>

        {/* Quick Balance indicator */}
        {userAglBalance > 0 && (
          <button
            onClick={() => setStakeAmount(String(userAglBalance))}
            className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <Coins className="w-3.5 h-3.5 text-purple-400" />
            <span>Use My Balance ({userAglBalance.toLocaleString()} AGL)</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Column (Controls & Inputs) - 5 Cols */}
        <div className="lg:col-span-5 space-y-5 bg-zinc-900/60 p-5 rounded-2xl border border-white/5">
          {/* Input 1: Stake Amount */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                Stake Amount (AGL)
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                ≈ ${(parseFloat(stakeAmount || "0") * aglPriceUsd).toFixed(2)} USD
              </span>
            </div>

            <div className="relative">
              <input
                id="apy-calc-amount-input"
                type="number"
                min="100"
                step="100"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="1000"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
              />
              <span className="absolute right-3 top-3 text-xs font-mono font-bold text-purple-400">
                AGL
              </span>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[1000, 5000, 10000, 25000, 50000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStakeAmount(String(amt))}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    stakeAmount === String(amt)
                      ? "bg-purple-500 text-white shadow-md"
                      : "bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-purple-500/40"
                  }`}
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Input 2: Staking Lock Duration Tier */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              Select Lock Duration Tier
            </label>
            <div className="grid grid-cols-1 gap-2">
              {stakingTiers.map((tier) => {
                const isSelected = selectedTierId === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      setSelectedTierId(tier.id);
                      setCustomDays(tier.durationDays);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-500/10"
                        : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full border ${isSelected ? "border-purple-400 bg-purple-500" : "border-zinc-600"}`} />
                      <div>
                        <span className="font-bold text-xs text-white block">{tier.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{tier.durationDays} Days Duration</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-extrabold text-emerald-400 block">
                        +{tier.apr.toFixed(2)}% APR
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input 3: Compounding Frequency */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              Compounding Frequency
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "none", label: "Simple" },
                { id: "monthly", label: "Monthly" },
                { id: "weekly", label: "Weekly" },
                { id: "daily", label: "Daily" }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCompoundingFreq(item.id as any)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-mono font-bold text-center border transition-all cursor-pointer ${
                    compoundingFreq === item.id
                      ? "bg-purple-500/20 border-purple-500 text-purple-300"
                      : "bg-zinc-950 border-white/10 text-zinc-500 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input 4: Bullish Price Multiplier Projection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                AGL Price Projection
              </label>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                ${projectedAglPriceUsd.toFixed(6)} USD ({priceMultiplier}x)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { mult: 1.0, label: "Current (1x)" },
                { mult: 1.5, label: "+50% (1.5x)" },
                { mult: 2.0, label: "2x Bullish" },
                { mult: 5.0, label: "5x Moon" }
              ].map((p) => (
                <button
                  key={p.mult}
                  type="button"
                  onClick={() => setPriceMultiplier(p.mult)}
                  className={`py-1.5 px-1 rounded-xl text-[10px] font-mono font-bold text-center border transition-all cursor-pointer ${
                    priceMultiplier === p.mult
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-zinc-950 border-white/10 text-zinc-500 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output Column (Live Simulation Summary) - 7 Cols */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          {/* Top Key Performance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Effective APY Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-zinc-900 to-zinc-950 border border-purple-500/30 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                Effective Yield Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white">
                  {calculations.effectiveApy.toFixed(2)}%
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {compoundingFreq === "none" ? "Simple APR" : `Compounded ${compoundingFreq}`}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 block">
                Base APR: {calculations.apr.toFixed(2)}% over {calculations.days} days lock
              </span>
            </div>

            {/* Total Estimated ROI Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                Projected Total Return (ROI)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-300">
                  +${calculations.netYieldUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  ({calculations.netRoiPct >= 0 ? "+" : ""}{calculations.netRoiPct.toFixed(1)}%)
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 block">
                Net yield token bonus: +{calculations.netAglYield.toLocaleString(undefined, { maximumFractionDigits: 2 })} AGL
              </span>
            </div>
          </div>

          {/* Breakdown Table Box */}
          <div className="bg-zinc-900/80 p-5 rounded-2xl border border-white/5 space-y-3 font-mono text-xs">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
              <TrendingUp className="w-4 h-4 text-purple-400" /> Simulated Yield Breakdown
            </h3>

            <div className="space-y-2 divide-y divide-white/5">
              <div className="flex justify-between items-center pt-1 text-zinc-300">
                <span className="text-zinc-400">Principal Deposit:</span>
                <span className="font-bold text-white">
                  {calculations.principal.toLocaleString()} AGL (${calculations.initialUsdValue.toFixed(2)})
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-zinc-300">
                <span className="text-zinc-400">Estimated Daily Reward:</span>
                <span className="font-bold text-emerald-400">
                  +{calculations.dailyAglYield.toFixed(2)} AGL / day (${(calculations.dailyAglYield * projectedAglPriceUsd).toFixed(3)})
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-zinc-300">
                <span className="text-zinc-400">Estimated Monthly Accumulation:</span>
                <span className="font-bold text-emerald-400">
                  +{calculations.monthlyAglYield.toFixed(2)} AGL / mo (${(calculations.monthlyAglYield * projectedAglPriceUsd).toFixed(2)})
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-zinc-300">
                <span className="text-zinc-400">Net Rewards at Maturity:</span>
                <span className="font-bold text-purple-300">
                  +{calculations.netAglYield.toLocaleString(undefined, { maximumFractionDigits: 2 })} AGL
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-sm text-white font-bold bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/20">
                <span className="text-purple-300">Total Projected Balance:</span>
                <span className="text-emerald-300 font-extrabold text-base">
                  {calculations.totalAgl.toLocaleString(undefined, { maximumFractionDigits: 2 })} AGL (${calculations.totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                </span>
              </div>
            </div>
          </div>

          {/* Action Callout */}
          {onApplyToStake && (
            <button
              id="btn-apply-apy-calc-to-stake"
              type="button"
              onClick={() => onApplyToStake(stakeAmount, selectedTierId)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold font-mono text-xs shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Apply {calculations.principal.toLocaleString()} AGL to Stake Form & Commit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
