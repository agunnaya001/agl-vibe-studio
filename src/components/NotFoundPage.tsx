import React, { useState } from "react";
import { 
  Compass, 
  Home, 
  Sparkles, 
  Rocket, 
  Search, 
  ArrowLeft, 
  Database, 
  BarChart3, 
  ShieldAlert,
  Bot,
  Landmark,
  Coins
} from "lucide-react";

interface NotFoundPageProps {
  requestedTab?: string;
  onNavigate: (tab: string) => void;
}

export default function NotFoundPage({ requestedTab, onNavigate }: NotFoundPageProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const suggestedPages = [
    { id: "dashboard", name: "My Studio Hub", description: "Personal activity, balances & deployed assets", icon: Home, category: "Workspace" },
    { id: "explore", name: "Bonding Curve Pad", description: "Discover & trade meme/utility tokens", icon: Rocket, category: "Trading" },
    { id: "ai-builder", name: "AI Smart Contract Studio", description: "Generate & deploy custom Solidity contracts", icon: Sparkles, category: "Creation" },
    { id: "token-factory", name: "Token Factory (Base)", description: "Launch standard & taxable ERC-20 tokens", icon: Database, category: "Creation" },
    { id: "staking-vault", name: "Automated Staking Vaults", description: "Deposit tokens to earn high APY yield", icon: Landmark, category: "DeFi" },
    { id: "ai-agents", name: "AI Agent Studio", description: "Deploy sovereign autonomous agents", icon: Bot, category: "Creation" },
    { id: "analytics", name: "Base Mainnet Analytics", description: "Track gas prices, TVL & bonding curves", icon: BarChart3, category: "DeFi" },
    { id: "defi", name: "Staking & Swaps", description: "Instant DEX swaps & yield pools", icon: Coins, category: "DeFi" },
  ];

  const filteredPages = suggestedPages.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="not-found-page-container" className="py-8 px-4 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* 404 Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-white/10 p-8 md:p-12 text-center shadow-2xl">
        {/* Glowing Background Radial */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-purple/20 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold tracking-widest uppercase shadow-inner">
            <ShieldAlert className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>404 • Page or Tab Not Found</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            Lost in the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-brand-purple to-pink-500">Decentralized Metaverse</span>?
          </h1>

          <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-sans">
            {requestedTab ? (
              <>
                The requested tab <code className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-200 font-mono text-xs">"{requestedTab}"</code> does not exist or may have been renamed in Agunnaya Studio.
              </>
            ) : (
              "The requested address or studio route was not found. Don't worry, your wallet state and assets are safe."
            )}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="return-home-404-btn"
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="px-6 py-3 rounded-2xl bg-brand-purple hover:bg-purple-600 text-white font-bold text-xs md:text-sm transition-all shadow-lg shadow-brand-purple/30 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>

            <button
              id="explore-tokens-404-btn"
              type="button"
              onClick={() => onNavigate("explore")}
              className="px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-200 hover:text-white font-semibold text-xs md:text-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Explore Bonding Curves</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Search & Quick Navigation Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-purple" />
              <span>Suggested Destinations</span>
            </h2>
            <p className="text-xs text-zinc-400">Jump directly to a verified studio tool or workspace</p>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search studio modules..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple/60 focus:ring-1 focus:ring-brand-purple/40 transition-all"
            />
          </div>
        </div>

        {/* Grid of Pages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredPages.map((page) => {
            const Icon = page.icon;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onNavigate(page.id)}
                className="p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-brand-purple/40 text-left transition-all duration-200 group flex flex-col justify-between space-y-3 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-brand-purple/5"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20 group-hover:scale-110 group-hover:bg-brand-purple group-hover:text-white transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                    {page.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <span>{page.name}</span>
                    <ArrowLeft className="w-3 h-3 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                  </h3>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-1 font-sans line-clamp-2">
                    {page.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {filteredPages.length === 0 && (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono bg-zinc-950/50 rounded-2xl border border-white/5">
            No matching studio modules found for "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
}
