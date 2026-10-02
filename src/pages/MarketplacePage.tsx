import React, { useState, useMemo } from "react";
import { 
  Store, 
  Search, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink, 
  Zap, 
  Bot, 
  Code2, 
  Cpu, 
  Gamepad2, 
  Wrench, 
  Layers, 
  Plus, 
  CheckCircle2, 
  Flame, 
  Tag, 
  Clock, 
  Star, 
  User, 
  ArrowUpRight, 
  AlertCircle, 
  Download,
  Info,
  X
} from "lucide-react";
import { MarketplaceItem, MarketplaceCategory, VerificationStatus } from "../types/ecosystem";
import { EcosystemService } from "../lib/ecosystemService";
import { WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { AGL_CREDITS_ADDRESS } from "../lib/aglContracts";

interface MarketplacePageProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  onSelectTab: (tab: string) => void;
  onNavigateToBuilder?: (address: string) => void;
}

const CATEGORY_TABS: Array<{ id: "all" | MarketplaceCategory; label: string; icon: any }> = [
  { id: "all", label: "All Items", icon: Store },
  { id: "ai_agents", label: "AI Agents", icon: Bot },
  { id: "web3_agents", label: "Web3 Agents", icon: Cpu },
  { id: "smart_contracts", label: "Smart Contracts", icon: Code2 },
  { id: "dapps", label: "dApps", icon: Zap },
  { id: "developer_tools", label: "Dev Tools", icon: Wrench },
  { id: "game_modules", label: "Game Modules", icon: Gamepad2 },
  { id: "plugins", label: "Plugins", icon: Layers },
  { id: "workflows", label: "Workflows", icon: Sparkles },
  { id: "components", label: "Components", icon: Tag },
];

export default function MarketplacePage({
  wallet,
  showToast,
  addTerminalLog,
  onSelectTab,
  onNavigateToBuilder
}: MarketplacePageProps) {
  const [items, setItems] = useState<MarketplaceItem[]>(() => EcosystemService.getMarketplaceItems());
  const [selectedCategory, setSelectedCategory] = useState<"all" | MarketplaceCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified_only">("all");
  const [dataSourceFilter, setDataSourceFilter] = useState<"all" | "live_only" | "demo_only">("all");

  // Selected item modal state
  const [activeItem, setActiveItem] = useState<MarketplaceItem | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Publish Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishForm, setPublishForm] = useState({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    category: "ai_agents" as MarketplaceCategory,
    creatorName: "",
    version: "1.0.0",
    creditsCost: 15,
    tags: "AI, Base, Tool",
    baseNetwork: "Base Mainnet" as "Base Mainnet" | "Base Sepolia",
    features: "Feature 1\nFeature 2",
    githubUrl: "",
    docsUrl: "",
    isSeedOrDemo: false
  });

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category match
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      
      // Verification match
      if (verificationFilter === "verified_only" && item.verificationStatus === "unverified") return false;

      // Data source match
      if (dataSourceFilter === "live_only" && item.isSeedOrDemo) return false;
      if (dataSourceFilter === "demo_only" && !item.isSeedOrDemo) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = item.name.toLowerCase().includes(q);
        const inDesc = item.description.toLowerCase().includes(q);
        const inTags = item.tags.some(t => t.toLowerCase().includes(q));
        const inCreator = item.creatorName.toLowerCase().includes(q);
        if (!inName && !inDesc && !inTags && !inCreator) return false;
      }

      return true;
    });
  }, [items, selectedCategory, verificationFilter, dataSourceFilter, searchQuery]);

  const handleLaunchItem = (item: MarketplaceItem) => {
    if (item.creditsCost > 0) {
      if (wallet.aglCredits < item.creditsCost) {
        showToast(`Insufficient AGL Credits (${wallet.aglCredits}/${item.creditsCost}). Burn AGL to recharge credits.`, "error");
        addTerminalLog?.("error", `MARKETPLACE_ERROR: Need ${item.creditsCost} AGL Credits. Current balance: ${wallet.aglCredits}.`);
        return;
      }
      
      // Deduct credits
      const currentWallet = AgunnayaDatabase.getWallet();
      currentWallet.aglCredits -= item.creditsCost;
      AgunnayaDatabase.saveWallet(currentWallet);
      
      addTerminalLog?.("system", `CREDITS_METER: Deducted ${item.creditsCost} AGL Credits for "${item.name}". Remaining: ${currentWallet.aglCredits}`);
    }

    setIsLaunching(true);
    addTerminalLog?.("info", `INITIALIZING_MODULE: Launching "${item.name}" (v${item.version}) on ${item.baseNetwork}...`);

    setTimeout(() => {
      setIsLaunching(false);
      showToast(`Successfully launched "${item.name}"!`, "success");
      addTerminalLog?.("success", `MODULE_ACTIVE: "${item.name}" running. Ready for integration.`);
      
      // Increment installs count
      const updated = items.map(i => i.id === item.id ? { ...i, installsCount: i.installsCount + 1 } : i);
      setItems(updated);
      EcosystemService.saveMarketplaceItems(updated);
    }, 1200);
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishForm.name.trim() || !publishForm.tagline.trim()) {
      showToast("Please provide item name and tagline", "error");
      return;
    }

    const creatorAddr = wallet.address || "0x725615639B760DAa64b3e794AA49B5A9a8A7632E";
    const newItem = EcosystemService.publishMarketplaceItem({
      name: publishForm.name,
      slug: publishForm.slug || publishForm.name.toLowerCase().replace(/\s+/g, "-"),
      tagline: publishForm.tagline,
      description: publishForm.description,
      category: publishForm.category,
      creatorAddress: creatorAddr,
      creatorName: publishForm.creatorName || (wallet.address ? `${wallet.address.slice(0, 6)}...` : "Community Builder"),
      version: publishForm.version,
      baseNetwork: publishForm.baseNetwork,
      creditsCost: Number(publishForm.creditsCost) || 0,
      tags: publishForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      verificationStatus: "community_verified",
      isSeedOrDemo: false, // Live user creation
      features: publishForm.features.split("\n").map(f => f.trim()).filter(Boolean),
      githubUrl: publishForm.githubUrl,
      docsUrl: publishForm.docsUrl
    });

    setItems(EcosystemService.getMarketplaceItems());
    setIsPublishModalOpen(false);
    showToast(`Published "${newItem.name}" to AGL Marketplace!`, "success");
    addTerminalLog?.("success", `MARKETPLACE_PUBLISH: Item "${newItem.name}" is now live on the AGL Ecosystem Hub.`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-purple-950/20 p-6 md:p-8">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-brand-purple/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute right-1/4 -bottom-8 w-48 h-48 bg-brand-blue/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-mono font-medium">
              <Store className="w-3.5 h-3.5" />
              <span>Agunnaya Labs Operating Layer</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white">
              AGL Marketplace & Discovery
            </h1>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              Discover, launch, and publish specialized AI agents, smart-contract templates, automated workflows, and Web3 tools on Base Mainnet. Metered via native AGL Credits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectTab("agl-credits")}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-medium text-zinc-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Credits: <strong className="text-white">{wallet.aglCredits}</strong></span>
            </button>
            <button
              onClick={() => setIsPublishModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue hover:from-purple-600 hover:to-blue-600 text-white font-semibold text-xs font-display flex items-center gap-2 shadow-lg shadow-brand-purple/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish to Marketplace</span>
            </button>
          </div>
        </div>

        {/* Live vs Seed data notification banner */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-zinc-300 font-mono">Transparency Layer Active</span>
            <span className="text-zinc-500">·</span>
            <span>Seed/demo listings are explicitly labeled with <span className="text-amber-400 font-mono font-semibold">DEMO SEED</span> badges to avoid misleading activity.</span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-zinc-500">Items Indexed:</span>
            <span className="text-white font-bold">{items.length}</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORY_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20 border border-brand-purple"
                  : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-900/40 border border-white/5 p-3 rounded-2xl">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents, templates, plugins, tools, or authors..."
            className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple transition-all font-mono"
          />
        </div>

        <div>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as any)}
            className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-brand-purple font-mono cursor-pointer"
          >
            <option value="all">All Verification Statuses</option>
            <option value="verified_only">Verified Only</option>
          </select>
        </div>

        <div>
          <select
            value={dataSourceFilter}
            onChange={(e) => setDataSourceFilter(e.target.value as any)}
            className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-brand-purple font-mono cursor-pointer"
          >
            <option value="all">Data Source: All Items</option>
            <option value="live_only">Live Production Only</option>
            <option value="demo_only">Demo / Seed Only</option>
          </select>
        </div>
      </div>

      {/* Grid of Listings */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/20 border border-white/5 rounded-2xl p-8 space-y-3">
          <Store className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold font-display text-white">No Marketplace Listings Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try adjusting your search criteria, category filters, or publish the first component in this category!
          </p>
          <button
            onClick={() => { setSelectedCategory("all"); setSearchQuery(""); setDataSourceFilter("all"); setVerificationFilter("all"); }}
            className="text-xs text-brand-purple hover:underline font-mono"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/30 hover:border-brand-purple/30 transition-all flex flex-col justify-between group hover:shadow-lg hover:shadow-brand-purple/5"
            >
              <div className="space-y-3">
                {/* Header: Badges & Version */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.verificationStatus === "verified_official" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" /> Official
                      </span>
                    )}
                    {item.verificationStatus === "community_verified" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400">
                        <CheckCircle2 className="w-3 h-3" /> Community
                      </span>
                    )}
                    {item.isSeedOrDemo ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        DEMO SEED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400">
                        LIVE
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-zinc-500">v{item.version}</span>
                </div>

                {/* Title & Tagline */}
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-brand-purple transition-colors font-display line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.tagline}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-950 border border-white/5 text-zinc-400">
                      #{tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 text-zinc-500">
                      +{item.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer info & Action button */}
              <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <User className="w-3 h-3 text-zinc-500" />
                    <button 
                      onClick={() => onNavigateToBuilder ? onNavigateToBuilder(item.creatorAddress) : onSelectTab("builder-profile")}
                      className="hover:text-white transition-colors truncate max-w-[120px] text-left underline-offset-2 hover:underline cursor-pointer"
                    >
                      {item.creatorName}
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{item.rating.toFixed(1)}</span>
                    <span className="text-zinc-500 text-[10px]">({item.reviewsCount})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-mono">Usage Cost</span>
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                      {item.creditsCost === 0 ? (
                        <strong className="text-emerald-400">Free</strong>
                      ) : (
                        <>
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.creditsCost} Credits</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handleLaunchItem(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-purple hover:bg-purple-600 text-white text-xs font-semibold font-display shadow-md shadow-brand-purple/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Use</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple font-semibold uppercase">
                    {activeItem.category.replace("_", " ")}
                  </span>
                  {activeItem.isSeedOrDemo ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                      DEMO SEED DATA
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      VERIFIED PRODUCTION
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 font-mono">v{activeItem.version}</span>
                </div>
                <h2 className="text-xl font-bold font-display text-white">{activeItem.name}</h2>
                <p className="text-xs text-zinc-400 mt-1">{activeItem.tagline}</p>
              </div>

              <button
                onClick={() => setActiveItem(null)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">Overview</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">{activeItem.description}</p>
            </div>

            {/* Features */}
            {activeItem.features && activeItem.features.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">Key Capabilities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeItem.features.map(f => (
                    <div key={f} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/40 border border-white/5 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats & Developer info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Active Users</span>
                <span className="text-sm font-bold font-mono text-white">{activeItem.activeUsersCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Total Installs</span>
                <span className="text-sm font-bold font-mono text-white">{activeItem.installsCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Network</span>
                <span className="text-xs font-bold font-mono text-brand-blue">{activeItem.baseNetwork}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Credits Per Call</span>
                <span className="text-sm font-bold font-mono text-amber-400">{activeItem.creditsCost} AGL</span>
              </div>
            </div>

            {/* Creator verification */}
            <div className="p-3 rounded-xl bg-zinc-900/20 border border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Creator Address:</span>
              <a
                href={`https://basescan.org/address/${activeItem.creatorAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-purple hover:underline flex items-center gap-1"
              >
                <span>{activeItem.creatorAddress.slice(0, 8)}...{activeItem.creatorAddress.slice(-6)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
              >
                Close
              </button>
              <button
                disabled={isLaunching}
                onClick={() => { handleLaunchItem(activeItem); setActiveItem(null); }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white font-semibold text-xs font-display flex items-center gap-2 shadow-lg shadow-brand-purple/20 hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isLaunching ? (
                  <span>Launching Module...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Launch with {activeItem.creditsCost} Credits</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH MODAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold font-display text-white">Publish to AGL Marketplace</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Share your AI agent, smart-contract template, or workflow with the ecosystem.</p>
              </div>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Listing Name *</label>
                <input
                  type="text"
                  required
                  value={publishForm.name}
                  onChange={(e) => setPublishForm({ ...publishForm, name: e.target.value })}
                  placeholder="e.g. Base Slippage Arbitrage Inspector"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Category *</label>
                  <select
                    value={publishForm.category}
                    onChange={(e) => setPublishForm({ ...publishForm, category: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple font-mono cursor-pointer"
                  >
                    <option value="ai_agents">AI Agents</option>
                    <option value="web3_agents">Web3 Agents</option>
                    <option value="smart_contracts">Smart Contract Templates</option>
                    <option value="dapps">dApps</option>
                    <option value="developer_tools">Developer Tools</option>
                    <option value="game_modules">Game Modules</option>
                    <option value="plugins">Plugins</option>
                    <option value="workflows">Workflows</option>
                    <option value="components">Studio Components</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Network *</label>
                  <select
                    value={publishForm.baseNetwork}
                    onChange={(e) => setPublishForm({ ...publishForm, baseNetwork: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple font-mono cursor-pointer"
                  >
                    <option value="Base Mainnet">Base Mainnet</option>
                    <option value="Base Sepolia">Base Sepolia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Tagline (One-Sentence Summary) *</label>
                <input
                  type="text"
                  required
                  value={publishForm.tagline}
                  onChange={(e) => setPublishForm({ ...publishForm, tagline: e.target.value })}
                  placeholder="e.g. Scans DEX liquidity pools and protects against sandwich attacks"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={publishForm.description}
                  onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                  placeholder="Detailed explanation of how this module or agent works..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Credits Cost per Use</label>
                  <input
                    type="number"
                    min="0"
                    value={publishForm.creditsCost}
                    onChange={(e) => setPublishForm({ ...publishForm, creditsCost: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">0 = Free public utility</span>
                </div>

                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Version</label>
                  <input
                    type="text"
                    value={publishForm.version}
                    onChange={(e) => setPublishForm({ ...publishForm, version: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={publishForm.tags}
                  onChange={(e) => setPublishForm({ ...publishForm, tags: e.target.value })}
                  placeholder="AI, Security, Solidity, DEX"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] text-zinc-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
                <span>Published listings are added to the live decentralized marketplace ledger and will reflect under your AGL Builder Identity.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-semibold text-xs font-display shadow-lg shadow-brand-purple/20 cursor-pointer"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
