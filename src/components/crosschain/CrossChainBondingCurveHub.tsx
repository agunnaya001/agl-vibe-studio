import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { WalletState, Token } from "../../types";
import {
  CrossChainNetworkConfig,
  CrossChainDeploymentPlan,
  UnifiedBondingCurvePool,
  UnifiedChainReserve,
  LiFiCrossChainSwapQuote,
  CrossChainRebalanceRecord
} from "../../types/crossChainLiquidity";
import ImageWithFallback from "../ImageWithFallback";
import {
  Globe,
  Layers,
  ArrowLeftRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Cpu,
  Sparkles,
  Fuel,
  Clock,
  Coins,
  Send,
  Sliders,
  ChevronRight,
  Database
} from "lucide-react";

interface CrossChainBondingCurveHubProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  initialToken?: Token | null;
}

export default function CrossChainBondingCurveHub({
  wallet,
  onRefreshWallet,
  addTerminalLog,
  showToast,
  initialToken
}: CrossChainBondingCurveHubProps) {
  // Tabs: "deployer" | "unified-trading" | "unified-reserves" | "rebalancer"
  const [activeTab, setActiveTab] = useState<"deployer" | "unified-trading" | "unified-reserves" | "rebalancer">("deployer");

  // Network State
  const [chains, setChains] = useState<CrossChainNetworkConfig[]>([]);
  const [loadingChains, setLoadingChains] = useState<boolean>(true);

  // Deployer State
  const [tokenName, setTokenName] = useState<string>(initialToken?.name || "Agunnaya CrossChain");
  const [tokenSymbol, setTokenSymbol] = useState<string>(initialToken?.symbol || "AGLX");
  const [tokenDesc, setTokenDesc] = useState<string>(initialToken?.description || "Unified bonding curve liquidity token across Optimism, Arbitrum, Unichain, and Polygon.");
  const [tokenLogo, setTokenLogo] = useState<string>(initialToken?.logoUrl || "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=100&auto=format&fit=crop&q=80");
  const [basePrice, setBasePrice] = useState<string>("0.000001");
  const [slope, setSlope] = useState<string>("0.00000000001");
  const [selectedChainIds, setSelectedChainIds] = useState<number[]>([10, 42161, 130, 137, 8453]);
  const [preparingDeploy, setPreparingDeploy] = useState<boolean>(false);
  const [activePlan, setActivePlan] = useState<CrossChainDeploymentPlan | null>(null);
  const [deployingChains, setDeployingChains] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Unified Trading State (via LI.FI)
  const [sourceChainId, setSourceChainId] = useState<number>(42161); // Default Arbitrum
  const [targetChainId, setTargetChainId] = useState<number>(8453); // Default Base Hub
  const [tradeSourceAmount, setTradeSourceAmount] = useState<string>("0.1");
  const [tradeQuote, setTradeQuote] = useState<LiFiCrossChainSwapQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [executingTrade, setExecutingTrade] = useState<boolean>(false);
  const [tradeSuccessTx, setTradeSuccessTx] = useState<{ txHash: string; explorerUrl: string; trackingId: string } | null>(null);

  // Unified Pool State
  const [unifiedPool, setUnifiedPool] = useState<UnifiedBondingCurvePool | null>(null);
  const [rebalanceLogs, setRebalanceLogs] = useState<CrossChainRebalanceRecord[]>([]);
  const [rebalancing, setRebalancing] = useState<boolean>(false);

  // Fetch Supported Chains from Backend
  const fetchChains = useCallback(async () => {
    try {
      setLoadingChains(true);
      const res = await fetch("/api/crosschain/chains");
      if (res.ok) {
        const data = await res.json();
        setChains(data.chains || []);
      }
    } catch (e) {
      console.warn("Could not fetch crosschain chains:", e);
    } finally {
      setLoadingChains(false);
    }
  }, []);

  // Fetch Unified Reserves
  const fetchUnifiedReserves = useCallback(async () => {
    try {
      const res = await fetch("/api/crosschain/unified-reserves");
      if (res.ok) {
        const data = await res.json();
        setUnifiedPool(data.pool);
        setRebalanceLogs(data.rebalanceLogs || []);
      }
    } catch (e) {
      console.warn("Could not fetch unified reserves:", e);
    }
  }, []);

  useEffect(() => {
    fetchChains();
    fetchUnifiedReserves();
  }, [fetchChains, fetchUnifiedReserves]);

  // Fetch LI.FI Cross-Chain Bonding Curve Route Quote
  const fetchRouteQuote = useCallback(async () => {
    if (!tradeSourceAmount || parseFloat(tradeSourceAmount) <= 0) {
      setTradeQuote(null);
      return;
    }

    setLoadingQuote(true);
    try {
      const res = await fetch("/api/crosschain/bonding-curve/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChainId: sourceChainId,
          toChainId: targetChainId,
          fromTokenSymbol: sourceChainId === 137 ? "POL" : "ETH",
          targetTokenAddress: unifiedPool?.tokenAddress || "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698",
          fromAmount: tradeSourceAmount,
          action: "buy",
          userAddress: wallet.address || "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTradeQuote(data.quote);
      }
    } catch (e) {
      console.error("Failed to fetch route quote:", e);
    } finally {
      setLoadingQuote(false);
    }
  }, [sourceChainId, targetChainId, tradeSourceAmount, unifiedPool?.tokenAddress, wallet.address]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRouteQuote();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchRouteQuote]);

  // Handle Chain Selection Toggle
  const toggleChainSelection = (chainId: number) => {
    if (selectedChainIds.includes(chainId)) {
      if (selectedChainIds.length === 1) {
        showToast("At least one chain must be selected for deployment.", "info");
        return;
      }
      setSelectedChainIds(selectedChainIds.filter(id => id !== chainId));
    } else {
      setSelectedChainIds([...selectedChainIds, chainId]);
    }
  };

  // Prepare Deployment Routes
  const handlePrepareDeployment = async () => {
    if (!tokenName.trim() || !tokenSymbol.trim()) {
      showToast("Please provide both token name and symbol.", "error");
      return;
    }

    setPreparingDeploy(true);
    try {
      const res = await fetch("/api/crosschain/deploy/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenName: tokenName.trim(),
          tokenSymbol: tokenSymbol.trim().toUpperCase(),
          tokenDescription: tokenDesc,
          logoUrl: tokenLogo,
          basePriceEth: parseFloat(basePrice) || 0.000001,
          slopeEth: parseFloat(slope) || 0.00000000001,
          creatorAddress: wallet.address || "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
          targetChains: selectedChainIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActivePlan(data.plan);
        addTerminalLog("success", `CROSSCHAIN_ROUTER: Prepared deterministic CREATE2 deployment for ${tokenSymbol} across ${data.plan.chains.length} chains.`);
        showToast(`Deployment routes prepared! Deterministic address: ${data.plan.deterministicAddress.slice(0, 8)}...`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to prepare cross-chain deployment", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Network error while preparing routes", "error");
    } finally {
      setPreparingDeploy(false);
    }
  };

  // Execute Cross-Chain Deployment
  const handleExecuteDeployment = async () => {
    if (!activePlan) return;

    setDeployingChains(true);
    addTerminalLog("info", `CROSSCHAIN_ROUTER: Broadcasting deployment transactions across Optimism, Arbitrum, Unichain, Polygon, and Base...`);

    try {
      const res = await fetch("/api/crosschain/deploy/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: activePlan.id })
      });

      if (res.ok) {
        const data = await res.json();
        setActivePlan(data.plan);
        addTerminalLog("success", `CROSSCHAIN_ROUTER: Successfully deployed ${activePlan.tokenSymbol} with verified bytecode on all selected EVM chains!`);
        showToast(`Token successfully deployed across ${data.plan.chains.length} networks!`, "success");
        fetchUnifiedReserves();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to execute deployment", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Error executing multi-chain deployment", "error");
    } finally {
      setDeployingChains(false);
    }
  };

  // Execute Cross-Chain Trade (LI.FI Unified Liquidity)
  const handleExecuteTrade = async () => {
    if (!wallet.isConnected) {
      showToast("Please connect your Web3 wallet first.", "error");
      return;
    }
    if (!tradeQuote) return;

    setExecutingTrade(true);
    setTradeSuccessTx(null);
    addTerminalLog("info", `LIFI_ROUTER: Initiating cross-chain buy of ${tradeQuote.bondingCurveMintAmount} ${tradeQuote.toToken.symbol} from ${tradeQuote.fromChainName}...`);

    try {
      const res = await fetch("/api/crosschain/bonding-curve/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: tradeQuote.quoteId,
          fromChainId: tradeQuote.fromChainId,
          fromAmount: tradeSourceAmount,
          userAddress: wallet.address
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTradeSuccessTx({
          txHash: data.txHash,
          explorerUrl: data.explorerUrl,
          trackingId: data.lifiTrackingId
        });
        addTerminalLog("success", `LIFI_ROUTER: Cross-chain trade confirmed! Relayed via ${tradeQuote.bridgeTool}. Tx: ${data.txHash.slice(0, 10)}...`);
        showToast(`Cross-chain trade executed! Minted ${tradeQuote.bondingCurveMintAmount} ${tradeQuote.toToken.symbol}`, "success");
        fetchUnifiedReserves();
        onRefreshWallet();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to execute cross-chain trade", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Error during cross-chain execution", "error");
    } finally {
      setExecutingTrade(false);
    }
  };

  // Trigger Cross-Chain Rebalance Relay
  const handleTriggerRebalance = async (sourceId: number, targetId: number, amount: number) => {
    setRebalancing(true);
    try {
      const res = await fetch("/api/crosschain/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChainId: sourceId,
          targetChainId: targetId,
          amountEth: amount
        })
      });

      if (res.ok) {
        const data = await res.json();
        addTerminalLog("success", `REBALANCE_RELAY: ${data.message}`);
        showToast(data.message, "success");
        fetchUnifiedReserves();
      }
    } catch (e: any) {
      showToast(e.message || "Rebalance failed", "error");
    } finally {
      setRebalancing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(id);
    showToast("Copied to clipboard!", "info");
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-purple-950/40 to-zinc-900 border border-purple-500/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-0 opacity-10 pointer-events-none hidden lg:block">
          <Globe className="w-64 h-64 text-purple-400" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
                <Globe className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-mono">
                    Cross-Chain Routes & Unified Liquidity
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30">
                    LI.FI Aggregator
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  Deterministic multi-chain deployment across <span className="text-purple-300 font-semibold">Optimism</span>, <span className="text-blue-300 font-semibold">Arbitrum</span>, <span className="text-pink-300 font-semibold">Unichain</span>, and <span className="text-violet-300 font-semibold">Polygon</span> with unified bonding curve liquidity.
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3">
              <div className="bg-zinc-800/80 backdrop-blur border border-zinc-700/60 rounded-xl px-4 py-2 text-right">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Global Unified TVL</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {unifiedPool ? `$${unifiedPool.totalReserveUsd.toLocaleString()}` : "$46,800"}
                </div>
              </div>
              <div className="bg-zinc-800/80 backdrop-blur border border-zinc-700/60 rounded-xl px-4 py-2 text-right">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Price Disparity</div>
                <div className="text-lg font-bold font-mono text-purple-300">
                  {unifiedPool ? `${unifiedPool.priceDisparityIndexPct}%` : "0.02%"}
                </div>
              </div>
            </div>
          </div>

          {/* Network Matrix Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-zinc-800/80">
            {loadingChains ? (
              <div className="col-span-full py-4 text-center text-xs text-zinc-500 font-mono">Loading cross-chain networks...</div>
            ) : (
              chains.map((chain) => (
                <div
                  key={chain.chainId}
                  className={`p-3 rounded-xl border transition-all ${
                    selectedChainIds.includes(chain.chainId)
                      ? "bg-zinc-800/90 border-purple-500/50 shadow-md shadow-purple-500/5"
                      : "bg-zinc-900/60 border-zinc-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ImageWithFallback
                        src={chain.logoUrl}
                        alt={chain.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-xs font-bold font-mono text-white">{chain.shortName}</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>ID: {chain.chainId}</span>
                    <span className="text-purple-300">{chain.averageBlockTimeSec}s block</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Gas: {chain.averageGasGwei} Gwei</span>
                    <span className="text-zinc-400 uppercase">{chain.nativeCurrency.symbol}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <button
            id="tab-btn-crosschain-deployer"
            type="button"
            onClick={() => setActiveTab("deployer")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "deployer"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Cross-Chain Deployment Hub</span>
          </button>

          <button
            id="tab-btn-crosschain-unified-trading"
            type="button"
            onClick={() => setActiveTab("unified-trading")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "unified-trading"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>LI.FI Unified Trading Terminal</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-900/60 text-purple-200">
              Live Bridge
            </span>
          </button>

          <button
            id="tab-btn-crosschain-unified-reserves"
            type="button"
            onClick={() => setActiveTab("unified-reserves")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "unified-reserves"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Unified Reserves & Depth</span>
          </button>

          <button
            id="tab-btn-crosschain-rebalancer"
            type="button"
            onClick={() => setActiveTab("rebalancer")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "rebalancer"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Liquidity Rebalance Relays</span>
          </button>
        </div>

        <button
          id="btn-refresh-crosschain-data"
          type="button"
          onClick={() => {
            fetchChains();
            fetchUnifiedReserves();
            showToast("Refreshed cross-chain state", "info");
          }}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: CROSS-CHAIN DEPLOYMENT ROUTER */}
      {activeTab === "deployer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Configuration */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white font-mono">1. Token & Curve Parameters</h3>
                </div>
                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                  CREATE2 Deterministic
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">Token Name</label>
                  <input
                    id="input-crosschain-token-name"
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g. Agunnaya CrossChain"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">Token Symbol</label>
                  <input
                    id="input-crosschain-token-symbol"
                    type="text"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. AGLX"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">Description</label>
                <textarea
                  id="input-crosschain-token-desc"
                  rows={2}
                  value={tokenDesc}
                  onChange={(e) => setTokenDesc(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">Base Price (ETH)</label>
                  <input
                    id="input-crosschain-base-price"
                    type="text"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">Linear Slope m</label>
                  <input
                    id="input-crosschain-slope"
                    type="text"
                    value={slope}
                    onChange={(e) => setSlope(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Target Networks Multi-Select */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-2">
                  Target Cross-Chain Networks (Select 1 to 5)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {chains.map((chain) => {
                    const isSelected = selectedChainIds.includes(chain.chainId);
                    return (
                      <button
                        key={chain.chainId}
                        id={`btn-toggle-chain-${chain.chainId}`}
                        type="button"
                        onClick={() => toggleChainSelection(chain.chainId)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-purple-950/30 border-purple-500 text-white"
                            : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ImageWithFallback
                            src={chain.logoUrl}
                            alt={chain.name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-xs font-bold font-mono">{chain.name}</div>
                            <div className="text-[10px] text-zinc-500">Chain ID: {chain.chainId}</div>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? "bg-purple-600 border-purple-500 text-white" : "border-zinc-600"
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                id="btn-prepare-crosschain-routes"
                type="button"
                onClick={handlePrepareDeployment}
                disabled={preparingDeploy}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-sm font-bold shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {preparingDeploy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Computing Deterministic Bytecode & Routes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Prepare Deployment Routes across {selectedChainIds.length} Chains</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Deployment Route Manifest & Execution */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white font-mono">2. Multi-Chain Route Manifest</h3>
                </div>
                {activePlan && (
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                    Routes Ready
                  </span>
                )}
              </div>

              {!activePlan ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-500">
                    <Layers className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-mono text-zinc-400 max-w-sm mx-auto">
                    Configure your token details on the left and click "Prepare Deployment Routes" to generate identical deterministic CREATE2 contract addresses.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Deterministic Address Badge */}
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-purple-300 font-bold uppercase">
                        Deterministic Contract Address (CREATE2)
                      </span>
                      <button
                        id="btn-copy-deterministic-addr"
                        type="button"
                        onClick={() => copyToClipboard(activePlan.deterministicAddress, "det")}
                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono"
                      >
                        {copiedAddress === "det" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAddress === "det" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <div className="font-mono text-sm text-white font-semibold break-all bg-black/40 p-2.5 rounded-lg border border-purple-500/20">
                      {activePlan.deterministicAddress}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2">
                      <span>Salt: {activePlan.salt.slice(0, 12)}...{activePlan.salt.slice(-6)}</span>
                      <span>•</span>
                      <span className="text-emerald-400">Identical address guaranteed on all EVM chains</span>
                    </div>
                  </div>

                  {/* Chain Stepper Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      Deployment Targets ({activePlan.chains.length})
                    </div>

                    <div className="space-y-2">
                      {activePlan.chains.map((chain) => (
                        <div
                          key={chain.chainId}
                          className="p-3 rounded-xl bg-zinc-800/70 border border-zinc-700/80 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                              {chain.status === "deployed" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <span className="text-xs font-bold text-purple-300">{chain.shortName.slice(0, 2)}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold font-mono text-white flex items-center gap-2">
                                <span>{chain.chainName}</span>
                                {chain.status === "deployed" && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px]">
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                Gas Est: {chain.gasEstimatedNative} ({chain.gasEstimatedUsd})
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {chain.txHash ? (
                              <a
                                href={chain.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-mono text-purple-400 hover:text-purple-300 underline"
                              >
                                <span>View Tx</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Ready to Broadcast
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Broadcast Button */}
                  <button
                    id="btn-execute-crosschain-deployment"
                    type="button"
                    onClick={handleExecuteDeployment}
                    disabled={deployingChains || activePlan.chains.every((c) => c.status === "deployed")}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {deployingChains ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Broadcasting Deployment to Optimism, Arbitrum, Unichain & Polygon...</span>
                      </>
                    ) : activePlan.chains.every((c) => c.status === "deployed") ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All Chains Deployed & Unified Liquidity Active!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Broadcast Deployment to {activePlan.chains.length} Networks</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LI.FI UNIFIED TRADING TERMINAL */}
      {activeTab === "unified-trading" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Swap Box */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white font-mono">Cross-Chain Bonding Curve Swap</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Zero Liquidity Fragmentation
                </span>
              </div>

              {/* Source Chain Selector */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">You Pay From (Source Chain)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {chains.map((chain) => (
                    <button
                      key={chain.chainId}
                      id={`btn-select-source-chain-${chain.chainId}`}
                      type="button"
                      onClick={() => setSourceChainId(chain.chainId)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                        sourceChainId === chain.chainId
                          ? "bg-purple-950/40 border-purple-500 text-white shadow-sm"
                          : "bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <ImageWithFallback
                        src={chain.logoUrl}
                        alt={chain.name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold font-mono">{chain.shortName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="bg-zinc-800/70 border border-zinc-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>Amount to Spend</span>
                  <span>Balance: {wallet.balanceEth.toFixed(4)} {sourceChainId === 137 ? "POL" : "ETH"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="input-crosschain-trade-amount"
                    type="number"
                    step="0.01"
                    value={tradeSourceAmount}
                    onChange={(e) => setTradeSourceAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-transparent text-2xl font-bold font-mono text-white focus:outline-none"
                  />
                  <div className="px-3 py-1.5 rounded-lg bg-zinc-700 text-white text-xs font-mono font-bold flex items-center gap-1.5">
                    <span>{sourceChainId === 137 ? "POL" : "ETH"}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  {["0.02", "0.05", "0.1", "0.25"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTradeSourceAmount(preset)}
                      className="px-2 py-0.5 rounded bg-zinc-700/50 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Token & Curve Info */}
              <div className="bg-zinc-800/70 border border-zinc-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>Destination Asset (Unified Curve)</span>
                  <span className="text-purple-300">Base Mainnet Hub</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold font-mono text-white">
                      {tradeQuote ? tradeQuote.bondingCurveMintAmount : "---"} AGL
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Estimated tokens received across unified bonding curve
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold font-mono">
                    AGL
                  </div>
                </div>
              </div>

              {/* Execute Trade Button */}
              <button
                id="btn-execute-lifi-crosschain-trade"
                type="button"
                onClick={handleExecuteTrade}
                disabled={executingTrade || loadingQuote || !tradeQuote}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-sm font-bold shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {executingTrade ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Cross-Chain LI.FI Bridge & Curve Mint...</span>
                  </>
                ) : loadingQuote ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Fetching Optimal LI.FI Route...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Buy with Unified Liquidity via LI.FI</span>
                  </>
                )}
              </button>

              {tradeSuccessTx && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Transaction Confirmed!</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300">
                    Tracking ID: <span className="text-purple-300">{tradeSuccessTx.trackingId}</span>
                  </div>
                  <a
                    href={tradeSuccessTx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-purple-400 hover:text-purple-300 underline"
                  >
                    <span>View on Block Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: LI.FI Route Breakdown & Transparency */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white font-mono">LI.FI Route Transparency</h3>
                </div>
                {tradeQuote && (
                  <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    ~{tradeQuote.estimatedDurationSeconds}s Arrival
                  </span>
                )}
              </div>

              {!tradeQuote ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500">
                  Enter an amount to preview the automated LI.FI bridge route & bonding curve contract call.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Step Breakdown */}
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Execution Pipeline</div>
                    {tradeQuote.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/70 flex items-start gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold font-mono text-white flex items-center gap-2">
                            <span>{step.tool}</span>
                            <span className="text-[10px] text-purple-400 font-normal">({step.durationSec}s)</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing and Gas Metrics */}
                  <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/60 space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Bridge Provider:</span>
                      <span className="text-white font-semibold">{tradeQuote.bridgeTool}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Bridge Protocol Fee:</span>
                      <span className="text-emerald-400">{tradeQuote.feeCostsUsd}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Network Gas Cost:</span>
                      <span className="text-zinc-300">{tradeQuote.gasCostsUsd}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Curve Price Impact:</span>
                      <span className={tradeQuote.priceImpactPct > 2 ? "text-amber-400" : "text-emerald-400"}>
                        {tradeQuote.priceImpactPct}%
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-700/50">
                      <span>Minimum Guaranteed:</span>
                      <span className="text-purple-300 font-bold">{tradeQuote.minimumReceived} AGL</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UNIFIED RESERVES & DEPTH MATRIX */}
      {activeTab === "unified-reserves" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <div className="text-xs font-mono text-zinc-400 uppercase">Aggregated Global Reserve</div>
              <div className="text-2xl font-bold font-mono text-white">
                {unifiedPool ? `${unifiedPool.totalReserveEth.toFixed(2)} ETH` : "18.72 ETH"}
              </div>
              <div className="text-[11px] font-mono text-emerald-400">
                {unifiedPool ? `$${unifiedPool.totalReserveUsd.toLocaleString()}` : "$46,800"} TVL
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <div className="text-xs font-mono text-zinc-400 uppercase">24h Cross-Chain Volume</div>
              <div className="text-2xl font-bold font-mono text-purple-300">
                {unifiedPool ? `$${unifiedPool.volume24hUsd.toLocaleString()}` : "$142,850"}
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                via LI.FI Diamond Router
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-1">
              <div className="text-xs font-mono text-zinc-400 uppercase">Automated Rebalances</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {unifiedPool ? unifiedPool.rebalanceCount : 14} Relays
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                Max skew &lt; 0.05%
              </div>
            </div>
          </div>

          {/* Chain Breakdown Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-mono text-white">
                Unified Reserve Distribution by L2 / PoS
              </h3>
              <span className="text-xs font-mono text-purple-400">5 Synchronized EVM Nodes</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-3">Network</th>
                    <th className="pb-3">Chain ID</th>
                    <th className="pb-3">Local Reserve (ETH)</th>
                    <th className="pb-3">Pool Share</th>
                    <th className="pb-3">24h Vol</th>
                    <th className="pb-3">Sync Block</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {unifiedPool && (Object.values(unifiedPool.reservesByChain) as UnifiedChainReserve[]).map((chain) => (
                    <tr key={chain.chainId} className="hover:bg-zinc-800/30">
                      <td className="py-3.5 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{chain.chainName}</span>
                      </td>
                      <td className="py-3.5 text-zinc-400">{chain.chainId}</td>
                      <td className="py-3.5 font-bold text-emerald-400">{chain.reserveEth.toFixed(2)} ETH</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-purple-500 h-full rounded-full"
                              style={{ width: `${chain.sharePct}%` }}
                            />
                          </div>
                          <span className="text-purple-300">{chain.sharePct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-zinc-300">{chain.volume24hEth.toFixed(1)} ETH</td>
                      <td className="py-3.5 text-zinc-500">#{chain.lastSyncBlock.toLocaleString()}</td>
                      <td className="py-3.5 text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                          Synchronized
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REBALANCE RELAYS */}
      {activeTab === "rebalancer" && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-mono text-white">
                  Automated Cross-Chain Liquidity Rebalancing Relays
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  LI.FI cross-chain arbitrage and inventory-skew dampener keeps bonding curve spot pricing identical across Optimism, Arbitrum, Unichain, and Polygon.
                </p>
              </div>

              <button
                id="btn-trigger-manual-rebalance"
                type="button"
                onClick={() => handleTriggerRebalance(8453, 130, 0.5)}
                disabled={rebalancing}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {rebalancing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Relaying 0.5 ETH to Unichain...</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Trigger Rebalance Relay (Base &rarr; Unichain)</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Recent Rebalance Execution Ledger
              </div>

              <div className="space-y-2">
                {rebalanceLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/70 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-white flex items-center gap-2">
                          <span>{log.sourceChainName}</span>
                          <span className="text-purple-400">&rarr;</span>
                          <span>{log.targetChainName}</span>
                          <span className="text-emerald-400 font-normal">({log.amountEth} ETH)</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Relay: {log.bridgeProvider} • Reason: {log.reason}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
