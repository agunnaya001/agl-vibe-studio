import React, { useState, useEffect } from "react";
import agunnayaLogo from "../assets/images/agunnaya_studio_logo_1786991724715.jpg";
import { 
  LayoutDashboard, 
  Sparkles, 
  TrendingUp, 
  Disc, 
  Users, 
  Gamepad2, 
  Bot, 
  Coins, 
  BarChart3, 
  Settings,
  Layers,
  Rocket,
  Gift,
  HardDrive,
  Mail,
  Flame,
  Gauge,
  Database,
  Landmark,
  Clock,
  Send,
  Building2,
  Compass,
  FileSpreadsheet,
  Presentation,
  X,
  Search,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  CheckCircle2
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isAdmin: boolean;
  onGoHome?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenTour?: () => void;
}

export default function Sidebar({ 
  currentTab, 
  onSelectTab, 
  isAdmin, 
  onGoHome, 
  isOpen = false, 
  onClose,
  onOpenTour
}: SidebarProps) {
  // Touch Swipe to Close Gesture State
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  // Search & Mobile Layout View States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mobileTabFilter, setMobileTabFilter] = useState<"all" | "core" | "assets" | "defi">("all");
  const [mobileViewMode, setMobileViewMode] = useState<"simplified" | "all">("simplified");

  // Touch Swipe Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    // Only track leftward swipes (drag left to close)
    if (deltaX < 0) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    // If swiped more than 40px left, trigger close
    if (swipeOffset < -40 && onClose) {
      onClose();
    }
    setTouchStartX(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  // Lock body scrolling on mobile when open
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        document.body.style.overflow = "";
      } else if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const menuItems = [
    { id: "landing", label: "Studio Home", icon: Sparkles, category: "Welcome", description: "Welcome & Studio Overview" },
    { id: "pitch-deck", label: "Pitch Deck", icon: Presentation, category: "Welcome", highlight: true, description: "Investor Presentation & Deck Export" },
    { id: "dashboard", label: "My Hub", icon: LayoutDashboard, category: "Workspace", description: "Personal Activity & Assets" },
    { id: "task-sync", label: "TaskSync", icon: Clock, category: "Workspace", description: "Automated On-Chain Cron Tasks" },
    { id: "ai-builder", label: "AI Contract Builder", icon: Sparkles, category: "Workspace", highlight: true, description: "Prompt to Solidity Generator" },
    { id: "gdrive", label: "Google Drive Cloud", icon: HardDrive, category: "Workspace", description: "Cloud Backup & Restore" },
    { id: "gmail", label: "Gmail Automation", icon: Mail, category: "Workspace", description: "Automated Email Alerts" },
    { id: "google-forms", label: "Google Forms", icon: FileSpreadsheet, category: "Workspace", description: "DAO Polls & Community Forms" },
    { id: "explore", label: "Bonding Curve Pad", icon: Rocket, category: "Assets & Creation", description: "Linear Curve Token Pad" },
    { id: "token-factory", label: "Token Factory (Base)", icon: Database, category: "Assets & Creation", highlight: true, description: "Deploy ERC-20 Tokens" },
    { id: "nfts", label: "NFT Studio", icon: Disc, category: "Assets & Creation", description: "Collections & Mints" },
    { id: "daos", label: "DAO Governance", icon: Users, category: "Assets & Creation", highlight: true, description: "Proposals & Voting" },
    { id: "gamefi", label: "Arena Gaming & PvP Hub", icon: Gamepad2, category: "Assets & Creation", highlight: true, description: "Champion NFTs, Marketplace & PvP" },
    { id: "ai-agents", label: "AI Agent Studio", icon: Bot, category: "Assets & Creation", description: "Deploy AI Web3 Assistants" },
    { id: "defi", label: "Staking & Swaps", icon: Coins, category: "DeFi Tools", description: "DeFi Liquidity Swaps" },
    { id: "staking-vault", label: "Automated Staking Vaults", icon: Landmark, category: "DeFi Tools", highlight: true, description: "Earn Passive Staking Rewards" },
    { id: "token-burner", label: "ERC-20 Token Burner", icon: Flame, category: "DeFi Tools", highlight: true, description: "Deflationary Token Burning" },
    { id: "batch-transfer", label: "Batch Multi-Send", icon: Send, category: "DeFi Tools", highlight: true, description: "Airdrop Multi-Send Engine" },
    { id: "treasury-monitor", label: "Treasury Fee Auto-Sweep", icon: Building2, category: "DeFi Tools", highlight: true, description: "Treasury Auto-Sweep Rules" },
    { id: "agl-credits", label: "AGL Credits Burn", icon: Flame, category: "DeFi Tools", highlight: true, description: "Burn AGL for Studio Credits" },
    { id: "gas-dashboard", label: "Gas Sponsorship Pad", icon: Gauge, category: "DeFi Tools", highlight: true, description: "Paymaster Gas Sponsorship" },
    { id: "analytics", label: "Base Analytics", icon: BarChart3, category: "DeFi Tools", description: "Base Network Analytics" },
    { id: "referrals", label: "Referral & Viral Ads", icon: Gift, category: "DeFi Tools", highlight: true, description: "Viral Links & Rewards" },
  ];

  if (isAdmin) {
    menuItems.push({ id: "admin", label: "Admin Panel", icon: Settings, category: "Administration", description: "Platform Controls & Analytics" });
  }

  // Active Menu Item for Persistent Context Indicator
  const activeMenuItem = menuItems.find(item => item.id === currentTab) || menuItems[0];
  const ActiveIcon = activeMenuItem.icon;

  // Simplified Core Items for Mobile View
  const simplifiedCoreIds = [
    "landing",
    "pitch-deck",
    "dashboard",
    "ai-builder",
    "token-factory",
    "daos",
    "staking-vault",
    "gas-dashboard",
    "gdrive"
  ];

  // Filter menu items by search and category
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = searchQuery === "" || 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (mobileTabFilter === "core") return item.category === "Welcome" || item.category === "Workspace";
    if (mobileTabFilter === "assets") return item.category === "Assets & Creation";
    if (mobileTabFilter === "defi") return item.category === "DeFi Tools" || item.category === "Administration";

    return true;
  });

  // Group items by category for detailed list
  const categories = Array.from(new Set(filteredMenuItems.map(item => item.category)));

  // Dynamic backdrop opacity during drag
  const backdropOpacity = isSwiping ? Math.max(0.1, 1 + swipeOffset / 250) : 1;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          id="sidebar-backdrop"
          onClick={onClose}
          style={{ opacity: backdropOpacity, touchAction: "none" }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden transition-opacity duration-300 animate-fade-in"
        />
      )}

      <aside 
        id="app-sidebar" 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isOpen && swipeOffset < 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: isSwiping ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          touchAction: "pan-y"
        }}
        className={`w-[82vw] sm:w-80 md:w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto overscroll-contain z-50
          fixed md:sticky md:translate-x-0 shadow-2xl md:shadow-none md:rounded-none rounded-r-3xl
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div>
          {/* Mobile Slide-Over Drag Handle Header */}
          <div className="md:hidden py-2 px-4 flex items-center justify-between bg-zinc-950/90 border-b border-white/5 select-none sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-brand-purple animate-ping" />
              <span>Swipe left to slide back</span>
            </div>
            <div className="w-10 h-1 bg-zinc-700/80 rounded-full" />
            <button
              id="close-sidebar-mobile-pill"
              onClick={onClose}
              className="p-1 px-2 rounded-lg text-zinc-300 hover:text-white bg-white/10 text-[10px] font-mono font-bold"
            >
              Close ✕
            </button>
          </div>

          {/* Mobile Pull Edge Handle Visual Cue */}
          <div className="md:hidden absolute right-1.5 top-1/2 -translate-y-1/2 h-14 w-1 rounded-full bg-white/20 pointer-events-none" />

          {/* Brand Logo & Tagline */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 bg-[#0a0a0a]/80">
            <div className="flex items-center gap-2.5">
              <img
                src={agunnayaLogo}
                alt="AL"
                className="w-8 h-8 rounded-xl object-cover shadow-lg shadow-blue-500/20 border border-white/10"
                referrerPolicy="no-referrer"
              />
              <span className="font-display font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                Agunnaya <span className="text-[10px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Labs</span>
              </span>
            </div>
            
            {/* Close Button on Mobile */}
            {onClose && (
              <button
                id="close-sidebar-mobile-btn"
                onClick={onClose}
                className="md:hidden p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="px-5 py-1.5 border-b border-white/5 bg-black/40 flex items-center justify-between text-[9px] text-zinc-400 font-medium">
            <span>Base Mainnet Active</span>
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 100% Online
            </span>
          </div>

          {/* PERSISTENT TAB INDICATOR (Current active context pinned at top) */}
          <div 
            id="persistent-tab-indicator"
            className="mx-3 my-2.5 p-3 rounded-2xl bg-gradient-to-r from-brand-purple/20 via-purple-900/10 to-zinc-900/60 border border-brand-purple/40 shadow-lg shadow-brand-purple/10 space-y-1.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-brand-purple">
                <span className="w-2 h-2 rounded-full bg-brand-purple animate-ping" />
                <span>Active Context</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-brand-purple/30 border border-brand-purple/50 text-purple-200 font-bold">
                {activeMenuItem.category}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-purple text-white shadow-md shadow-brand-purple/30 shrink-0">
                <ActiveIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-xs text-white truncate flex items-center gap-1.5">
                  <span>{activeMenuItem.label}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{activeMenuItem.description}</p>
              </div>
            </div>
          </div>

          {/* Mobile Search & Simplified Navigation Bar */}
          <div className="p-3 border-b border-white/5 space-y-2 bg-zinc-950/40">
            {/* Quick Search */}
            <div className="relative">
              <input
                id="sidebar-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps & tools..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-brand-purple/50 min-h-[38px]"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-zinc-500 hover:text-white text-xs font-mono px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Mobile View Mode Switcher (Simplified vs Full) */}
            <div className="flex md:hidden items-center justify-between pt-1 font-mono text-[10px]">
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-white/5 w-full">
                <button
                  id="btn-mobile-view-simplified"
                  type="button"
                  onClick={() => setMobileViewMode("simplified")}
                  className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all ${
                    mobileViewMode === "simplified"
                      ? "bg-brand-purple text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  ⚡ Simplified
                </button>
                <button
                  id="btn-mobile-view-all"
                  type="button"
                  onClick={() => setMobileViewMode("all")}
                  className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all ${
                    mobileViewMode === "all"
                      ? "bg-brand-purple text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  📁 All Apps ({menuItems.length})
                </button>
              </div>
            </div>

            {/* Mobile Category Filters */}
            {(mobileViewMode === "all" || searchQuery !== "") && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 font-mono text-[10px] scrollbar-none">
                {[
                  { id: "all", label: "All" },
                  { id: "core", label: "Workspace" },
                  { id: "assets", label: "Creation" },
                  { id: "defi", label: "DeFi" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTabFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 font-bold transition-all ${
                      mobileTabFilter === tab.id
                        ? "bg-white/10 text-white border border-white/20"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SIMPLIFIED MOBILE NAV MODE */}
          {mobileViewMode === "simplified" && searchQuery === "" ? (
            <div className="p-3 space-y-2 md:hidden">
              <span className="block px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Quick Access Top Apps
              </span>
              <div className="space-y-1.5">
                {menuItems.filter(item => simplifiedCoreIds.includes(item.id)).map(item => {
                  const IconComp = item.icon;
                  const isActive = currentTab === item.id;
                  
                  const handleItemClick = () => {
                    if (item.id === "landing") {
                      if (onGoHome) onGoHome();
                    } else {
                      onSelectTab(item.id);
                    }
                    if (onClose) onClose();
                  };

                  return (
                    <button
                      id={`sidebar-mobile-simplified-${item.id}`}
                      key={item.id}
                      onClick={handleItemClick}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-medium transition-all text-left min-h-[48px] border cursor-pointer ${
                        isActive
                          ? "bg-brand-purple/20 border-brand-purple/50 text-white shadow-md shadow-purple-500/10 font-bold ring-1 ring-brand-purple/30"
                          : "bg-zinc-900/60 border-white/5 hover:border-white/20 text-zinc-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          isActive ? "bg-brand-purple text-white shadow-md shadow-purple-500/30" : "bg-black/40 text-brand-purple border border-white/5"
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{item.label}</span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] bg-emerald-500/20 text-emerald-400 font-mono font-bold uppercase">Active</span>
                            )}
                            {item.highlight && !isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-pulse" />
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">{item.description}</span>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "text-brand-purple" : "text-zinc-600"}`} />
                    </button>
                  );
                })}

                <button
                  onClick={() => setMobileViewMode("all")}
                  className="w-full py-3 mt-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  <SlidersHorizontal className="w-4 h-4 text-brand-purple" />
                  <span>View All {menuItems.length} Studio Apps & Tools</span>
                </button>
              </div>
            </div>
          ) : (
            /* DETAILED / DESKTOP FULL LISTINGS MODE */
            <div className="p-4 space-y-6">
              {categories.map(cat => (
                <div key={cat} className="space-y-1.5">
                  <span className="block px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{cat}</span>
                  <div className="space-y-0.5">
                    {filteredMenuItems.filter(item => item.category === cat).map(item => {
                      const IconComp = item.icon;
                      const isActive = currentTab === item.id;
                      
                      const handleItemClick = () => {
                        if (item.id === "landing") {
                          if (onGoHome) onGoHome();
                        } else {
                          onSelectTab(item.id);
                        }
                        if (onClose) onClose(); // Auto close sidebar on tab select
                      };
                      
                      return (
                        <button
                          id={`sidebar-item-${item.id}`}
                          key={item.id}
                          onClick={handleItemClick}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left relative group min-h-[42px] cursor-pointer ${
                            isActive
                              ? "bg-gradient-to-r from-brand-purple/20 via-brand-purple/10 to-transparent text-white border-l-4 border-brand-purple font-bold shadow-sm shadow-brand-purple/10"
                              : "text-zinc-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComp className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive ? "text-brand-purple" : "text-zinc-500 group-hover:text-zinc-300"
                            }`} />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {isActive ? (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-brand-purple/30 text-purple-200 border border-brand-purple/40">
                              ACTIVE
                            </span>
                          ) : (
                            item.highlight && (
                              <span className="w-2 h-2 rounded-full bg-brand-purple animate-pulse shrink-0" />
                            )
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredMenuItems.length === 0 && (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-zinc-500 font-mono">No apps matching "{searchQuery}"</p>
                  <button
                    onClick={() => { setSearchQuery(""); setMobileTabFilter("all"); }}
                    className="text-[10px] font-mono text-brand-purple underline"
                  >
                    Clear search filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer with Ecosystem Stats & Tour Trigger */}
        <div className="p-4 border-t border-white/10 bg-black/50 space-y-2.5">
          {onOpenTour && (
            <button
              id="btn-sidebar-onboarding-tour"
              onClick={() => {
                onOpenTour();
                if (onClose) onClose();
              }}
              className="w-full py-2.5 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/40 rounded-xl text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm min-h-[44px] cursor-pointer"
            >
              <Compass className="w-4 h-4 text-purple-400 animate-spin-slow" />
              <span>Launch Onboarding Tour</span>
            </button>
          )}

          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>TVL Deployed:</span>
            <span className="text-white font-bold">14,250 ETH</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>Total Launches:</span>
            <span className="text-white font-bold">3,892</span>
          </div>
          <div className="pt-1 text-center text-[9px] text-zinc-600 font-medium">
            Agunnaya Labs © 2026
          </div>
        </div>
      </aside>
    </>
  );
}


