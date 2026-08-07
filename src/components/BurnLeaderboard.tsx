import React, { useState, useEffect, useMemo } from "react";
import { 
  Flame, 
  Trophy, 
  Crown, 
  Medal, 
  Award, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  BarChart2, 
  Clock, 
  Coins, 
  User, 
  RefreshCw,
  Zap,
  ArrowUpRight,
  TrendingDown,
  X
} from "lucide-react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Activity, WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";

interface BurnLeaderboardProps {
  wallet?: WalletState;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
  onOpenConnectWallet?: () => void;
  onSelectBurnerAddress?: (address: string) => void;
}

export interface BurnerRankEntry {
  rank: number;
  address: string;
  totalValueUsd: number;
  totalTokensBurned: number;
  burnCount: number;
  primaryToken: string;
  tokenBreakdown: Record<string, number>;
  lastBurnTimestamp: number;
  rankTitle: string;
  rankBadgeColor: string;
  recentTxHashes: string[];
}

const ETH_PRICE_ESTIMATE = 3250; // Standard USD conversion factor for ETH-denominated burn values

export default function BurnLeaderboard({
  wallet,
  showToast,
  onOpenConnectWallet,
  onSelectBurnerAddress
}: BurnLeaderboardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [timeframe, setTimeframe] = useState<"all" | "month" | "week">("all");
  const [selectedTokenFilter, setSelectedTokenFilter] = useState<string>("all");
  const [inspectingBurner, setInspectingBurner] = useState<BurnerRankEntry | null>(null);

  // Load activities from Firestore with real-time listener + local fallback
  useEffect(() => {
    let unsubscribe = () => {};

    try {
      const q = query(
        collection(db, "activities"),
        orderBy("timestamp", "desc"),
        limit(200)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Activity[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Activity);
        });

        if (list.length > 0) {
          setActivities(list);
        } else {
          // Fallback to local DB if Firestore returns empty set
          setActivities(AgunnayaDatabase.getActivities());
        }
        setLoading(false);
      }, (error) => {
        console.warn("Firestore real-time listener fallback to local DB:", error);
        setActivities(AgunnayaDatabase.getActivities());
        setLoading(false);
      });
    } catch (err) {
      console.warn("Error setting up Firestore listener, using local activities:", err);
      setActivities(AgunnayaDatabase.getActivities());
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Also combine local storage burn history from TokenBurnerPage
  const localBurnHistory = useMemo(() => {
    try {
      const saved = localStorage.getItem("agl_token_burn_history");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  }, []);

  // Process and aggregate burn data by user address
  const burnerLeaderboard = useMemo(() => {
    const addressMap: Record<string, {
      address: string;
      totalValueUsd: number;
      totalTokensBurned: number;
      burnCount: number;
      tokenBreakdown: Record<string, number>;
      lastBurnTimestamp: number;
      recentTxHashes: string[];
    }> = {};

    const now = Date.now();
    const timeframeMs = timeframe === "week" 
      ? 7 * 24 * 3600 * 1000 
      : timeframe === "month" 
      ? 30 * 24 * 3600 * 1000 
      : Infinity;

    // 1. Process Activity records with type 'burn' or burn details
    activities.forEach((act) => {
      const isBurn = act.type === "burn" || act.details.toLowerCase().includes("burn") || act.details.toLowerCase().includes("deflat");
      if (!isBurn) return;

      if (now - act.timestamp > timeframeMs) return;

      if (selectedTokenFilter !== "all" && act.tokenSymbol.toUpperCase() !== selectedTokenFilter.toUpperCase()) {
        return;
      }

      const addr = act.user || "0x0000000000000000000000000000000000000000";
      if (!addressMap[addr]) {
        addressMap[addr] = {
          address: addr,
          totalValueUsd: 0,
          totalTokensBurned: 0,
          burnCount: 0,
          tokenBreakdown: {},
          lastBurnTimestamp: act.timestamp,
          recentTxHashes: []
        };
      }

      // Value estimation
      const valUsd = act.ethValue > 0 ? act.ethValue * ETH_PRICE_ESTIMATE : (act.amount * 0.1625);
      addressMap[addr].totalValueUsd += valUsd;
      addressMap[addr].totalTokensBurned += act.amount;
      addressMap[addr].burnCount += 1;
      
      const symbol = act.tokenSymbol || "AGL";
      addressMap[addr].tokenBreakdown[symbol] = (addressMap[addr].tokenBreakdown[symbol] || 0) + act.amount;
      
      if (act.timestamp > addressMap[addr].lastBurnTimestamp) {
        addressMap[addr].lastBurnTimestamp = act.timestamp;
      }
      if (act.id && !addressMap[addr].recentTxHashes.includes(act.id)) {
        addressMap[addr].recentTxHashes.push(act.id);
      }
    });

    // 2. Process local burn history transactions from TokenBurnerPage
    localBurnHistory.forEach((b: any) => {
      if (now - b.timestamp > timeframeMs) return;
      if (selectedTokenFilter !== "all" && b.tokenSymbol.toUpperCase() !== selectedTokenFilter.toUpperCase()) {
        return;
      }

      const addr = b.burnerAddress || "0x0000000000000000000000000000000000000000";
      if (!addressMap[addr]) {
        addressMap[addr] = {
          address: addr,
          totalValueUsd: 0,
          totalTokensBurned: 0,
          burnCount: 0,
          tokenBreakdown: {},
          lastBurnTimestamp: b.timestamp,
          recentTxHashes: []
        };
      }

      const valUsd = b.amountUsd || (b.amount * 0.1625);
      addressMap[addr].totalValueUsd += valUsd;
      addressMap[addr].totalTokensBurned += b.amount;
      addressMap[addr].burnCount += 1;

      const symbol = b.tokenSymbol || "AGL";
      addressMap[addr].tokenBreakdown[symbol] = (addressMap[addr].tokenBreakdown[symbol] || 0) + b.amount;

      if (b.timestamp > addressMap[addr].lastBurnTimestamp) {
        addressMap[addr].lastBurnTimestamp = b.timestamp;
      }
      if (b.txHash && !addressMap[addr].recentTxHashes.includes(b.txHash)) {
        addressMap[addr].recentTxHashes.push(b.txHash);
      }
    });

    // Ensure seed top burners exist if data is sparse
    if (Object.keys(addressMap).length === 0) {
      addressMap["0x479596943e70316A0d893De1876EBeA1Ea8E4D5B"] = {
        address: "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B",
        totalValueUsd: 12850.00,
        totalTokensBurned: 65000,
        burnCount: 12,
        tokenBreakdown: { "AGL": 50000, "cbETH": 1.5, "USDC": 3000 },
        lastBurnTimestamp: Date.now() - 3600000 * 2,
        recentTxHashes: ["0x9d4a8f2e7b1c3d5e7f9a2b4c6d8e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e"]
      };
      addressMap["0x98219483A12b059e93847aB19d72e73110555523"] = {
        address: "0x98219483A12b059e93847aB19d72e73110555523",
        totalValueUsd: 8750.50,
        totalTokensBurned: 18500,
        burnCount: 8,
        tokenBreakdown: { "AERO": 15000, "AGL": 3500 },
        lastBurnTimestamp: Date.now() - 3600000 * 18,
        recentTxHashes: ["0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c"]
      };
      addressMap["0x7890123456789012345678901234567890123456"] = {
        address: "0x7890123456789012345678901234567890123456",
        totalValueUsd: 2500.00,
        totalTokensBurned: 2500,
        burnCount: 3,
        tokenBreakdown: { "USDC": 2500 },
        lastBurnTimestamp: Date.now() - 3600000 * 5,
        recentTxHashes: ["0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d"]
      };
    }

    // Convert to sorted array
    const sorted = Object.values(addressMap).sort((a, b) => b.totalValueUsd - a.totalValueUsd);

    // Map ranks and titles
    return sorted.map((item, idx) => {
      const rank = idx + 1;
      let rankTitle = "Supply Deflator";
      let rankBadgeColor = "bg-zinc-800 text-zinc-300 border-zinc-700";

      if (rank === 1) {
        rankTitle = "King of Deflation";
        rankBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
      } else if (rank === 2) {
        rankTitle = "Grand Incinerator";
        rankBadgeColor = "bg-slate-400/20 text-slate-200 border-slate-400/40";
      } else if (rank === 3) {
        rankTitle = "Flame Vanguard";
        rankBadgeColor = "bg-amber-700/20 text-amber-400 border-amber-700/40";
      } else if (rank <= 5) {
        rankTitle = "Pro Pyromaniac";
        rankBadgeColor = "bg-red-500/20 text-red-400 border-red-500/30";
      } else if (rank <= 10) {
        rankTitle = "Token Burner";
        rankBadgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/30";
      }

      // Find top token burned by amount
      const topTokenEntry = Object.entries(item.tokenBreakdown).sort((a, b) => b[1] - a[1])[0];
      const primaryToken = topTokenEntry ? topTokenEntry[0] : "AGL";

      return {
        ...item,
        rank,
        primaryToken,
        rankTitle,
        rankBadgeColor
      } as BurnerRankEntry;
    });
  }, [activities, localBurnHistory, timeframe, selectedTokenFilter]);

  // Filtered leaderboard by search term
  const filteredLeaderboard = useMemo(() => {
    if (!searchTerm.trim()) return burnerLeaderboard;
    const term = searchTerm.toLowerCase();
    return burnerLeaderboard.filter(
      b => b.address.toLowerCase().includes(term) || b.primaryToken.toLowerCase().includes(term) || b.rankTitle.toLowerCase().includes(term)
    );
  }, [burnerLeaderboard, searchTerm]);

  // Aggregate stats
  const totalValueDestroyedAll = useMemo(() => {
    return burnerLeaderboard.reduce((acc, curr) => acc + curr.totalValueUsd, 0);
  }, [burnerLeaderboard]);

  const totalBurnCountAll = useMemo(() => {
    return burnerLeaderboard.reduce((acc, curr) => acc + curr.burnCount, 0);
  }, [burnerLeaderboard]);

  // Connected wallet rank
  const connectedUserRank = useMemo(() => {
    if (!wallet || !wallet.isConnected || !wallet.address) return null;
    return burnerLeaderboard.find(b => b.address.toLowerCase() === wallet.address.toLowerCase()) || null;
  }, [burnerLeaderboard, wallet]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    if (showToast) showToast(`${label} copied to clipboard!`, "info");
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div id="burn-leaderboard-component" className="p-6 md:p-8 rounded-3xl bg-zinc-950 border border-red-500/30 shadow-2xl space-y-8 relative overflow-hidden font-sans">
      
      {/* Background glow effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-red-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-10 w-80 h-80 rounded-full bg-amber-600/10 blur-3xl pointer-events-none"></div>

      {/* Leaderboard Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10 relative z-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>FIRESTORE BACKED LEADERBOARD</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
            Top Burner Hall of Fame
            <span className="text-xs bg-red-600 text-white font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
              LIVE DEFLATION
            </span>
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Rankings of top Web3 addresses on Base Mainnet ranked by total value destroyed ($ USD) via null-address deflation transactions and studio compute credit mints.
          </p>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-2 gap-3 shrink-0 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Deflated Value</span>
            <span className="text-lg font-extrabold text-emerald-400 block">
              ${totalValueDestroyedAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Burn Transactions</span>
            <span className="text-lg font-extrabold text-white flex items-center gap-1.5 block">
              <Flame className="w-4 h-4 text-red-500 fill-red-500" />
              {totalBurnCountAll.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Connected User Rank Callout Banner */}
      {wallet?.isConnected && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/50 via-purple-950/40 to-black border border-red-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-white font-bold flex items-center gap-2">
                <span>Your Burner Rank:</span>
                {connectedUserRank ? (
                  <span className="text-amber-300 font-extrabold text-sm">#{connectedUserRank.rank} ({connectedUserRank.rankTitle})</span>
                ) : (
                  <span className="text-zinc-400 font-normal">Unranked (No burns recorded yet)</span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                {connectedUserRank 
                  ? `Total Destroyed: $${connectedUserRank.totalValueUsd.toFixed(2)} across ${connectedUserRank.burnCount} burns.`
                  : "Execute a burn transaction below to climb the global leaderboard!"}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <a
              href="#execute-burn-btn"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:opacity-90 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>Burn Tokens & Rise Rank</span>
            </a>
          </div>
        </div>
      )}

      {/* Top 3 Podium Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        
        {/* RANK 2 - Silver */}
        {burnerLeaderboard[1] && (
          <div className="p-5 rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-black border border-slate-400/30 hover:border-slate-300/50 transition-all space-y-4 shadow-xl relative overflow-hidden order-2 md:order-1 mt-0 md:mt-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40 font-mono text-xs font-bold flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 text-slate-300" />
                RANK #2
              </span>
              <span className="text-[10px] font-mono text-slate-400">{burnerLeaderboard[1].rankTitle}</span>
            </div>

            <div className="text-center space-y-2 py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-400/40 flex items-center justify-center shadow-lg">
                <span className="font-mono text-lg font-extrabold text-slate-200">
                  {burnerLeaderboard[1].address.slice(2, 6)}
                </span>
              </div>
              <div className="font-mono">
                <span className="text-xs text-white font-bold flex items-center justify-center gap-1">
                  {burnerLeaderboard[1].address.slice(0, 6)}...{burnerLeaderboard[1].address.slice(-4)}
                  <button onClick={() => copyToClipboard(burnerLeaderboard[1].address, "Address")} className="text-zinc-500 hover:text-white">
                    {copiedAddress === burnerLeaderboard[1].address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <div className="font-mono">
                <span className="text-xl font-extrabold text-emerald-400 block">
                  ${burnerLeaderboard[1].totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  {burnerLeaderboard[1].totalTokensBurned.toLocaleString()} {burnerLeaderboard[1].primaryToken} Burned
                </span>
              </div>
            </div>

            <button
              onClick={() => setInspectingBurner(burnerLeaderboard[1])}
              className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span>View Burn Logs ({burnerLeaderboard[1].burnCount})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* RANK 1 - Gold (Center, Crown, Glowing) */}
        {burnerLeaderboard[0] && (
          <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 via-zinc-900 to-black border-2 border-amber-500/50 hover:border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all space-y-4 relative overflow-hidden order-1 md:order-2 scale-105">
            <div className="absolute top-0 right-0 px-4 py-1 rounded-bl-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-[10px] font-mono tracking-widest uppercase">
              TOP BURNER CHAMPION
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono text-xs font-bold flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-300 animate-bounce" />
                RANK #1
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold">{burnerLeaderboard[0].rankTitle}</span>
            </div>

            <div className="text-center space-y-2 py-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-xl relative">
                <Crown className="w-8 h-8 text-amber-300 fill-amber-300" />
              </div>
              <div className="font-mono">
                <span className="text-sm text-white font-extrabold flex items-center justify-center gap-1.5">
                  {burnerLeaderboard[0].address.slice(0, 6)}...{burnerLeaderboard[0].address.slice(-4)}
                  <button onClick={() => copyToClipboard(burnerLeaderboard[0].address, "Address")} className="text-amber-400 hover:text-white">
                    {copiedAddress === burnerLeaderboard[0].address ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
              </div>
              <div className="font-mono">
                <span className="text-2xl font-extrabold text-amber-300 block tracking-tight">
                  ${burnerLeaderboard[0].totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-zinc-300 font-bold block mt-1">
                  {burnerLeaderboard[0].totalTokensBurned.toLocaleString()} {burnerLeaderboard[0].primaryToken} Deflated
                </span>
              </div>
            </div>

            <button
              onClick={() => setInspectingBurner(burnerLeaderboard[0])}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:opacity-90 text-white font-mono text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inspect Champion History ({burnerLeaderboard[0].burnCount} Burns)</span>
            </button>
          </div>
        )}

        {/* RANK 3 - Bronze */}
        {burnerLeaderboard[2] && (
          <div className="p-5 rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-black border border-amber-700/30 hover:border-amber-600/50 transition-all space-y-4 shadow-xl relative overflow-hidden order-3 md:order-3 mt-0 md:mt-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/40 font-mono text-xs font-bold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                RANK #3
              </span>
              <span className="text-[10px] font-mono text-amber-500">{burnerLeaderboard[2].rankTitle}</span>
            </div>

            <div className="text-center space-y-2 py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/40 border border-amber-700/40 flex items-center justify-center shadow-lg">
                <span className="font-mono text-lg font-extrabold text-amber-400">
                  {burnerLeaderboard[2].address.slice(2, 6)}
                </span>
              </div>
              <div className="font-mono">
                <span className="text-xs text-white font-bold flex items-center justify-center gap-1">
                  {burnerLeaderboard[2].address.slice(0, 6)}...{burnerLeaderboard[2].address.slice(-4)}
                  <button onClick={() => copyToClipboard(burnerLeaderboard[2].address, "Address")} className="text-zinc-500 hover:text-white">
                    {copiedAddress === burnerLeaderboard[2].address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <div className="font-mono">
                <span className="text-xl font-extrabold text-emerald-400 block">
                  ${burnerLeaderboard[2].totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  {burnerLeaderboard[2].totalTokensBurned.toLocaleString()} {burnerLeaderboard[2].primaryToken} Burned
                </span>
              </div>
            </div>

            <button
              onClick={() => setInspectingBurner(burnerLeaderboard[2])}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span>View Burn Logs ({burnerLeaderboard[2].burnCount})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search burner address or token..."
            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Timeframe & Token Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          
          {/* Timeframe selector */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/10">
            {[
              { id: "all", label: "All Time" },
              { id: "month", label: "30 Days" },
              { id: "week", label: "7 Days" }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  timeframe === t.id ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Token selector */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/10">
            {["all", "AGL", "USDC", "AERO", "cbETH"].map(tok => (
              <button
                key={tok}
                onClick={() => setSelectedTokenFilter(tok)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedTokenFilter === tok ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {tok === "all" ? "All Tokens" : tok}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Table Section */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-zinc-900/90 text-zinc-400 border-b border-white/10 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Rank</th>
                <th className="py-3.5 px-4">Burner Address</th>
                <th className="py-3.5 px-4">Value Destroyed ($ USD)</th>
                <th className="py-3.5 px-4">Primary Token</th>
                <th className="py-3.5 px-4 text-center">Burn Tx Count</th>
                <th className="py-3.5 px-4">Last Active</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading Firestore Burn Leaderboard...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No burn records match your search filter.
                  </td>
                </tr>
              ) : (
                filteredLeaderboard.map((entry) => {
                  const isConnectedUser = wallet?.isConnected && wallet.address.toLowerCase() === entry.address.toLowerCase();

                  return (
                    <tr 
                      key={entry.address}
                      className={`hover:bg-zinc-900/60 transition-colors ${
                        isConnectedUser ? "bg-red-500/10 border-l-4 border-l-red-500" : ""
                      }`}
                    >
                      {/* Rank Position */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center ${
                            entry.rank === 1 ? "bg-amber-500 text-black" :
                            entry.rank === 2 ? "bg-slate-300 text-black" :
                            entry.rank === 3 ? "bg-amber-700 text-white" : "bg-zinc-800 text-zinc-400"
                          }`}>
                            {entry.rank}
                          </span>
                          {isConnectedUser && (
                            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">YOU</span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            <span>{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</span>
                            <button
                              onClick={() => copyToClipboard(entry.address, "Address")}
                              className="text-zinc-500 hover:text-white transition-colors"
                            >
                              {copiedAddress === entry.address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <a
                              href={`https://basescan.org/address/${entry.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-500 hover:text-white"
                              title="View on BaseScan"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded border ${entry.rankBadgeColor}`}>
                            {entry.rankTitle}
                          </span>
                        </div>
                      </td>

                      {/* Total USD Value */}
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-extrabold text-emerald-400 block">
                          ${entry.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {entry.totalTokensBurned.toLocaleString()} tokens total
                        </span>
                      </td>

                      {/* Primary Token */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-1 rounded bg-zinc-800 text-white font-bold text-[11px] border border-white/10">
                          {entry.primaryToken}
                        </span>
                      </td>

                      {/* Burn Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold">
                          {entry.burnCount}
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                        {new Date(entry.lastBurnTimestamp).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setInspectingBurner(entry)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] transition-all inline-flex items-center gap-1"
                        >
                          <span>Logs</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Burner Detail Inspector Modal */}
      {inspectingBurner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-6 shadow-2xl font-mono relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-white font-display">Burner History Ledger</h3>
              </div>
              <button
                onClick={() => setInspectingBurner(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Address Overview */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Address:</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  {inspectingBurner.address}
                  <button onClick={() => copyToClipboard(inspectingBurner.address, "Address")} className="text-zinc-500 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Rank:</span>
                <span className="font-bold text-amber-300">#{inspectingBurner.rank} ({inspectingBurner.rankTitle})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total Destroyed:</span>
                <span className="font-bold text-emerald-400">${inspectingBurner.totalValueUsd.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Token Breakdown */}
            <div className="space-y-2 text-xs">
              <span className="text-zinc-400 font-bold block">Token Breakdown:</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(inspectingBurner.tokenBreakdown).map(([sym, amt]) => (
                  <div key={sym} className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-between">
                    <span className="text-white font-bold">{sym}</span>
                    <span className="text-red-400 font-bold">{amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => setInspectingBurner(null)}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
