import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Activity } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { 
  Activity as ActivityIcon, 
  RotateCw, 
  Coins, 
  Flame, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  Sparkles, 
  Vote, 
  Layers, 
  Award, 
  UserCheck, 
  ExternalLink 
} from "lucide-react";

interface ActivityFeedProps {
  onViewAll?: () => void;
  className?: string;
}

export default function ActivityFeed({ onViewAll, className = "" }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFallbackData = () => {
    try {
      const local = AgunnayaDatabase.getActivities().slice(0, 5);
      setActivities(local);
    } catch (err) {
      console.warn("Failed to load local activity fallback:", err);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const q = query(
        collection(db, "activities"),
        orderBy("timestamp", "desc"),
        limit(5)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setIsLoading(false);
          setIsLive(true);
          if (!snapshot.empty) {
            const firestoreDocs: Activity[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as Activity;
              firestoreDocs.push({
                ...data,
                id: doc.id || data.id,
              });
            });
            setActivities(firestoreDocs);
          } else {
            // If empty in Firestore, populate with local fallback seeds
            fetchFallbackData();
          }
        },
        (error) => {
          console.warn("Firestore onSnapshot error in ActivityFeed:", error);
          setIsLoading(false);
          setIsLive(false);
          try {
            handleFirestoreError(error, OperationType.LIST, "activities");
          } catch (e: any) {
            setErrorMessage(e.message || "Failed to read Firestore activities");
          }
          fetchFallbackData();
        }
      );
    } catch (err: any) {
      console.warn("Error setting up Firestore query in ActivityFeed:", err);
      setIsLoading(false);
      setIsLive(false);
      try {
        handleFirestoreError(err, OperationType.LIST, "activities");
      } catch (e: any) {
        setErrorMessage(e.message || "Failed to setup activities query");
      }
      fetchFallbackData();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const q = query(
        collection(db, "activities"),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreDocs: Activity[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Activity;
          firestoreDocs.push({
            ...data,
            id: doc.id || data.id,
          });
        });
        setActivities(firestoreDocs);
      } else {
        fetchFallbackData();
      }
    } catch (err) {
      console.warn("Manual refresh of activities failed:", err);
      try {
        handleFirestoreError(err, OperationType.LIST, "activities");
      } catch (e) {
        // fallback to local db
      }
      fetchFallbackData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const getTypeBadge = (type: Activity["type"]) => {
    switch (type) {
      case "buy":
        return {
          label: "BUY",
          icon: <ArrowDownLeft className="w-3 h-3 text-emerald-400" />,
          colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "sell":
        return {
          label: "SELL",
          icon: <ArrowUpRight className="w-3 h-3 text-rose-400" />,
          colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      case "create":
      case "deployment":
        return {
          label: type === "create" ? "CREATE" : "DEPLOY",
          icon: <PlusCircle className="w-3 h-3 text-brand-purple" />,
          colorClass: "bg-brand-purple/15 text-purple-300 border-brand-purple/30",
        };
      case "mint":
        return {
          label: "MINT",
          icon: <Sparkles className="w-3 h-3 text-brand-blue" />,
          colorClass: "bg-brand-blue/15 text-blue-300 border-brand-blue/30",
        };
      case "burn":
        return {
          label: "BURN",
          icon: <Flame className="w-3 h-3 text-amber-400" />,
          colorClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        };
      case "vote":
        return {
          label: "VOTE",
          icon: <Vote className="w-3 h-3 text-indigo-400" />,
          colorClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        };
      case "stake":
        return {
          label: "STAKE",
          icon: <Layers className="w-3 h-3 text-cyan-400" />,
          colorClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        };
      case "achievement":
        return {
          label: "AWARD",
          icon: <Award className="w-3 h-3 text-yellow-400" />,
          colorClass: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
        };
      case "referral":
        return {
          label: "REFERRAL",
          icon: <UserCheck className="w-3 h-3 text-emerald-400" />,
          colorClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        };
      default:
        return {
          label: String(type || "TX").toUpperCase(),
          icon: <Coins className="w-3 h-3 text-zinc-400" />,
          colorClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
        };
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return "Just now";
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return `${diffSec || 1}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "0x000...0000";
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div id="activity-feed-card" className={`glass-panel rounded-2xl border border-white/5 p-6 bg-zinc-900/20 flex flex-col justify-between ${className}`}>
      <div>
        {/* Component Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
              <ActivityIcon className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
                Firestore Activity Feed
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-ping" : "bg-zinc-500"}`} />
                  {isLive ? "Live Firestore Sync" : "Cached Mode"}
                </span>
                <span className="text-[10px] text-zinc-600">•</span>
                <span className="text-[10px] font-mono text-zinc-500">Last 5 Transactions</span>
              </div>
            </div>
          </div>

          <button
            id="activity-feed-refresh-btn"
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-brand-purple/40 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh latest transactions from Firestore"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-brand-purple" : ""}`} />
          </button>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="p-3 bg-zinc-950/60 rounded-xl border border-white/5 animate-pulse space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-4 bg-zinc-800 rounded" />
                  <div className="w-12 h-3 bg-zinc-800 rounded" />
                </div>
                <div className="w-full h-3 bg-zinc-800/60 rounded" />
                <div className="w-24 h-2.5 bg-zinc-900 rounded" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          /* Empty State */
          <div className="text-center py-10 border border-dashed border-white/5 rounded-xl space-y-2">
            <ActivityIcon className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 font-semibold">No recent transactions recorded</p>
            <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
              Blockchain interactions, token swaps, or deployments will appear here live.
            </p>
          </div>
        ) : (
          /* Transaction Items Feed */
          <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
            {activities.slice(0, 5).map((act) => {
              const badge = getTypeBadge(act.type);
              return (
                <div
                  key={act.id}
                  className="p-3 bg-zinc-950/80 hover:bg-zinc-950 rounded-xl border border-white/5 hover:border-brand-purple/30 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold ${badge.colorClass}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                      {act.tokenSymbol && (
                        <span className="text-zinc-300 font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">
                          ${act.tokenSymbol}
                        </span>
                      )}
                    </div>

                    <span className="text-zinc-500 font-semibold" title={new Date(act.timestamp).toLocaleString()}>
                      {formatTime(act.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-200 leading-snug font-sans group-hover:text-white transition-colors">
                    {act.details}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1">
                      <span className="text-zinc-600">User:</span>
                      <span className="text-zinc-400 font-bold">{formatAddress(act.user)}</span>
                    </span>

                    {(act.ethValue > 0 || act.amount > 0) && (
                      <span className="text-emerald-400 font-bold">
                        {act.ethValue > 0 ? `${act.ethValue.toFixed(4)} ETH` : `${act.amount.toLocaleString()} Units`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation Link */}
      <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between text-[11px] font-mono">
        <span className="text-zinc-500">Firestore collection: <code className="text-brand-purple">/activities</code></span>
        {onViewAll && (
          <button
            id="activity-feed-view-all-btn"
            type="button"
            onClick={onViewAll}
            className="text-brand-blue hover:text-white font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Ledger</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
