import React, { useState, useMemo } from "react";
import { 
  Bot, 
  User, 
  Search, 
  Clock, 
  Copy, 
  Check, 
  MessageSquare, 
  Sparkles, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Cpu, 
  Zap, 
  Filter, 
  Layers, 
  MapPin,
  ArrowRight,
  Terminal
} from "lucide-react";
import { AIAgent } from "../types";
import ImageWithFallback from "./ImageWithFallback";

export interface InteractionPair {
  id: string;
  agentId: string;
  agentName: string;
  agentSymbol: string;
  agentAvatar: string;
  prompt: string;
  response: string;
  timestamp: number;
  model?: string;
  tokensProcessed?: number;
  latencyMs?: number;
  groundingMetadata?: any;
  image?: string;
}

interface AgentInteractionHistoryProps {
  agents: AIAgent[];
  activeAgentId?: string | null;
  onSelectAgent?: (agent: AIAgent) => void;
  onLoadPromptToChat?: (agent: AIAgent, promptText: string) => void;
  onClearHistory?: (agentId: string) => void;
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const AgentInteractionHistory: React.FC<AgentInteractionHistoryProps> = ({
  agents,
  activeAgentId,
  onSelectAgent,
  onLoadPromptToChat,
  onClearHistory,
  showToast
}) => {
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>(activeAgentId || "all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync selectedAgentFilter if activeAgentId prop changes from parent
  React.useEffect(() => {
    if (activeAgentId && activeAgentId !== selectedAgentFilter) {
      setSelectedAgentFilter(activeAgentId);
    }
  }, [activeAgentId]);

  // Extract all interaction pairs across agents
  const allInteractions = useMemo(() => {
    const pairs: InteractionPair[] = [];

    agents.forEach((agent) => {
      const history = agent.chatHistory || [];
      
      // Group consecutive user & assistant messages or extract pairs
      for (let i = 0; i < history.length; i++) {
        const item = history[i];
        if (item.role === "user") {
          const nextItem = history[i + 1];
          const responseText = nextItem && nextItem.role === "assistant" ? nextItem.content : "";
          
          pairs.push({
            id: `${agent.id}-pair-${i}-${item.timestamp || Date.now()}`,
            agentId: agent.id,
            agentName: agent.name,
            agentSymbol: agent.symbol,
            agentAvatar: agent.avatarUrl,
            prompt: item.content,
            response: responseText || "No response recorded.",
            timestamp: item.timestamp || (agent.createdAt + i * 60000),
            model: item.model || nextItem?.model || "gemini-3.6-flash",
            tokensProcessed: item.tokens || Math.floor((item.content.length + responseText.length) * 0.75),
            groundingMetadata: nextItem?.groundingMetadata || item.groundingMetadata,
            image: item.image
          });

          if (nextItem && nextItem.role === "assistant") {
            i++; // skip assistant item as it's paired
          }
        }
      }
    });

    return pairs;
  }, [agents]);

  // Filtered & sorted interactions
  const filteredInteractions = useMemo(() => {
    return allInteractions
      .filter((item) => {
        // Agent filter
        if (selectedAgentFilter !== "all" && item.agentId !== selectedAgentFilter) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesPrompt = item.prompt.toLowerCase().includes(q);
          const matchesResponse = item.response.toLowerCase().includes(q);
          const matchesAgent = item.agentName.toLowerCase().includes(q) || item.agentSymbol.toLowerCase().includes(q);
          return matchesPrompt || matchesResponse || matchesAgent;
        }
        return true;
      })
      .sort((a, b) => {
        return sortOrder === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
      });
  }, [allInteractions, selectedAgentFilter, searchQuery, sortOrder]);

  // Stats calculation
  const totalPrompts = allInteractions.length;
  const totalTokens = allInteractions.reduce((acc, curr) => acc + (curr.tokensProcessed || 0), 0);
  const activeAgent = agents.find((a) => a.id === selectedAgentFilter);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyText = (text: string, label: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    if (showToast) showToast(`${label} copied to clipboard!`, "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredInteractions, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `agent_interaction_history_${selectedAgentFilter}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (showToast) showToast("Interaction history exported as JSON!", "success");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div id="agent-interaction-history-container" className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-950/80 space-y-6 shadow-xl">
      
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-purple/20 border border-brand-purple/40 rounded-xl text-brand-purple">
              <Terminal className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                Agent Interaction History Log
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30 uppercase font-bold">
                  {filteredInteractions.length} Interactions
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Review previous prompts, AI cognitive responses, token consumption, and directive evaluations across deployed workers.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            id="btn-export-history-json"
            onClick={handleExportJSON}
            disabled={filteredInteractions.length === 0}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-brand-purple/40 hover:bg-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-zinc-900 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-brand-purple" />
            <span>Export JSON</span>
          </button>

          {selectedAgentFilter !== "all" && onClearHistory && (
            <button
              id={`btn-clear-agent-history-${selectedAgentFilter}`}
              onClick={() => {
                if (window.confirm(`Clear all interaction logs for ${activeAgent?.name || "this agent"}?`)) {
                  onClearHistory(selectedAgentFilter);
                  if (showToast) showToast("Interaction history cleared.", "info");
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-xs font-mono text-red-400 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Agent Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/40 p-3 rounded-xl border border-white/5 font-mono text-xs">
        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-white/5">
          <span className="text-[9px] text-zinc-500 uppercase block font-bold">Total Prompts</span>
          <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
            <MessageSquare className="w-3.5 h-3.5 text-brand-purple" />
            {totalPrompts}
          </span>
        </div>

        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-white/5">
          <span className="text-[9px] text-zinc-500 uppercase block font-bold">Deployed Agents</span>
          <span className="text-sm font-bold text-brand-blue flex items-center gap-1 mt-0.5">
            <Bot className="w-3.5 h-3.5 text-brand-blue" />
            {agents.length}
          </span>
        </div>

        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-white/5">
          <span className="text-[9px] text-zinc-500 uppercase block font-bold">Est. Tokens Evaluated</span>
          <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {totalTokens.toLocaleString()}
          </span>
        </div>

        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-white/5">
          <span className="text-[9px] text-zinc-500 uppercase block font-bold">Selected Filter</span>
          <span className="text-xs font-bold text-purple-300 truncate block mt-0.5">
            {selectedAgentFilter === "all" ? "All Deployed Agents" : activeAgent?.name || selectedAgentFilter}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Agent Dropdown Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-brand-purple" /> Agent:
          </span>
          <select
            id="agent-history-selector"
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple/40 font-mono"
          >
            <option value="all">🌐 All Deployed Agents ({agents.length})</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                🤖 {ag.name} ({ag.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Search Input & Sort Toggle */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
            <input
              id="input-search-agent-history"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts or responses..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white text-xs font-mono"
              >
                ×
              </button>
            )}
          </div>

          <button
            id="btn-toggle-sort-order"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            title="Toggle Sort Order"
          >
            <Clock className="w-3.5 h-3.5 text-brand-purple" />
            <span>{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
          </button>
        </div>
      </div>

      {/* Interaction Logs Scrollable Feed */}
      <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
        {filteredInteractions.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/20 border border-dashed border-white/5 rounded-2xl space-y-3">
            <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-400 font-display">No Agent Interactions Found</p>
              <p className="text-[11px] text-zinc-600 font-sans max-w-sm mx-auto">
                {searchQuery 
                  ? "No prompts or responses match your search criteria. Try clearing the filter." 
                  : "Prompt an agent in the Agent Studio to record cognitive interaction logs here."}
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-brand-purple hover:underline font-mono font-bold"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          filteredInteractions.map((pair) => {
            const isExpanded = expandedIds[pair.id] ?? false;
            const targetAgent = agents.find((a) => a.id === pair.agentId);

            return (
              <div 
                key={pair.id} 
                className="glass-panel p-4 rounded-xl border border-white/5 bg-zinc-900/20 hover:border-brand-purple/30 transition-all space-y-3"
              >
                {/* Log Item Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <ImageWithFallback 
                      src={pair.agentAvatar} 
                      alt={pair.agentName} 
                      fallbackText={pair.agentSymbol} 
                      className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0" 
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-display text-white">{pair.agentName}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-purple font-bold border border-brand-purple/30">
                          {pair.agentSymbol}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        {formatTime(pair.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata & Quick Action Tags */}
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    {pair.model && (
                      <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-white/5">
                        {pair.model}
                      </span>
                    )}

                    {pair.tokensProcessed && (
                      <span className="px-2 py-0.5 rounded bg-zinc-950 text-emerald-400 border border-white/5">
                        ⚡ {pair.tokensProcessed} tokens
                      </span>
                    )}

                    {targetAgent && onLoadPromptToChat && (
                      <button
                        id={`btn-rerun-prompt-${pair.id}`}
                        onClick={() => {
                          onLoadPromptToChat(targetAgent, pair.prompt);
                          if (showToast) showToast(`Loaded prompt into ${targetAgent.name} chat!`, "info");
                        }}
                        className="px-2.5 py-1 rounded bg-brand-purple/20 hover:bg-brand-purple text-purple-300 hover:text-white border border-brand-purple/30 transition-all font-bold flex items-center gap-1 cursor-pointer"
                        title="Load prompt into agent chat"
                      >
                        <Send className="w-3 h-3" />
                        <span>Prompt Again</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt & Response Content */}
                <div className="space-y-2.5">
                  
                  {/* User Prompt Box */}
                  <div className="bg-zinc-950/80 p-3 rounded-lg border border-white/5 space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-wider">
                      <span className="flex items-center gap-1 text-purple-300">
                        <User className="w-3 h-3 text-brand-purple" /> User Prompt:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(pair.prompt, "Prompt", `prompt-${pair.id}`)}
                        className="hover:text-white transition-all flex items-center gap-1 text-[9px] font-mono"
                      >
                        {copiedId === `prompt-${pair.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === `prompt-${pair.id}` ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {pair.image && (
                      <img 
                        src={pair.image.startsWith("data:") ? pair.image : `data:image/png;base64,${pair.image}`} 
                        alt="Attached image" 
                        className="max-w-[150px] max-h-[100px] object-cover rounded border border-white/10 my-1" 
                      />
                    )}

                    <p className="text-xs text-zinc-200 font-sans whitespace-pre-wrap leading-relaxed">
                      {pair.prompt}
                    </p>
                  </div>

                  {/* AI Assistant Response Box */}
                  <div className="bg-zinc-900/60 p-3 rounded-lg border border-brand-purple/20 space-y-1 relative">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-wider">
                      <span className="flex items-center gap-1 text-brand-purple">
                        <Bot className="w-3 h-3 text-brand-purple" /> {pair.agentName} Response:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(pair.response, "AI Response", `resp-${pair.id}`)}
                        className="hover:text-white transition-all flex items-center gap-1 text-[9px] font-mono"
                      >
                        {copiedId === `resp-${pair.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === `resp-${pair.id}` ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    <p className={`text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed ${
                      !isExpanded && pair.response.length > 280 ? "line-clamp-4" : ""
                    }`}>
                      {pair.response}
                    </p>

                    {/* Grounding references link list if present */}
                    {pair.groundingMetadata?.groundingChunks && pair.groundingMetadata.groundingChunks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-mono font-bold">Grounded References:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {pair.groundingMetadata.groundingChunks.map((chunk: any, cidx: number) => {
                            const url = chunk.maps?.uri || chunk.web?.uri;
                            const label = chunk.maps?.title || chunk.web?.title || "Reference Link";
                            if (!url) return null;
                            return (
                              <a 
                                key={cidx}
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-[9px] bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue px-2 py-0.5 rounded border border-brand-blue/30 font-mono transition-all"
                              >
                                <MapPin className="w-2.5 h-2.5" />
                                <span>{label}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Expand / Collapse toggle button for long text */}
                    {pair.response.length > 280 && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => toggleExpand(pair.id)}
                          className="text-[10px] font-mono text-brand-purple hover:text-purple-300 flex items-center gap-1 cursor-pointer font-bold"
                        >
                          {isExpanded ? (
                            <>
                              <span>Collapse View</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>Expand Response ({pair.response.length} chars)</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
