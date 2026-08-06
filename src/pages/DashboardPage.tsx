import { WalletState, Token, NFTCollection, DAO, GameFiProject, AIAgent, Activity } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import ImageWithFallback from "../components/ImageWithFallback";
import TransactionHistoryTable from "../components/TransactionHistoryTable";
import { useState, useMemo } from "react";
import TaskSummaryWidget from "../components/TaskSummaryWidget";
import { 
  Briefcase, 
  Layers, 
  Coins, 
  Disc, 
  Users, 
  Bot, 
  ShieldCheck, 
  Compass, 
  Award,
  FlameKindling,
  ArrowUpDown,
  TrendingUp,
  Calendar,
  Droplets,
  Filter
} from "lucide-react";

interface DashboardPageProps {
  wallet: WalletState;
  userTokens: Token[];
  userNFTs: NFTCollection[];
  userDAOs: DAO[];
  userGameFi: GameFiProject[];
  userAgents: AIAgent[];
  activities: Activity[];
  onOpenConnect: () => void;
  onSelectTab: (tab: string) => void;
}

export default function DashboardPage({ 
  wallet, 
  userTokens, 
  userNFTs, 
  userDAOs, 
  userGameFi, 
  userAgents,
  activities: initialActivities,
  onOpenConnect,
  onSelectTab
}: DashboardPageProps) {
  const [localActivities, setLocalActivities] = useState<Activity[]>(initialActivities);

  // Sorting state for created tokens list
  type TokenSortOption = "marketCap" | "launchDate" | "liquidity";
  const [tokenSortBy, setTokenSortBy] = useState<TokenSortOption>("marketCap");
  const [tokenScope, setTokenScope] = useState<"myCreated" | "all">("myCreated");

  const handleRefreshActivities = () => {
    const fresh = AgunnayaDatabase.getActivities();
    setLocalActivities(fresh);
  };

  const myCreatedTokensCount = userTokens.filter(t => t.creator === wallet.address).length;

  const sortedTokens = useMemo(() => {
    let list = tokenScope === "myCreated" 
      ? userTokens.filter(t => t.creator === wallet.address)
      : userTokens;

    // Fallback: if tokenScope is "myCreated" and user has no created tokens yet, fallback to userTokens so sorting is always interactive
    if (tokenScope === "myCreated" && list.length === 0) {
      list = userTokens;
    }

    return [...list].sort((a, b) => {
      if (tokenSortBy === "marketCap") {
        return (b.marketCap || 0) - (a.marketCap || 0);
      } else if (tokenSortBy === "launchDate") {
        return (b.createdAt || 0) - (a.createdAt || 0);
      } else if (tokenSortBy === "liquidity") {
        return (b.reserveEth || 0) - (a.reserveEth || 0);
      }
      return 0;
    });
  }, [userTokens, wallet.address, tokenScope, tokenSortBy]);
  
  if (!wallet.isConnected) {
    return (
      <div id="dashboard-disconnected" className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
          <Briefcase className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display tracking-tight text-white">Your Web3 Workspace</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Connect your wallet to unlock your personalized developer workspace. Monitor holdings, sponsor deployment gas, launch DAOs, manage AI agents, and claim staking awards.
          </p>
        </div>
        <button
          id="dashboard-connect-btn"
          onClick={onOpenConnect}
          className="px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-600 font-semibold font-display text-xs transition-all flex items-center gap-2"
        >
          <Briefcase className="w-4 h-4" />
          <span>Connect Web3 Wallet</span>
        </button>
      </div>
    );
  }

  const tokenBalances = wallet.address ? AgunnayaDatabase.getTokenBalances(wallet.address) : {};

  // Calculate some mock totals
  const myCreatedProjectsCount = 
    userTokens.filter(t => t.creator === wallet.address).length +
    userNFTs.filter(n => n.creator === wallet.address).length +
    userDAOs.filter(d => d.creator === wallet.address).length +
    userGameFi.filter(g => g.creator === wallet.address).length +
    userAgents.filter(a => a.creator === wallet.address).length;

  const totalCreatorFeesEarned = userTokens
    .filter(t => t.creator === wallet.address)
    .reduce((sum, t) => sum + t.creatorFeesEarned, 0);

  // Gas sponsorship progress %
  const gasSponsorshipPct = (wallet.sponsoredGasEth / 0.05) * 100;

  return (
    <div id="dashboard-connected-root" className="space-y-6 animate-fade-in">
      {/* Upper Cards Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Details Profile */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/40 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-blue/5 blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Secured Web3 Identity</span>
              <span className="text-[10px] bg-brand-blue/20 text-brand-blue font-bold font-mono px-2 py-0.5 rounded uppercase">
                {wallet.walletType === "smart" ? "AA Smart" : "Extern EOA"}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white font-mono">{wallet.address}</h3>
            <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Simulated Base Network Secure Link</span>
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Identity Provider:</span>
            <span className="font-semibold text-zinc-300 font-mono capitalize">{wallet.walletType}</span>
          </div>
        </div>

        {/* Account Abstraction Gas Sponsorship Meter */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/40 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Sponsored Dev Gas (AA)</span>
              <span className="text-xs font-mono font-bold text-white">{wallet.sponsoredGasEth.toFixed(4)} / 0.0500 ETH</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-3 mb-2">
              <div 
                className="bg-gradient-to-r from-brand-purple to-brand-blue h-full rounded-full"
                style={{ width: `${gasSponsorshipPct}%` }}
              ></div>
            </div>

            <p className="text-[10px] text-zinc-500 leading-normal mt-2">
              Our Account Abstraction gas sponsor automatically covers gas for token launches, DAO voting and staking operations!
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Status:</span>
            <button
              id="dashboard-manage-gas-btn"
              onClick={() => onSelectTab("gas-dashboard")}
              className="font-bold text-emerald-400 flex items-center gap-1 font-mono hover:text-brand-purple transition-colors bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 hover:border-brand-purple/30 hover:bg-brand-purple/10"
            >
              <FlameKindling className="w-3.5 h-3.5 animate-pulse" /> Manage & Faucet
            </button>
          </div>
        </div>

        {/* Platform Rewards Metrics */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/40 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-purple/5 blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Developer Metrics</span>
              <span className="text-zinc-500 font-mono text-[10px]">Lifetime</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Your Deployed Projects:</span>
                <span className="font-mono text-sm font-bold text-brand-purple">{myCreatedProjectsCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Total Curve Fees Earned:</span>
                <span className="font-mono text-sm font-bold text-emerald-400">{totalCreatorFeesEarned.toFixed(4)} ETH</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Fee discount tier:</span>
            <span className="font-bold text-white font-mono bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded">10% Off via AGL</span>
          </div>
        </div>
      </div>

      {/* Main split sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Holdings and Deployed Registry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Created Tokens & Deployed Contracts Registry */}
          <div className="glass-panel rounded-2xl border border-white/5 p-6 bg-zinc-900/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-brand-purple" /> Created Tokens & Contracts
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Organize and track tokens on Base sorted by market cap, launch date, or liquidity pool size.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Scope Filter Tabs */}
                <div className="flex items-center p-1 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono">
                  <button
                    type="button"
                    id="token-scope-mycreated-btn"
                    onClick={() => setTokenScope("myCreated")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      tokenScope === "myCreated"
                        ? "bg-brand-purple text-white font-bold shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    My Created ({myCreatedTokensCount})
                  </button>
                  <button
                    type="button"
                    id="token-scope-all-btn"
                    onClick={() => setTokenScope("all")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      tokenScope === "all"
                        ? "bg-brand-purple text-white font-bold shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    All Base ({userTokens.length})
                  </button>
                </div>

                {/* Sorting Dropdown */}
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 font-mono text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-brand-purple shrink-0" />
                  <span className="text-[10px] text-zinc-500 font-bold uppercase hidden sm:inline">Sort:</span>
                  <select
                    id="dashboard-token-sort-select"
                    value={tokenSortBy}
                    onChange={(e) => setTokenSortBy(e.target.value as TokenSortOption)}
                    className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="marketCap" className="bg-zinc-900 text-white">Market Cap (High → Low)</option>
                    <option value="launchDate" className="bg-zinc-900 text-white">Launch Date (Newest First)</option>
                    <option value="liquidity" className="bg-zinc-900 text-white">Liquidity Pool Size (High → Low)</option>
                  </select>
                </div>

                <button 
                  id="dash-launch-prompt"
                  onClick={() => onSelectTab("ai-builder")}
                  className="text-[10px] text-brand-purple hover:text-white bg-brand-purple/10 border border-brand-purple/20 px-3 py-1.5 rounded-xl font-mono font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  + Deploy New
                </button>
              </div>
            </div>

            {/* List of Sorted Tokens */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {sortedTokens.map((t) => (
                <div key={t.address} className="p-3.5 bg-zinc-950/80 rounded-xl border border-white/5 hover:border-brand-purple/30 transition-all space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback src={t.logoUrl} alt={t.name} fallbackText={t.symbol} className="w-9 h-9 rounded-xl object-cover border border-white/10" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-display">{t.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[9px] font-bold">
                            ${t.symbol}
                          </span>
                          {t.creator === wallet.address && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold">
                              Created by You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                          Contract: {t.address.slice(0, 8)}...{t.address.slice(-6)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="block text-xs font-mono font-bold text-emerald-400">
                        {(t.supply / 1000000).toFixed(2)}M Minted
                      </span>
                      <span className="block text-[10px] text-zinc-400 font-mono">
                        Price: {t.currentPrice.toFixed(6)} ETH
                      </span>
                    </div>
                  </div>

                  {/* Key Metrics Row for Sorting Verification */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[10px] font-mono">
                    <div className="p-2 rounded-lg bg-zinc-900/90 border border-white/5 flex items-center justify-between">
                      <span className="text-zinc-500 text-[9px] uppercase flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" /> Market Cap
                      </span>
                      <span className="text-white font-bold">{t.marketCap.toFixed(2)} ETH</span>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-900/90 border border-white/5 flex items-center justify-between">
                      <span className="text-zinc-500 text-[9px] uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-400" /> Launch Date
                      </span>
                      <span className="text-zinc-200 font-bold">
                        {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-900/90 border border-white/5 flex items-center justify-between">
                      <span className="text-zinc-500 text-[9px] uppercase flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-purple-400" /> Liquidity Pool
                      </span>
                      <span className="text-brand-purple font-bold">{t.reserveEth.toFixed(3)} ETH</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Other Deployed Assets (DAOs & AI Agents) */}
              {userDAOs.filter(d => d.creator === wallet.address).map((d) => (
                <div key={d.contractAddress} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-white">{d.name} DAO ({d.symbol})</span>
                      <span className="block text-[9px] font-mono text-zinc-500">Governance · {d.contractAddress.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-mono text-white">{d.memberCount} Members</span>
                    <span className="block text-[9px] text-zinc-500 font-mono">Treasury: {d.treasuryBalanceEth} ETH</span>
                  </div>
                </div>
              ))}

              {userAgents.filter(a => a.creator === wallet.address).map((a) => (
                <div key={a.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback src={a.avatarUrl} alt={a.name} fallbackText={a.symbol} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <span className="block text-xs font-semibold text-white">{a.name} ({a.symbol})</span>
                      <span className="block text-[9px] font-mono text-zinc-500">Autonomous Agent · SENT_CORE</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-mono text-brand-purple">{a.queryCount} Queries Executed</span>
                    <span className="block text-[9px] text-zinc-500 font-mono">Revenue: {a.lifetimeRevenueEth.toFixed(3)} ETH</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wallet holdings grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tokens Portfolios holdings */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/20">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-brand-purple" /> Token Assets
              </h3>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                <div className="flex justify-between items-center p-2.5 bg-black/30 rounded-xl border border-white/5 text-xs">
                  <span className="font-bold text-white font-mono font-display">AGL Token</span>
                  <span className="font-mono text-zinc-300">{wallet.aglTokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} AGL</span>
                </div>
                {userTokens.filter(t => t.symbol !== "AGL").map(t => {
                  const bal = tokenBalances[t.address.toLowerCase()] || 0;
                  const isPreset = t.symbol === "CHAD" || t.symbol === "BAIC";
                  if (!isPreset && bal <= 0) return null;
                  return (
                    <div key={t.address} className="flex justify-between items-center p-2.5 bg-black/30 rounded-xl border border-white/5 text-xs">
                      <div className="flex items-center gap-1.5">
                        {t.logoUrl && <ImageWithFallback src={t.logoUrl} alt={t.symbol} fallbackText={t.symbol} className="w-4 h-4 rounded-full object-cover" />}
                        <span className="font-bold text-white font-mono">{t.symbol}</span>
                      </div>
                      <span className="font-mono text-zinc-300">{bal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t.symbol}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NFTs Portfolios holdings */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/20">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                <Disc className="w-4 h-4 text-brand-blue" /> Minted NFTs
              </h3>
              {userNFTs.reduce((sum, n) => sum + n.items.length, 0) === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/5 rounded-xl">
                  <p className="text-[10px] text-zinc-500">No NFTs in your vault.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userNFTs.map(n => n.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2.5 p-2 bg-black/30 rounded-xl border border-white/5 text-xs">
                      <ImageWithFallback src={item.imageUrl} alt={item.name} fallbackText={n.name} className="w-7 h-7 rounded object-cover" />
                      <div>
                        <span className="block font-bold text-white">{item.name}</span>
                        <span className="block text-[8px] text-zinc-500 font-mono">{n.name} · #{item.id}</span>
                      </div>
                    </div>
                  )))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Platform activity logs */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6 bg-zinc-900/20 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-brand-purple" /> Global Activity Stream
            </h3>
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {(localActivities.length > 0 ? localActivities : initialActivities).slice(0, 6).map((act) => (
                <div key={act.id} className="text-xs border-b border-white/5 pb-3">
                  <div className="flex items-center justify-between mb-1 font-mono text-[9px] text-zinc-500">
                    <span className="uppercase text-brand-purple font-bold">{act.type}</span>
                    <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-zinc-200 leading-normal">{act.details}</p>
                  <span className="block text-[9px] font-mono text-zinc-600 truncate mt-1">User: {act.user}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 mt-4 text-center">
            <button 
              id="dash-view-analytics"
              onClick={() => onSelectTab("analytics")}
              className="text-[10px] font-mono text-brand-blue hover:text-white font-bold transition-all"
            >
              Analyze Base Statistics →
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Paginated Transaction History Ledger */}
      <TransactionHistoryTable 
        activities={localActivities.length > 0 ? localActivities : initialActivities} 
        onRefresh={handleRefreshActivities}
      />

      <TaskSummaryWidget onNavigateToTasks={() => onSelectTab("task-sync")} />
    </div>
  );
}
