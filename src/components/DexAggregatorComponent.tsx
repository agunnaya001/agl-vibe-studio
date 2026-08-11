import React, { useState, useEffect } from "react";
import { 
  ArrowDown, 
  ArrowLeftRight, 
  Zap, 
  CheckCircle2, 
  SlidersHorizontal, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  ExternalLink, 
  RefreshCw,
  Coins,
  ChevronDown,
  Info,
  Fuel,
  Cpu,
  BarChart3,
  Bot,
  AlertTriangle
} from "lucide-react";
import { WalletState, Token } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { AGL_TREASURY_ADDRESS } from "../lib/aglContracts";
import { TreasuryFeeService } from "../lib/treasuryFeeService";
import ImageWithFallback from "./ImageWithFallback";

interface DexAggregatorComponentProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export interface DexQuote {
  dexName: string;
  dexIcon: string;
  outputAmount: number;
  outputUsd: number;
  priceImpact: number;
  gasEstimateEth: number;
  gasEstimateUsd: number;
  executionTimeMs: number;
  routeHops: { percentage: number; dex: string; pair: string }[];
  isBestRate: boolean;
  isLowestGas: boolean;
}

const SUPPORTED_TOKENS = [
  { symbol: "ETH", name: "Ethereum", icon: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", address: "0x0000000000000000000000000000000000000000", decimals: 18, priceUsd: 3250 },
  { symbol: "AGL", name: "Agunnaya Labs Token", icon: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80", address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698", decimals: 18, priceUsd: 0.1625 },
  { symbol: "USDC", name: "USD Coin (Base)", icon: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, priceUsd: 1.00 },
  { symbol: "AERO", name: "Aerodrome Token", icon: "https://assets.coingecko.com/coins/images/31745/large/aerodrome.png", address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", decimals: 18, priceUsd: 1.25 },
  { symbol: "cbETH", name: "Coinbase Wrapped Staked ETH", icon: "https://assets.coingecko.com/coins/images/27008/large/cbeth.png", address: "0x2Ae3F1Ec7F1F5012A27a5d3f112702170bA3b400", decimals: 18, priceUsd: 3510 }
];

export default function DexAggregatorComponent({
  wallet,
  onRefreshWallet,
  addTerminalLog,
  showToast
}: DexAggregatorComponentProps) {
  const [fromToken, setFromToken] = useState(SUPPORTED_TOKENS[0]); // ETH
  const [toToken, setToToken] = useState(SUPPORTED_TOKENS[1]);     // AGL
  const [inputAmount, setInputAmount] = useState<string>("0.1");
  const [slippage, setSlippage] = useState<number>(0.5);
  const [customSlippage, setCustomSlippage] = useState<string>("");
  const [isCustomSlippage, setIsCustomSlippage] = useState<boolean>(false);
  const [mevProtection, setMevProtection] = useState<boolean>(true);
  const [selectedDex, setSelectedDex] = useState<string>("1inch");
  const [isQuoting, setIsQuoting] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [quotes, setQuotes] = useState<DexQuote[]>([]);

  // Get active effective slippage
  const effectiveSlippage = isCustomSlippage ? (parseFloat(customSlippage) || 0.5) : slippage;

  // Calculate live quotes whenever inputs change
  useEffect(() => {
    const amount = parseFloat(inputAmount) || 0;
    if (amount <= 0) {
      setQuotes([]);
      return;
    }

    setIsQuoting(true);
    const timer = setTimeout(() => {
      // Base conversion rate
      const fromUsd = amount * fromToken.priceUsd;
      const baseOutput = fromUsd / toToken.priceUsd;

      // Simulate DEX aggregator quotes on Base L2
      const computedQuotes: DexQuote[] = [
        {
          dexName: "1inch Aggregator V6",
          dexIcon: "⚡",
          outputAmount: baseOutput * 1.008, // Best overall output
          outputUsd: fromUsd * 1.008,
          priceImpact: 0.12,
          gasEstimateEth: 0.00012,
          gasEstimateUsd: 0.00012 * 3250,
          executionTimeMs: 180,
          routeHops: [
            { percentage: 65, dex: "Aerodrome AMM", pair: `${fromToken.symbol}/${toToken.symbol}` },
            { percentage: 35, dex: "Uniswap V3 (0.05%)", pair: `${fromToken.symbol}/USDC -> ${toToken.symbol}` }
          ],
          isBestRate: true,
          isLowestGas: false
        },
        {
          dexName: "0x Protocol / Matcha",
          dexIcon: "🍵",
          outputAmount: baseOutput * 1.004,
          outputUsd: fromUsd * 1.004,
          priceImpact: 0.18,
          gasEstimateEth: 0.00008, // Gas optimized
          gasEstimateUsd: 0.00008 * 3250,
          executionTimeMs: 140,
          routeHops: [
            { percentage: 100, dex: "0x RFQ Maker", pair: `${fromToken.symbol}/${toToken.symbol}` }
          ],
          isBestRate: false,
          isLowestGas: true
        },
        {
          dexName: "Aerodrome Finance (Base Native)",
          dexIcon: "✈️",
          outputAmount: baseOutput * 1.002,
          outputUsd: fromUsd * 1.002,
          priceImpact: 0.25,
          gasEstimateEth: 0.00015,
          gasEstimateUsd: 0.00015 * 3250,
          executionTimeMs: 220,
          routeHops: [
            { percentage: 100, dex: "Aerodrome Slipstream", pair: `${fromToken.symbol}/${toToken.symbol}` }
          ],
          isBestRate: false,
          isLowestGas: false
        },
        {
          dexName: "Uniswap V3 (Base)",
          dexIcon: "🦄",
          outputAmount: baseOutput * 0.998,
          outputUsd: fromUsd * 0.998,
          priceImpact: 0.31,
          gasEstimateEth: 0.00018,
          gasEstimateUsd: 0.00018 * 3250,
          executionTimeMs: 200,
          routeHops: [
            { percentage: 100, dex: "Uniswap V3 Pool (0.3%)", pair: `${fromToken.symbol}/${toToken.symbol}` }
          ],
          isBestRate: false,
          isLowestGas: false
        },
        {
          dexName: "Paraswap Base",
          dexIcon: "🔀",
          outputAmount: baseOutput * 1.001,
          outputUsd: fromUsd * 1.001,
          priceImpact: 0.22,
          gasEstimateEth: 0.00014,
          gasEstimateUsd: 0.00014 * 3250,
          executionTimeMs: 250,
          routeHops: [
            { percentage: 50, dex: "KyberSwap Elastic", pair: `${fromToken.symbol}/${toToken.symbol}` },
            { percentage: 50, dex: "Uniswap V3", pair: `${fromToken.symbol}/${toToken.symbol}` }
          ],
          isBestRate: false,
          isLowestGas: false
        }
      ];

      setQuotes(computedQuotes);
      setIsQuoting(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [inputAmount, fromToken, toToken]);

  const bestQuote = quotes.find(q => q.isBestRate) || quotes[0];
  const activeQuote = quotes.find(q => q.dexName.toLowerCase().includes(selectedDex.toLowerCase())) || bestQuote;

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleExecuteAggregatedSwap = () => {
    if (!wallet.isConnected) {
      showToast("Please connect your Web3 wallet first.", "error");
      return;
    }

    const amt = parseFloat(inputAmount) || 0;
    if (amt <= 0) {
      showToast("Enter a valid swap amount.", "error");
      return;
    }

    if (!activeQuote) return;

    // Check balance
    if (fromToken.symbol === "ETH" && wallet.balanceEth < amt) {
      showToast(`Insufficient ETH balance (${wallet.balanceEth.toFixed(4)} available)`, "error");
      return;
    }
    if (fromToken.symbol === "AGL" && wallet.aglTokenBalance < amt) {
      showToast(`Insufficient AGL balance (${wallet.aglTokenBalance.toLocaleString()} available)`, "error");
      return;
    }

    setIsExecuting(true);
    addTerminalLog("info", `Initiating Aggregated DEX Swap via ${activeQuote.dexName} on Base L2...`);

    setTimeout(() => {
      setIsExecuting(false);

      // Perform real balance updates in AgunnayaDatabase
      const updatedWallet = { ...wallet };
      if (fromToken.symbol === "ETH") {
        updatedWallet.balanceEth -= amt;
      } else if (fromToken.symbol === "AGL") {
        updatedWallet.aglTokenBalance -= amt;
      }

      if (toToken.symbol === "ETH") {
        updatedWallet.balanceEth += activeQuote.outputAmount;
      } else if (toToken.symbol === "AGL") {
        updatedWallet.aglTokenBalance += activeQuote.outputAmount;
      }

      AgunnayaDatabase.saveWallet(updatedWallet);

      // Record 0.3% swap fee into Treasury Fee Monitor
      const swapEthFee = fromToken.symbol === "ETH" ? amt * 0.003 : 0.0005;
      const swapAglFee = fromToken.symbol === "AGL" ? amt * 0.003 : 15;
      TreasuryFeeService.addProtocolFees(swapEthFee, swapAglFee, `DEX Aggregator (${activeQuote.dexName})`);

      AgunnayaDatabase.addActivity({
        type: "buy",
        tokenSymbol: toToken.symbol,
        tokenAddress: toToken.address,
        user: wallet.address || AGL_TREASURY_ADDRESS,
        amount: activeQuote.outputAmount,
        ethValue: fromToken.symbol === "ETH" ? amt : 0,
        details: `Swapped ${amt} ${fromToken.symbol} for ${activeQuote.outputAmount.toFixed(2)} ${toToken.symbol} via ${activeQuote.dexName}`
      });

      addTerminalLog("success", `DEX Swap Executed! ${amt} ${fromToken.symbol} -> ${activeQuote.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${toToken.symbol} via ${activeQuote.dexName}`);
      showToast(`Swapped ${amt} ${fromToken.symbol} for ${activeQuote.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${toToken.symbol} on ${activeQuote.dexName}!`, "success");
      onRefreshWallet();
      setInputAmount("");
    }, 1200);
  };

  return (
    <div id="dex-aggregator-container" className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-purple/15 via-[#0052FF]/10 to-emerald-500/10 border border-white/10 glow-border-purple relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-2">
                AGL Smart DEX Aggregator Engine
                <span className="text-[10px] bg-brand-purple/20 border border-brand-purple/30 text-brand-purple px-2 py-0.5 rounded-full font-mono font-bold">
                  BASE MAINNET
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Multi-routing quotes across 1inch, 0x/Matcha, Aerodrome, Uniswap V3 & Paraswap for optimal $AGL execution</p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              MEV Shield Active
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-brand-blue">
              5 Aggregators Live
            </span>
          </div>
        </div>
      </div>

      {/* Main Aggregator Grid: Left Swap Card, Right Route Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Swap Card (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-purple" /> Swap Parameters
            </span>

            {/* Slippage Selector & Custom Input */}
            <div className="flex items-center gap-1 font-mono text-[11px] flex-wrap justify-end">
              <span className="text-zinc-500 mr-0.5">Slippage:</span>
              {[0.1, 0.5, 1.0].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setSlippage(s);
                    setIsCustomSlippage(false);
                  }}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    !isCustomSlippage && slippage === s 
                      ? "bg-brand-purple text-white font-bold shadow-sm shadow-purple-500/50" 
                      : "bg-black/40 text-zinc-400 hover:text-white"
                  }`}
                >
                  {s}%
                </button>
              ))}

              {/* Custom Slippage Input */}
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0.05"
                  max="10"
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={(e) => {
                    setCustomSlippage(e.target.value);
                    setIsCustomSlippage(true);
                  }}
                  className={`w-14 px-1.5 py-0.5 rounded bg-black/60 border text-[10px] font-bold text-white focus:outline-none text-right ${
                    isCustomSlippage ? "border-brand-purple text-purple-300" : "border-white/10"
                  }`}
                />
                <span className="text-[10px] text-zinc-400 ml-0.5">%</span>
              </div>
            </div>
          </div>

          {effectiveSlippage > 2.0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>High slippage tolerance ({effectiveSlippage}%). Your trade may be front-run by MEV searchers. MEV protection active.</span>
            </div>
          )}

          {/* From Token Field */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
              <span>You Pay</span>
              <span>Balance: {fromToken.symbol === "ETH" ? wallet.balanceEth.toFixed(4) : (wallet.aglTokenBalance || 0).toLocaleString()} {fromToken.symbol}</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
              />

              <select
                value={fromToken.symbol}
                onChange={(e) => {
                  const selected = SUPPORTED_TOKENS.find(t => t.symbol === e.target.value);
                  if (selected) {
                    if (selected.symbol === toToken.symbol) handleSwapTokens();
                    else setFromToken(selected);
                  }
                }}
                className="bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold font-mono text-white focus:outline-none"
              >
                {SUPPORTED_TOKENS.map(t => (
                  <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                ))}
              </select>
            </div>

            <span className="text-[10px] text-zinc-500 font-mono block">
              ≈ ${((parseFloat(inputAmount) || 0) * fromToken.priceUsd).toFixed(2)} USD
            </span>
          </div>

          {/* Direction Switcher Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleSwapTokens}
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-brand-purple border border-white/10 text-white shadow-lg transition-all"
              title="Swap From/To Tokens"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>

          {/* To Token Field */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
              <span>You Receive (Estimated Output)</span>
              <span>Balance: {toToken.symbol === "ETH" ? wallet.balanceEth.toFixed(4) : (wallet.aglTokenBalance || 0).toLocaleString()} {toToken.symbol}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-full text-xl font-bold font-mono text-emerald-400">
                {isQuoting ? (
                  <span className="text-zinc-500 animate-pulse text-sm">Computing best aggregator routes...</span>
                ) : activeQuote ? (
                  activeQuote.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })
                ) : (
                  "0.0"
                )}
              </div>

              <select
                value={toToken.symbol}
                onChange={(e) => {
                  const selected = SUPPORTED_TOKENS.find(t => t.symbol === e.target.value);
                  if (selected) {
                    if (selected.symbol === fromToken.symbol) handleSwapTokens();
                    else setToToken(selected);
                  }
                }}
                className="bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold font-mono text-white focus:outline-none"
              >
                {SUPPORTED_TOKENS.map(t => (
                  <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                ))}
              </select>
            </div>

            <span className="text-[10px] text-zinc-500 font-mono block">
              ≈ ${activeQuote ? activeQuote.outputUsd.toFixed(2) : "0.00"} USD
            </span>
          </div>

          {/* Selected Route Info Summary */}
          {activeQuote && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Selected DEX Provider:</span>
                <span className="text-white font-bold">{activeQuote.dexName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Price Impact:</span>
                <span className="text-emerald-400 font-bold">{activeQuote.priceImpact}%</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Estimated Gas:</span>
                <span className="text-amber-300 font-bold">{wallet.isSmartAccount ? "0.00 ETH (Sponsored)" : `${activeQuote.gasEstimateEth} ETH (~$${activeQuote.gasEstimateUsd.toFixed(3)})`}</span>
              </div>
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecuteAggregatedSwap}
            disabled={isExecuting || isQuoting || !activeQuote}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-purple via-purple-600 to-[#0052FF] hover:opacity-95 text-white font-bold text-sm shadow-lg font-display flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Executing Aggregated Route on Base...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Execute Best Route via {activeQuote ? activeQuote.dexName : "Aggregator"}</span>
              </>
            )}
          </button>
        </div>

        {/* Right Live DEX Aggregation Comparison Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-blue" />
              Live Route Comparison across Base DEXes
            </h4>
            <span className="text-[11px] text-zinc-400 font-mono">
              Auto-updating quotes
            </span>
          </div>

          <div className="space-y-3">
            {quotes.map((q, idx) => {
              const isSelected = activeQuote?.dexName === q.dexName;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDex(q.dexName)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected 
                      ? "bg-brand-purple/10 border-brand-purple shadow-[0_0_20px_rgba(139,92,246,0.15)]" 
                      : "bg-zinc-900/70 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{q.dexIcon}</span>
                      <div>
                        <h5 className="text-sm font-bold text-white flex items-center gap-2">
                          {q.dexName}
                          {q.isBestRate && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> BEST RATE
                            </span>
                          )}
                          {q.isLowestGas && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                              <Fuel className="w-2.5 h-2.5" /> LOWEST GAS
                            </span>
                          )}
                        </h5>
                        <p className="text-[11px] text-zinc-400 font-mono">Execution time: {q.executionTimeMs}ms</p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-sm font-extrabold text-white block">
                        {q.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 3 })} {toToken.symbol}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        ≈ ${q.outputUsd.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Route Hop Visualization */}
                  <div className="pt-2 border-t border-white/5 font-mono text-[11px] flex items-center justify-between text-zinc-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-zinc-500 text-[10px]">Route:</span>
                      {q.routeHops.map((hop, hIdx) => (
                        <span key={hIdx} className="bg-black/50 px-2 py-0.5 rounded border border-white/5 text-zinc-300 text-[10px]">
                          {hop.percentage}% {hop.dex} ({hop.pair})
                        </span>
                      ))}
                    </div>

                    <span className="text-zinc-400 text-[10px] shrink-0">
                      Impact: <strong className="text-emerald-400">{q.priceImpact}%</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
