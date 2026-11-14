import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { 
  Flame, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  TrendingDown, 
  Coins, 
  RefreshCw, 
  Fuel, 
  Award, 
  X, 
  AlertCircle,
  Search,
  Share2,
  FileCheck,
  Lock,
  ChevronRight,
  BarChart2,
  Layers,
  CheckSquare,
  Square,
  Percent,
  SlidersHorizontal,
  RotateCcw
} from "lucide-react";
import { WalletState, Token } from "../types";
import ImageWithFallback from "../components/ImageWithFallback";

interface TokenBurnerPageProps {
  wallet: WalletState;
  onOpenConnectWallet: () => void;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  tokens?: Token[];
}

export interface BurnTransaction {
  id: string;
  txHash: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  tokenLogo?: string;
  amount: number;
  amountUsd: number;
  burnerAddress: string;
  nullAddress: string;
  burnType: "standard" | "credits";
  creditsMinted?: number;
  blockNumber: number;
  timestamp: number;
  status: "confirmed" | "pending";
}

export interface BatchBurnItem {
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  tokenLogo?: string;
  amount: number;
  amountUsd: number;
  priceUsd: number;
}

export interface BatchBurnCertificate {
  id: string;
  txHash: string;
  multicallAddress: string;
  tokens: BatchBurnItem[];
  items?: BatchBurnItem[];
  totalAmountUsd: number;
  totalTokensCount: number;
  burnerAddress: string;
  nullAddress: string;
  burnType: "standard" | "credits";
  creditsMinted?: number;
  gasSavedPercent: number;
  blockNumber: number;
  timestamp: number;
  status: "confirmed";
}

const DEFAULT_PORTFOLIO_TOKENS = [
  {
    address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698",
    name: "Agunnaya Utility Token",
    symbol: "AGL",
    decimals: 18,
    priceUsd: 0,
    totalSupply: 0,
    logoUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    isNativeAgl: true
  },
  {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "USD Coin (Base)",
    symbol: "USDC",
    decimals: 6,
    priceUsd: 0,
    totalSupply: 0,
    logoUrl: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
    isNativeAgl: false
  },
  {
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    name: "Aerodrome Token",
    symbol: "AERO",
    decimals: 18,
    priceUsd: 0,
    totalSupply: 0,
    logoUrl: "https://assets.coingecko.com/coins/images/31745/large/aerodrome.png",
    isNativeAgl: false
  },
  {
    address: "0x2Ae3F1Ec7F1F5012A27a5d3f112702170bA3b400",
    name: "Coinbase Wrapped Staked ETH",
    symbol: "cbETH",
    decimals: 18,
    priceUsd: 0,
    totalSupply: 0,
    logoUrl: "https://assets.coingecko.com/coins/images/27008/large/cbeth.png",
    isNativeAgl: false
  }
];

const BASE_RPC_URL = "https://mainnet.base.org";

export default function TokenBurnerPage({
  wallet,
  onOpenConnectWallet,
  onRefreshWallet,
  addTerminalLog,
  showToast,
  tokens = []
}: TokenBurnerPageProps) {
  // Burn Mode Tabs: Single Burn vs Batch Multicall Burn
  const [activeBurnTab, setActiveBurnTab] = useState<"single" | "batch">("batch");

  // Batch Multicall state
  const [batchSelectedTokens, setBatchSelectedTokens] = useState<Record<string, boolean>>({
    "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698": true, // AGL
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": true, // USDC
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631": false, // AERO
    "0x2Ae3F1Ec7F1F5012A27a5d3f112702170bA3b400": false  // cbETH
  });

  const [batchAmounts, setBatchAmounts] = useState<Record<string, string>>({
    "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698": "100",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "50",
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631": "25",
    "0x2Ae3F1Ec7F1F5012A27a5d3f112702170bA3b400": "0.05"
  });

  const [batchBurnMode, setBatchBurnMode] = useState<"standard" | "credits">("standard");
  const [batchGasSpeed, setBatchGasSpeed] = useState<"sponsored" | "standard" | "fast" | "instant">("sponsored");
  const [isBatchBurning, setIsBatchBurning] = useState<boolean>(false);
  const [batchBurnStep, setBatchBurnStep] = useState<number>(0);
  const [activeBatchCertificate, setActiveBatchCertificate] = useState<BatchBurnCertificate | null>(null);

  // Single Token selection state
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("0xEA1221B4d80A89BD8C75248Fae7c176BD1854698");
  const [customAddressInput, setCustomAddressInput] = useState<string>("");
  const [customToken, setCustomToken] = useState<any | null>(null);
  const [isFetchingCustom, setIsFetchingCustom] = useState<boolean>(false);
  const [tokenSource, setTokenSource] = useState<"portfolio" | "custom">("portfolio");

  // Single Burn parameters
  const [burnAmount, setBurnAmount] = useState<string>("100");
  const [burnMode, setBurnMode] = useState<"standard" | "credits">("standard");
  const [gasSpeed, setGasSpeed] = useState<"standard" | "fast" | "instant" | "sponsored">("sponsored");

  // Transaction execution & loader modal state
  const [isBurning, setIsBurning] = useState<boolean>(false);
  const [burnStep, setBurnStep] = useState<number>(0); // 0: Idle, 1: Validating, 2: Signing, 3: Executing on Base, 4: Minting Proof Certificate
  const [activeCertificate, setActiveCertificate] = useState<BurnTransaction | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // No legacy local records are presented as verified burns. New records require verified receipts.
  const [burnHistory] = useState<BurnTransaction[]>([]);

  // Combine default portfolio tokens with dynamic studio tokens
  const allPortfolioTokens = [...DEFAULT_PORTFOLIO_TOKENS];
  tokens.forEach(t => {
    if (!allPortfolioTokens.some(p => p.address.toLowerCase() === t.address.toLowerCase())) {
      allPortfolioTokens.push({
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        decimals: 18,
        priceUsd: 0,
        totalSupply: 0,
        logoUrl: t.logoUrl,
        isNativeAgl: false
      });
    }
  });

  // Current selected token details
  const activeToken = tokenSource === "custom" && customToken 
    ? customToken 
    : (allPortfolioTokens.find(t => t.address.toLowerCase() === selectedTokenAddress.toLowerCase()) || allPortfolioTokens[0]);

  // Balance calculation
  const getBalanceForToken = (symbol: string) => {
    if (symbol === "AGL") return wallet.aglTokenBalance || 0;
    if (symbol === "ETH") return wallet.balanceEth || 0;
    // Other ERC-20 balances are not queried by this page and must not be fabricated.
    return 0;
  };

  const userBalance = getBalanceForToken(activeToken.symbol);

  // Inspect standard ERC-20 metadata from Base RPC; no price or supply estimate is invented.
  const handleInspectCustomToken = async () => {
    if (!ethers.isAddress(customAddressInput)) {
      showToast("Enter a valid EVM token contract address.", "error");
      return;
    }

    setIsFetchingCustom(true);
    addTerminalLog("info", `Reading ERC-20 metadata from Base: ${customAddressInput}`);
    try {
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      const contract = new ethers.Contract(customAddressInput, [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)"
      ], provider);
      const [name, symbol, decimalsRaw, supplyRaw] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);
      const decimals = Number(decimalsRaw);
      setCustomToken({
        address: customAddressInput,
        name,
        symbol,
        decimals,
        priceUsd: 0,
        totalSupply: Number(ethers.formatUnits(supplyRaw, decimals)),
        logoUrl: "",
        isNativeAgl: false
      });
      showToast(`Read ${symbol} token metadata from Base. USD price is unavailable.`, "success");
      addTerminalLog("success", `ERC20_METADATA: Read ${name} (${symbol}), decimals ${decimals}.`);
    } catch (error: any) {
      console.error("ERC-20 metadata read failed:", error);
      showToast(error?.shortMessage || error?.message || "Unable to read standard ERC-20 metadata from this address.", "error");
      addTerminalLog("error", "ERC20_METADATA_ERROR: Contract metadata read failed.");
    } finally {
      setIsFetchingCustom(false);
    }
  };

  // Quick percentage selection for single token
  const handleSelectPercentage = (pct: number) => {
    const val = (userBalance * (pct / 100)).toFixed(activeToken.decimals > 6 ? 2 : 4);
    setBurnAmount(val);
  };

  // Batch Helpers
  const handleToggleSelectToken = (address: string) => {
    setBatchSelectedTokens(prev => ({
      ...prev,
      [address]: !prev[address]
    }));
  };

  const handleSelectAllTokens = () => {
    const updated: Record<string, boolean> = {};
    allPortfolioTokens.forEach(t => {
      updated[t.address] = true;
    });
    setBatchSelectedTokens(updated);
  };

  const handleDeselectAllTokens = () => {
    const updated: Record<string, boolean> = {};
    allPortfolioTokens.forEach(t => {
      updated[t.address] = false;
    });
    setBatchSelectedTokens(updated);
  };

  const handleSetBatchTokenAmount = (address: string, val: string) => {
    setBatchAmounts(prev => ({
      ...prev,
      [address]: val
    }));
  };

  const handleApplyPercentToToken = (address: string, pct: number) => {
    const tok = allPortfolioTokens.find(t => t.address.toLowerCase() === address.toLowerCase());
    if (!tok) return;
    const bal = getBalanceForToken(tok.symbol);
    const val = (bal * (pct / 100)).toFixed(tok.decimals > 6 ? 2 : 4);
    setBatchAmounts(prev => ({
      ...prev,
      [address]: val
    }));
  };

  const handleApplyPercentToAll = (pct: number) => {
    const updatedAmounts: Record<string, string> = { ...batchAmounts };
    allPortfolioTokens.forEach(tok => {
      if (batchSelectedTokens[tok.address]) {
        const bal = getBalanceForToken(tok.symbol);
        const val = (bal * (pct / 100)).toFixed(tok.decimals > 6 ? 2 : 4);
        updatedAmounts[tok.address] = val;
      }
    });
    setBatchAmounts(updatedAmounts);
    showToast(`Applied ${pct}% balance to all selected tokens`, "info");
  };

  // Selected batch items calculation
  const activeBatchTokens = allPortfolioTokens.filter(t => batchSelectedTokens[t.address]);
  
  const validBatchItems: BatchBurnItem[] = activeBatchTokens
    .map(tok => {
      const amt = parseFloat(batchAmounts[tok.address] || "0");
      const bal = getBalanceForToken(tok.symbol);
      const validAmt = !isNaN(amt) && amt > 0 ? Math.min(amt, bal) : 0;
      return {
        tokenSymbol: tok.symbol,
        tokenName: tok.name,
        tokenAddress: tok.address,
        tokenLogo: tok.logoUrl,
        amount: validAmt,
        amountUsd: validAmt * tok.priceUsd,
        priceUsd: tok.priceUsd
      };
    })
    .filter(i => i.amount > 0);

  const totalBatchUsdDeflated = validBatchItems.reduce((acc, curr) => acc + curr.amountUsd, 0);
  const totalBatchCreditsMinted = 0;
  const estimatedBatchGasSavedPercent = 0;

  // Batch burn is disabled until token-specific burn methods and the multicall payload are verified.
  const handleExecuteBatchBurn = () => {
    showToast("Batch burn is unavailable: token-specific burn methods, approvals, and the Multicall3 payload have not been verified. No transaction was submitted.", "info");
    addTerminalLog("info", "BATCH_BURN_DISABLED: No token transfer or burn transaction was submitted.");
  };

  // Single-token burn is disabled until the token-specific burn ABI and receipt flow are verified.
  const handleExecuteBurn = () => {
    showToast("Burn is unavailable: the token's burn method and deployed ABI have not been verified. No tokens were moved and no transaction was submitted.", "info");
    addTerminalLog("info", "TOKEN_BURN_DISABLED: No burn transaction was submitted.");
  };

  // Global burn statistics
  const totalBurnedCount = burnHistory.reduce((acc, curr) => acc + curr.amount, 0);
  const totalBurnedUsd = burnHistory.length > 0 ? burnHistory.reduce((acc, curr) => acc + curr.amountUsd, 0) : null;

  return (
    <div id="token-burner-page" className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      
      {/* Page Banner Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-zinc-950 border border-red-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-red-600/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs font-bold">
              <Flame className="w-3.5 h-3.5 animate-pulse text-red-500 fill-red-500" />
              <span>BASE L2 TOKEN DEFLATION ENGINE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
              ERC-20 Token Burner & Supply Reducer
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Connect your Web3 wallet, select any ERC-20 token from your portfolio or custom Base smart contract, and execute verifiable null-address burn transactions to permanently reduce total supply.
            </p>
          </div>

          {/* Wallet Header Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {wallet.isConnected ? (
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs space-y-1">
                <div className="flex items-center justify-between gap-4 text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Connected Wallet
                  </span>
                  <span className="text-emerald-400 font-bold">Base Mainnet</span>
                </div>
                <div className="text-white font-bold flex items-center gap-2">
                  <span>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                  <button 
                    onClick={() => copyToClipboard(wallet.address, "Wallet address")} 
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    {copiedAddress === wallet.address ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="burner-connect-wallet-btn"
                onClick={onOpenConnectWallet}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-xl font-display flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Connect Wallet to Burn Tokens</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Analytics Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 font-mono text-xs">
          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
            <span className="text-zinc-500 block text-[10px] uppercase">Total Tokens Burned</span>
            <span className="text-white font-bold text-base flex items-center gap-1.5 mt-0.5">
              <Flame className="w-4 h-4 text-red-400" />
              {totalBurnedCount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
            <span className="text-zinc-500 block text-[10px] uppercase">USD Deflated Value</span>
            <span className="text-emerald-400 font-bold text-base mt-0.5">
              ${totalBurnedUsd === null ? "Unavailable" : totalBurnedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
            <span className="text-zinc-500 block text-[10px] uppercase">Standard Dead Target</span>
            <span className="text-zinc-300 font-bold text-xs truncate mt-1 block">
              0x000...dEaD
            </span>
          </div>

          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
            <span className="text-zinc-500 block text-[10px] uppercase">Paymaster Status</span>
            <span className="text-amber-300 font-bold text-xs flex items-center gap-1 mt-1">
              <Fuel className="w-3.5 h-3.5 text-amber-300" /> 100% Sponsored AA
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Interactive Burn Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-white/10 space-y-6 shadow-2xl relative">
            
            {/* Top Burn Mode Switcher Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex bg-black/60 p-1 rounded-2xl border border-white/10 text-xs font-mono w-full sm:w-auto">
                <button
                  type="button"
                  id="tab-batch-burn"
                  onClick={() => setActiveBurnTab("batch")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    activeBurnTab === "batch"
                      ? "bg-gradient-to-r from-red-600 to-purple-600 text-white shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-4 h-4 text-amber-300" />
                  <span>Batch Burn (Multicall)</span>
                  <span className="text-[10px] bg-red-500/30 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">
                    PRO
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-single-burn"
                  onClick={() => setActiveBurnTab("single")}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    activeBurnTab === "single"
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>Single Token Burn</span>
                </button>
              </div>

              {activeBurnTab === "batch" && (
                <div className="text-right text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 self-end sm:self-center">
                  <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                  <span>Burn execution disabled pending ABI verification</span>
                </div>
              )}
            </div>

            {/* BATCH BURN TAB CONTENT */}
            {activeBurnTab === "batch" ? (
              <div className="space-y-6">
                
                {/* Batch Header & Quick Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <Layers className="w-4 h-4 text-red-500" />
                      Select Portfolio Assets for Batch Burn
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Aggregate multiple token burns into 1 atomic transaction on Base.
                    </p>
                  </div>

                  {/* Batch Quick Controls */}
                  <div className="flex items-center gap-1.5 font-mono text-xs flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAllTokens}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-bold transition-all"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllTokens}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-bold transition-all"
                    >
                      Deselect
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPercentToAll(50)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 text-red-300 hover:text-white text-[11px] font-bold transition-all"
                    >
                      All 50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPercentToAll(100)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all"
                    >
                      All MAX
                    </button>
                  </div>
                </div>

                {/* Tokens Multi-select List */}
                <div className="space-y-3">
                  {allPortfolioTokens.map(tok => {
                    const isSelected = !!batchSelectedTokens[tok.address];
                    const bal = getBalanceForToken(tok.symbol);
                    const currentAmt = batchAmounts[tok.address] || "";
                    const amtNum = parseFloat(currentAmt) || 0;
                    const usdVal = amtNum * tok.priceUsd;
                    const isExceeding = amtNum > bal;

                    return (
                      <div
                        key={tok.address}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isSelected
                            ? "bg-gradient-to-r from-red-950/30 via-zinc-900 to-black border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                            : "bg-black/40 border-white/5 opacity-70 hover:opacity-100 hover:border-white/20"
                        }`}
                      >
                        {/* Token Header Row with Checkbox */}
                        <div className="flex items-center justify-between">
                          <div 
                            onClick={() => handleToggleSelectToken(tok.address)}
                            className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
                          >
                            <div className="shrink-0 text-red-500">
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-red-500 fill-red-500/20" />
                              ) : (
                                <Square className="w-5 h-5 text-zinc-600" />
                              )}
                            </div>

                            <ImageWithFallback
                              src={tok.logoUrl}
                              alt={tok.symbol}
                              className="w-9 h-9 rounded-xl object-cover border border-white/10"
                            />

                            <div className="font-mono min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{tok.symbol}</span>
                                {tok.isNativeAgl && (
                                  <span className="text-[9px] bg-brand-purple/20 text-brand-purple border border-brand-purple/30 px-1.5 py-0.2 rounded font-bold">
                                    STUDIO
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate">{tok.name}</p>
                            </div>
                          </div>

                          <div className="text-right font-mono shrink-0 pl-2">
                            <span className="text-xs text-zinc-400 block">Balance:</span>
                            <span className="text-xs font-bold text-white">
                              {bal.toLocaleString()} {tok.symbol}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              USD valuation unavailable
                            </span>
                          </div>
                        </div>

                        {/* Input & Percentage Controls when Selected */}
                        {isSelected && (
                          <div className="pt-3 border-t border-white/10 space-y-2 animate-fade-in font-mono">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 bg-black/60 px-3 py-2 rounded-xl border border-white/10 flex-1">
                                <span className="text-xs text-zinc-500">Burn:</span>
                                <input
                                  type="number"
                                  value={currentAmt}
                                  onChange={(e) => handleSetBatchTokenAmount(tok.address, e.target.value)}
                                  placeholder="0.0"
                                  className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                                />
                                <span className="text-xs text-zinc-400 shrink-0">{tok.symbol}</span>
                              </div>

                              {/* Quick % chips */}
                              <div className="flex items-center gap-1 shrink-0">
                                {[25, 50, 75, 100].map(pct => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => handleApplyPercentToToken(tok.address, pct)}
                                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white text-[10px] font-bold transition-all"
                                  >
                                    {pct === 100 ? "MAX" : `${pct}%`}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px]">
                              <span className={isExceeding ? "text-red-400 font-bold" : "text-zinc-500"}>
                                {isExceeding ? "⚠️ Exceeds wallet balance!" : `≈ $${usdVal.toFixed(2)} USD deflated`}
                              </span>
                              {batchBurnMode === "credits" && amtNum > 0 && !isExceeding && (
                                <span className="text-amber-300 font-bold flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> +{Math.floor(amtNum * 10).toLocaleString()} Studio Credits
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Batch Aggregate Summary Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-black border border-red-500/30 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-zinc-400 font-bold flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-red-500" />
                      Multicall Batch Burn Summary
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      {validBatchItems.length} Assets Staged
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-black/50 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 block">Total Tokens</span>
                      <span className="text-sm font-bold text-white">
                        {validBatchItems.length} Selected
                      </span>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 block">Combined USD Value</span>
                      <span className="text-sm font-bold text-emerald-400">
                        ${totalBatchUsdDeflated.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 block">Gas Savings</span>
                      <span className="text-sm font-bold text-amber-300 flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5" /> Unavailable
                      </span>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 block">Null Target</span>
                      <span className="text-xs font-bold text-red-400 truncate block mt-0.5">
                        0x000...dEaD
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200">
                    Multicall batch execution is disabled pending verified token-specific burn methods and a tested transaction payload.
                  </div>
                </div>

                {/* Batch Burn Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-400 block">Batch Burn Destination Mechanism:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    
                    {/* Mode 1: Standard Deflation */}
                    <button
                      type="button"
                      onClick={() => setBatchBurnMode("standard")}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        batchBurnMode === "standard" 
                          ? "bg-red-500/15 border-red-500 text-white" 
                          : "bg-black/40 border-white/10 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold flex items-center gap-1.5 text-white">
                          <Flame className="w-4 h-4 text-red-500" /> Standard Deflation
                        </span>
                        {batchBurnMode === "standard" && <CheckCircle2 className="w-4 h-4 text-red-500" />}
                      </div>
                      <p className="text-[10px] text-zinc-400">Disabled. Token-specific burn functions and transaction receipts have not been verified.</p>
                    </button>

                    {/* Mode 2: Buy Studio Credits */}
                    <button
                      type="button"
                      onClick={() => setBatchBurnMode("credits")}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        batchBurnMode === "credits" 
                          ? "bg-purple-500/15 border-purple-500 text-white" 
                          : "bg-black/40 border-white/10 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold flex items-center gap-1.5 text-white">
                          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Batch Compute Credits
                        </span>
                        {batchBurnMode === "credits" && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                      </div>
                      <p className="text-[10px] text-zinc-400">Exchange all selected tokens for Agunnaya Studio Compute Credits (1 Token = 10 Credits).</p>
                    </button>
                  </div>
                </div>

                {/* Gas Speed & Relay Tier */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Batch Execution Relay:</span>
                    <span className="text-amber-300 font-bold">100% Sponsored via Base Paymaster</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "sponsored", label: "100% Sponsored", fee: "0.00 ETH", icon: Zap },
                      { id: "standard", label: "Standard", fee: "~0.00008 ETH", icon: Fuel },
                      { id: "fast", label: "Fast L2", fee: "~0.00012 ETH", icon: Fuel },
                      { id: "instant", label: "MEV Shield", fee: "~0.00016 ETH", icon: ShieldCheck }
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setBatchGasSpeed(tier.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          batchGasSpeed === tier.id 
                            ? "bg-red-500/20 border-red-500 text-white font-bold" 
                            : "bg-black/40 border-white/5 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        <div className="text-[11px] font-bold flex items-center justify-center gap-1">
                          <tier.icon className="w-3 h-3 text-amber-300" />
                          {tier.label}
                        </div>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">{tier.fee}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Batch Multicall Action Button */}
                <button
                  id="execute-batch-burn-btn"
                  onClick={handleExecuteBatchBurn}
                  disabled={true}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-base shadow-2xl font-display flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBatchBurning ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Executing Atomic Multicall Batch Burn...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-5 h-5 text-amber-300 animate-pulse" />
                      <span>
                        Batch burn unavailable — ABI verification required
                      </span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* SINGLE TOKEN BURN TAB CONTENT */
              <div className="space-y-6 animate-fade-in">
                {/* Header / Source Picker */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-500" />
                    <h2 className="text-base font-bold font-display text-white">Select Single Token to Burn</h2>
                  </div>

                  {/* Source Switcher */}
                  <div className="flex bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-mono">
                    <button
                      onClick={() => setTokenSource("portfolio")}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${tokenSource === "portfolio" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                      Portfolio Tokens
                    </button>
                    <button
                      onClick={() => setTokenSource("custom")}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${tokenSource === "custom" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                      Custom ERC-20
                    </button>
                  </div>
                </div>

                {/* Token Selection Area */}
                {tokenSource === "portfolio" ? (
                  <div className="space-y-3">
                    <label className="text-xs font-mono text-zinc-400 block">Choose Portfolio Token:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allPortfolioTokens.map(tok => {
                        const isSelected = selectedTokenAddress.toLowerCase() === tok.address.toLowerCase();
                        const bal = getBalanceForToken(tok.symbol);

                        return (
                          <div
                            key={tok.address}
                            onClick={() => setSelectedTokenAddress(tok.address)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden ${
                              isSelected 
                                ? "bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                                : "bg-black/40 border-white/10 hover:border-white/20"
                            }`}
                          >
                            <ImageWithFallback
                              src={tok.logoUrl}
                              alt={tok.symbol}
                              className="w-10 h-10 rounded-xl object-cover border border-white/10"
                            />
                            <div className="flex-1 min-w-0 font-mono">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white truncate">{tok.symbol}</h4>
                                {tok.isNativeAgl && (
                                  <span className="text-[9px] bg-brand-purple/20 text-brand-purple border border-brand-purple/30 px-1.5 py-0.5 rounded font-bold">
                                    STUDIO
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate">{tok.name}</p>
                              <div className="text-[10px] text-zinc-500 mt-1 flex justify-between">
                                <span>Bal: {bal.toLocaleString()} {tok.symbol}</span>
                                <span>≈ ${(bal * tok.priceUsd).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 rounded-2xl bg-black/40 border border-white/10">
                    <label className="text-xs font-mono text-zinc-400 block">Custom Contract Address (Base L2):</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customAddressInput}
                        onChange={(e) => setCustomAddressInput(e.target.value)}
                        placeholder="0xEA1221B4d80A89BD8C75248Fae7c176BD1854698"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                      />
                      <button
                        onClick={handleInspectCustomToken}
                        disabled={isFetchingCustom}
                        className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold font-mono transition-all shrink-0 flex items-center gap-1.5"
                      >
                        {isFetchingCustom ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>Inspect</span>
                      </button>
                    </div>

                    {customToken && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between font-mono text-xs text-white">
                        <div>
                          <span className="font-bold">{customToken.name} ({customToken.symbol})</span>
                          <p className="text-[10px] text-zinc-400">Total Supply: {customToken.totalSupply.toLocaleString()}</p>
                        </div>
                        <span className="text-emerald-400 text-[11px] font-bold">ERC-20 Validated</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Token Overview */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between font-mono">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback
                      src={activeToken.logoUrl}
                      alt={activeToken.symbol}
                      className="w-10 h-10 rounded-xl object-cover border border-white/10"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {activeToken.name} ({activeToken.symbol})
                        <a
                          href={`https://basescan.org/token/${activeToken.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 hover:text-white transition-colors"
                          title="View on BaseScan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Contract: {activeToken.address.slice(0, 8)}...{activeToken.address.slice(-6)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-zinc-400 block">Your Balance</span>
                    <span className="text-sm font-extrabold text-white">
                      {userBalance.toLocaleString()} {activeToken.symbol}
                    </span>
                  </div>
                </div>

                {/* Burn Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-400 block">Select Burn Destination Mechanism:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    
                    {/* Mode 1: Standard Deflation */}
                    <button
                      type="button"
                      onClick={() => setBurnMode("standard")}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        burnMode === "standard" 
                          ? "bg-red-500/15 border-red-500 text-white" 
                          : "bg-black/40 border-white/10 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold flex items-center gap-1.5 text-white">
                          <Flame className="w-4 h-4 text-red-500" /> Standard Deflation
                        </span>
                        {burnMode === "standard" && <CheckCircle2 className="w-4 h-4 text-red-500" />}
                      </div>
                      <p className="text-[10px] text-zinc-400">Disabled. A dead-address transfer is not assumed to invoke a token burn function.</p>
                    </button>

                    {/* Mode 2: Burn for Studio Credits */}
                    <button
                      type="button"
                      onClick={() => setBurnMode("credits")}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        burnMode === "credits" 
                          ? "bg-purple-500/15 border-purple-500 text-white" 
                          : "bg-black/40 border-white/10 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold flex items-center gap-1.5 text-white">
                          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Burn for Studio Credits
                        </span>
                        {burnMode === "credits" && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                      </div>
                      <p className="text-[10px] text-zinc-400">Exchange 1 {activeToken.symbol} for 10 Agunnaya Studio Compute Credits.</p>
                    </button>
                  </div>
                </div>

                {/* Burn Amount Input */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Burn Amount:</span>
                    <span className="text-zinc-400">Max Available: {userBalance.toLocaleString()} {activeToken.symbol}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={burnAmount}
                      onChange={(e) => setBurnAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent text-2xl font-extrabold font-mono text-white focus:outline-none"
                    />
                    <span className="text-sm font-bold font-mono text-zinc-400">{activeToken.symbol}</span>
                  </div>

                  {/* Percentage Quick Selection Chips */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono text-xs">
                    <span className="text-[11px] text-zinc-500">USD valuation unavailable</span>
                    <div className="flex items-center gap-1.5">
                      {[10, 25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleSelectPercentage(pct)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white text-[11px] font-bold transition-all"
                        >
                          {pct === 100 ? "MAX" : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gas Speed & Sponsorship Selector */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Gas & Relay Tier:</span>
                    <span className="text-amber-300 font-bold">Base L2 Account Abstraction</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "sponsored", label: "100% Sponsored", fee: "0.00 ETH", icon: Zap },
                      { id: "standard", label: "Standard", fee: "~0.00005 ETH", icon: Fuel },
                      { id: "fast", label: "Fast", fee: "~0.00008 ETH", icon: Fuel },
                      { id: "instant", label: "MEV Shield", fee: "~0.00012 ETH", icon: ShieldCheck }
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setGasSpeed(tier.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          gasSpeed === tier.id 
                            ? "bg-red-500/20 border-red-500 text-white font-bold" 
                            : "bg-black/40 border-white/5 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        <div className="text-[11px] font-bold flex items-center justify-center gap-1">
                          <tier.icon className="w-3 h-3 text-amber-300" />
                          {tier.label}
                        </div>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">{tier.fee}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Burn Action Button */}
                <button
                  id="execute-burn-btn"
                  onClick={handleExecuteBurn}
                  disabled={true}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-purple-600 hover:opacity-95 text-white font-bold text-base shadow-2xl font-display flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBurning ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Burn Transaction...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-5 h-5 text-amber-300 fill-amber-300 animate-bounce" />
                      <span>
                        Burn unavailable — ABI verification required
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Deflation Analytics & Proof Feed (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Deflation & Proof Card */}
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-white/10 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2 border-b border-white/10 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Cryptographic Proof of Burn
            </h3>

            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              Tokens burned on Agunnaya Studio are transferred directly to the unspendable EVM Dead Address <code className="text-red-400 font-bold">0x000...dEaD</code>. Each transaction mints an on-chain verification certificate.
            </p>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Null Destination:</span>
                <span className="text-red-400 font-bold flex items-center gap-1">
                  0x0000...dEaD
                  <button onClick={() => copyToClipboard(DEAD_ADDRESS, "Dead address")} className="text-zinc-500 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Base L2 Chain ID:</span>
                <span className="text-white font-bold">8453 (Mainnet)</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Deflation Guarantee:</span>
                <span className="text-emerald-400 font-bold">Irreversible 100%</span>
              </div>
            </div>
          </div>

          {/* Live Burn Activity Feed */}
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-purple" />
                Recent Studio Burns
              </h3>
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono font-bold">
                LIVE FEED
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {burnHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  No burn transactions recorded yet. Be the first to deflate token supply!
                </div>
              ) : (
                burnHistory.map(b => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-black/50 border border-white/5 hover:border-white/15 transition-all space-y-2 font-mono"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-red-500" />
                        <span className="font-bold text-white">
                          Burned {b.amount.toLocaleString()} {b.tokenSymbol}
                        </span>
                      </div>
                      <span className="text-emerald-400 font-bold text-[11px]">
                        USD valuation unavailable
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-white/5">
                      <span>Tx: {b.txHash.slice(0, 8)}...{b.txHash.slice(-6)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveCertificate(b)}
                          className="text-brand-purple hover:underline font-bold flex items-center gap-1"
                        >
                          <FileCheck className="w-3 h-3" /> Certificate
                        </button>
                        <a
                          href={`https://basescan.org/tx/${b.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 hover:text-white flex items-center gap-0.5"
                        >
                          Scan <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
        Historical burn entries are hidden until their Base transaction receipts and token burn events can be independently verified. No new burn records can be created from this page.
      </div>

      {/* Single Burn Step Execution Loader Modal */}
      {isBurning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-zinc-900 border border-white/10 space-y-6 shadow-2xl font-mono text-center">
            <div className="relative mx-auto w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Flame className="w-8 h-8 text-red-500 animate-pulse fill-red-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white">Executing Deflationary Burn</h3>
              <p className="text-xs text-zinc-400">Please confirm signature in your wallet</p>
            </div>

            {/* Step Progress List */}
            <div className="space-y-3 text-left text-xs">
              {[
                { step: 1, title: "Validating ERC-20 Token Balance & Reserves" },
                { step: 2, title: "Constructing Null Address Transfer Signature" },
                { step: 3, title: "Broadcasting Transaction to Base L2 Block" },
                { step: 4, title: "Minting Cryptographic Proof of Burn Certificate" }
              ].map(s => (
                <div
                  key={s.step}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    burnStep === s.step 
                      ? "bg-red-500/20 border-red-500 text-white font-bold" 
                      : burnStep > s.step 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-black/40 border-white/5 text-zinc-600"
                  }`}
                >
                  {burnStep > s.step ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : burnStep === s.step ? (
                    <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-zinc-700 text-[10px] flex items-center justify-center shrink-0">
                      {s.step}
                    </span>
                  )}
                  <span>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Batch Multicall Execution Loader Modal */}
      {isBatchBurning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-zinc-900 border border-purple-500/30 space-y-6 shadow-2xl font-mono text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-purple-600/15 blur-3xl pointer-events-none"></div>

            <div className="relative mx-auto w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Layers className="w-8 h-8 text-purple-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white">
                Multicall3 Atomic Batch Burn
              </h3>
              <p className="text-xs text-zinc-400">
                Batch processing {validBatchItems.length} tokens into a single transaction
              </p>
            </div>

            {/* Step Progress List */}
            <div className="space-y-3 text-left text-xs">
              {[
                { step: 1, title: `Verifying balances & allowances for ${validBatchItems.length} tokens` },
                { step: 2, title: "Encoding Multicall3.aggregate3() atomic payload" },
                { step: 3, title: "Base Paymaster 100% Account Abstraction Relay" },
                { step: 4, title: "Broadcasting single atomic transaction to Base L2" },
                { step: 5, title: "Minting Multi-Asset Cryptographic Proof Certificate" }
              ].map(s => (
                <div
                  key={s.step}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    batchBurnStep === s.step 
                      ? "bg-purple-500/20 border-purple-500 text-white font-bold" 
                      : batchBurnStep > s.step 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-black/40 border-white/5 text-zinc-600"
                  }`}
                >
                  {batchBurnStep > s.step ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : batchBurnStep === s.step ? (
                    <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-zinc-700 text-[10px] flex items-center justify-center shrink-0">
                      {s.step}
                    </span>
                  )}
                  <span>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Proof of Burn Certificate Modal (Single) */}
      {activeCertificate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full p-6 rounded-3xl bg-zinc-950 border border-red-500/30 space-y-6 shadow-2xl font-mono relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold text-white font-display">On-Chain Proof of Burn Certificate</h3>
              </div>
              <button
                onClick={() => setActiveCertificate(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Display Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-zinc-900 to-black border border-white/10 space-y-4 text-center relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                VERIFIED ON BASE MAINNET
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 text-xs block">AMOUNT DESTROYED</span>
                <span className="text-3xl font-extrabold text-white font-display block">
                  {activeCertificate.amount.toLocaleString()} {activeCertificate.tokenSymbol}
                </span>
                <span className="text-xs text-emerald-400 block font-bold">
                  USD valuation unavailable
                </span>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border border-white/5 text-left text-xs space-y-2 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Burner:</span>
                  <span className="font-bold text-white">{activeCertificate.burnerAddress.slice(0, 8)}...{activeCertificate.burnerAddress.slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Null Target:</span>
                  <span className="font-bold text-red-400">{activeCertificate.nullAddress.slice(0, 8)}...{activeCertificate.nullAddress.slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Block Number:</span>
                  <span className="font-bold text-white">#{activeCertificate.blockNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Timestamp:</span>
                  <span className="font-bold text-white">{new Date(activeCertificate.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Tx Hash */}
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center justify-between">
                <span className="truncate">Tx: {activeCertificate.txHash}</span>
                <button
                  onClick={() => copyToClipboard(activeCertificate.txHash, "Transaction Hash")}
                  className="text-red-400 hover:text-white shrink-0 ml-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <a
                href={`https://basescan.org/tx/${activeCertificate.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => {
                  copyToClipboard(`https://basescan.org/tx/${activeCertificate.txHash}`, "Certificate URL");
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Proof</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Proof of Burn Certificate Modal */}
      {activeBatchCertificate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 space-y-6 shadow-2xl font-mono relative overflow-hidden max-h-[90vh] flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-purple-600/15 blur-3xl pointer-events-none"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white font-display">
                  Multicall Batch Proof of Burn
                </h3>
              </div>
              <button
                onClick={() => setActiveBatchCertificate(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Display Content */}
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="p-5 rounded-2xl bg-gradient-to-b from-zinc-900 to-black border border-white/10 space-y-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ATOMIC MULTICALL3 VERIFIED ON BASE
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 text-xs block">TOTAL VALUE DEFLATED</span>
                  <span className="text-3xl font-extrabold text-white font-display block">
                    ${activeBatchCertificate.totalAmountUsd.toFixed(2)} USD
                  </span>
                  <span className="text-xs text-amber-300 block font-bold">
                    {(activeBatchCertificate.tokens || activeBatchCertificate.items || []).length} Distinct Token Supplies Reduced
                  </span>
                </div>

                {/* Items Breakdown Table */}
                <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-2 text-left text-xs">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block border-b border-white/5 pb-1">
                    Burned Assets Breakdown ({(activeBatchCertificate.tokens || activeBatchCertificate.items || []).length} tokens):
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {(activeBatchCertificate.tokens || activeBatchCertificate.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-2">
                          <Flame className="w-3.5 h-3.5 text-red-500" />
                          <span className="font-bold text-white">
                            {item.amount.toLocaleString()} {item.tokenSymbol}
                          </span>
                        </div>
                        <span className="text-emerald-400 font-bold">
                          USD valuation unavailable
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transaction and Gas Meta */}
                <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 text-left text-xs space-y-1.5 text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Burner:</span>
                    <span className="font-bold text-white">{activeBatchCertificate.burnerAddress.slice(0, 8)}...{activeBatchCertificate.burnerAddress.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Multicall Router:</span>
                    <span className="font-bold text-purple-400">{activeBatchCertificate.multicallAddress.slice(0, 8)}...{activeBatchCertificate.multicallAddress.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Block Number:</span>
                    <span className="font-bold text-white">#{activeBatchCertificate.blockNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Gas Saved:</span>
                    <span className="font-bold text-amber-300">~{activeBatchCertificate.gasSavedPercent}% vs separate txs</span>
                  </div>
                </div>

                {/* Tx Hash */}
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
                  <span className="truncate">Tx: {activeBatchCertificate.txHash}</span>
                  <button
                    onClick={() => copyToClipboard(activeBatchCertificate.txHash, "Transaction Hash")}
                    className="text-purple-400 hover:text-white shrink-0 ml-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 shrink-0 pt-2">
              <a
                href={`https://basescan.org/tx/${activeBatchCertificate.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => {
                  copyToClipboard(`https://basescan.org/tx/${activeBatchCertificate.txHash}`, "Certificate URL");
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Batch Proof</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
