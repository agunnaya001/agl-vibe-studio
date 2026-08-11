import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ExternalLink, 
  Plus, 
  Search, 
  Loader2, 
  Zap, 
  CheckCircle2, 
  Terminal, 
  Key, 
  Lock, 
  Cpu, 
  Layers, 
  Globe,
  Settings,
  RefreshCw,
  X,
  CreditCard,
  Cloud,
  Server
} from "lucide-react";
import { AgentServiceConnection } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import MCPServerRegistryComponent from "./MCPServerRegistryComponent";

interface AgentServiceRegistryProps {
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onRefresh?: () => void;
}

interface ProviderConfig {
  version: string;
  provider_name: string;
  description: string;
  issuer: string;
  endpoints: {
    capabilities: string;
    [key: string]: string;
  };
}

export const AgentServiceRegistry: React.FC<AgentServiceRegistryProps> = ({ showToast, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<"mcp" | "connectors">("mcp");
  const [connections, setConnections] = useState<AgentServiceConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchUrl, setSearchUrl] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredProvider, setDiscoveredProvider] = useState<ProviderConfig | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = () => {
    const data = AgunnayaDatabase.getServiceConnections();
    setConnections(data);
  };

  const handleDiscoverProvider = async () => {
    if (!searchUrl.trim()) {
      showToast("Please enter a provider URL (e.g., vercel.agent-auth.directory)", "error");
      return;
    }

    setIsDiscovering(true);
    setDiscoveredProvider(null);

    try {
      // Normalize URL
      let url = searchUrl.trim();
      if (!url.startsWith("http")) url = `https://${url}`;
      if (!url.endsWith("/agent-configuration") && !url.endsWith("/agent-configuration/")) {
        url = `${url.replace(/\/$/, "")}/.well-known/agent-configuration`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch provider configuration");
      
      const config: ProviderConfig = await response.json();
      setDiscoveredProvider(config);
      showToast(`Discovered ${config.provider_name} Agent Provider`, "success");
    } catch (err: any) {
      showToast(`Discovery failed: ${err.message}`, "error");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConnect = async (provider: ProviderConfig) => {
    setIsLoading(true);
    try {
      // In a real scenario, we would fetch capabilities from provider.endpoints.capabilities
      // For this implementation, we'll mock the capability fetch
      const conn: AgentServiceConnection = {
        id: crypto.randomUUID(),
        providerName: provider.provider_name,
        issuer: provider.issuer,
        description: provider.description,
        connectedAt: Date.now(),
        status: "active",
        capabilities: [
          { name: "List Domains", description: "Read-only access to your domain registry", approvalStrength: "session" },
          { name: "Execute Deployment", description: "Perform atomic deployments", approvalStrength: "webauthn" }
        ]
      };

      AgunnayaDatabase.saveServiceConnection(conn);
      loadConnections();
      setDiscoveredProvider(null);
      setSearchUrl("");
      showToast(`Successfully connected to ${provider.provider_name}`, "success");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(`Connection failed: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = (id: string) => {
    const updated = connections.map(c => c.id === id ? { ...c, status: "revoked" as const } : c);
    AgunnayaDatabase.saveServiceConnections(updated);
    setConnections(updated);
    showToast("Service connection revoked", "info");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center justify-between p-2 bg-zinc-950/80 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-2 font-mono text-xs font-bold">
          <button
            id="btn-subtab-mcp"
            onClick={() => setActiveSubTab("mcp")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "mcp"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-300" />
            <span>MCP Servers & Connectors</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-[9px] font-bold">
              RPC 2.0
            </span>
          </button>

          <button
            id="btn-subtab-connectors"
            onClick={() => setActiveSubTab("connectors")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "connectors"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Globe className="w-4 h-4 text-blue-300" />
            <span>Service Auth & OAuth Links</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[9px] font-bold">
              {connections.filter(c => c.status === "active").length} Active
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === "mcp" ? (
        <MCPServerRegistryComponent
          showToast={showToast}
          onRefresh={onRefresh}
        />
      ) : (
        <>
          {/* HEADER SECTION */}
          <div className="bg-zinc-950/40 border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand-purple font-mono text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" />
              <span>Identity & Permissions Control</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white">Agent Service Registry</h2>
            <p className="text-zinc-400 text-sm max-w-xl">
              Connect your autonomous agents to external cloud providers and financial networks. Manage delegated capabilities and session-scoped authorizations securely.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="text-center">
                <div className="text-white font-display font-bold text-lg">{connections.filter(c => c.status === "active").length}</div>
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Active Links</div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="text-center">
                <div className="text-white font-display font-bold text-lg">{connections.reduce((acc, c) => acc + c.capabilities.length, 0)}</div>
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Total Rights</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DISCOVERY & ADD SECTION */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-zinc-950 space-y-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">Connect Provider</h3>
                <p className="text-xs text-zinc-400">Discover "Agent Auth" compliant services</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchUrl}
                  onChange={(e) => setSearchUrl(e.target.value)}
                  placeholder="e.g. vercel.agent-auth.directory"
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-brand-purple transition-all"
                />
                <button
                  onClick={handleDiscoverProvider}
                  disabled={isDiscovering || !searchUrl}
                  className="absolute right-2 top-2 p-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/80 text-white transition-all disabled:opacity-50"
                >
                  {isDiscovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSearchUrl("vercel.agent-auth.directory")}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5 text-[10px] font-mono text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                >
                  vercel.agent-auth.directory
                </button>
                <button 
                  onClick={() => setSearchUrl("stripe.agent-auth.ai")}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5 text-[10px] font-mono text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                >
                  stripe.agent-auth.ai
                </button>
              </div>
            </div>

            {discoveredProvider && (
              <div className="mt-4 p-4 rounded-2xl bg-brand-purple/5 border border-brand-purple/20 animate-in fade-in slide-in-from-top-2 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-white font-bold flex items-center gap-2">
                      {discoveredProvider.provider_name === "Vercel" ? <Cloud className="w-4 h-4 text-white" /> : <CreditCard className="w-4 h-4 text-white" />}
                      {discoveredProvider.provider_name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {discoveredProvider.description}
                    </p>
                  </div>
                  <button onClick={() => setDiscoveredProvider(null)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500 uppercase font-bold">Issuer ID:</span>
                    <span className="text-brand-purple truncate max-w-[150px]">{discoveredProvider.issuer}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500 uppercase font-bold">Auth Method:</span>
                    <span className="text-zinc-300">Delegated (autonomous)</span>
                  </div>
                </div>

                <button
                  onClick={() => handleConnect(discoveredProvider)}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-purple/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Authorize Agent Access</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Zero-Trust Security</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              All agent authorizations use session-scoped capabilities. You can revoke access at any time directly from this registry. Your private keys never leave the studio environment.
            </p>
          </div>
        </div>

        {/* ACTIVE CONNECTIONS LIST (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-zinc-950 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">Active Service Links</h3>
              </div>
              <button 
                onClick={loadConnections}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {connections.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                  <Cpu className="w-8 h-8 text-zinc-700" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-zinc-400 font-bold">No Active Service Links</h4>
                  <p className="text-xs text-zinc-600 max-w-[240px]">Connect a provider to enable autonomous cloud & financial capabilities for your agents.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map((conn) => (
                  <div 
                    key={conn.id} 
                    className={`p-5 rounded-2xl border transition-all ${
                      conn.status === "active" 
                        ? "bg-zinc-900/60 border-white/10 hover:border-brand-purple/40" 
                        : "bg-zinc-900/20 border-white/5 opacity-60 grayscale"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          conn.providerName === "Vercel" ? "bg-white text-black" : "bg-indigo-600 text-white"
                        }`}>
                          {conn.providerName === "Vercel" ? <Cloud className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-bold text-sm">{conn.providerName}</h4>
                            {conn.status === "active" ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                            ) : (
                              <span className="text-[9px] uppercase font-bold text-rose-400">Revoked</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">
                            {conn.issuer}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {conn.status === "active" && (
                          <button
                            onClick={() => handleRevoke(conn.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                            title="Revoke All Access"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/10 transition-all">
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2 tracking-wider flex items-center gap-1.5">
                        <Key className="w-3 h-3" /> Authorized Capabilities
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {conn.capabilities.map((cap, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-bold text-[10px]">{cap.name}</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            </div>
                            <p className="text-[9px] text-zinc-500 leading-tight line-clamp-1">
                              {cap.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Connected: {new Date(conn.connectedAt).toLocaleDateString()}</span>
                      <a href="#" className="text-brand-purple hover:text-brand-purple/80 flex items-center gap-1">
                        View Audit Log <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )}
    </div>
  );
};
