import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Token, PriceAlert } from "../types";
import { TrendingUp, BarChart4, DollarSign, Wallet2, Award, ArrowUpRight, Bell, Trash, ExternalLink } from "lucide-react";
import ImageWithFallback from "../components/ImageWithFallback";

interface AnalyticsPageProps {
  tokens: Token[];
  onSelectToken: (token: Token) => void;
  priceAlerts: PriceAlert[];
  onDeletePriceAlert: (id: string) => void;
}

export default function AnalyticsPage({ tokens, onSelectToken, priceAlerts, onDeletePriceAlert }: AnalyticsPageProps) {
  // Chart seed data
  const volumeHistory = [
    { name: "Mon", Volume: 12.4, TVL: 45.2, Fees: 0.12 },
    { name: "Tue", Volume: 15.8, TVL: 45.8, Fees: 0.15 },
    { name: "Wed", Volume: 11.2, TVL: 46.1, Fees: 0.11 },
    { name: "Thu", Volume: 18.9, TVL: 47.4, Fees: 0.18 },
    { name: "Fri", Volume: 24.5, TVL: 48.9, Fees: 0.24 },
    { name: "Sat", Volume: 32.1, TVL: 51.2, Fees: 0.32 },
    { name: "Sun", Volume: 28.4, TVL: 52.4, Fees: 0.28 }
  ];

  const sortedByMcap = [...tokens].sort((a, b) => b.marketCap - a.marketCap).slice(0, 5);

  return (
    <div id="analytics-suite-root" className="space-y-6 animate-fade-in">
      
      {/* Visual statistics grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-xl border border-white/5 bg-zinc-900/40 relative">
          <span className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Cumulative Swaps Volume</span>
          <span className="block text-xl font-mono font-bold text-white tracking-tight">173.3 ETH</span>
          <span className="text-[10px] text-emerald-400 font-mono mt-1 block flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +15.4% (24h)
          </span>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-white/5 bg-zinc-900/40 relative">
          <span className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Total Fee Share Collected</span>
          <span className="block text-xl font-mono font-bold text-white tracking-tight">1.733 ETH</span>
          <span className="text-[10px] text-zinc-500 font-mono mt-1 block">1% flat linear curve fee</span>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-white/5 bg-zinc-900/40 relative">
          <span className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Locked reserves TVL</span>
          <span className="block text-xl font-mono font-bold text-white tracking-tight">28.42 ETH</span>
          <span className="text-[10px] text-emerald-400 font-mono mt-1 block flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +8.2% (24h)
          </span>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-white/5 bg-zinc-900/40 relative">
          <span className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Ecosystem Transactions</span>
          <span className="block text-xl font-mono font-bold text-white tracking-tight">8,142 TXS</span>
          <span className="text-[10px] text-brand-purple font-mono mt-1 block font-bold uppercase">Base Sepolia L2 active</span>
        </div>
      </div>

      {/* Main double charting splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cumulative area chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
          <div>
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-brand-purple" />
              Volume Trajectory History
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono block">Weekly ETH volume traded in bonding curves</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeHistory}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }} />
                <Area type="monotone" dataKey="Volume" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVol)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protocol fees bar chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
          <div>
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
              <BarChart4 className="w-4 h-4 text-brand-blue" />
              Fee Allocations Distribution
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono block">Daily protocol earnings from linear curves</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }} />
                <Bar dataKey="Fees" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Performing Token Table list */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
        <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
          <Award className="w-4 h-4 text-brand-purple" />
          Top 5 Performing Bonding Curves
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500">
                <th className="pb-3 pl-2">Rank</th>
                <th className="pb-3">Asset</th>
                <th className="pb-3">Spot Price</th>
                <th className="pb-3">Market Valuation</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedByMcap.map((token, index) => (
                <tr key={token.address} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="py-4 pl-2 font-bold text-brand-purple">#{index + 1}</td>
                  <td className="py-4 font-sans font-bold flex items-center gap-2">
                    <ImageWithFallback src={token.logoUrl} alt={token.name} fallbackText={token.symbol} className="w-6 h-6 rounded-lg object-cover border border-white/5" />
                    <div>
                      <span className="block text-white text-xs leading-none">{token.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{token.symbol}</span>
                    </div>
                  </td>
                  <td className="py-4 text-zinc-300">{(token.currentPrice * 1000000).toFixed(3)} μETH</td>
                  <td className="py-4 text-emerald-400 font-bold">{token.marketCap.toFixed(3)} ETH</td>
                  <td className="py-4 text-right pr-2">
                    <button
                      id={`analytic-trade-trigger-${token.address}`}
                      onClick={() => onSelectToken(token)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-brand-purple text-zinc-300 hover:text-white rounded text-[10px] font-bold transition-all"
                    >
                      Trade →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GLOBAL PRICE ALERTS MANAGEMENT PANEL */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-brand-purple" />
            Global Price Alerts Dashboard
          </h3>
          <span className="text-[10px] font-mono text-zinc-500 font-semibold">
            Manage your real-time spot alerts across all launchpad tokens
          </span>
        </div>

        {(!priceAlerts || priceAlerts.length === 0) ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-white/5 bg-zinc-950/20 text-zinc-500 text-xs">
            <p className="font-semibold">No Price Alerts Configured</p>
            <p className="text-[10px] text-zinc-600 mt-1">Visit any bonding curve trading terminal to configure custom notifications.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {priceAlerts.map((alert) => {
              const matchedToken = tokens.find(t => t.address.toLowerCase() === alert.tokenAddress.toLowerCase());
              return (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-xl border transition-all ${
                    alert.status === "triggered" 
                      ? "bg-emerald-500/5 border-emerald-500/10" 
                      : "bg-zinc-950/40 border-white/5 hover:border-brand-purple/20"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {matchedToken ? (
                        <ImageWithFallback src={matchedToken.logoUrl} alt={alert.tokenSymbol} fallbackText={alert.tokenSymbol} className="w-8 h-8 rounded-lg object-cover border border-white/5" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs">{alert.tokenSymbol}</div>
                      )}
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-white text-xs font-sans font-bold leading-none">{matchedToken ? matchedToken.name : alert.tokenSymbol}</span>
                          <span className="text-[8px] font-mono font-bold bg-zinc-800 text-zinc-400 px-1 py-0.2 rounded">{alert.tokenSymbol}</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-mono block mt-0.5 truncate max-w-[120px]">
                          {alert.tokenAddress.slice(0, 6)}...{alert.tokenAddress.slice(-4)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {matchedToken && (
                        <button
                          type="button"
                          onClick={() => onSelectToken(matchedToken)}
                          className="p-1.5 rounded-md bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                          title="Open Swaps Terminal"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeletePriceAlert(alert.id)}
                        className="p-1.5 rounded-md bg-zinc-900 border border-white/5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-800 transition-all"
                        title="Delete Alert"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                    <div className="font-mono text-[10px]">
                      <span className="block text-[8px] text-zinc-500 uppercase font-semibold">Target Price</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[8px] font-bold px-1 rounded uppercase ${
                          alert.condition === "above" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {alert.condition === "above" ? "Above ↑" : "Below ↓"}
                        </span>
                        <span className="text-white font-bold">{(alert.targetPrice * 1000000).toFixed(3)} μETH</span>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[10px]">
                      <span className="block text-[8px] text-zinc-500 uppercase font-semibold">Status</span>
                      {alert.status === "triggered" ? (
                        <div className="mt-0.5">
                          <span className="text-emerald-400 font-bold flex items-center justify-end gap-1 text-[9px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Triggered
                          </span>
                          <span className="text-[8px] text-zinc-500 block mt-0.2">
                            {new Date(alert.triggeredAt || alert.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-0.5">
                          <span className="text-brand-blue font-bold flex items-center justify-end gap-1 text-[9px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue inline-block animate-pulse" /> Active
                          </span>
                          {matchedToken && (
                            <span className="text-[8px] text-zinc-500 block mt-0.2">
                              Spot: {(matchedToken.currentPrice * 1000000).toFixed(3)} μ
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
