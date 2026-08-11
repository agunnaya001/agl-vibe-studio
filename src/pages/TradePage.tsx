import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Token, WalletState, Activity, PriceAlert } from "../types";
import BondingCurveChart from "../components/BondingCurveChart";
import BondingCurveAnalytics from "../components/BondingCurveAnalytics";
import BondingCurveTrading from "../components/BondingCurveTrading";
import TokenSecurityAudit from "../components/TokenSecurityAudit";
import LiquidityDepthChart from "../components/LiquidityDepthChart";
import TerminalLog, { TerminalLine } from "../components/TerminalLog";
import ImageWithFallback from "../components/ImageWithFallback";
import TradeConfirmationModal from "../components/TradeConfirmationModal";
import { LineChart, Line, ResponsiveContainer, YAxis, AreaChart, Area, Tooltip as RechartsTooltip } from "recharts";
import { 
  getSpotPrice, 
  getTokensForEth, 
  getEthCostForTokens, 
  getEthReturnForTokens,
  AgunnayaDatabase,
  BASE_PRICE,
  SLOPE
} from "../lib/db";
import { 
  ArrowLeftRight, 
  TrendingUp, 
  ArrowLeft, 
  Coins, 
  ExternalLink, 
  Twitter, 
  Globe, 
  Cpu, 
  DollarSign, 
  Sparkles,
  Award,
  Bell,
  Trash,
  Settings,
  Info,
  Flame,
  Check,
  ShieldCheck,
  Layers
} from "lucide-react";

interface TradePageProps {
  token: Token;
  wallet: WalletState;
  onBack: () => void;
  onRefreshWallet: () => void;
  terminalLogs: TerminalLine[];
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  priceAlerts: PriceAlert[];
  onAddPriceAlert: (alert: Omit<PriceAlert, "id" | "createdAt" | "status" | "triggeredAt">) => void;
  onDeletePriceAlert: (id: string) => void;
  firebaseUser: any;
}

export default function TradePage({ 
  token, 
  wallet, 
  onBack, 
  onRefreshWallet, 
  terminalLogs, 
  addTerminalLog,
  showToast,
  priceAlerts,
  onAddPriceAlert,
  onDeletePriceAlert,
  firebaseUser
}: TradePageProps) {
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [tradingInterface, setTradingInterface] = useState<"bondingContract" | "quickSwap">("bondingContract");
  const [inputVal, setInputVal] = useState("");
  const [estimatedOutput, setEstimatedOutput] = useState(0);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [chartView, setChartView] = useState<"bonding" | "analytics" | "depth" | "gecko" | "audit">("bonding");

  // Premium trading utility states
  const [slippage, setSlippage] = useState<number>(1.0);
  const [customSlippage, setCustomSlippage] = useState<string>("");
  const [gasMode, setGasMode] = useState<"standard" | "fast" | "instant">("fast");
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Load user token balance dynamically
  const refreshLocalTokenBalance = () => {
    if (wallet.isConnected && wallet.address) {
      const balances = AgunnayaDatabase.getTokenBalances(wallet.address);
      setTokenBalance(balances[token.address.toLowerCase()] || 0);
    } else {
      setTokenBalance(0);
    }
  };

  useEffect(() => {
    refreshLocalTokenBalance();
  }, [wallet.isConnected, wallet.address, token.address]);

  // Local state for the sparkline price movement history
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Calculate price trend metrics for sparkline
  const isUp = priceHistory.length > 1 ? priceHistory[priceHistory.length - 1] >= priceHistory[0] : true;
  const strokeColor = isUp ? "#10b981" : "#f43f5e";
  const priceChangePct = priceHistory.length > 1 ? ((priceHistory[priceHistory.length - 1] - priceHistory[0]) / priceHistory[0] * 100) : 0;
  const sparklineData = priceHistory.map((p, idx) => ({ idx, price: p * 1000000 }));

  // Generate deterministic pseudo-random history of price points
  const generatePriceHistory = (tokenAddress: string, currentPrice: number) => {
    let hash = 0;
    for (let i = 0; i < tokenAddress.length; i++) {
      hash = tokenAddress.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const points = 15;
    const history: number[] = [];
    let price = currentPrice * 0.92; // start slightly lower
    
    for (let i = 0; i < points - 1; i++) {
      const pseudoRandom = Math.sin(hash + i) * 0.5 + 0.5; // value between 0 and 1
      const percentChange = (pseudoRandom - 0.45) * 0.04; // -1.8% to +2.2%
      price = price * (1 + percentChange);
      history.push(price);
    }
    
    // Last point is exactly current price
    history.push(currentPrice);
    return history;
  };

  // Initialize price history
  useEffect(() => {
    setPriceHistory(generatePriceHistory(token.address, token.currentPrice));
  }, [token.address]);

  // Append new price to history when currentPrice updates (if different from last point)
  useEffect(() => {
    if (priceHistory.length > 0) {
      const lastPrice = priceHistory[priceHistory.length - 1];
      if (Math.abs(lastPrice - token.currentPrice) > 1e-12) {
        setPriceHistory(prev => {
          const updated = [...prev, token.currentPrice];
          if (updated.length > 24) {
            updated.shift();
          }
          return updated;
        });
      }
    }
  }, [token.currentPrice]);

  // Local states for Set Price Alert form
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");

  // Automatically suggest condition based on target price
  useEffect(() => {
    const target = parseFloat(alertTargetPrice) || 0;
    const currentMicro = token.currentPrice * 1000000;
    if (target > 0) {
      if (target > currentMicro) {
        setAlertCondition("above");
      } else {
        setAlertCondition("below");
      }
    }
  }, [alertTargetPrice, token.currentPrice]);

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMicro = parseFloat(alertTargetPrice) || 0;
    if (targetMicro <= 0) {
      showToast("Please enter a valid target price.", "error");
      return;
    }

    // Convert micro ETH to absolute ETH
    const targetEth = targetMicro / 1000000;
    
    // UserId can be firebase uid, wallet address or local
    const userId = firebaseUser?.uid || wallet.address || "local_user";

    onAddPriceAlert({
      userId,
      tokenAddress: token.address,
      tokenSymbol: token.symbol,
      targetPrice: targetEth,
      condition: alertCondition
    });

    setAlertTargetPrice("");
  };

  // Filter alerts for this token only
  const tokenAlerts = priceAlerts ? priceAlerts.filter(a => a.tokenAddress.toLowerCase() === token.address.toLowerCase()) : [];

  // Re-estimate on input change
  useEffect(() => {
    const num = parseFloat(inputVal) || 0;
    if (num <= 0) {
      setEstimatedOutput(0);
      return;
    }

    if (tradeMode === "buy") {
      // Calculate how many tokens for num ETH
      const tokens = getTokensForEth(token.supply, num);
      setEstimatedOutput(tokens);
    } else {
      // Calculate how much ETH for num tokens
      const { net } = getEthReturnForTokens(token.supply, num);
      setEstimatedOutput(net);
    }
  }, [inputVal, tradeMode, token.supply]);

  // Price Impact estimation: (Next Price - Current Price) / Current Price * 100
  const getPriceImpact = () => {
    const num = parseFloat(inputVal) || 0;
    if (num <= 0) return 0;
    
    const currentPrice = token.currentPrice;
    if (tradeMode === "buy") {
      const tokensMinted = getTokensForEth(token.supply, num);
      const nextSupply = token.supply + tokensMinted;
      const nextPrice = getSpotPrice(nextSupply);
      return ((nextPrice - currentPrice) / currentPrice) * 100;
    } else {
      const nextSupply = Math.max(0, token.supply - num);
      const nextPrice = getSpotPrice(nextSupply);
      return ((currentPrice - nextPrice) / currentPrice) * 100;
    }
  };

  // Step 1: Initiate Trade & Show Confirmation Modal Overlay
  const handleInitiateTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Please connect your wallet first.", "error");
      return;
    }
    const num = parseFloat(inputVal) || 0;
    if (num <= 0 || tradeLoading) return;

    // 1. Validate Token Balance for Sell Order
    if (tradeMode === "sell" && num > tokenBalance) {
      showToast(`Insufficient ${token.symbol} balance. You only have ${tokenBalance.toLocaleString()} ${token.symbol}.`, "error");
      return;
    }

    // 2. Slippage Validation Check
    const currentPriceImpact = getPriceImpact();
    const activeSlippage = slippage;
    if (currentPriceImpact > activeSlippage) {
      addTerminalLog("error", `Swap failed: Price impact (${currentPriceImpact.toFixed(2)}%) exceeds slippage tolerance (${activeSlippage.toFixed(2)}%)!`);
      showToast(`Slippage limit exceeded: ${currentPriceImpact.toFixed(1)}% Impact > ${activeSlippage.toFixed(1)}% Limit. Adjust slippage tolerance or reduce amount.`, "error");
      return;
    }

    // 3. Gas Fee Check
    const gasFee = wallet.isSmartAccount ? 0 : (gasMode === "standard" ? 0.0001 : gasMode === "fast" ? 0.0002 : 0.0004);
    if (tradeMode === "buy" && num + gasFee > wallet.balanceEth) {
      showToast("Insufficient ETH balance to cover amount and gas fees.", "error");
      return;
    }

    // Open confirmation modal overlay
    setIsConfirmModalOpen(true);
  };

  // Step 2: Confirmed in Modal -> Execute Buy / Sell Order
  const handleConfirmAndExecuteTrade = () => {
    const num = parseFloat(inputVal) || 0;
    if (num <= 0 || tradeLoading) return;

    setTradeLoading(true);

    const gasFee = wallet.isSmartAccount ? 0 : (gasMode === "standard" ? 0.0001 : gasMode === "fast" ? 0.0002 : 0.0004);

    if (tradeMode === "buy") {
      addTerminalLog("info", `Broadcasting curve BUY order via ${gasMode.toUpperCase()} gas tier (${wallet.isSmartAccount ? "AA SPONSORED" : gasFee + " ETH"})...`);

      setTimeout(() => {
        const tokensMinted = getTokensForEth(token.supply, num);
        const fee = num * 0.01;
        
        // Mutate token state
        const tokensList = AgunnayaDatabase.getTokens();
        const found = tokensList.find(t => t.address === token.address);
        if (found) {
          found.supply += tokensMinted;
          found.reserveEth += num - fee;
          found.creatorFeesEarned += fee;
          found.currentPrice = getSpotPrice(found.supply);
          found.marketCap = found.currentPrice * found.supply;
          found.volume24h += num;
          
          AgunnayaDatabase.saveTokens(tokensList);
          // Sync local prop state
          token.supply = found.supply;
          token.reserveEth = found.reserveEth;
          token.creatorFeesEarned = found.creatorFeesEarned;
          token.currentPrice = found.currentPrice;
          token.marketCap = found.marketCap;
          token.volume24h = found.volume24h;
        }

        // Deduct from wallet and record AGL token bonuses
        const updatedWallet = { 
          ...wallet, 
          balanceEth: wallet.balanceEth - num - gasFee,
          aglTokenBalance: wallet.aglTokenBalance + 10 // reward 10 AGL on trades!
        };
        AgunnayaDatabase.saveWallet(updatedWallet);

        // Update persistent custom token balance
        const balances = AgunnayaDatabase.getTokenBalances(wallet.address);
        balances[token.address.toLowerCase()] = (balances[token.address.toLowerCase()] || 0) + tokensMinted;
        AgunnayaDatabase.saveTokenBalances(wallet.address, balances);
        refreshLocalTokenBalance();

        AgunnayaDatabase.addReferralPayout(wallet.address, "buy order", fee);
        onRefreshWallet();

        // Save activity
        AgunnayaDatabase.addActivity({
          type: "buy",
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          user: wallet.address,
          amount: tokensMinted,
          ethValue: num,
          details: `Bought +${tokensMinted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol} for ${num} ETH`
        });

        addTerminalLog("buy", `${wallet.address.slice(0, 6)}... bought +${tokensMinted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol} for ${num} ETH`);
        showToast(`Successfully purchased +${tokensMinted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol}!`, "success");
        
        setInputVal("");
        setTradeLoading(false);
        setIsConfirmModalOpen(false);
      }, 1500);

    } else {
      // Sell logic
      addTerminalLog("info", `Initiating linear curve BURN/SELL execution for ${num} ${token.symbol} via ${gasMode.toUpperCase()} gas...`);

      setTimeout(() => {
        const { net, fee } = getEthReturnForTokens(token.supply, num);
        
        // Mutate token state
        const tokensList = AgunnayaDatabase.getTokens();
        const found = tokensList.find(t => t.address === token.address);
        if (found) {
          found.supply = Math.max(0, found.supply - num);
          found.reserveEth = Math.max(0, found.reserveEth - (net + fee));
          found.creatorFeesEarned += fee;
          found.currentPrice = getSpotPrice(found.supply);
          found.marketCap = found.currentPrice * found.supply;
          found.volume24h += net;

          AgunnayaDatabase.saveTokens(tokensList);
          // Sync local prop state
          token.supply = found.supply;
          token.reserveEth = found.reserveEth;
          token.creatorFeesEarned = found.creatorFeesEarned;
          token.currentPrice = found.currentPrice;
          token.marketCap = found.marketCap;
          token.volume24h = found.volume24h;
        }

        // Add to wallet balance (net return minus gas fee)
        const updatedWallet = { 
          ...wallet, 
          balanceEth: wallet.balanceEth + net - gasFee,
          aglTokenBalance: wallet.aglTokenBalance + 5 // reward 5 AGL
        };
        AgunnayaDatabase.saveWallet(updatedWallet);

        // Update persistent custom token balance
        const balances = AgunnayaDatabase.getTokenBalances(wallet.address);
        balances[token.address.toLowerCase()] = Math.max(0, (balances[token.address.toLowerCase()] || 0) - num);
        AgunnayaDatabase.saveTokenBalances(wallet.address, balances);
        refreshLocalTokenBalance();

        AgunnayaDatabase.addReferralPayout(wallet.address, "sell order", fee);
        onRefreshWallet();

        // Save activity
        AgunnayaDatabase.addActivity({
          type: "sell",
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          user: wallet.address,
          amount: num,
          ethValue: net,
          details: `Sold -${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol} for ${net.toFixed(5)} ETH`
        });

        addTerminalLog("sell", `${wallet.address.slice(0, 6)}... sold -${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol} for ${net.toFixed(5)} ETH`);
        showToast(`Successfully sold -${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol}!`, "success");
        
        setInputVal("");
        setTradeLoading(false);
        setIsConfirmModalOpen(false);
      }, 1500);
    }
  };

  return (
    <div id="trading-workspace-root" className="space-y-6 animate-fade-in">
      {/* Return button */}
      <button
        id="trade-back-btn"
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/80 text-xs font-semibold text-zinc-400 hover:text-white transition-all font-display"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Explore launchpad</span>
      </button>

      {/* Main split sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Token Info & Chart */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header Stats bar */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <ImageWithFallback src={token.logoUrl} alt={token.name} fallbackText={token.symbol} className="w-12 h-12 rounded-2xl object-cover border border-white/5 shadow-md" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-display text-white">{token.name}</h2>
                  <span className="text-[10px] font-mono font-bold bg-brand-purple/20 text-brand-purple px-1.5 py-0.5 rounded">{token.symbol}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 font-semibold truncate flex items-center gap-1.5 max-w-xs sm:max-w-md">
                  Contract: 
                  <a 
                    href={`https://basescan.org/address/${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-blue hover:underline hover:text-brand-purple transition-all font-bold"
                    title="Verify on BaseScan"
                  >
                    {token.address} ↗
                  </a>
                </span>
              </div>
            </div>

            {/* Price change info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:text-right font-mono text-xs border-t md:border-t-0 border-white/5 pt-3 md:pt-0 w-full md:w-auto">
              {/* Sparkline Visual Component */}
              {priceHistory.length > 0 && (
                <div className="w-28 h-10 bg-zinc-950/40 px-2.5 py-1 rounded-xl border border-white/5 flex flex-col justify-between">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider text-left block">
                    Live Trend
                  </span>
                  <div className="w-full h-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <defs>
                          <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={strokeColor}
                          strokeWidth={1.5}
                          fill="url(#sparklineGrad)"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
                <div>
                  <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Spot Price</span>
                  <div className="flex items-center gap-1.5 md:justify-end">
                    <span className="text-white font-bold text-sm">{(token.currentPrice * 1000000).toFixed(3)} μETH</span>
                    <span className={`text-[10px] font-bold font-mono ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                      {isUp ? "↑" : "↓"}{Math.abs(priceChangePct).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Market Cap</span>
                  <span className="text-brand-purple font-bold text-sm">{token.marketCap.toFixed(3)} ETH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section with Dual-View Options */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Chart Mode:</span>
                <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-white/5">
                  <button
                    id="chart-mode-bonding"
                    type="button"
                    onClick={() => setChartView("bonding")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all ${
                      chartView === "bonding"
                        ? "bg-brand-purple text-white shadow-md font-extrabold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Bonding Curve Model
                  </button>
                  <button
                    id="chart-mode-analytics"
                    type="button"
                    onClick={() => setChartView("analytics")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all ${
                      chartView === "analytics"
                        ? "bg-brand-blue text-white shadow-md font-extrabold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Slippage & Math Analytics
                  </button>
                  <button
                    id="chart-mode-depth"
                    type="button"
                    onClick={() => setChartView("depth")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 ${
                      chartView === "depth"
                        ? "bg-purple-600 text-white shadow-md font-extrabold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Liquidity Depth Chart
                  </button>
                  <button
                    id="chart-mode-gecko"
                    type="button"
                    onClick={() => setChartView("gecko")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 ${
                      chartView === "gecko"
                        ? "bg-emerald-500 text-black shadow-md font-extrabold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Live Base DEX (GeckoTerminal)
                  </button>
                  <button
                    id="chart-mode-audit"
                    type="button"
                    onClick={() => setChartView("audit")}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 ${
                      chartView === "audit"
                        ? "bg-emerald-400 text-black shadow-md font-extrabold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Security Audit
                  </button>
                </div>
              </div>

              {chartView === "gecko" && (
                <a
                  href="https://www.geckoterminal.com/base/pools/0xe7d6de2bf95c563a819eb62cbf0c7e9020df53c875ccfbaf3fdccaa1fd25b085"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-zinc-400 hover:text-emerald-400 transition-all flex items-center gap-1 hover:underline"
                >
                  View full pool contract <ExternalLink className="w-3 h-3 text-emerald-400" />
                </a>
              )}
            </div>

            {chartView === "bonding" ? (
              <BondingCurveChart currentSupply={token.supply} maxSupply={token.maxSupply} tokenSymbol={token.symbol} />
            ) : chartView === "analytics" ? (
              <BondingCurveAnalytics 
                token={token} 
                onApplyTradeAmount={(amt, mode) => {
                  setTradeMode(mode);
                  setInputVal(amt.toString());
                  showToast(`Filled ${mode.toUpperCase()} order for ${amt} ${mode === "buy" ? "ETH" : token.symbol}`, "info");
                }} 
              />
            ) : chartView === "depth" ? (
              <LiquidityDepthChart
                token={token}
                onApplyTradeAmount={(amt, mode) => {
                  setTradeMode(mode);
                  setInputVal(amt);
                  showToast(`Applied ${mode.toUpperCase()} depth order for ${amt} ${mode === "buy" ? "ETH" : token.symbol}`, "info");
                }}
              />
            ) : chartView === "audit" ? (
              <TokenSecurityAudit 
                token={token}
                showToast={showToast}
              />
            ) : (
              <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-white/10 bg-black relative shadow-2xl">
                {/* Embedded GeckoTerminal Live Chart */}
                <iframe
                  id="geckoterminal-chart-embed"
                  width="100%"
                  height="100%"
                  src="https://www.geckoterminal.com/base/pools/0xe7d6de2bf95c563a819eb62cbf0c7e9020df53c875ccfbaf3fdccaa1fd25b085?embed=1&info=0&swaps=1&theme=dark"
                  title="GeckoTerminal Live Base DEX Pool Chart"
                  frameBorder="0"
                  allow="clipboard-write"
                  allowFullScreen
                  className="bg-black w-full h-full border-0"
                ></iframe>
              </div>
            )}
          </div>

          {/* macOS command terminal logs */}
          <TerminalLog logs={terminalLogs} />

          {/* Bonding Curve Mathematical Analytics Suite */}
          {chartView !== "analytics" && (
            <BondingCurveAnalytics 
              token={token} 
              onApplyTradeAmount={(amt, mode) => {
                setTradeMode(mode);
                setInputVal(amt.toString());
                showToast(`Filled ${mode.toUpperCase()} order for ${amt} ${mode === "buy" ? "ETH" : token.symbol}`, "info");
              }} 
            />
          )}

        </div>

        {/* Trade Execution panel & metrics */}
        <div className="space-y-6">
          
          {/* Trading Interface Selector Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-2xl border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => setTradingInterface("bondingContract")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-display transition-all flex items-center justify-center gap-1.5 ${
                tradingInterface === "bondingContract"
                  ? "bg-[#0052FF] text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Bonding Curve Contract</span>
            </button>
            <button
              type="button"
              onClick={() => setTradingInterface("quickSwap")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-display transition-all flex items-center justify-center gap-1.5 ${
                tradingInterface === "quickSwap"
                  ? "bg-brand-purple text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-300" />
              <span>Quick Swap</span>
            </button>
          </div>

          {tradingInterface === "bondingContract" ? (
            <BondingCurveTrading
              token={token}
              wallet={wallet}
              onRefreshWallet={onRefreshWallet}
              addTerminalLog={addTerminalLog}
              showToast={showToast}
              onTradeExecuted={({ type, amount, ethValue }) => {
                refreshLocalTokenBalance();
              }}
            />
          ) : (
            /* Interactive Buy/Sell Form */
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-950 space-y-5 relative">
              
              {/* Toggle-able animated tab interface */}
              <div className="flex bg-zinc-900/80 p-1 rounded-xl relative border border-white/5 overflow-hidden">
                <button
                  id="trade-buy-tab"
                  type="button"
                  onClick={() => { setTradeMode("buy"); setInputVal(""); }}
                  className={`relative flex-1 py-2.5 rounded-lg text-xs font-semibold font-display transition-all z-10 ${
                    tradeMode === "buy"
                      ? "text-emerald-950 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tradeMode === "buy" && (
                    <motion.div
                      layoutId="activeTradeTab"
                      className="absolute inset-0 bg-emerald-400 rounded-lg -z-10 shadow"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  Buy {token.symbol}
                </button>
                <button
                  id="trade-sell-tab"
                  type="button"
                  onClick={() => { setTradeMode("sell"); setInputVal(""); }}
                  className={`relative flex-1 py-2.5 rounded-lg text-xs font-semibold font-display transition-all z-10 ${
                    tradeMode === "sell"
                      ? "text-rose-950 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tradeMode === "sell" && (
                    <motion.div
                      layoutId="activeTradeTab"
                      className="absolute inset-0 bg-rose-400 rounded-lg -z-10 shadow"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  Sell {token.symbol}
                </button>
              </div>

              <form onSubmit={handleInitiateTrade} className="space-y-4">
                {/* Amount input with balance helper and MAX shortcut buttons */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      {tradeMode === "buy" ? "Investment Amount (ETH)" : "Quantity to Burn (Tokens)"}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (tradeMode === "buy") {
                          const maxVal = Math.max(0, wallet.balanceEth - 0.002);
                          setInputVal(maxVal > 0 ? maxVal.toFixed(4) : "0");
                        } else {
                          setInputVal(tokenBalance.toString());
                        }
                      }}
                      className="text-[10px] text-zinc-400 hover:text-brand-purple hover:underline transition-colors flex items-center gap-1 font-mono font-semibold"
                    >
                      <span>Wallet Balance:</span>
                      <span className="text-zinc-200">
                        {tradeMode === "buy"
                          ? `${wallet.balanceEth.toFixed(4)} ETH`
                          : `${tokenBalance.toLocaleString()} ${token.symbol}`}
                      </span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="trade-amount-input"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder={tradeMode === "buy" ? "0.05" : "10,000"}
                      required
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl p-3 pr-12 text-xs font-mono text-white focus:outline-none focus:border-brand-purple/40"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs text-zinc-500 font-bold font-mono">
                      {tradeMode === "buy" ? "ETH" : token.symbol}
                    </span>
                  </div>

                  {/* Quick percentage shortcuts */}
                  <div className="flex gap-1.5 mt-2">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          if (tradeMode === "buy") {
                            const base = wallet.balanceEth;
                            if (pct === 100) {
                              const maxVal = Math.max(0, base - 0.002);
                              setInputVal(maxVal > 0 ? maxVal.toFixed(4) : "0");
                            } else {
                              setInputVal((base * (pct / 100)).toFixed(4));
                            }
                          } else {
                            setInputVal(Math.floor(tokenBalance * (pct / 100)).toString());
                          }
                        }}
                        className="flex-1 py-1 text-[9px] font-bold font-mono text-zinc-500 hover:text-zinc-200 bg-zinc-905/30 hover:bg-zinc-900 rounded-md border border-white/5 transition-all cursor-pointer"
                      >
                        {pct === 100 ? "MAX" : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slippage Tolerance Panel */}
                <div className="space-y-1.5 bg-zinc-900/30 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1 font-display">
                      <Settings className="w-3.5 h-3.5 text-zinc-500" />
                      Slippage Tolerance
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">
                      {slippage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0.5, 1.0, 3.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setSlippage(val);
                          setCustomSlippage("");
                        }}
                        className={`flex-1 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                          slippage === val && !customSlippage
                            ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30 font-extrabold"
                            : "bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 border border-transparent"
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        placeholder="Custom"
                        value={customSlippage}
                        onChange={(e) => {
                          setCustomSlippage(e.target.value);
                          const num = parseFloat(e.target.value);
                          if (num > 0) setSlippage(Math.min(50, num));
                        }}
                        className="w-full bg-zinc-900/40 text-center py-1 rounded-md text-[10px] font-mono text-zinc-300 focus:outline-none border border-white/5 placeholder-zinc-600 focus:border-brand-purple/30"
                      />
                    </div>
                  </div>
                  {slippage < 0.5 && (
                    <p className="text-[9px] text-rose-400 font-mono leading-tight flex items-center gap-1 mt-1">
                      <Info className="w-3 h-3 flex-shrink-0" /> Low slippage: Trade might revert.
                    </p>
                  )}
                  {slippage > 5.0 && (
                    <p className="text-[9px] text-amber-400 font-mono leading-tight flex items-center gap-1 mt-1">
                      <Info className="w-3 h-3 flex-shrink-0" /> High slippage: High sandwich / frontrunning risk.
                    </p>
                  )}
                </div>

                {/* DEX Aggregator Route Telemetry */}
                <div className="py-2 px-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    Multi-DEX Aggregator Active
                  </span>
                  <span className="text-[9px] text-zinc-400">
                    1inch • Aerodrome • 0x • UniV3
                  </span>
                </div>

                {/* Gas / Speed Settings Panel */}
                <div className="space-y-1.5 bg-zinc-900/30 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1 font-display">
                      <Flame className="w-3.5 h-3.5 text-zinc-500" />
                      Transaction Speed (Gas)
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">
                      {wallet.isSmartAccount ? "AA Sponsored" : `${gasMode === "standard" ? "0.0001" : gasMode === "fast" ? "0.0002" : "0.0004"} ETH`}
                    </span>
                  </div>
                  {wallet.isSmartAccount ? (
                    <div className="py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-mono leading-normal">
                      ⚡ **Account Abstraction Active!** Gas fees are 100% sponsored by Agunnaya Labs Relayer.
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      {[
                        { mode: "standard", label: "Std", gwei: "~15 Gwei" },
                        { mode: "fast", label: "Fast", gwei: "~25 Gwei" },
                        { mode: "instant", label: "Instant", gwei: "~50 Gwei" }
                      ].map((g) => (
                        <button
                          key={g.mode}
                          type="button"
                          onClick={() => setGasMode(g.mode as any)}
                          className={`flex-1 py-1 rounded-md text-[10px] font-mono font-bold transition-all flex flex-col items-center cursor-pointer ${
                            gasMode === g.mode
                              ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/30 font-extrabold"
                              : "bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 border border-transparent"
                          }`}
                        >
                          <span>{g.label}</span>
                          <span className="text-[8px] opacity-60 font-medium">{g.gwei}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Real-time estimation outputs and Web3 fee telemetry */}
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/5 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Est. Output:</span>
                    <span className="text-white font-bold">
                      {estimatedOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tradeMode === "buy" ? token.symbol : "ETH"}
                    </span>
                  </div>

                  {/* Price Impact display */}
                  <div className="flex justify-between text-zinc-400">
                    <span>Price Impact:</span>
                    <span className={`font-bold ${
                      getPriceImpact() < 1
                        ? "text-emerald-400"
                        : getPriceImpact() < 5
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}>
                      {inputVal ? `${getPriceImpact().toFixed(2)}%` : "0.00%"}
                    </span>
                  </div>

                  {/* Minimum Output display */}
                  <div className="flex justify-between text-zinc-500 text-[10px]">
                    <span>Min. Output (Slippage):</span>
                    <span>
                      {inputVal
                        ? `${(estimatedOutput * (1 - slippage / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${tradeMode === "buy" ? token.symbol : "ETH"}`
                        : `0.00 ${tradeMode === "buy" ? token.symbol : "ETH"}`}
                    </span>
                  </div>

                  {/* Creator Fee */}
                  <div className="flex justify-between text-zinc-500 text-[10px]">
                    <span>Creator Fee (1%):</span>
                    <span>
                      {tradeMode === "buy"
                        ? `${((parseFloat(inputVal) || 0) * 0.01).toFixed(6)} ETH`
                        : `${((estimatedOutput) * 0.01).toFixed(6)} ETH`}
                    </span>
                  </div>

                  {/* Referral Split */}
                  <div className="flex justify-between text-zinc-500 text-[10px]">
                    <span>Referral Split (20%):</span>
                    <span className="text-emerald-500">
                      {tradeMode === "buy"
                        ? `${((parseFloat(inputVal) || 0) * 0.01 * 0.20).toFixed(6)} ETH`
                        : `${((estimatedOutput) * 0.01 * 0.20).toFixed(6)} ETH`}
                    </span>
                  </div>

                  {/* AGL Rewards */}
                  <div className="flex justify-between text-zinc-500 text-[10px]">
                    <span>AGL Trade Reward:</span>
                    <span className="text-brand-purple font-bold">+{tradeMode === "buy" ? "10 AGL" : "5 AGL"}</span>
                  </div>
                </div>

                <button
                  id="trade-submit-btn"
                  type="submit"
                  disabled={tradeLoading || !inputVal || parseFloat(inputVal) <= 0}
                  className={`w-full py-3.5 rounded-xl font-bold font-display text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    tradeMode === "buy"
                      ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 text-black font-bold"
                      : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/10 text-white font-bold"
                  }`}
                >
                  <ArrowLeftRight className={`w-4 h-4 ${tradeLoading ? "animate-spin" : ""}`} />
                  <span>{tradeLoading ? "Executing on Base L2..." : tradeMode === "buy" ? `Buy ${token.symbol} Asset` : `Sell ${token.symbol} Asset`}</span>
                </button>
              </form>
            </div>
          )}

          {/* Token metadata, creator info, socials */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">Project Specifics</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {token.description}
            </p>

            <div className="border-t border-white/5 pt-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-500">
                <span>Creator Earnings:</span>
                <span className="text-zinc-200">{token.creatorFeesEarned.toFixed(5)} ETH</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Vesting Period:</span>
                <span className="text-zinc-200">{token.vestingWeeks > 0 ? `${token.vestingWeeks} Weeks` : "None"}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Referral Payout:</span>
                <span className="text-zinc-200">{token.referralRewardsPct}%</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Curve Reserves:</span>
                <span className="text-emerald-400 font-bold">{token.reserveEth.toFixed(4)} ETH</span>
              </div>
            </div>

            {/* Social icons links */}
            <div className="flex gap-2 border-t border-white/5 pt-4">
              {token.socials.website && (
                <a
                  href={token.socials.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {token.socials.twitter && (
                <a
                  href={token.socials.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 text-xs font-mono flex items-center gap-1.5 ml-auto leading-none">
                <Cpu className="w-3.5 h-3.5 text-brand-blue" />
                <span>Linear Reserve Synced</span>
              </div>
            </div>
          </div>

          {/* PRICE ALERTS SYSTEM */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-purple" />
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">Price Alerts</h3>
              </div>
              {("Notification" in window) && (
                Notification.permission !== "granted" ? (
                  <button
                    type="button"
                    onClick={() => Notification.requestPermission()}
                    className="text-[9px] font-mono font-bold bg-brand-purple/20 text-brand-purple px-2 py-1 rounded hover:bg-brand-purple/35 transition-all"
                  >
                    🔔 Enable Push
                  </button>
                ) : (
                  <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Push Enabled
                  </span>
                )
              )}
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                  Target Price (μETH)
                </label>
                <div className="relative">
                  <input
                    id="alert-price-input"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder={(token.currentPrice * 1000000).toFixed(3)}
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl p-3 pr-16 text-xs font-mono text-white focus:outline-none focus:border-brand-purple/40"
                  />
                  <span className="absolute right-3 top-3 text-[10px] text-zinc-500 font-bold font-mono">
                    μETH
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-[9px] font-mono text-zinc-500">
                  <span>Current: {(token.currentPrice * 1000000).toFixed(3)} μETH</span>
                  {alertTargetPrice && (
                    <span>= {(parseFloat(alertTargetPrice) / 1000000).toFixed(8)} ETH</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAlertCondition("above")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                    alertCondition === "above"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  goes above ↑
                </button>
                <button
                  type="button"
                  onClick={() => setAlertCondition("below")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                    alertCondition === "below"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  goes below ↓
                </button>
              </div>

              <button
                id="set-alert-btn"
                type="submit"
                className="w-full py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-hover text-white font-bold font-display text-[11px] shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Create Alert</span>
              </button>
            </form>

            {/* Existing price alerts list for this token */}
            {tokenAlerts.length > 0 && (
              <div className="border-t border-white/5 pt-3 space-y-2">
                <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Active Alerts ({tokenAlerts.length})</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {tokenAlerts.map((alert) => (
                    <div key={alert.id} className="flex justify-between items-center p-2 rounded-lg bg-zinc-950/60 border border-white/5 text-[10px] font-mono">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${
                            alert.condition === "above" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {alert.condition === "above" ? "Above" : "Below"}
                          </span>
                          <span className="text-white font-bold">{(alert.targetPrice * 1000000).toFixed(3)} μETH</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] text-zinc-500">
                          <span>Set: {new Date(alert.createdAt).toLocaleTimeString()}</span>
                          {alert.status === "triggered" && alert.triggeredAt && (
                            <span className="text-emerald-500 font-bold">Triggered!</span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => onDeletePriceAlert(alert.id)}
                        className="p-1.5 rounded-md hover:bg-white/5 text-zinc-500 hover:text-rose-500 transition-all"
                        title="Delete Alert"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Trade Confirmation Overlay Modal */}
      <TradeConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          if (!tradeLoading) setIsConfirmModalOpen(false);
        }}
        onConfirm={handleConfirmAndExecuteTrade}
        tradeMode={tradeMode}
        token={token}
        inputAmount={parseFloat(inputVal) || 0}
        estimatedOutput={estimatedOutput}
        priceImpact={getPriceImpact()}
        slippage={slippage}
        gasMode={gasMode}
        gasFee={wallet.isSmartAccount ? 0 : (gasMode === "standard" ? 0.0001 : gasMode === "fast" ? 0.0002 : 0.0004)}
        isSmartAccount={wallet.isSmartAccount}
        walletBalanceEth={wallet.balanceEth}
        isLoading={tradeLoading}
      />
    </div>
  );
}
