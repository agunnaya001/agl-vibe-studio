import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Fuel, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Flame, 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  Gauge, 
  Layers, 
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  Globe
} from "lucide-react";

export interface GasOracleResponse {
  success: boolean;
  chainId: number;
  network: string;
  lastBlock: string;
  safeGasPrice: number;
  proposeGasPrice: number;
  fastGasPrice: number;
  baseFee: number;
  gasUsedRatio: string;
  congestion: {
    level: "low" | "normal" | "moderate" | "high" | "extreme";
    label: string;
    score: number; // 0 - 100
    blockUtilization: string;
  };
  ethPriceUsd: number;
  typicalSwapGasUnits: number;
  l1DataFeeUsd: number;
  estimatedTradeGas: {
    safeEth: number;
    proposeEth: number;
    fastEth: number;
    safeUsd: number;
    proposeUsd: number;
    fastUsd: number;
  };
  timestamp: number;
  source: string;
}

export interface RealTimeGasEstimatorProps {
  tradeAmount?: string | number;
  tradeMode?: "buy" | "sell";
  tokenPriceEth?: number;
  tokenSymbol?: string;
  compact?: boolean;
  onGasTierChange?: (tier: "safe" | "standard" | "fast", gasFeeEth: number, gasFeeUsd: number) => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function RealTimeGasEstimator({
  tradeAmount = 0,
  tradeMode = "buy",
  tokenPriceEth = 0,
  tokenSymbol = "TOKEN",
  compact = false,
  onGasTierChange,
  showToast
}: RealTimeGasEstimatorProps) {
  const [selectedChainId, setSelectedChainId] = useState<number>(8453); // Default Base Mainnet
  const [gasTier, setGasTier] = useState<"safe" | "standard" | "fast">("standard");
  const [gasData, setGasData] = useState<GasOracleResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  // Fetch real-time gas from Etherscan V2 / BaseScan Gas Oracle
  const fetchGasOracle = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/gas/oracle?chainId=${selectedChainId}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data: GasOracleResponse = await res.json();
      if (!data || !data.success) {
        throw new Error("Gas oracle returned no verified estimate");
      }
      setGasData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.warn("Gas Oracle Fetch Warning:", err.message);
      setGasData(null);
      setLastUpdated(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedChainId]);

  // Initial fetch and chainId change
  useEffect(() => {
    fetchGasOracle(true);
  }, [fetchGasOracle, selectedChainId]);

  // Periodic polling every 12 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchGasOracle(false);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchGasOracle, autoRefresh]);

  // Calculate Trade Value in ETH
  const tradeEthValue = useMemo(() => {
    const num = typeof tradeAmount === "string" ? parseFloat(tradeAmount) : tradeAmount;
    if (!Number.isFinite(num) || num <= 0) return 0;
    if (tradeMode === "buy") {
      return num;
    }
    if (!Number.isFinite(tokenPriceEth) || tokenPriceEth <= 0) return 0;
    return num * tokenPriceEth;
  }, [tradeAmount, tradeMode, tokenPriceEth]);

  // Selected Gas Fee in ETH & USD
  const currentGasEth = useMemo(() => {
    if (!gasData) return null;
    if (gasTier === "safe") return gasData.estimatedTradeGas.safeEth;
    if (gasTier === "fast") return gasData.estimatedTradeGas.fastEth;
    return gasData.estimatedTradeGas.proposeEth;
  }, [gasData, gasTier]);

  const currentGasUsd = useMemo(() => {
    if (!gasData) return null;
    if (gasTier === "safe") return gasData.estimatedTradeGas.safeUsd;
    if (gasTier === "fast") return gasData.estimatedTradeGas.fastUsd;
    return gasData.estimatedTradeGas.proposeUsd;
  }, [gasData, gasTier]);

  // Calculate Gas as % of Trade Amount
  const gasPercentOfTrade = useMemo(() => {
    if (currentGasEth === null || tradeEthValue <= 0) return null;
    return (currentGasEth / tradeEthValue) * 100;
  }, [currentGasEth, tradeEthValue]);

  const isHighGasWarning = useMemo(() => {
    return gasPercentOfTrade !== null && gasPercentOfTrade > 25;
  }, [gasPercentOfTrade]);

  // Propagate gas tier selection to parent
  useEffect(() => {
    if (onGasTierChange && currentGasEth !== null && currentGasUsd !== null) {
      onGasTierChange(gasTier, currentGasEth, currentGasUsd);
    }
  }, [gasTier, currentGasEth, currentGasUsd, onGasTierChange, gasData]);

  // Congestion Color & Badge Helpers
  const congestionStyle = useMemo(() => {
    const level = gasData?.congestion?.level || "unavailable";
    switch (level) {
      case "extreme":
        return {
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
          bar: "bg-rose-500",
          text: "text-rose-400",
          bg: "bg-rose-950/30 border-rose-500/30"
        };
      case "high":
        return {
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          bar: "bg-amber-500",
          text: "text-amber-400",
          bg: "bg-amber-950/30 border-amber-500/30"
        };
      case "moderate":
        return {
          badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
          bar: "bg-yellow-500",
          text: "text-yellow-400",
          bg: "bg-yellow-950/30 border-yellow-500/30"
        };
      case "normal":
        return {
          badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
          bar: "bg-blue-500",
          text: "text-blue-400",
          bg: "bg-blue-950/30 border-blue-500/30"
        };
      case "low":
        return {
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          bar: "bg-emerald-500",
          text: "text-emerald-400",
          bg: "bg-emerald-950/30 border-emerald-500/30"
        };
      default:
        return {
          badge: "bg-zinc-800 text-zinc-400 border-zinc-700",
          bar: "bg-zinc-700",
          text: "text-zinc-400",
          bg: "bg-zinc-900 border-zinc-800"
        };
    }
  }, [gasData?.congestion?.level]);

  return (
    <div 
      id="realtime-gas-estimator"
      className="glass-panel rounded-2xl border border-white/10 bg-zinc-950/90 shadow-xl overflow-hidden transition-all text-xs"
    >
      {/* Header Bar */}
      <div className="p-3.5 bg-zinc-900/60 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#0052FF]/20 border border-[#0052FF]/40 flex items-center justify-center text-[#0052FF]">
            <Fuel className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-display font-bold text-white text-xs">
              <span>{gasData ? "Etherscan V2 Gas Oracle" : "Gas oracle unavailable"}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${gasData ? "bg-emerald-400" : "bg-amber-400"}`} />
            </div>
            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
              <span>Network:</span>
              <button
                type="button"
                onClick={() => {
                  const nextChain = selectedChainId === 8453 ? 1 : 8453;
                  setSelectedChainId(nextChain);
                  if (showToast) {
                    showToast(`Switched gas oracle tracker to ${nextChain === 8453 ? "Base L2" : "Ethereum L1"}`, "info");
                  }
                }}
                className="text-[#0052FF] hover:underline font-semibold cursor-pointer"
              >
                {selectedChainId === 8453 ? "Base Mainnet (8453)" : "Ethereum L1 (1)"} ⇄
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Congestion Level Badge */}
          {gasData && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${congestionStyle.badge}`}>
              {gasData.congestion.label}
            </span>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            title="Refresh Gas Oracle"
            onClick={() => fetchGasOracle(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#0052FF]" : ""}`} />
          </button>

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* CRITICAL WARNING BANNER: Gas fee > 25% of trade amount */}
      {isHighGasWarning && (
        <div 
          id="high-gas-warning-alert"
          className="p-3.5 bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-rose-950/90 border-y border-rose-500/50 text-rose-200 space-y-2 animate-in fade-in duration-300"
        >
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between font-bold text-xs text-rose-300 font-display">
                <span>⚠️ HIGH GAS FEE ALERT (&gt; 25% OF TRADE)</span>
              <span className="font-mono bg-rose-500/30 px-2 py-0.5 rounded text-rose-200 border border-rose-500/50">
                {gasPercentOfTrade?.toFixed(1)}% of trade
              </span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200/90">
                Estimated network gas fee of <strong className="text-white font-mono">{currentGasEth.toFixed(6)} ETH</strong> (~${currentGasUsd.toFixed(2)}) represents <strong className="text-amber-300 underline font-mono">{gasPercentOfTrade.toFixed(1)}%</strong> of your trade amount ({tradeEthValue.toFixed(4)} ETH).
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono text-rose-300/90">
                <span className="bg-black/40 px-2 py-0.5 rounded border border-rose-500/30">
                  💡 Tip: Increase trade size or switch to Base L2 to reduce fee drag
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Content View */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          
          {/* Congestion Level Gauge / Load Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                Network Congestion Load
              </span>
              <span className="font-bold text-zinc-200">
                {gasData ? `${gasData.congestion.score}% capacity` : "Unavailable"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-500 ${congestionStyle.bar}`}
                style={{ width: `${gasData ? Math.min(100, Math.max(0, gasData.congestion.score)) : 0}%` }}
              />
            </div>
          </div>

          {/* Gas Price Speed Tiers Grid */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
              <span>Select Priority Tier (Etherscan V2):</span>
              <span className="text-[9px] text-zinc-500">
                Base Fee: {gasData ? `${gasData.baseFee} Gwei` : "Unavailable"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Safe Tier */}
              <button
                type="button"
                onClick={() => setGasTier("safe")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  gasTier === "safe"
                    ? "bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-500/10 text-white font-bold"
                    : "bg-zinc-900/60 border-white/5 hover:border-white/20 text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-semibold text-emerald-400">Safe</span>
                  <span className="text-[9px] opacity-70">Estimate</span>
                </div>
                <div className="font-mono text-xs font-bold text-white">
                  {gasData ? `${gasData.safeGasPrice} Gwei` : "Unavailable"}
                </div>
                <div className="font-mono text-[9px] text-zinc-400 mt-0.5">
                  {gasData ? `~$${gasData.estimatedTradeGas.safeUsd.toFixed(3)}` : "USD unavailable"}
                </div>
              </button>

              {/* Standard / Propose Tier */}
              <button
                type="button"
                onClick={() => setGasTier("standard")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  gasTier === "standard"
                    ? "bg-[#0052FF]/20 border-[#0052FF] shadow-md shadow-[#0052FF]/20 text-white font-bold"
                    : "bg-zinc-900/60 border-white/5 hover:border-white/20 text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-semibold text-blue-400">Standard</span>
                  <span className="text-[9px] opacity-70">Estimate</span>
                </div>
                <div className="font-mono text-xs font-bold text-white">
                  {gasData ? `${gasData.proposeGasPrice} Gwei` : "Unavailable"}
                </div>
                <div className="font-mono text-[9px] text-zinc-400 mt-0.5">
                  {gasData ? `~$${gasData.estimatedTradeGas.proposeUsd.toFixed(3)}` : "USD unavailable"}
                </div>
              </button>

              {/* Fast / Instant Tier */}
              <button
                type="button"
                onClick={() => setGasTier("fast")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  gasTier === "fast"
                    ? "bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-500/10 text-white font-bold"
                    : "bg-zinc-900/60 border-white/5 hover:border-white/20 text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-semibold text-purple-400">Fast</span>
                  <span className="text-[9px] opacity-70">Estimate</span>
                </div>
                <div className="font-mono text-xs font-bold text-white">
                  {gasData ? `${gasData.fastGasPrice} Gwei` : "Unavailable"}
                </div>
                <div className="font-mono text-[9px] text-zinc-400 mt-0.5">
                  {gasData ? `~$${gasData.estimatedTradeGas.fastUsd.toFixed(3)}` : "USD unavailable"}
                </div>
              </button>
            </div>
          </div>

          {/* Current Trade Gas Impact Telemetry */}
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between items-center text-zinc-400">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Est. Trade Gas Fee ({gasTier.toUpperCase()}):
              </span>
              <span className="font-bold text-white">
                {currentGasEth !== null && currentGasUsd !== null ? `${currentGasEth.toFixed(6)} ETH (~$${currentGasUsd.toFixed(3)})` : "Unavailable"}
              </span>
            </div>

            {tradeEthValue > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="text-zinc-400">Gas % of Trade Amount:</span>
                <span className={`font-bold font-mono ${
                  gasPercentOfTrade === null
                  ? "text-zinc-400"
                  : gasPercentOfTrade > 25
                  ? "text-rose-400 animate-pulse font-extrabold"
                  : gasPercentOfTrade > 5
                  ? "text-amber-400"
                  : "text-emerald-400"
                }`}>
                  {gasPercentOfTrade === null ? "Unavailable" : gasPercentOfTrade < 0.01 ? "< 0.01%" : `${gasPercentOfTrade.toFixed(2)}%`}
                  {gasPercentOfTrade !== null && gasPercentOfTrade > 25 && " (⚠️ > 25%)"}
                </span>
              </div>
            )}

            {selectedChainId === 8453 && (
              <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1">
                <span>L1 data fee:</span>
                <span className="text-zinc-400 font-mono">Included in oracle estimate</span>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-400" />
              Source:               {gasData?.source || "No verified data"}
            </span>
            {lastUpdated && (
              <span>
                Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
