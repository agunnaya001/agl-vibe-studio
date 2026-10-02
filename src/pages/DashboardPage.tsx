import { WalletState, Token, NFTCollection, DAO, GameFiProject, AIAgent, Activity } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import ImageWithFallback from "../components/ImageWithFallback";
import TransactionHistoryTable from "../components/TransactionHistoryTable";
import ActivityFeed from "../components/ActivityFeed";
import { useState, useMemo } from "react";
import TaskSummaryWidget from "../components/TaskSummaryWidget";
import DailyMissionsWidget from "../components/DailyMissionsWidget";
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
  Filter,
  ExternalLink
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
  const [accountSubTab, setAccountSubTab] = useState<"overview" | "deployments" | "agents_apps" | "governance" | "activity">("overview");

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
      {/* Unified AGL Account Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple font-bold">
              UNIFIED AGL ACCOUNT
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {wallet.address ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}` : "Base Mainnet"}
            </span>
          </div>
          <h2 className="text-lg font-bold font-display text-white">Developer Hub & Ecosystem Assets</h2>
        </div>

        {/* Sub-nav buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono overflow-x-auto scrollbar-none">
          <button
            onClick={() => setAccountSubTab("overview")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              accountSubTab === "overview"
                ? "bg-brand-purple text-white font-bold shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Overview & Wallet
          </button>
          <button
            onClick={() => setAccountSubTab("deployments")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              accountSubTab === "deployments"
                ? "bg-brand-purple text-white font-bold shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Deployments ({myCreatedProjectsCount})
          </button>
          <button
            onClick={() => setAccountSubTab("agents_apps")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              accountSubTab === "agents_apps"
                ? "bg-brand-purple text-white font-bold shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Agents & Apps
          </button>
          <button
            onClick={() => setAccountSubTab("governance")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              accountSubTab === "governance"
                ? "bg-brand-purple text-white font-bold shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Governance
          </button>
          <button
            onClick={() => setAccountSubTab("activity")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              accountSubTab === "activity"
                ? "bg-brand-purple text-white font-bold shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Ledger & Tasks
          </button>
        </div>
      </div>

      {/* Conditional Rendering based on accountSubTab */}
      {accountSubTab === "overview" && (
        <>
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
              <span>Wallet connected · live address</span>
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

      {/* Daily Missions & Bonus Credits Progress Tracker */}
      <DailyMissionsWidget 
        userAddress={wallet.address} 
        onNavigateTab={onSelectTab}
        onRewardClaimed={handleRefreshActivities}
      />

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

        {/* Recent Platform activity logs from Firestore */}
        <ActivityFeed onViewAll={() => onSelectTab("analytics")} />
      </div>

      {/* Detailed Paginated Transaction History Ledger */}
      <TransactionHistoryTable 
        activities={localActivities.length > 0 ? localActivities : initialActivities} 
        onRefresh={handleRefreshActivities}
      />

      <TaskSummaryWidget onNavigateToTasks={() => onSelectTab("task-sync")} />
        </>
      )}

      {accountSubTab === "deployments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-bold font-display text-white">Your Deployed Contracts & Assets</h3>
              <p className="text-xs text-zinc-400">Tokens, bonding curve contracts, and DAOs deployed with your wallet.</p>
            </div>
            <button
              onClick={() => onSelectTab("token-factory")}
              className="px-4 py-2 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-semibold text-xs font-display flex items-center gap-1.5 transition-all cursor-pointer"
            >
              + Launch New Token
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTokens.filter(t => t.creator.toLowerCase() === wallet.address.toLowerCase()).map(t => (
              <div key={t.address} className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ImageWithFallback src={t.logoUrl} alt={t.name} fallbackText={t.symbol} className="w-8 h-8 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-white font-display">{t.name}</h4>
                      <span className="text-[10px] font-mono text-zinc-400">${t.symbol}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400">
                    Deployed
                  </span>
                </div>

                <div className="pt-2 border-t border-white/5 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Supply:</span>
                    <span className="text-white font-bold">{t.supply.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Reserve:</span>
                    <span className="text-emerald-400 font-bold">{t.reserveEth.toFixed(3)} ETH</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs font-mono">
                  <a
                    href={`https://basescan.org/address/${t.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-purple hover:underline flex items-center gap-1"
                  >
                    <span>{t.address.slice(0, 8)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => onSelectTab("explore")}
                    className="text-zinc-300 hover:text-white underline cursor-pointer"
                  >
                    Trade Curve
                  </button>
                </div>
              </div>
            ))}

            {userTokens.filter(t => t.creator.toLowerCase() === wallet.address.toLowerCase()).length === 0 && (
              <div className="col-span-full py-12 text-center bg-zinc-900/20 border border-dashed border-white/10 rounded-2xl p-6">
                <Coins className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white font-display">No tokens deployed yet</h4>
                <p className="text-xs text-zinc-400 mt-1">Deploy your first bonding curve token or ERC-20 on Base Mainnet.</p>
                <button
                  onClick={() => onSelectTab("token-factory")}
                  className="mt-3 px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-semibold cursor-pointer"
                >
                  Deploy First Token
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {accountSubTab === "agents_apps" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-bold font-display text-white">Your Specialized Agents & Published Apps</h3>
              <p className="text-xs text-zinc-400">Autonomous agents and completed applications you have published to the ecosystem.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTab("agent-economy")}
                className="px-3.5 py-2 rounded-xl bg-brand-purple text-white text-xs font-semibold cursor-pointer"
              >
                + New Agent
              </button>
              <button
                onClick={() => onSelectTab("app-store")}
                className="px-3.5 py-2 rounded-xl bg-brand-blue text-white text-xs font-semibold cursor-pointer"
              >
                + Publish App
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-3">
              <h4 className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-brand-purple" />
                <span>Specialized Autonomous Agents</span>
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deploy and configure specialized agents with modular tools, credit pricing, and zero silent transaction permissions.
              </p>
              <button
                onClick={() => onSelectTab("agent-economy")}
                className="text-xs font-mono text-brand-purple hover:underline flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>Manage Autonomous Fleet in Agent Economy</span>
                <ArrowUpDown className="w-3 h-3 rotate-90" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-3">
              <h4 className="text-xs font-bold font-mono text-white uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-blue" />
                <span>Published Apps in App Store</span>
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Discover your published applications in the ecosystem directory, view live user metrics, and embed the "Built with AGL" badge.
              </p>
              <button
                onClick={() => onSelectTab("app-store")}
                className="text-xs font-mono text-brand-blue hover:underline flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>View AGL App Store Listings</span>
                <ArrowUpDown className="w-3 h-3 rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      {accountSubTab === "governance" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-bold font-display text-white">DAO Governance & Voting Records</h3>
              <p className="text-xs text-zinc-400">Timelocked protocol voting power and community proposal history.</p>
            </div>
            <button
              onClick={() => onSelectTab("governance")}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-display flex items-center gap-1.5 transition-all cursor-pointer"
            >
              Open DAO Governance Hub
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-500 block uppercase">Voting Token (wAGL)</span>
              <span className="text-sm font-bold text-white block">1 wAGL = 1 Vote</span>
              <span className="text-[10px] text-zinc-500">ERC-20 IVotes Snapshot</span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-500 block uppercase">Timelock Controller</span>
              <span className="text-sm font-bold text-emerald-400 block">48 Hours Delay</span>
              <span className="text-[10px] text-zinc-500">Autonomous execution</span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-500 block uppercase">Venture Grants Hub</span>
              <span className="text-sm font-bold text-brand-purple block">Active Cohorts</span>
              <button
                onClick={() => onSelectTab("bounties")}
                className="text-[10px] text-brand-purple hover:underline"
              >
                View Protocol Grants
              </button>
            </div>
          </div>
        </div>
      )}

      {accountSubTab === "activity" && (
        <div className="space-y-6">
          <TransactionHistoryTable 
            activities={localActivities.length > 0 ? localActivities : initialActivities} 
            onRefresh={handleRefreshActivities}
          />
          <TaskSummaryWidget onNavigateToTasks={() => onSelectTab("task-sync")} />
        </div>
      )}
    </div>
  );
}
