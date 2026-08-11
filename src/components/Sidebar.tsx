import React, { useState, useEffect } from "react";
import agunnayaLogo from "../assets/images/agunnaya_logo_1782747905258.jpg";
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
  X
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
    { id: "landing", label: "Studio Home", icon: Sparkles, category: "Welcome" },
    { id: "dashboard", label: "My Hub", icon: LayoutDashboard, category: "Workspace" },
    { id: "task-sync", label: "TaskSync", icon: Clock, category: "Workspace" },
    { id: "ai-builder", label: "AI Contract Builder", icon: Sparkles, category: "Workspace", highlight: true },
    { id: "gdrive", label: "Google Drive Cloud", icon: HardDrive, category: "Workspace" },
    { id: "gmail", label: "Gmail Automation", icon: Mail, category: "Workspace" },
    { id: "google-forms", label: "Google Forms", icon: FileSpreadsheet, category: "Workspace" },
    { id: "explore", label: "Bonding Curve Pad", icon: Rocket, category: "Assets & Creation" },
    { id: "token-factory", label: "Token Factory (Base)", icon: Database, category: "Assets & Creation", highlight: true },
    { id: "nfts", label: "NFT Studio", icon: Disc, category: "Assets & Creation" },
    { id: "daos", label: "DAO Governance", icon: Users, category: "Assets & Creation" },
    { id: "gamefi", label: "GameFi Arena", icon: Gamepad2, category: "Assets & Creation" },
    { id: "ai-agents", label: "AI Agent Studio", icon: Bot, category: "Assets & Creation" },
    { id: "defi", label: "Staking & Swaps", icon: Coins, category: "DeFi Tools" },
    { id: "staking-vault", label: "Automated Staking Vaults", icon: Landmark, category: "DeFi Tools", highlight: true },
    { id: "token-burner", label: "ERC-20 Token Burner", icon: Flame, category: "DeFi Tools", highlight: true },
    { id: "batch-transfer", label: "Batch Multi-Send", icon: Send, category: "DeFi Tools", highlight: true },
    { id: "treasury-monitor", label: "Treasury Fee Auto-Sweep", icon: Building2, category: "DeFi Tools", highlight: true },
    { id: "agl-credits", label: "AGL Credits Burn", icon: Flame, category: "DeFi Tools", highlight: true },
    { id: "gas-dashboard", label: "Gas Sponsorship Pad", icon: Gauge, category: "DeFi Tools", highlight: true },
    { id: "analytics", label: "Base Analytics", icon: BarChart3, category: "DeFi Tools" },
    { id: "referrals", label: "Referral & Viral Ads", icon: Gift, category: "DeFi Tools", highlight: true },
  ];

  if (isAdmin) {
    menuItems.push({ id: "admin", label: "Admin Panel", icon: Settings, category: "Administration" });
  }

  // Group items by category
  const categories = Array.from(new Set(menuItems.map(item => item.category)));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 animate-fade-in"
          style={{ touchAction: "none" }}
        />
      )}

      <aside 
        id="app-sidebar" 
        className={`w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto overscroll-contain transition-transform duration-300 ease-in-out z-50
          fixed md:sticky md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div>
          {/* Brand Logo & Tagline */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0a0a0a]/60">
            <div className="flex items-center gap-2">
              <img
                src={agunnayaLogo}
                alt="AL"
                className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-blue-500/20 border border-white/10"
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
                className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="px-6 py-1.5 border-b border-white/5 bg-black/20">
            <span className="text-[9px] text-zinc-500 font-medium tracking-wide">Build & Launch on Base Mainnet</span>
          </div>

          {/* Menu Listings */}
          <div className="p-4 space-y-6">
            {categories.map(cat => (
              <div key={cat} className="space-y-1.5">
                <span className="block px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{cat}</span>
                <div className="space-y-0.5">
                  {menuItems.filter(item => item.category === cat).map(item => {
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
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left relative group ${
                          isActive
                            ? "bg-zinc-900 text-white border-l-2 border-brand-purple shadow-sm shadow-brand-purple/5"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {item.highlight && !isActive && (
                          <span className="absolute right-3 top-2.5 w-2 h-2 rounded-full bg-brand-purple animate-pulse"></span>
                        )}
                        <IconComp className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-brand-purple" : "text-zinc-500 group-hover:text-zinc-300"
                        }`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer with Ecosystem Stats & Tour Trigger */}
        <div className="p-4 border-t border-white/10 bg-black/30 space-y-2.5">
          {onOpenTour && (
            <button
              onClick={() => {
                onOpenTour();
                if (onClose) onClose();
              }}
              className="w-full py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/40 rounded-xl text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
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
