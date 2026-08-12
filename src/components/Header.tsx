import { useState, useRef, useEffect } from "react";
import { Wallet, Coins, RefreshCw, Layers, Database, Search, X, Bot, Palette, Cloud, CloudOff, Menu, AlertTriangle, Clock, ShieldAlert, ArrowRightLeft, Share2, Compass } from "lucide-react";
import { WalletState, Token, NFTCollection, AIAgent } from "../types";
import { AuthHealthState } from "../lib/authSyncService";
import { ensureCorrectChain, getChainNameFromId } from "../lib/tokenFactory";
import { aglSdk } from "../lib/aglSdk";
import ImageWithFallback from "./ImageWithFallback";
import OfflineIndicator from "./OfflineIndicator";

interface HeaderProps {
  wallet: WalletState;
  onOpenConnect: () => void;
  onDisconnect: () => void;
  onFundWallet: () => void;
  network: "mainnet" | "sepolia";
  setNetwork: (network: "mainnet" | "sepolia") => void;
  tokens: Token[];
  nfts: NFTCollection[];
  agents: AIAgent[];
  onSelectToken: (token: Token) => void;
  onSelectTab: (tab: string) => void;
  firebaseUser?: any;
  onSignInWithGoogle?: () => void;
  onSignOut?: () => void;
  onOpenSidebar?: () => void;
  authHealthState?: AuthHealthState | null;
  onRefreshAuthToken?: () => void;
  onOpenTour?: () => void;
}

export default function Header({ 
  wallet, 
  onOpenConnect, 
  onDisconnect, 
  onFundWallet, 
  network, 
  setNetwork,
  tokens = [],
  nfts = [],
  agents = [],
  onSelectToken,
  onSelectTab,
  firebaseUser = null,
  onSignInWithGoogle,
  onSignOut,
  onOpenSidebar,
  authHealthState = null,
  onRefreshAuthToken,
  onOpenTour
}: HeaderProps) {
  const shortAddress = wallet.isConnected && wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : "";

  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Monitor connected wallet chain ID
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      const updateChain = () => {
        if (ethereum.chainId) {
          setCurrentChainId(parseInt(ethereum.chainId, 16));
        }
      };

      updateChain();

      ethereum.on?.("chainChanged", (hexChainId: string) => {
        setCurrentChainId(parseInt(hexChainId, 16));
      });

      return () => {
        ethereum.removeListener?.("chainChanged", updateChain);
      };
    }
  }, [wallet.isConnected]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation/dismiss
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.querySelector("input")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const query = searchQuery.trim().toLowerCase();

  const filteredTokens = query
    ? (tokens || []).filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.symbol.toLowerCase().includes(query) ||
        t.address.toLowerCase().includes(query)
      )
    : [];

  const filteredNFTs = query
    ? (nfts || []).filter(n => 
        n.name.toLowerCase().includes(query) || 
        n.symbol.toLowerCase().includes(query) ||
        n.contractAddress.toLowerCase().includes(query)
      )
    : [];

  const filteredAgents = query
    ? (agents || []).filter(a => 
        a.name.toLowerCase().includes(query) || 
        a.symbol.toLowerCase().includes(query) ||
        a.contractAddress.toLowerCase().includes(query)
      )
    : [];

  const hasResults = filteredTokens.length > 0 || filteredNFTs.length > 0 || filteredAgents.length > 0;

  return (
    <header id="app-header" className="sticky top-0 z-40 w-full h-16 border-b border-white/10 bg-[#050505]/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
      {/* Search / Network info on desktop */}
      <div className="flex items-center gap-4">
        {onOpenSidebar && (
          <button
            id="mobile-sidebar-hamburger"
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {/* Immersive UI Brand Title */}
        <div className="hidden lg:flex items-center gap-3">
          <h1 className="text-xs font-semibold tracking-wider text-white/80 uppercase">
            AGUNNAYA LABS STUDIO <span className="text-[#0052FF] font-bold">v2.4</span>
          </h1>
          <div className="h-4 w-px bg-white/10"></div>
        </div>

        {/* Network Switcher */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-white/10 text-xs font-mono">
          <button
            id="switch-network-mainnet"
            onClick={() => setNetwork("mainnet")}
            className={`px-3 py-1 rounded-md transition-all ${
              network === "mainnet"
                ? "bg-[#0052FF] text-white shadow-[0_0_15px_rgba(0,82,255,0.4)] font-bold text-[11px]"
                : "text-zinc-500 hover:text-zinc-200 text-[11px]"
            }`}
          >
            Base Mainnet
          </button>
          <button
            id="switch-network-sepolia"
            onClick={() => setNetwork("sepolia")}
            className={`px-3 py-1 rounded-md transition-all ${
              network === "sepolia"
                ? "bg-brand-purple text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] font-bold text-[11px]"
                : "text-zinc-500 hover:text-zinc-200 text-[11px]"
            }`}
          >
            Sepolia Sandbox
          </button>
        </div>

        {/* Live Gas Monitor */}
        <button
          id="header-gas-monitor"
          onClick={() => onSelectTab("gas-dashboard")}
          className="hidden md:flex items-center gap-2 text-zinc-500 hover:text-brand-purple hover:bg-white/5 px-2 py-1 rounded-md transition-all text-xs font-mono group"
        >
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981] group-hover:bg-brand-purple group-hover:shadow-[0_0_8px_rgba(139,92,246,0.6)]"></span>
          <span className="text-[10px] font-bold">GAS: 0.01 gwei</span>
        </button>

        {/* Offline & Service Worker Status Indicator */}
        <div className="hidden sm:block">
          <OfflineIndicator />
        </div>
      </div>

      {/* Global Search Component */}
      <div ref={searchRef} className="relative hidden md:block w-48 sm:w-64 md:w-72 lg:w-80 focus-within:w-80 lg:focus-within:w-[400px] transition-all duration-300">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search tokens, NFTs, agents..."
            className="w-full h-9 pl-9 pr-8 bg-zinc-950/80 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/20 transition-all"
          />
          {searchQuery ? (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 hidden lg:inline-flex items-center gap-0.5 h-5 select-none rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[9px] font-medium text-zinc-500">
              <span>/</span>
            </kbd>
          )}
        </div>

        {/* Search Dropdown Panel */}
        {isOpen && searchQuery && (
          <div className="absolute top-11 left-0 right-0 max-h-[420px] overflow-y-auto bg-zinc-950 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md z-50 divide-y divide-white/5">
            {!hasResults ? (
              <div className="p-4 text-center text-zinc-500 text-xs font-mono">
                No matching assets found
              </div>
            ) : (
              <>
                {/* TOKENS SECTION */}
                {filteredTokens.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono flex items-center justify-between">
                      <span>Tokens</span>
                      <span className="text-[8px] bg-[#0052FF]/10 text-[#0052FF] border border-[#0052FF]/20 px-1 py-0.2 rounded">BONDING CURVE</span>
                    </div>
                    {filteredTokens.map(token => (
                      <button
                        key={token.address}
                        onClick={() => {
                          onSelectToken(token);
                          setSearchQuery("");
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2">
                          {token.logoUrl ? (
                            <ImageWithFallback src={token.logoUrl} alt={token.name} fallbackText={token.symbol} className="w-6 h-6 rounded-md object-cover border border-white/10" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-[10px] text-zinc-400">
                              {token.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-100 group-hover:text-white truncate">{token.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">{token.symbol} • {token.address.slice(0, 6)}...{token.address.slice(-4)}</p>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[10px]">
                          <p className="text-zinc-300 font-semibold">{token.currentPrice ? `${token.currentPrice.toFixed(6)} ETH` : "0.00 ETH"}</p>
                          <p className="text-zinc-500">MC: ${Math.floor(token.marketCap || 0).toLocaleString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* NFTS SECTION */}
                {filteredNFTs.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono flex items-center justify-between">
                      <span>NFT Collections</span>
                      <span className="text-[8px] bg-brand-purple/10 text-brand-purple border border-brand-purple/20 px-1 py-0.2 rounded">COLLECTION</span>
                    </div>
                    {filteredNFTs.map(nft => (
                      <button
                        key={nft.contractAddress}
                        onClick={() => {
                          onSelectTab("nfts");
                          setSearchQuery("");
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2">
                          {nft.imageUrl ? (
                            <ImageWithFallback src={nft.imageUrl} alt={nft.name} fallbackText={nft.symbol} className="w-6 h-6 rounded-md object-cover border border-white/10" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-[10px] text-zinc-400">
                              <Palette className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-100 group-hover:text-white truncate">{nft.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">{nft.symbol} • {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}</p>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[10px]">
                          <p className="text-zinc-300 font-semibold">{nft.mintPrice ? `${nft.mintPrice} ETH` : "Free"}</p>
                          <p className="text-zinc-500">Supply: {nft.currentSupply}/{nft.maxSupply}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* AI AGENTS SECTION */}
                {filteredAgents.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono flex items-center justify-between">
                      <span>AI Agents</span>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded">INTELLIGENCE</span>
                    </div>
                    {filteredAgents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          onSelectTab("ai-agents");
                          setSearchQuery("");
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2">
                          {agent.avatarUrl ? (
                            <ImageWithFallback src={agent.avatarUrl} alt={agent.name} fallbackText={agent.symbol} className="w-6 h-6 rounded-md object-cover border border-white/10" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-100 group-hover:text-white truncate">{agent.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">{agent.symbol} • {agent.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[10px]">
                          <p className="text-zinc-300 font-semibold">{agent.usageFeeEth} ETH fee</p>
                          <p className="text-zinc-500">{agent.queryCount} queries</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Web3 User Status / Connect Buttons */}
      <div className="flex items-center gap-3">
        {/* Aggregate Balance Summary Header Badge */}
        {(wallet.isConnected || (wallet.subAccounts && wallet.subAccounts.length > 0)) && (
          <button
            id="header-aggregate-summary"
            onClick={onOpenConnect}
            title="Manage Sub-Accounts & view multi-account portfolio summary"
            className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-r from-[#0052FF]/10 via-purple-500/10 to-emerald-500/10 hover:from-[#0052FF]/20 hover:via-purple-500/20 hover:to-emerald-500/20 border border-white/10 hover:border-brand-purple/40 rounded-xl text-xs font-mono transition-all group"
          >
            <div className="flex items-center gap-2 text-zinc-300">
              <Layers className="w-3.5 h-3.5 text-brand-purple group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] uppercase font-bold text-zinc-400">Agg Portfolio:</span>
              <span className="text-white font-bold">Ξ {(wallet.subAccounts && wallet.subAccounts.length > 0 ? wallet.subAccounts.reduce((a, s) => a + (s.balanceEth || 0), 0) : wallet.balanceEth).toFixed(4)}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-[#0052FF] font-bold">{(wallet.subAccounts && wallet.subAccounts.length > 0 ? wallet.subAccounts.reduce((a, s) => a + (s.aglTokenBalance || 0), 0) : wallet.aglTokenBalance).toLocaleString()} AGL</span>
            </div>
            <span className="text-[9px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.5 rounded-md border border-brand-purple/30 font-bold">
              {wallet.subAccounts?.length || 1} Accounts
            </span>
          </button>
        )}

        {/* Persistent Onboarding Tour Button */}
        {onOpenTour && (
          <button
            id="persistent-tour-button"
            onClick={onOpenTour}
            title="Launch Interactive Onboarding Tour"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:scale-105 active:scale-95"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
            <span>Tour</span>
          </button>
        )}

        {wallet.isConnected && (
          <>
            {/* Viral Share / Referral Link Button */}
            <button
              id="viral-share-button"
              onClick={async () => {
                const config = aglSdk.generateViralReferralLink(wallet.address || "0x725615639B760DAa64b3e794AA49B5A9a8A7632E");
                await aglSdk.shareViralEngagement(config);
              }}
              title="Share Agunnaya Studio & earn referral credits"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-mono font-semibold transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)]"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Share & Earn</span>
            </button>

            {/* Faucet/Fund Button */}
            <button
              id="faucet-button"
              onClick={onFundWallet}
              title="Synchronize balances with Base Mainnet"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono font-medium transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Sync Wallet</span>
            </button>

            {/* AGL Balance display */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#0052FF]/10 border border-[#0052FF]/30 rounded-lg text-xs font-mono shadow-[0_0_15px_rgba(0,82,255,0.1)]">
              <Coins className="w-4 h-4 text-[#0052FF]" />
              <span className="text-zinc-400">AGL:</span>
              <span className="text-white font-bold">{wallet.aglTokenBalance.toLocaleString()}</span>
            </div>

            {/* AGL Credits display */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Bot className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-zinc-400">Credits:</span>
              <span className="text-white font-bold">{(wallet.aglCredits || 0).toLocaleString()}</span>
            </div>

            {/* ETH Balance display */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-purple/10 border border-brand-purple/30 rounded-lg text-xs font-mono shadow-[0_0_15px_rgba(139,92,246,0.1)]">
              <Database className="w-4 h-4 text-brand-purple" />
              <span className="text-zinc-400">ETH:</span>
              <span className="text-white font-bold">{wallet.balanceEth.toFixed(4)}</span>
            </div>
          </>
        )}

        {/* Google Cloud Sync Widget & Session Health Indicator */}
        {firebaseUser ? (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {/* Session Expiration Warning Badge */}
            {authHealthState?.status === "nearing_expiration" && (
              <div 
                id="header-session-expiration-warning"
                className="flex items-center gap-2 px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse"
                title={`Firebase Auth session token expires in ${authHealthState.expiresInMinutes ?? 0} min. Click 'Renew' to refresh token without interruption.`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-bold tracking-tight">
                  Session Expiring ({authHealthState.expiresInMinutes ? `${authHealthState.expiresInMinutes}m` : `${authHealthState.expiresInSeconds}s`})
                </span>
                {onRefreshAuthToken && (
                  <button
                    id="header-refresh-auth-token-button"
                    onClick={onRefreshAuthToken}
                    disabled={authHealthState.isRefreshing}
                    className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-[9px] font-bold transition-all flex items-center gap-1 active:scale-95"
                    title="Refresh Firebase Auth token"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${authHealthState.isRefreshing ? "animate-spin" : ""}`} />
                    <span>{authHealthState.isRefreshing ? "Renewing..." : "Renew"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Session Expired Alert Badge */}
            {authHealthState?.status === "expired" && (
              <div 
                id="header-session-expired-alert"
                className="flex items-center gap-2 px-2.5 py-1 bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                title="Firebase Auth token has expired. Please refresh your session or re-authenticate."
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 animate-bounce" />
                <span className="text-[10px] font-bold tracking-tight">
                  Session Expired
                </span>
                {onRefreshAuthToken && (
                  <button
                    id="header-reauth-button"
                    onClick={onRefreshAuthToken}
                    className="ml-1 px-1.5 py-0.5 rounded bg-red-500/30 hover:bg-red-500/40 border border-red-400/40 text-red-100 text-[9px] font-bold transition-all flex items-center gap-1 active:scale-95"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Re-Auth</span>
                  </button>
                )}
              </div>
            )}

            {/* Session Offline Indicator */}
            {authHealthState?.status === "offline" && (
              <div 
                className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-amber-500/30 text-amber-400 rounded-xl text-[10px]"
                title={authHealthState.errorMessage || "Auth Sync Offline"}
              >
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Sync Offline</span>
              </div>
            )}

            {/* Main User Cloud Sync Capsule */}
            <div className="flex items-center gap-1.5 bg-black/50 border border-emerald-500/30 rounded-xl p-1 font-mono text-xs shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <div 
                className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5"
                title={authHealthState?.expiresInMinutes ? `Firebase Auth Healthy (${authHealthState.expiresInMinutes}m remaining)` : "Cloud Sync Active"}
              >
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                <Cloud className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden lg:inline">
                  Cloud Sync Active
                </span>
              </div>
              {firebaseUser.photoURL ? (
                <ImageWithFallback 
                  src={firebaseUser.photoURL} 
                  alt={firebaseUser.displayName || "Google User"} 
                  fallbackText={firebaseUser.displayName}
                  className="w-5 h-5 rounded-full border border-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-[9px] text-zinc-400">
                  G
                </div>
              )}
              <button
                onClick={onSignOut}
                className="px-2 py-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-red-400 transition-all text-[10px]"
                title="Sign out of Google Cloud Backup"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onSignInWithGoogle}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-white/10 rounded-lg text-xs font-mono font-medium transition-all"
            title="Authenticate with Google to persist and share your creations in the cloud"
          >
            <CloudOff className="w-3.5 h-3.5 text-zinc-500" />
            <span>Cloud Backup</span>
          </button>
        )}

        {/* Quick Platform Tour Trigger */}
        {onOpenTour && (
          <button
            id="header-quick-tour-btn"
            onClick={onOpenTour}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple border border-brand-purple/30 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Open Interactive Platform Tour"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Quick Tour</span>
          </button>
        )}

        {/* Connection Widget */}
        {wallet.isConnected ? (
          <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-xl p-1 font-mono text-xs shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            {/* Active Network Indicator / Auto Switch Prompt */}
            {currentChainId && currentChainId !== 8453 ? (
              <button
                id="header-switch-network-btn"
                onClick={async () => {
                  await ensureCorrectChain(8453);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-1.5 transition-all animate-pulse"
                title={`Connected to ${getChainNameFromId(currentChainId)} (ID: ${currentChainId}). Click to switch wallet network to Base Mainnet (8453).`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Switch to Base</span>
                <span className="sm:hidden">Switch</span>
              </button>
            ) : (
              <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                <span>Base Mainnet</span>
              </div>
            )}

            {/* Wallet Type icon */}
            <div className="px-2.5 py-1 rounded-lg bg-white/5 text-zinc-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#0052FF] rounded-full animate-pulse shadow-[0_0_8px_#0052ff]"></span>
              <span className="capitalize text-[10px]">{wallet.walletType === "smart" ? "AA Smart" : wallet.walletType}</span>
            </div>
            
            <button
              id="wallet-info-dropdown"
              onClick={onDisconnect}
              className="px-3 py-1 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-all flex items-center gap-1 font-bold"
              title="Click to Disconnect Wallet"
            >
              <span>{shortAddress}</span>
              <span className="text-[10px] text-zinc-500 hover:text-red-400 ml-1">✕</span>
            </button>
          </div>
        ) : (
          <button
            id="connect-wallet-header"
            onClick={onOpenConnect}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-white/90 text-black font-bold text-xs rounded-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all font-display"
          >
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet</span>
          </button>
        )}
      </div>
    </header>
  );
}
