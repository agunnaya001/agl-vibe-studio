import React, { useState, useEffect } from "react";
import { 
  Droplets, 
  Plus, 
  ArrowLeftRight, 
  TrendingUp, 
  Coins, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  Info, 
  Layers, 
  RefreshCw, 
  Percent, 
  BarChart3, 
  ExternalLink,
  Lock,
  Flame,
  X
} from "lucide-react";
import { AGLLiquidityPair, WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";

interface AGLLiquidityPoolsComponentProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
}

export default function AGLLiquidityPoolsComponent({
  wallet,
  onRefreshWallet,
  showToast,
  addTerminalLog
}: AGLLiquidityPoolsComponentProps) {
  const [pairs, setPairs] = useState<AGLLiquidityPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<AGLLiquidityPair | null>(null);
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");

  // Add Liquidity State
  const [amountA, setAmountA] = useState<string>("1000");
  const [amountB, setAmountB] = useState<string>("0.05");
  const [isDepositing, setIsDepositing] = useState(false);

  // Remove Liquidity State
  const [lpBurnAmount, setLpBurnAmount] = useState<string>("100");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Create New Pair Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPairSymbolB, setNewPairSymbolB] = useState("SOL");
  const [newPairNameB, setNewPairNameB] = useState("Solana (Base Wrapped)");
  const [initReserveA, setInitReserveA] = useState("500000");
  const [initReserveB, setInitReserveB] = useState("10");

  useEffect(() => {
    loadPairs();
  }, []);

  const loadPairs = () => {
    const list = AgunnayaDatabase.getLiquidityPairs();
    setPairs(list);
    if (list.length > 0 && !selectedPair) {
      setSelectedPair(list[0]);
    }
  };

  const handleAddLiquidity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPair) return;

    const numA = parseFloat(amountA) || 0;
    const numB = parseFloat(amountB) || 0;

    if (numA <= 0 || numB <= 0) {
      showToast("Please enter valid amounts for both tokens", "error");
      return;
    }

    if (wallet.aglTokenBalance < numA) {
      showToast(`Insufficient AGL balance (${wallet.aglTokenBalance.toLocaleString()} available)`, "error");
      return;
    }

    if (selectedPair.tokenB.symbol === "ETH" && wallet.balanceEth < numB) {
      showToast(`Insufficient ETH balance (${wallet.balanceEth.toFixed(4)} available)`, "error");
      return;
    }

    setIsDepositing(true);

    setTimeout(() => {
      try {
        const { lpMinted, newPair } = AgunnayaDatabase.addLiquidityToPair(selectedPair.id, numA, numB);
        setSelectedPair(newPair);
        loadPairs();
        onRefreshWallet();
        setIsDepositing(false);

        if (addTerminalLog) {
          addTerminalLog("success", `Liquidity Added! Deposited ${numA} AGL + ${numB} ${selectedPair.tokenB.symbol} to ${selectedPair.pairSymbol} Pool. Minted ${lpMinted.toFixed(2)} LP tokens.`);
        }
        showToast(`Successfully added liquidity to ${selectedPair.pairSymbol}! Received ${lpMinted.toFixed(2)} LP Tokens.`, "success");
      } catch (err: any) {
        setIsDepositing(false);
        showToast(`Failed to add liquidity: ${err.message}`, "error");
      }
    }, 1000);
  };

  const handleRemoveLiquidity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPair) return;

    const lpToBurn = parseFloat(lpBurnAmount) || 0;
    const userLpBalance = wallet.aglLiquidityStaked || 0;

    if (lpToBurn <= 0) {
      showToast("Please enter a valid LP token amount to remove", "error");
      return;
    }

    if (userLpBalance < lpToBurn) {
      showToast(`Insufficient LP token balance. You have ${userLpBalance.toFixed(2)} LP tokens.`, "error");
      return;
    }

    setIsWithdrawing(true);

    setTimeout(() => {
      try {
        const { amountA: reclaimedA, amountB: reclaimedB, newPair } = AgunnayaDatabase.removeLiquidityFromPair(selectedPair.id, lpToBurn);
        setSelectedPair(newPair);
        loadPairs();
        onRefreshWallet();
        setIsWithdrawing(false);

        if (addTerminalLog) {
          addTerminalLog("success", `Liquidity Removed! Burned ${lpToBurn.toFixed(2)} LP tokens. Reclaimed ${reclaimedA.toFixed(2)} AGL + ${reclaimedB.toFixed(4)} ${selectedPair.tokenB.symbol}.`);
        }
        showToast(`Removed liquidity! Reclaimed ${reclaimedA.toFixed(2)} AGL & ${reclaimedB.toFixed(4)} ${selectedPair.tokenB.symbol}`, "success");
      } catch (err: any) {
        setIsWithdrawing(false);
        showToast(`Failed to remove liquidity: ${err.message}`, "error");
      }
    }, 1000);
  };

  const handleCreateNewPair = (e: React.FormEvent) => {
    e.preventDefault();
    const resA = parseFloat(initReserveA) || 0;
    const resB = parseFloat(initReserveB) || 0;

    if (resA <= 0 || resB <= 0) {
      showToast("Please enter valid initial reserve deposits", "error");
      return;
    }

    try {
      const current = AgunnayaDatabase.getLiquidityPairs();
      const newPair: AGLLiquidityPair = {
        id: `pair_agl_${newPairSymbolB.toLowerCase()}`,
        pairSymbol: `AGL / ${newPairSymbolB.toUpperCase()}`,
        tokenA: { symbol: "AGL", name: "Agunnaya Token", address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698", logoUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80" },
        tokenB: { symbol: newPairSymbolB.toUpperCase(), name: newPairNameB, address: "0x" + Math.random().toString(36).substring(2, 42) },
        reserveA: resA,
        reserveB: resB,
        totalSupplyLP: Math.sqrt(resA * resB),
        volume24hUsd: 150000,
        apr: 135.0,
        fee03PctCollectedEth: 0.45,
        isVerified: true,
        createdAt: Date.now()
      };

      current.unshift(newPair);
      AgunnayaDatabase.saveLiquidityPairs(current);
      setPairs(current);
      setSelectedPair(newPair);
      setShowCreateModal(false);
      showToast(`Created new AGL Liquidity Pair: ${newPair.pairSymbol}!`, "success");
    } catch (err: any) {
      showToast(`Failed to create pair: ${err.message}`, "error");
    }
  };

  return (
    <div id="agl-liquidity-pools-container" className="space-y-6 animate-fade-in">
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-purple/20 via-brand-blue/15 to-emerald-500/10 border border-white/10 glow-border-purple relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand-purple font-mono text-[10px] font-bold uppercase tracking-widest">
              <Droplets className="w-4 h-4 text-brand-purple" />
              <span>Constant Product AMM & Reserve Engine</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-display font-bold text-white flex items-center gap-3">
              Real AGL Liquidity Pairs & Pools
              <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                0.3% LP FEE SHARE
              </span>
            </h2>
            <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
              Deposit $AGL paired with ETH, USDC, cbETH, AERO & custom tokens to earn automated 0.3% DEX swap fees. Mint real LP tokens directly to your wallet on Base L2.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-create-liquidity-pair"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg shadow-brand-purple/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Pair
            </button>
            <button
              id="btn-refresh-pairs"
              onClick={loadPairs}
              className="p-2.5 bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer"
              title="Refresh Pair Reserves"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Pair List (7 cols) + Deposit/Withdraw Manager (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pair List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between font-mono text-xs text-zinc-400 px-1">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-purple" /> Active AGL Liquidity Pools ({pairs.length})
            </span>
            <span>Total LP Tokens Staked: {(wallet.aglLiquidityStaked || 0).toFixed(2)} LP</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pairs.map((pair) => {
              const isSelected = selectedPair?.id === pair.id;
              const tvlUsd = (pair.reserveA * 0.1625) + (pair.reserveB * (pair.tokenB.symbol === "USDC" ? 1 : 3250));

              return (
                <div
                  key={pair.id}
                  onClick={() => setSelectedPair(pair)}
                  className={`p-5 rounded-2xl bg-zinc-900/90 border transition-all cursor-pointer space-y-3 relative ${
                    isSelected
                      ? "border-brand-purple ring-1 ring-brand-purple/40 bg-zinc-900 shadow-xl"
                      : "border-white/10 hover:border-white/20 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <img src={pair.tokenA.logoUrl} alt="AGL" className="w-8 h-8 rounded-full border-2 border-zinc-900" />
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center font-bold text-xs font-mono text-brand-purple">
                          {pair.tokenB.symbol.slice(0, 3)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold font-display text-white">{pair.pairSymbol}</h3>
                          {pair.isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          Reserves: {pair.reserveA.toLocaleString()} AGL / {pair.reserveB.toLocaleString()} {pair.tokenB.symbol}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-emerald-400 block">
                        {pair.apr}% APY
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        TVL: ${tvlUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-black/50 p-2.5 rounded-xl border border-white/5 font-mono text-[10px]">
                    <div>
                      <span className="text-zinc-500 block">24h Volume</span>
                      <span className="font-bold text-white">${pair.volume24hUsd.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">0.3% Fees Earned</span>
                      <span className="font-bold text-purple-300">{pair.fee03PctCollectedEth.toFixed(3)} ETH</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Total LP Minted</span>
                      <span className="font-bold text-white">{pair.totalSupplyLP.toLocaleString(undefined, { maximumFractionDigits: 0 })} LP</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Deposit / Remove Manager Card (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-zinc-900/90 border border-white/10 space-y-5 shadow-2xl relative">
          {selectedPair ? (
            <>
              {/* Card Header & Tabs */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    Liquidity Manager: <span className="text-brand-purple">{selectedPair.pairSymbol}</span>
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">Constant Product Math (x * y = k)</span>
                </div>

                <div className="flex bg-black/60 p-1 rounded-xl border border-white/10 font-mono text-xs">
                  <button
                    onClick={() => setActiveTab("add")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${activeTab === "add" ? "bg-brand-purple text-white" : "text-zinc-400 hover:text-white"}`}
                  >
                    Add LP
                  </button>
                  <button
                    onClick={() => setActiveTab("remove")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${activeTab === "remove" ? "bg-brand-purple text-white" : "text-zinc-400 hover:text-white"}`}
                  >
                    Remove LP
                  </button>
                </div>
              </div>

              {activeTab === "add" ? (
                /* Add Liquidity Form */
                <form onSubmit={handleAddLiquidity} className="space-y-4 font-mono">
                  {/* Token A Input */}
                  <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                      <span>Deposit Token A</span>
                      <span>Balance: {wallet.aglTokenBalance.toLocaleString()} AGL</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={amountA}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmountA(val);
                          // Calculate proportional token B
                          const ratio = selectedPair.reserveB / selectedPair.reserveA;
                          setAmountB(((parseFloat(val) || 0) * ratio).toFixed(4));
                        }}
                        placeholder="0.0"
                        className="w-full bg-transparent text-lg font-bold text-white focus:outline-none"
                      />
                      <span className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs font-bold text-white">AGL</span>
                    </div>
                  </div>

                  {/* Plus Icon */}
                  <div className="flex justify-center -my-2">
                    <div className="p-2 rounded-full bg-zinc-800 border border-white/10 text-brand-purple">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Token B Input */}
                  <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                      <span>Deposit Token B</span>
                      <span>
                        Balance: {selectedPair.tokenB.symbol === "ETH" ? wallet.balanceEth.toFixed(4) : "1,000"} {selectedPair.tokenB.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={amountB}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmountB(val);
                          const ratio = selectedPair.reserveA / selectedPair.reserveB;
                          setAmountA(((parseFloat(val) || 0) * ratio).toFixed(2));
                        }}
                        placeholder="0.0"
                        className="w-full bg-transparent text-lg font-bold text-white focus:outline-none"
                      />
                      <span className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs font-bold text-white">{selectedPair.tokenB.symbol}</span>
                    </div>
                  </div>

                  {/* Pool Share Estimation */}
                  <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 text-[11px] space-y-1.5 text-zinc-400">
                    <div className="flex justify-between">
                      <span>Estimated LP Tokens Minted:</span>
                      <span className="font-bold text-purple-300">
                        {Math.sqrt((parseFloat(amountA)||0) * (parseFloat(amountB)||0)).toFixed(2)} LP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Pool Share:</span>
                      <span className="font-bold text-emerald-400">
                        {(((parseFloat(amountA)||0) / (selectedPair.reserveA + (parseFloat(amountA)||0))) * 100).toFixed(3)}%
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isDepositing}
                    className="w-full py-3 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20 cursor-pointer disabled:opacity-50"
                  >
                    {isDepositing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Minting LP Tokens...
                      </>
                    ) : (
                      <>
                        <Droplets className="w-4 h-4" /> Deposit Liquidity & Mint LP
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Remove Liquidity Form */
                <form onSubmit={handleRemoveLiquidity} className="space-y-4 font-mono">
                  <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                      <span>Burn LP Tokens</span>
                      <span>Available: {(wallet.aglLiquidityStaked || 0).toFixed(2)} LP</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={lpBurnAmount}
                        onChange={(e) => setLpBurnAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-transparent text-lg font-bold text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setLpBurnAmount((wallet.aglLiquidityStaked || 0).toString())}
                        className="px-2.5 py-1 rounded-lg bg-brand-purple/20 text-purple-300 text-xs font-bold hover:bg-brand-purple hover:text-white"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Reclaimed Token Estimates */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 text-xs space-y-2 text-zinc-300">
                    <span className="font-bold text-white uppercase text-[10px] text-zinc-400 block">Reclaimed Assets</span>
                    <div className="flex justify-between">
                      <span>Reclaimed AGL:</span>
                      <span className="font-bold text-emerald-400">
                        {((selectedPair.reserveA * (parseFloat(lpBurnAmount)||0)) / selectedPair.totalSupplyLP).toFixed(2)} AGL
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reclaimed {selectedPair.tokenB.symbol}:</span>
                      <span className="font-bold text-emerald-400">
                        {((selectedPair.reserveB * (parseFloat(lpBurnAmount)||0)) / selectedPair.totalSupplyLP).toFixed(4)} {selectedPair.tokenB.symbol}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isWithdrawing}
                    className="w-full py-3 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isWithdrawing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Burning LP & Reclaiming Assets...
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" /> Remove Liquidity & Reclaim Tokens
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-zinc-500 font-mono text-xs">
              Select a liquidity pool from the left list to manage positions.
            </div>
          )}
        </div>
      </div>

      {/* Modal for Creating New Pair */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 max-w-lg w-full space-y-5 relative shadow-2xl animate-fade-in font-mono">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white text-xs p-1 rounded-lg bg-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">Create AGL Trading Pair</h3>
                <p className="text-xs text-zinc-400 font-sans">Initialize a constant product liquidity pool paired with $AGL.</p>
              </div>
            </div>

            <form onSubmit={handleCreateNewPair} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Paired Token Symbol</label>
                <input
                  type="text"
                  value={newPairSymbolB}
                  onChange={(e) => setNewPairSymbolB(e.target.value.toUpperCase())}
                  placeholder="e.g. SOL, UNI, LINK"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-purple"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Token Name</label>
                <input
                  type="text"
                  value={newPairNameB}
                  onChange={(e) => setNewPairNameB(e.target.value)}
                  placeholder="e.g. Solana Wrapped"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-purple"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Initial AGL Reserve</label>
                  <input
                    type="number"
                    value={initReserveA}
                    onChange={(e) => setInitReserveA(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-purple"
                    required
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Initial {newPairSymbolB} Reserve</label>
                  <input
                    type="number"
                    value={initReserveB}
                    onChange={(e) => setInitReserveB(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-purple"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl font-bold shadow-lg shadow-brand-purple/20 cursor-pointer"
                >
                  Create Liquidity Pair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
