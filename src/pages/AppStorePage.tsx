import React, { useState, useMemo } from "react";
import { 
  Compass, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Plus, 
  Search, 
  CheckCircle2, 
  Users, 
  Activity, 
  TrendingUp, 
  Globe, 
  Code2, 
  X,
  Image as ImageIcon
} from "lucide-react";
import { PublishedApp, AppCategory } from "../types/ecosystem";
import { EcosystemService } from "../lib/ecosystemService";
import { WalletState } from "../types";

interface AppStorePageProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  onSelectTab: (tab: string) => void;
  onNavigateToBuilder?: (address: string) => void;
}

const CATEGORIES: Array<{ id: "all" | AppCategory; label: string }> = [
  { id: "all", label: "All Categories" },
  { id: "DeFi & Yield", label: "DeFi & Yield" },
  { id: "AI & Autonomous Agents", label: "AI & Agents" },
  { id: "Gaming & Metaverse", label: "Gaming & PvP" },
  { id: "NFTs & Collectibles", label: "NFTs" },
  { id: "DAO & Governance", label: "DAOs & Gov" },
  { id: "Developer Tooling", label: "Dev Tools" },
  { id: "Infrastructure", label: "Infrastructure" }
];

export default function AppStorePage({
  wallet,
  showToast,
  addTerminalLog,
  onSelectTab,
  onNavigateToBuilder
}: AppStorePageProps) {
  const [apps, setApps] = useState<PublishedApp[]>(() => EcosystemService.getPublishedApps());
  const [selectedCategory, setSelectedCategory] = useState<"all" | AppCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<PublishedApp | null>(null);

  // Submit App Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    category: "DeFi & Yield" as AppCategory,
    logoUrl: "",
    screenshots: "",
    developerName: "",
    launchUrl: "",
    contractAddresses: "",
    baseNetwork: "Base Mainnet" as "Base Mainnet" | "Base Sepolia",
    version: "1.0.0"
  });

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      if (selectedCategory !== "all" && app.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = app.name.toLowerCase().includes(q);
        const inDesc = app.description.toLowerCase().includes(q);
        const inDev = app.developerName.toLowerCase().includes(q);
        if (!inName && !inDesc && !inDev) return false;
      }
      return true;
    });
  }, [apps, selectedCategory, searchQuery]);

  const handleSubmitApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.launchUrl.trim()) {
      showToast("App Name and Launch URL are required", "error");
      return;
    }

    const contractsList = form.contractAddresses
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(c => {
        const parts = c.split(":");
        const label = parts.length > 1 ? parts[0].trim() : "Main Contract";
        const address = parts.length > 1 ? parts[1].trim() : parts[0].trim();
        return {
          label,
          address,
          explorerUrl: `https://basescan.org/address/${address}`
        };
      });

    const screenshotsList = form.screenshots
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    const devAddr = wallet.address || "0x725615639B760DAa64b3e794AA49B5A9a8A7632E";
    const newApp = EcosystemService.publishApp({
      name: form.name,
      tagline: form.tagline,
      description: form.description,
      category: form.category,
      logoUrl: form.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
      screenshots: screenshotsList.length > 0 ? screenshotsList : ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"],
      developerAddress: devAddr,
      developerName: form.developerName || (wallet.address ? `${wallet.address.slice(0, 6)}...` : "Ecosystem Builder"),
      launchUrl: form.launchUrl,
      contractAddresses: contractsList,
      baseNetwork: form.baseNetwork,
      verificationStatus: "community_verified",
      isSeedOrDemo: false,
      totalTransactions: 1,
      uniqueUsersCount: 1,
      tvlEth: 0,
      builtWithAglBadge: true,
      version: form.version
    });

    setApps(EcosystemService.getPublishedApps());
    setIsSubmitModalOpen(false);
    showToast(`Published "${newApp.name}" to the AGL App Store!`, "success");
    addTerminalLog?.("success", `APP_STORE: "${newApp.name}" is now listed in the ecosystem directory.`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-blue-950/20 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-medium">
              <Compass className="w-3.5 h-3.5" />
              <span>Agunnaya Ecosystem Directory</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white">
              AGL App Store
            </h1>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              Explore live applications, games, DAOs, and autonomous agents deployed on Base Mainnet using AGL Studio.
            </p>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-xs font-display flex items-center gap-2 shadow-lg shadow-brand-blue/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Submit App to Directory</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20 border border-brand-blue font-bold"
                  : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search published applications by name, category, or developer..."
          className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-blue font-mono"
        />
      </div>

      {/* App Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map(app => (
          <div
            key={app.id}
            className="glass-panel rounded-2xl border border-white/5 bg-zinc-900/40 hover:border-brand-blue/40 transition-all overflow-hidden flex flex-col justify-between group hover:shadow-xl hover:shadow-brand-blue/5"
          >
            <div>
              {/* Screenshot Banner */}
              <div className="relative h-44 bg-zinc-950 overflow-hidden">
                {app.screenshots && app.screenshots.length > 0 ? (
                  <img
                    src={app.screenshots[0]}
                    alt={app.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                
                {/* Badges on screenshot */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/70 backdrop-blur-sm border border-white/10 text-white">
                    {app.category}
                  </span>
                  {app.builtWithAglBadge && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-brand-purple/80 backdrop-blur-sm text-white">
                      Built with AGL
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/80 backdrop-blur-sm text-white">
                    {app.baseNetwork}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white group-hover:text-brand-blue transition-colors font-display line-clamp-1">
                    {app.name}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">v{app.version}</span>
                </div>
                
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {app.tagline || app.description}
                </p>

                <div className="pt-2 text-xs font-mono text-zinc-500 flex items-center gap-2">
                  <span>By:</span>
                  <button 
                    onClick={() => onNavigateToBuilder ? onNavigateToBuilder(app.developerAddress) : onSelectTab("builder-profile")}
                    className="text-zinc-300 hover:text-white underline cursor-pointer truncate max-w-[150px]"
                  >
                    {app.developerName}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer metrics & action */}
            <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-white/5 text-xs font-mono">
              <div className="flex items-center gap-3 text-zinc-400">
                {app.uniqueUsersCount && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{app.uniqueUsersCount} users</span>
                  </span>
                )}
                {app.tvlEth ? (
                  <span className="text-emerald-400">
                    {app.tvlEth} ETH TVL
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedApp(app)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  Details
                </button>
                <a
                  href={app.launchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold text-xs font-display flex items-center gap-1 shadow-md shadow-brand-blue/20 transition-all"
                >
                  <span>Launch</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* APP DETAILS MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-blue/20 text-brand-blue font-bold">
                    {selectedApp.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    {selectedApp.baseNetwork}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">v{selectedApp.version}</span>
                </div>
                <h2 className="text-xl font-bold font-display text-white">{selectedApp.name}</h2>
                <p className="text-xs text-zinc-400 mt-1">{selectedApp.tagline}</p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Screenshots */}
            {selectedApp.screenshots && selectedApp.screenshots.length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-white/10 h-64 bg-zinc-900">
                <img
                  src={selectedApp.screenshots[0]}
                  alt={selectedApp.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Full description */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">About Application</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">{selectedApp.description}</p>
            </div>

            {/* Verified Contract Addresses on Base */}
            {selectedApp.contractAddresses && selectedApp.contractAddresses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-brand-purple" />
                  <span>Verified On-Chain Contracts (Base Mainnet)</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedApp.contractAddresses.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 text-xs font-mono">
                      <span className="text-zinc-400 font-semibold">{c.label}</span>
                      <a
                        href={c.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-purple hover:underline flex items-center gap-1"
                      >
                        <span>{c.address.slice(0, 10)}...{c.address.slice(-6)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
              >
                Close
              </button>
              <a
                href={selectedApp.launchUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold text-xs font-display flex items-center gap-2 shadow-lg shadow-brand-blue/20"
              >
                <span>Open Application</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT APP MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold font-display text-white">Submit App to AGL App Store</h3>
                <p className="text-xs text-zinc-400 mt-0.5">List your completed Base application in the official ecosystem directory.</p>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitApp} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">App Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Base Cyber Arena"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono cursor-pointer"
                  >
                    <option value="DeFi & Yield">DeFi & Yield</option>
                    <option value="AI & Autonomous Agents">AI & Autonomous Agents</option>
                    <option value="Gaming & Metaverse">Gaming & Metaverse</option>
                    <option value="NFTs & Collectibles">NFTs & Collectibles</option>
                    <option value="DAO & Governance">DAO & Governance</option>
                    <option value="Developer Tooling">Developer Tooling</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Network *</label>
                  <select
                    value={form.baseNetwork}
                    onChange={(e) => setForm({ ...form, baseNetwork: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono cursor-pointer"
                  >
                    <option value="Base Mainnet">Base Mainnet</option>
                    <option value="Base Sepolia">Base Sepolia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Tagline *</label>
                <input
                  type="text"
                  required
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. Arcade PvP battle game with verifiable VRF on Base"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Launch URL *</label>
                <input
                  type="url"
                  required
                  value={form.launchUrl}
                  onChange={(e) => setForm({ ...form, launchUrl: e.target.value })}
                  placeholder="https://yourapp.xyz"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description of features, token utility, and user value..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Contract Addresses on Base (One per line, format: Label:Address)</label>
                <textarea
                  rows={2}
                  value={form.contractAddresses}
                  onChange={(e) => setForm({ ...form, contractAddresses: e.target.value })}
                  placeholder="Token:0xEA1221b4d80a89bd8c75248fae7c176bd1854698"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold text-xs font-display shadow-lg shadow-brand-blue/20 cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
