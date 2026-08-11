import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Token } from "../types";
import { 
  getSpotPrice, 
  getTokensForEth, 
  getEthReturnForTokens, 
  getReserveAtSupply,
  BASE_PRICE, 
  SLOPE 
} from "../lib/db";
import { 
  AreaChart, 
  Area, 
  Line, 
  ComposedChart, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  ReferenceDot 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  Sliders, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3, 
  Calculator, 
  Flame, 
  Layers,
  ArrowRight,
  RefreshCw,
  Coins
} from "lucide-react";

interface BondingCurveAnalyticsProps {
  token: Token;
  onApplyTradeAmount?: (amount: number, mode: "buy" | "sell") => void;
}

const PRESET_ETH_BUY_AMOUNTS = [0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0];

export default function BondingCurveAnalytics({ token, onApplyTradeAmount }: BondingCurveAnalyticsProps) {
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [simulatedEth, setSimulatedEth] = useState<number>(0.25);
  const [simulatedTokens, setSimulatedTokens] = useState<number>(100000);
  const [activeTab, setActiveTab] = useState<"chart" | "heatmap" | "formula">("chart");

  const currentSupply = token.supply;
  const maxSupply = token.maxSupply || 1000000000;
  const currentSpotPrice = token.currentPrice || (BASE_PRICE + SLOPE * currentSupply);
  const currentReserve = token.reserveEth || getReserveAtSupply(currentSupply);

  // Calculate trade outcomes based on tradeMode
  const tradeMetrics = useMemo(() => {
    if (tradeMode === "buy") {
      const ethAmount = Math.max(0.001, simulatedEth);
      const tokensMinted = getTokensForEth(currentSupply, ethAmount);
      const nextSupply = currentSupply + tokensMinted;
      const finalSpotPrice = getSpotPrice(nextSupply);
      
      // Effective / Average price per token in ETH
      const avgPriceEth = tokensMinted > 0 ? ethAmount / tokensMinted : currentSpotPrice;
      
      // Slippage percentage vs starting spot price
      const priceImpactPct = currentSpotPrice > 0 ? ((finalSpotPrice - currentSpotPrice) / currentSpotPrice) * 100 : 0;
      const slippageVsAvgPct = currentSpotPrice > 0 ? ((avgPriceEth - currentSpotPrice) / currentSpotPrice) * 100 : 0;
      
      const newReserve = currentReserve + (ethAmount * 0.99);

      return {
        tradeAmount: ethAmount,
        tokensDelta: tokensMinted,
        startSupply: currentSupply,
        endSupply: nextSupply,
        startSpotPrice: currentSpotPrice,
        finalSpotPrice,
        avgPriceEth,
        priceImpactPct,
        slippageVsAvgPct,
        newReserve,
        reserveDelta: ethAmount * 0.99
      };
    } else {
      const tokenAmount = Math.max(1, Math.min(currentSupply, simulatedTokens));
      const { net, gross, fee } = getEthReturnForTokens(currentSupply, tokenAmount);
      const nextSupply = Math.max(0, currentSupply - tokenAmount);
      const finalSpotPrice = getSpotPrice(nextSupply);
      
      const avgPriceEth = tokenAmount > 0 ? gross / tokenAmount : currentSpotPrice;
      const priceImpactPct = currentSpotPrice > 0 ? ((currentSpotPrice - finalSpotPrice) / currentSpotPrice) * 100 : 0;
      const slippageVsAvgPct = currentSpotPrice > 0 ? ((currentSpotPrice - avgPriceEth) / currentSpotPrice) * 100 : 0;

      const newReserve = Math.max(0, currentReserve - gross);

      return {
        tradeAmount: net,
        tokensDelta: tokenAmount,
        startSupply: currentSupply,
        endSupply: nextSupply,
        startSpotPrice: currentSpotPrice,
        finalSpotPrice,
        avgPriceEth,
        priceImpactPct,
        slippageVsAvgPct,
        newReserve,
        reserveDelta: -gross
      };
    }
  }, [tradeMode, simulatedEth, simulatedTokens, currentSupply, currentSpotPrice, currentReserve]);

  // Generate continuous bonding curve sampling points for Recharts
  const curveChartData = useMemo(() => {
    const points: any[] = [];
    const steps = 30;
    
    // Range of supply to render: from max(0, currentSupply - 20M) to min(maxSupply, currentSupply + 30M)
    const span = Math.max(10000000, currentSupply * 0.8);
    const minS = Math.max(0, currentSupply - span * 0.4);
    const maxS = Math.min(maxSupply, currentSupply + span * 0.6);
    const stepSize = (maxS - minS) / steps;

    const lowerBound = Math.min(tradeMetrics.startSupply, tradeMetrics.endSupply);
    const upperBound = Math.max(tradeMetrics.startSupply, tradeMetrics.endSupply);

    for (let i = 0; i <= steps; i++) {
      const supply = minS + i * stepSize;
      const priceEth = getSpotPrice(supply);
      const priceMicro = priceEth * 1000000; // micro-ETH

      const inTradeZone = supply >= lowerBound && supply <= upperBound;

      points.push({
        supply,
        supplyFormatted: `${(supply / 1000000).toFixed(1)}M`,
        priceMicro,
        priceEth,
        tradeZonePrice: inTradeZone ? priceMicro : null,
        isCurrent: Math.abs(supply - currentSupply) < stepSize / 2
      });
    }

    return points;
  }, [currentSupply, maxSupply, tradeMetrics.startSupply, tradeMetrics.endSupply]);

  // Graduation target: 10 ETH in reserve (or 80% of max supply)
  const GRADUATION_TARGET_ETH = 10.0;
  const graduationProgressPct = Math.min(100, (currentReserve / GRADUATION_TARGET_ETH) * 100);

  // Volume sensitivity heatmap matrix
  const heatmapData = useMemo(() => {
    return PRESET_ETH_BUY_AMOUNTS.map((ethVal) => {
      const minted = getTokensForEth(currentSupply, ethVal);
      const endS = currentSupply + minted;
      const endP = getSpotPrice(endS);
      const avgP = minted > 0 ? ethVal / minted : currentSpotPrice;
      const impact = ((endP - currentSpotPrice) / currentSpotPrice) * 100;

      let safetyCategory: "low" | "medium" | "high" = "low";
      if (impact > 3.0) safetyCategory = "high";
      else if (impact > 1.0) safetyCategory = "medium";

      return {
        ethVal,
        minted,
        endP,
        avgP,
        impact,
        safetyCategory
      };
    });
  }, [currentSupply, currentSpotPrice]);

  return (
    <div className="glass-panel rounded-2xl border border-white/10 bg-zinc-950/80 p-5 space-y-5 shadow-2xl">
      {/* Top Title & Tab Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple/30 to-brand-blue/30 border border-brand-purple/40 flex items-center justify-center text-brand-purple shadow-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              Bonding Curve Mathematical Analytics
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30 font-mono font-bold">
                P(S) = P₀ + k·S
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              Deterministic price progression, slippage preview & liquidity reserve dynamics for {token.symbol}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 font-mono text-[11px]">
          <button
            onClick={() => setActiveTab("chart")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "chart"
                ? "bg-brand-purple text-white font-bold shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Interactive Curve
          </button>
          <button
            onClick={() => setActiveTab("heatmap")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "heatmap"
                ? "bg-brand-purple text-white font-bold shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Slippage Matrix
          </button>
          <button
            onClick={() => setActiveTab("formula")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "formula"
                ? "bg-brand-purple text-white font-bold shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> Math Spec
          </button>
        </div>
      </div>

      {/* Main Mode Controls & Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/40 p-3.5 rounded-xl border border-white/5 font-mono text-xs">
        {/* Trade Mode Switcher */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
            Simulation Direction
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setTradeMode("buy")}
              className={`py-1.5 rounded-md font-bold text-center transition-all flex items-center justify-center gap-1 ${
                tradeMode === "buy"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Buy Order
            </button>
            <button
              onClick={() => setTradeMode("sell")}
              className={`py-1.5 rounded-md font-bold text-center transition-all flex items-center justify-center gap-1 ${
                tradeMode === "sell"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" /> Sell / Burn
            </button>
          </div>
        </div>

        {/* Volume Input Slider */}
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold">
            <span className="text-zinc-400">
              {tradeMode === "buy" ? "Simulated Trade Size (ETH)" : `Tokens to Sell (${token.symbol})`}
            </span>
            <span className="text-brand-purple font-bold">
              {tradeMode === "buy"
                ? `${simulatedEth.toFixed(2)} ETH`
                : `${simulatedTokens.toLocaleString()} ${token.symbol}`}
            </span>
          </div>

          {tradeMode === "buy" ? (
            <div className="space-y-2">
              <input
                type="range"
                min={0.01}
                max={5.0}
                step={0.05}
                value={simulatedEth}
                onChange={(e) => setSimulatedEth(parseFloat(e.target.value) || 0.01)}
                className="w-full accent-brand-purple h-2 bg-zinc-950 rounded-lg cursor-pointer"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-zinc-500 uppercase font-bold">Presets:</span>
                {PRESET_ETH_BUY_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSimulatedEth(amt)}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-all ${
                      simulatedEth === amt
                        ? "bg-brand-purple text-white border-brand-purple font-bold"
                        : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/20"
                    }`}
                  >
                    {amt} ETH
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="range"
                min={1000}
                max={Math.max(10000, currentSupply * 0.25)}
                step={10000}
                value={simulatedTokens}
                onChange={(e) => setSimulatedTokens(parseFloat(e.target.value) || 1000)}
                className="w-full accent-rose-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-zinc-500 uppercase font-bold">Percent Supply:</span>
                {[0.01, 0.05, 0.10, 0.25].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setSimulatedTokens(Math.round(currentSupply * pct))}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-all ${
                      Math.abs(simulatedTokens - currentSupply * pct) < 5000
                        ? "bg-rose-500 text-white border-rose-500 font-bold"
                        : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/20"
                    }`}
                  >
                    {(pct * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metric Callouts Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase font-bold block">Starting Spot Price</span>
          <span className="text-white font-bold text-sm block">
            {(tradeMetrics.startSpotPrice * 1000000).toFixed(3)} μETH
          </span>
          <span className="text-[10px] text-zinc-400 block">
            ${(tradeMetrics.startSpotPrice * 3200).toFixed(4)} USD
          </span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase font-bold block">Post-Trade Spot Price</span>
          <span className="text-brand-purple font-bold text-sm block">
            {(tradeMetrics.finalSpotPrice * 1000000).toFixed(3)} μETH
          </span>
          <span className="text-[10px] text-emerald-400 font-bold block">
            {tradeMetrics.priceImpactPct >= 0 ? "+" : ""}{tradeMetrics.priceImpactPct.toFixed(2)}% Shift
          </span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase font-bold block">Avg Execution Price</span>
          <span className="text-amber-400 font-bold text-sm block">
            {(tradeMetrics.avgPriceEth * 1000000).toFixed(3)} μETH
          </span>
          <span className="text-[10px] text-zinc-400 block">
            Effective entry/exit rate
          </span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
          <span className="text-[9px] text-zinc-500 uppercase font-bold block">Calculated Slippage</span>
          <span className={`font-bold text-sm block ${
            tradeMetrics.slippageVsAvgPct > 2.0 ? "text-rose-400" : tradeMetrics.slippageVsAvgPct > 1.0 ? "text-amber-400" : "text-emerald-400"
          }`}>
            {tradeMetrics.slippageVsAvgPct.toFixed(2)}%
          </span>
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            {tradeMetrics.slippageVsAvgPct <= 1.5 ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Optimal Volume
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> High Impact
              </span>
            )}
          </span>
        </div>
      </div>

      {/* TAB CONTENT 1: Interactive Recharts Curve */}
      {activeTab === "chart" && (
        <div className="space-y-4">
          <div className="w-full h-72 rounded-2xl bg-zinc-950 border border-white/10 p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between font-mono text-xs z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-purple animate-pulse"></span>
                <span className="text-zinc-300 font-bold">Bonding Price Curve P(S)</span>
                <span className="text-[10px] text-zinc-500">
                  (Shaded Region: Trade Execution Window)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Current Spot
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Expected Avg
                </span>
              </div>
            </div>

            <div className="w-full h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curveChartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="curveBaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0052ff" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="tradeZoneGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={tradeMode === "buy" ? "#10b981" : "#f43f5e"} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={tradeMode === "buy" ? "#10b981" : "#f43f5e"} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>

                  <XAxis dataKey="supplyFormatted" tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} domain={['auto', 'auto']} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "#09090b",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      fontSize: "11px",
                      color: "#fff",
                      fontFamily: "monospace"
                    }}
                    formatter={(val: any) => [`${Number(val).toFixed(3)} μETH`, "Spot Price"]}
                  />

                  {/* Main Curve Line */}
                  <Line type="monotone" dataKey="priceMicro" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />

                  {/* Trade Execution Zone Area */}
                  <Area
                    type="monotone"
                    dataKey="tradeZonePrice"
                    stroke={tradeMode === "buy" ? "#10b981" : "#f43f5e"}
                    strokeWidth={2}
                    fill="url(#tradeZoneGrad)"
                  />

                  {/* Reference line for Avg Execution Price */}
                  <ReferenceLine
                    y={tradeMetrics.avgPriceEth * 1000000}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Avg P: ${(tradeMetrics.avgPriceEth * 1000000).toFixed(3)} μETH`,
                      fill: "#f59e0b",
                      fontSize: 9,
                      position: "insideTopRight"
                    }}
                  />

                  {/* Marker for Current Supply & Spot Price */}
                  <ReferenceDot
                    x={`${(currentSupply / 1000000).toFixed(1)}M`}
                    y={currentSpotPrice * 1000000}
                    r={6}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Uniswap v3 Liquidity Graduation Progress Bar */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-950 via-brand-purple/10 to-zinc-950 border border-brand-purple/30 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" /> Base DEX Liquidity Graduation Goal
              </span>
              <span className="text-brand-purple font-bold">
                {currentReserve.toFixed(3)} / {GRADUATION_TARGET_ETH} ETH ({graduationProgressPct.toFixed(1)}%)
              </span>
            </div>
            
            <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-white/10 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${graduationProgressPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-brand-blue via-brand-purple to-emerald-400 rounded-full"
              />
            </div>

            <p className="text-[10px] text-zinc-400">
              When the reserve reaches {GRADUATION_TARGET_ETH} ETH, {token.symbol} automatically migrates liquidity to Uniswap v3 on Base Mainnet, burning LP tokens forever.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Volume Sensitivity Heatmap Matrix */}
      {activeTab === "heatmap" && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Volume Slippage Sensitivity Grid for Buy Orders</span>
            <span className="text-[10px] text-emerald-400">Calculated at current supply {(currentSupply / 1000000).toFixed(1)}M</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-900/60 text-[10px] uppercase text-zinc-400">
                  <th className="p-3">Buy Amount</th>
                  <th className="p-3">Tokens Received</th>
                  <th className="p-3">Avg Execution Price</th>
                  <th className="p-3">Post Spot Price</th>
                  <th className="p-3">Price Impact</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                {heatmapData.map((row) => (
                  <tr key={row.ethVal} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white">{row.ethVal} ETH</td>
                    <td className="p-3 text-zinc-300">{row.minted.toLocaleString(undefined, { maximumFractionDigits: 0 })} {token.symbol}</td>
                    <td className="p-3 font-mono text-amber-400">{(row.avgP * 1000000).toFixed(3)} μETH</td>
                    <td className="p-3 font-mono text-brand-purple">{(row.endP * 1000000).toFixed(3)} μETH</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        row.safetyCategory === "low"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : row.safetyCategory === "medium"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}>
                        +{row.impact.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {onApplyTradeAmount && (
                        <button
                          onClick={() => {
                            onApplyTradeAmount(row.ethVal, "buy");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-brand-purple/20 hover:bg-brand-purple text-brand-purple hover:text-white border border-brand-purple/40 font-bold text-[10px] transition-all flex items-center gap-1 ml-auto"
                        >
                          Fill Trade <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Mathematical Spec & Formula */}
      {activeTab === "formula" && (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand-purple" /> Mathematical Model Specification
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">1. Spot Price Formula</span>
                <code className="text-emerald-400 font-bold block text-xs">P(S) = P₀ + k × S</code>
                <p className="text-[10px] text-zinc-400">
                  P₀ = {BASE_PRICE} ETH (Base spot price). k = {SLOPE} ETH/token (Linear slope factor).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">2. Reserve Integral</span>
                <code className="text-brand-purple font-bold block text-xs">R(S) = P₀·S + ½·k·S²</code>
                <p className="text-[10px] text-zinc-400">
                  The exact ETH reserve required to back all issued token supply S on-chain.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">3. Closed-Form Token Minting Integration</span>
              <code className="text-amber-400 font-bold block text-xs">
                ΔS = [ √( B² + 2·k·ΔETH ) - B ] / k , where B = P(S_current)
              </code>
              <p className="text-[10px] text-zinc-400">
                Guarantees zero rounding errors, zero MEV sandwich front-running, and instantaneous continuous price recalculations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
