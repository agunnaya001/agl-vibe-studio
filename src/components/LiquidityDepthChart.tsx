import React, { useState, useMemo } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  CartesianGrid 
} from "recharts";
import { 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Zap, 
  Info, 
  ShieldCheck, 
  BarChart2, 
  RefreshCw, 
  Sliders,
  DollarSign
} from "lucide-react";
import { Token } from "../types";

interface LiquidityDepthChartProps {
  token: Token;
  onApplyTradeAmount?: (amount: string, mode: "buy" | "sell") => void;
}

export default function LiquidityDepthChart({ token, onApplyTradeAmount }: LiquidityDepthChartProps) {
  // Configurable controls
  const [rangePct, setRangePct] = useState<number>(0.10); // 10% depth range by default
  const [simMode, setSimMode] = useState<"buy" | "sell">("buy");
  const [simAmount, setSimAmount] = useState<string>("0.5"); // in ETH (for buy) or Tokens (for sell)
  const [displayUnit, setDisplayUnit] = useState<"ETH" | "USD">("ETH");

  // Mid price calculation
  const midPriceEth = token.currentPrice > 0 ? token.currentPrice : 0.00005;
  const ethPriceUsd = 3100; // estimated ETH USD price
  const midPriceUsd = midPriceEth * ethPriceUsd;

  // Generate synthetic depth order book points around mid price
  const depthData = useMemo(() => {
    const steps = 40; // 20 steps below mid price, 20 steps above
    const halfSteps = steps / 2;
    const stepSize = (midPriceEth * rangePct) / halfSteps;

    const points: Array<{
      priceEth: number;
      priceUsd: number;
      priceLabel: string;
      bidsDepth: number | null; // cumulative buy liquidity
      asksDepth: number | null; // cumulative sell liquidity
      bidsEth: number | null;
      asksEth: number | null;
      isMid: boolean;
      slippagePct: number;
    }> = [];

    // 1. Generate Bids (Left side: prices < midPrice)
    let accumBidsEth = 0;
    // We compute from lowest price up to mid price
    const bidPoints = [];
    for (let i = halfSteps; i >= 1; i--) {
      const price = midPriceEth - i * stepSize;
      const distancePct = (midPriceEth - price) / midPriceEth;
      // Exponential curve for realistic bonding curve liquidity pool accumulation
      const incrementalLiquidity = (0.05 + distancePct * distancePct * 12) * (token.reserveEth || 15);
      accumBidsEth += incrementalLiquidity;
      
      bidPoints.push({
        priceEth: price,
        priceUsd: price * ethPriceUsd,
        priceLabel: price < 0.0001 ? price.toExponential(3) : price.toFixed(6),
        bidsDepth: displayUnit === "ETH" ? accumBidsEth : accumBidsEth * ethPriceUsd,
        asksDepth: null,
        bidsEth: accumBidsEth,
        asksEth: null,
        isMid: false,
        slippagePct: distancePct * 100
      });
    }

    // Mid point
    const midPoint = {
      priceEth: midPriceEth,
      priceUsd: midPriceUsd,
      priceLabel: midPriceEth < 0.0001 ? midPriceEth.toExponential(3) : midPriceEth.toFixed(6),
      bidsDepth: displayUnit === "ETH" ? accumBidsEth : accumBidsEth * ethPriceUsd,
      asksDepth: 0,
      bidsEth: accumBidsEth,
      asksEth: 0,
      isMid: true,
      slippagePct: 0
    };

    // 2. Generate Asks (Right side: prices > midPrice)
    let accumAsksEth = 0;
    const askPoints = [];
    for (let i = 1; i <= halfSteps; i++) {
      const price = midPriceEth + i * stepSize;
      const distancePct = (price - midPriceEth) / midPriceEth;
      const incrementalLiquidity = (0.05 + distancePct * distancePct * 12) * (token.reserveEth || 15);
      accumAsksEth += incrementalLiquidity;

      askPoints.push({
        priceEth: price,
        priceUsd: price * ethPriceUsd,
        priceLabel: price < 0.0001 ? price.toExponential(3) : price.toFixed(6),
        bidsDepth: null,
        asksDepth: displayUnit === "ETH" ? accumAsksEth : accumAsksEth * ethPriceUsd,
        bidsEth: null,
        asksEth: accumAsksEth,
        isMid: false,
        slippagePct: distancePct * 100
      });
    }

    return [...bidPoints, midPoint, ...askPoints];
  }, [midPriceEth, rangePct, token.reserveEth, displayUnit, ethPriceUsd]);

  // Aggregate 2% Depth stats
  const stats = useMemo(() => {
    // 2% bid depth
    const bid2Pct = depthData.filter(d => d.priceEth < midPriceEth && (midPriceEth - d.priceEth) / midPriceEth <= 0.02);
    const maxBid2Eth = bid2Pct.length > 0 ? Math.max(...bid2Pct.map(d => d.bidsEth || 0)) : 1.2;

    // 2% ask depth
    const ask2Pct = depthData.filter(d => d.priceEth > midPriceEth && (d.priceEth - midPriceEth) / midPriceEth <= 0.02);
    const maxAsk2Eth = ask2Pct.length > 0 ? Math.max(...ask2Pct.map(d => d.asksEth || 0)) : 1.1;

    const totalLiquidityEth = (token.reserveEth || 15) * 2;
    const buyPressurePct = (maxBid2Eth / (maxBid2Eth + maxAsk2Eth)) * 100;
    const sellPressurePct = 100 - buyPressurePct;

    return {
      bid2Eth: maxBid2Eth,
      bid2Usd: maxBid2Eth * ethPriceUsd,
      ask2Eth: maxAsk2Eth,
      ask2Usd: maxAsk2Eth * ethPriceUsd,
      totalLiquidityEth,
      totalLiquidityUsd: totalLiquidityEth * ethPriceUsd,
      buyPressurePct,
      sellPressurePct,
      spreadPct: 0.05 // 0.05% DEX pool spread
    };
  }, [depthData, midPriceEth, token.reserveEth, ethPriceUsd]);

  // Order impact simulation calculation
  const simImpact = useMemo(() => {
    const amt = parseFloat(simAmount) || 0;
    if (amt <= 0) return { priceImpactPct: 0, fillPriceEth: midPriceEth, totalCostUsd: 0 };

    if (simMode === "buy") {
      // Input is ETH amount
      // Estimate price impact = (amt / reserveEth) * 100 * 0.5
      const reserve = token.reserveEth || 15;
      const priceImpactPct = Math.min(99.9, (amt / reserve) * 45);
      const fillPriceEth = midPriceEth * (1 + (priceImpactPct / 100) * 0.5);
      return {
        priceImpactPct,
        fillPriceEth,
        totalCostUsd: amt * ethPriceUsd
      };
    } else {
      // Input is Token amount
      // Convert tokens to ETH value
      const ethVal = amt * midPriceEth;
      const reserve = token.reserveEth || 15;
      const priceImpactPct = Math.min(99.9, (ethVal / reserve) * 45);
      const fillPriceEth = midPriceEth * (1 - (priceImpactPct / 100) * 0.5);
      return {
        priceImpactPct,
        fillPriceEth,
        totalCostUsd: ethVal * ethPriceUsd
      };
    }
  }, [simAmount, simMode, midPriceEth, token.reserveEth, ethPriceUsd]);

  return (
    <div className="w-full bg-zinc-950/90 border border-white/10 rounded-2xl p-5 space-y-6 shadow-2xl font-sans animate-fade-in">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold font-display text-white">Liquidity Depth Chart</h3>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {token.symbol} Order Book
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visualizing cumulative buy (Bids) & sell (Asks) liquidity depth across price tiers.
          </p>
        </div>

        {/* Range & Unit Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-xl p-1 gap-1">
            <span className="text-[10px] font-mono text-zinc-500 px-2 font-bold">Range:</span>
            {[
              { label: "±1%", val: 0.01 },
              { label: "±2%", val: 0.02 },
              { label: "±5%", val: 0.05 },
              { label: "±10%", val: 0.10 },
              { label: "±25%", val: 0.25 }
            ].map(r => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRangePct(r.val)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  rangePct === r.val
                    ? "bg-emerald-500 text-black shadow-md font-extrabold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setDisplayUnit("ETH")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                displayUnit === "ETH"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ETH
            </button>
            <button
              type="button"
              onClick={() => setDisplayUnit("USD")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                displayUnit === "USD"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              USD
            </button>
          </div>
        </div>
      </div>

      {/* Main Recharts Area Container */}
      <div className="relative w-full h-[360px] bg-zinc-900/40 rounded-xl border border-white/5 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={depthData} margin={{ top: 20, right: 20, left: 10, bottom: 25 }}>
            <defs>
              {/* Bids Gradient (Green) */}
              <linearGradient id="bidsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              {/* Asks Gradient (Red) */}
              <linearGradient id="asksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />

            <XAxis 
              dataKey="priceEth" 
              tickFormatter={(val) => val < 0.0001 ? val.toExponential(2) : val.toFixed(6)}
              stroke="#71717a"
              fontSize={10}
              fontFamily="monospace"
              dy={10}
            />

            <YAxis 
              stroke="#71717a"
              fontSize={10}
              fontFamily="monospace"
              tickFormatter={(val) => displayUnit === "USD" ? `$${(val / 1000).toFixed(1)}k` : `${val.toFixed(2)}`}
              orientation="right"
            />

            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                const isBid = data.bidsDepth !== null && data.priceEth <= midPriceEth;
                const isAsk = data.asksDepth !== null && data.priceEth >= midPriceEth;

                return (
                  <div className="bg-zinc-950/95 border border-white/20 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1">
                      <span className="text-zinc-400 font-bold">Price Level:</span>
                      <span className="text-white font-extrabold">{data.priceEth.toFixed(7)} ETH</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-zinc-300">
                      <span className="text-zinc-400">USD Value:</span>
                      <span className="text-emerald-400 font-bold">${data.priceUsd.toFixed(4)}</span>
                    </div>

                    {isBid && (
                      <div className="flex items-center justify-between gap-4 text-emerald-400 pt-1">
                        <span>Cumulative Bids:</span>
                        <span className="font-extrabold">
                          {displayUnit === "USD" ? `$${data.bidsDepth?.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `${data.bidsDepth?.toFixed(3)} ETH`}
                        </span>
                      </div>
                    )}

                    {isAsk && (
                      <div className="flex items-center justify-between gap-4 text-rose-400 pt-1">
                        <span>Cumulative Asks:</span>
                        <span className="font-extrabold">
                          {displayUnit === "USD" ? `$${data.asksDepth?.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `${data.asksDepth?.toFixed(3)} ETH`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                      <span>Distance from Mid:</span>
                      <span>{data.slippagePct.toFixed(2)}%</span>
                    </div>
                  </div>
                );
              }}
            />

            {/* Bids Depth Area (Buy Side) */}
            <Area
              type="stepAfter"
              dataKey="bidsDepth"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bidsGradient)"
              name="Bids (Buy)"
            />

            {/* Asks Depth Area (Sell Side) */}
            <Area
              type="stepBefore"
              dataKey="asksDepth"
              stroke="#f43f5e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#asksGradient)"
              name="Asks (Sell)"
            />

            {/* Current Mid Price Reference Line */}
            <ReferenceLine 
              x={midPriceEth} 
              stroke="#a855f7" 
              strokeWidth={2} 
              strokeDasharray="4 4" 
              label={{ 
                value: `Mid: ${midPriceEth.toFixed(6)} ETH`, 
                fill: "#c084fc", 
                fontSize: 10, 
                position: "top", 
                fontFamily: "monospace" 
              }} 
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Overlay Badges */}
        <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> BIDS (BUY DEPTH)
          </span>
        </div>
        <div className="absolute top-3 right-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-rose-400" /> ASKS (SELL DEPTH)
          </span>
        </div>
      </div>

      {/* 2% Depth Summary & Order Book Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
        {/* Metric 1: Bid Depth (+2%) */}
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-emerald-500/20 space-y-1">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
            2% Bid Depth (Buy Support)
          </span>
          <div className="text-base font-extrabold text-emerald-400">
            {stats.bid2Eth.toFixed(2)} ETH
          </div>
          <span className="text-[10px] text-zinc-500 block">
            ≈ ${stats.bid2Usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
          </span>
        </div>

        {/* Metric 2: Ask Depth (-2%) */}
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-rose-500/20 space-y-1">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
            2% Ask Depth (Sell Liquidity)
          </span>
          <div className="text-base font-extrabold text-rose-400">
            {stats.ask2Eth.toFixed(2)} ETH
          </div>
          <span className="text-[10px] text-zinc-500 block">
            ≈ ${stats.ask2Usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
          </span>
        </div>

        {/* Metric 3: Total Reserve Liquidity */}
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-purple-500/20 space-y-1">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
            Bonding Pool Liquidity
          </span>
          <div className="text-base font-extrabold text-purple-300">
            {(token.reserveEth || 15).toFixed(2)} ETH
          </div>
          <span className="text-[10px] text-zinc-500 block">
            Total Depth Pool: ${((token.reserveEth || 15) * ethPriceUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
          </span>
        </div>

        {/* Metric 4: Buy/Sell Ratio Meter */}
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-emerald-400">{stats.buyPressurePct.toFixed(0)}% Bids</span>
            <span className="text-rose-400">{stats.sellPressurePct.toFixed(0)}% Asks</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden flex">
            <div style={{ width: `${stats.buyPressurePct}%` }} className="bg-emerald-500 h-full" />
            <div style={{ width: `${stats.sellPressurePct}%` }} className="bg-rose-500 h-full" />
          </div>
          <span className="text-[10px] text-zinc-500 block pt-0.5 text-center">
            Spread: {stats.spreadPct}%
          </span>
        </div>
      </div>

      {/* Interactive Order Execution Impact Simulator */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-white font-display">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Simulate Order Depth & Price Impact</span>
          </div>
          <span className="text-[10px] text-zinc-400">
            Test how a large market order executes against the order book
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Mode switch */}
          <div className="md:col-span-3 flex bg-zinc-950 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setSimMode("buy")}
              className={`flex-1 py-1.5 rounded-lg text-center text-xs font-bold transition-all cursor-pointer ${
                simMode === "buy" ? "bg-emerald-500 text-black shadow-md" : "text-zinc-400 hover:text-white"
              }`}
            >
              BUY {token.symbol}
            </button>
            <button
              type="button"
              onClick={() => setSimMode("sell")}
              className={`flex-1 py-1.5 rounded-lg text-center text-xs font-bold transition-all cursor-pointer ${
                simMode === "sell" ? "bg-rose-500 text-white shadow-md" : "text-zinc-400 hover:text-white"
              }`}
            >
              SELL {token.symbol}
            </button>
          </div>

          {/* Amount input */}
          <div className="md:col-span-4 relative">
            <input
              id="sim-order-amount-input"
              type="number"
              step="0.1"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              placeholder="Order amount"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <span className="absolute right-3 top-2.5 text-[10px] font-bold text-purple-400">
              {simMode === "buy" ? "ETH" : token.symbol}
            </span>
          </div>

          {/* Quick preset chips */}
          <div className="md:col-span-5 flex flex-wrap gap-1">
            {simMode === "buy" ? (
              [0.1, 0.5, 1.0, 2.5, 5.0].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSimAmount(String(val))}
                  className="px-2 py-1 rounded-lg bg-zinc-950 border border-white/10 hover:border-purple-500/40 text-[10px] text-zinc-300 font-bold cursor-pointer transition-all"
                >
                  {val} ETH
                </button>
              ))
            ) : (
              [1000, 10000, 50000, 100000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSimAmount(String(val))}
                  className="px-2 py-1 rounded-lg bg-zinc-950 border border-white/10 hover:border-purple-500/40 text-[10px] text-zinc-300 font-bold cursor-pointer transition-all"
                >
                  {val.toLocaleString()}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Simulation Outcome Result Banner */}
        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-purple-300 font-bold uppercase block">Estimated Execution Impact</span>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-extrabold text-sm">
                Average Fill Price: {simImpact.fillPriceEth.toFixed(7)} ETH
              </span>
              <span className="text-[10px] text-zinc-400">
                (≈ ${(simImpact.fillPriceEth * ethPriceUsd).toFixed(4)} USD)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-4">
            <div>
              <span className="text-[10px] text-zinc-400 block">Slippage Impact</span>
              <span className={`font-extrabold ${simImpact.priceImpactPct > 5 ? "text-rose-400" : "text-emerald-400"}`}>
                {simImpact.priceImpactPct.toFixed(2)}%
              </span>
            </div>

            {onApplyTradeAmount && (
              <button
                id="btn-apply-sim-order-to-trade"
                type="button"
                onClick={() => onApplyTradeAmount(simAmount, simMode)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition-all cursor-pointer shadow-md"
              >
                Apply to Trade Form
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
