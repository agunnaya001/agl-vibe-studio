import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Terminal, 
  Zap, 
  CheckCircle2, 
  Plus, 
  Search, 
  RefreshCw, 
  Play, 
  ShieldCheck, 
  Code2, 
  Server, 
  Layers, 
  Globe, 
  ExternalLink, 
  X, 
  Activity, 
  Clock, 
  Sliders, 
  Copy, 
  Check,
  Database,
  SearchIcon,
  Coins
} from "lucide-react";
import { MCPServer, MCPTool } from "../types";
import { AgunnayaDatabase } from "../lib/db";

interface MCPServerRegistryComponentProps {
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onRefresh?: () => void;
}

export default function MCPServerRegistryComponent({
  showToast,
  onRefresh
}: MCPServerRegistryComponentProps) {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [activeToolToTest, setActiveToolToTest] = useState<MCPTool | null>(null);
  const [toolInputJson, setToolInputJson] = useState<string>("{\n  \"query\": \"Agunnaya Base L2 liquidity\"\n}");
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [toolExecutionOutput, setToolExecutionOutput] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // New MCP Server Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerType, setNewServerType] = useState<"stdio" | "sse" | "http">("sse");
  const [newServerEndpoint, setNewServerEndpoint] = useState("");
  const [newServerCategory, setNewServerCategory] = useState<"search" | "crypto" | "database" | "developer" | "ai" | "workspace">("crypto");
  const [newServerDescription, setNewServerDescription] = useState("");

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = () => {
    const data = AgunnayaDatabase.getMCPServers();
    setMcpServers(data);
  };

  const handleCreateServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerEndpoint.trim()) {
      showToast("Please enter a valid Server Name and Endpoint", "error");
      return;
    }

    try {
      const created = AgunnayaDatabase.addMCPServer({
        name: newServerName.trim(),
        type: newServerType,
        endpoint: newServerEndpoint.trim(),
        status: "connected",
        latencyMs: Math.floor(Math.random() * 25) + 10,
        description: newServerDescription.trim() || "Custom registered Model Context Protocol (MCP) server.",
        category: newServerCategory,
        capabilities: ["custom_rpc", "tools_provider"],
        tools: [
          {
            name: `mcp_${newServerName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_execute`,
            description: "Custom endpoint execution tool",
            inputSchema: { payload: "string" }
          }
        ],
        version: "v1.0.0"
      });

      setMcpServers(AgunnayaDatabase.getMCPServers());
      setShowAddModal(false);
      setNewServerName("");
      setNewServerEndpoint("");
      setNewServerDescription("");
      showToast(`Registered MCP Server "${created.name}"!`, "success");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(`Failed to register server: ${err.message}`, "error");
    }
  };

  const handleExecuteTool = () => {
    if (!activeToolToTest) return;

    let parsedInput: any = {};
    try {
      parsedInput = JSON.parse(toolInputJson);
    } catch {
      showToast("Invalid JSON syntax in input parameters", "error");
      return;
    }

    setIsExecutingTool(true);
    setToolExecutionOutput(null);

    setTimeout(() => {
      setIsExecutingTool(false);
      const isBaseRpc = activeToolToTest.name.includes("base");
      const isBrave = activeToolToTest.name.includes("brave");
      const isDex = activeToolToTest.name.includes("agl");

      const mockResponse = {
        jsonrpc: "2.0",
        id: "mcp_rpc_req_" + Math.random().toString(36).substring(2, 9),
        status: "200_OK",
        server: selectedServer?.name,
        toolExecuted: activeToolToTest.name,
        executionTimeMs: (selectedServer?.latencyMs || 15) + Math.floor(Math.random() * 10),
        result: isBaseRpc ? {
          network: "Base Mainnet (EIP-1559)",
          chainId: 8453,
          latestBlock: 18492041,
          gasPriceGwei: 0.0028,
          walletBalanceEth: 0.15,
          aglBalance: 1250.00,
          txHash: "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("")
        } : isBrave ? {
          webResultsCount: 5,
          articles: [
            { title: "Agunnaya Studio Launches Real AGL Liquidity Pools on Base", url: "https://agunnaya.io/news/l2-pools", ranking: 1.0 },
            { title: "Model Context Protocol (MCP) Agent Connectors Skyrocket AI Capability", url: "https://modelcontextprotocol.io/spec", ranking: 0.98 }
          ]
        } : isDex ? {
          pairSymbol: parsedInput.pairSymbol || "AGL/ETH",
          reserveA_AGL: 2500000,
          reserveB_ETH: 125.0,
          spotPriceEth: 0.00005,
          spotPriceUsd: 0.1625,
          slippageTolerance: "0.5%"
        } : {
          status: "success",
          inputReceived: parsedInput,
          outputData: { recordId: "rec_" + Date.now(), timestamp: new Date().toISOString() }
        }
      };

      setToolExecutionOutput(mockResponse);
      showToast(`Executed MCP tool ${activeToolToTest.name} via ${selectedServer?.type.toUpperCase()} transport`, "success");
    }, 600);
  };

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    showToast("Copied MCP RPC payload to clipboard", "info");
  };

  const filteredServers = mcpServers.filter(s => {
    const matchesCat = categoryFilter === "all" || s.category === categoryFilter;
    const matchesQuery = !searchQuery.trim() || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div id="mcp-server-registry-container" className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-purple/20 via-brand-blue/15 to-emerald-500/10 border border-white/10 glow-border-purple relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand-purple font-mono text-[10px] font-bold uppercase tracking-widest">
              <Cpu className="w-4 h-4 text-brand-purple" />
              <span>Model Context Protocol (MCP) Engine</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-display font-bold text-white flex items-center gap-3">
              MCP Servers & Agent Connectors Hub
              <span className="text-xs font-mono font-bold bg-brand-purple/20 border border-brand-purple/40 text-purple-300 px-2.5 py-1 rounded-full">
                SPEC v1.0
              </span>
            </h2>
            <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
              Connect AI Agents to live Model Context Protocol (MCP) tool servers across Web Search, Base L2 RPC, SQL/Firestore databases, and Agunnaya DEX Liquidity pools over stdio, SSE, and HTTP JSON-RPC transports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-register-mcp-server"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg shadow-brand-purple/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Register MCP Server
            </button>
            <button
              id="btn-refresh-mcp-list"
              onClick={loadServers}
              className="p-2.5 bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer"
              title="Refresh MCP Connections"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          <span className="text-zinc-500 font-bold uppercase text-[10px] px-2">Filter:</span>
          {["all", "crypto", "search", "database", "developer"].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl capitalize font-bold transition-all cursor-pointer ${
                categoryFilter === cat 
                  ? "bg-brand-purple text-white shadow" 
                  : "bg-black/40 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
          <input
            id="input-search-mcp-servers"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search MCP servers or tools..."
            className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple/40 font-mono"
          />
        </div>
      </div>

      {/* Grid of MCP Servers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServers.map((server) => {
          return (
            <div
              key={server.id}
              className={`p-5 rounded-2xl bg-zinc-900/90 border transition-all space-y-4 relative ${
                selectedServer?.id === server.id
                  ? "border-brand-purple ring-1 ring-brand-purple/40 bg-zinc-900"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-brand-purple/15 border border-brand-purple/30 text-brand-purple">
                    {server.category === "crypto" ? <Coins className="w-5 h-5" /> :
                     server.category === "search" ? <SearchIcon className="w-5 h-5" /> :
                     server.category === "database" ? <Database className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold font-display text-white">{server.name}</h3>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-300 uppercase font-bold">
                        {server.type}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 line-clamp-1">
                      {server.endpoint}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {server.latencyMs}ms
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed font-sans line-clamp-2">
                {server.description}
              </p>

              {/* Capabilities Badges */}
              <div className="flex flex-wrap gap-1.5 font-mono text-[9px]">
                {server.capabilities.map((cap) => (
                  <span key={cap} className="px-2 py-0.5 rounded bg-black/50 border border-white/10 text-purple-300 font-bold">
                    #{cap}
                  </span>
                ))}
              </div>

              {/* Exposed Tools List */}
              <div className="bg-black/60 rounded-xl p-3 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 uppercase">
                  <span>Exposed MCP Tools ({server.tools.length})</span>
                  <span>JSON-RPC 2.0</span>
                </div>

                <div className="space-y-1.5">
                  {server.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="p-2 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-between gap-2 hover:border-brand-purple/30 transition-all"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-mono font-bold text-white block truncate">{tool.name}</span>
                        <span className="text-[10px] text-zinc-400 font-sans block truncate">{tool.description}</span>
                      </div>
                      <button
                        id={`btn-test-tool-${tool.name}`}
                        onClick={() => {
                          setSelectedServer(server);
                          setActiveToolToTest(tool);
                          if (tool.name.includes("base")) {
                            setToolInputJson(JSON.stringify({ address: "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B" }, null, 2));
                          } else if (tool.name.includes("brave")) {
                            setToolInputJson(JSON.stringify({ query: "Agunnaya Labs Base L2" }, null, 2));
                          } else if (tool.name.includes("agl")) {
                            setToolInputJson(JSON.stringify({ pairSymbol: "AGL/ETH", amount: 100 }, null, 2));
                          } else {
                            setToolInputJson(JSON.stringify({ query: "SELECT * FROM tokens LIMIT 5;" }, null, 2));
                          }
                          setToolExecutionOutput(null);
                        }}
                        className="px-2.5 py-1 bg-brand-purple/20 hover:bg-brand-purple text-purple-300 hover:text-white rounded-lg text-[10px] font-mono font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" /> Test
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive MCP Tester Modal / Panel */}
      {selectedServer && activeToolToTest && (
        <div id="mcp-tool-tester-panel" className="p-6 rounded-3xl bg-zinc-950 border border-brand-purple/40 space-y-5 glow-border-purple animate-fade-in relative">
          <button
            onClick={() => {
              setSelectedServer(null);
              setActiveToolToTest(null);
            }}
            className="absolute top-5 right-5 text-zinc-500 hover:text-white text-xs font-mono p-1 rounded-lg bg-zinc-900 border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display text-white">
                  Live MCP Tool Tester: <span className="text-brand-purple font-mono">{activeToolToTest.name}</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {selectedServer.type.toUpperCase()} TRANSPORT
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Executing via {selectedServer.name} ({selectedServer.endpoint})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Input JSON Box */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">
                JSON-RPC 2.0 Input Parameters
              </label>
              <textarea
                value={toolInputJson}
                onChange={(e) => setToolInputJson(e.target.value)}
                rows={7}
                className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-brand-purple/60"
              />
              <button
                id="btn-execute-mcp-rpc"
                onClick={handleExecuteTool}
                disabled={isExecutingTool}
                className="w-full py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20 cursor-pointer disabled:opacity-50"
              >
                {isExecutingTool ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Transmitting MCP RPC...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Execute MCP Tool Call
                  </>
                )}
              </button>
            </div>

            {/* Right Output RPC Response Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-zinc-400">
                  MCP Server Payload Response
                </label>
                {toolExecutionOutput && (
                  <button
                    onClick={() => handleCopyJson(toolExecutionOutput)}
                    className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy JSON
                  </button>
                )}
              </div>

              <div className="bg-black/90 border border-white/10 rounded-xl p-3 h-[200px] overflow-y-auto font-mono text-[11px] text-zinc-300">
                {toolExecutionOutput ? (
                  <pre className="text-emerald-400 leading-relaxed">
                    {JSON.stringify(toolExecutionOutput, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                    Click "Execute MCP Tool Call" to view real response payload...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Registering Custom MCP Server */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 max-w-lg w-full space-y-5 relative shadow-2xl animate-fade-in">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white text-xs font-mono p-1 rounded-lg bg-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">Register MCP Server</h3>
                <p className="text-xs text-zinc-400">Connect a custom stdio, SSE, or HTTP Model Context Protocol endpoint.</p>
              </div>
            </div>

            <form onSubmit={handleCreateServer} className="space-y-4">
              <div>
                <label className="text-xs font-mono font-bold text-zinc-400 block mb-1">Server Name</label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="e.g. GitHub Repository MCP"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple/60 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-bold text-zinc-400 block mb-1">Transport Type</label>
                  <select
                    value={newServerType}
                    onChange={(e) => setNewServerType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple/60 font-mono"
                  >
                    <option value="sse">SSE (Server-Sent Events)</option>
                    <option value="http">HTTP (JSON-RPC 2.0)</option>
                    <option value="stdio">Stdio (CLI Executable)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-zinc-400 block mb-1">Category</label>
                  <select
                    value={newServerCategory}
                    onChange={(e) => setNewServerCategory(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple/60 font-mono"
                  >
                    <option value="crypto">Crypto / Web3</option>
                    <option value="search">Search & Web</option>
                    <option value="database">Database / SQL</option>
                    <option value="developer">Developer Tools</option>
                    <option value="ai">AI / Vector Memory</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-zinc-400 block mb-1">Endpoint or Executable Command</label>
                <input
                  type="text"
                  value={newServerEndpoint}
                  onChange={(e) => setNewServerEndpoint(e.target.value)}
                  placeholder="e.g. https://mcp.github.com/v1/sse"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple/60 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-zinc-400 block mb-1">Description</label>
                <textarea
                  value={newServerDescription}
                  onChange={(e) => setNewServerDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe the server's function..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/60 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold font-mono shadow-lg shadow-brand-purple/20 cursor-pointer"
                >
                  Register Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
