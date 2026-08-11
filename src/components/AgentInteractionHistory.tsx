import React, { useState, useMemo } from "react";
import ImageWithFallback from "./ImageWithFallback";
import CodeResponseViewer from "./CodeResponseViewer";
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
  Terminal,
  BrainCircuit,
  Sliders,
  CheckCircle2,
  Info
} from "lucide-react";
import { AIAgent } from "../types";

export interface AIModelOption {
  id: string;
  name: string;
  tag: string;
  badgeColor: string;
  description: string;
  speed: string;
  reasoning: string;
  contextWindow: string;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    tag: "Recommended",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    description: "Next-gen fast multimodal model with high quality code generation and low latency.",
    speed: "⚡ Fast (1.2s avg)",
    reasoning: "🧠 High Logic",
    contextWindow: "1M Tokens"
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro (Thinking)",
    tag: "Deep Reasoning",
    badgeColor: "bg-brand-purple/20 text-purple-300 border-brand-purple/40",
    description: "Extended cognitive thinking model optimized for complex smart contract architecture & multi-step analysis.",
    speed: "🐢 Moderate (2.8s avg)",
    reasoning: "🧠🧠 Deep Thinking",
    contextWindow: "2M Tokens"
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    tag: "Ultra Fast",
    badgeColor: "bg-brand-blue/20 text-blue-300 border-brand-blue/40",
    description: "Lightweight high-throughput model designed for quick queries and real-time interaction.",
    speed: "⚡⚡ Ultra Fast (0.6s avg)",
    reasoning: "⚡ Basic Reasoning",
    contextWindow: "1M Tokens"
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    tag: "Versatile",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    description: "Battle-tested stable AI model for general automation and conversational assistant subroutines.",
    speed: "⚡ Fast (1.0s avg)",
    reasoning: "🧠 Standard Logic",
    contextWindow: "1M Tokens"
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    tag: "Code Synthesis",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
    description: "Specialized code synthesis model for heavy smart contract refactoring and auditing.",
    speed: "🐢 Moderate (2.5s avg)",
    reasoning: "🧠 Deep Logic",
    contextWindow: "2M Tokens"
  }
];

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
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
  onSelectAgent?: (agent: AIAgent) => void;
  onLoadPromptToChat?: (agent: AIAgent, promptText: string, model?: string) => void;
  onReRunPrompt?: (agent: AIAgent, promptText: string, model?: string) => void;
  onClearHistory?: (agentId: string) => void;
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const AgentInteractionHistory: React.FC<AgentInteractionHistoryProps> = ({
  agents,
  activeAgentId,
  selectedModel: externalSelectedModel,
  onSelectModel,
  onSelectAgent,
  onLoadPromptToChat,
  onReRunPrompt,
  onClearHistory,
  showToast
}) => {
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>(activeAgentId || "all");
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>("all");
  const [activeExecutionModel, setActiveExecutionModel] = useState<string>(externalSelectedModel || "gemini-3.6-flash");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModelDetailsModal, setShowModelDetailsModal] = useState<boolean>(false);

  // Sync selectedAgentFilter if activeAgentId prop changes from parent
  React.useEffect(() => {
    if (activeAgentId && activeAgentId !== selectedAgentFilter) {
      setSelectedAgentFilter(activeAgentId);
    }
  }, [activeAgentId]);

  // Sync externalSelectedModel if passed from parent
  React.useEffect(() => {
    if (externalSelectedModel && externalSelectedModel !== activeExecutionModel) {
      setActiveExecutionModel(externalSelectedModel);
    }
  }, [externalSelectedModel]);

  const handleModelChange = (modelId: string) => {
    setActiveExecutionModel(modelId);
    if (onSelectModel) {
      onSelectModel(modelId);
    }
    const matched = AI_MODELS.find(m => m.id === modelId);
    if (showToast) showToast(`Switched active AI model to ${matched?.name || modelId}`, "info");
  };

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
        // Model filter
        if (selectedModelFilter !== "all" && item.model !== selectedModelFilter) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesPrompt = item.prompt.toLowerCase().includes(q);
          const matchesResponse = item.response.toLowerCase().includes(q);
          const matchesAgent = item.agentName.toLowerCase().includes(q) || item.agentSymbol.toLowerCase().includes(q);
          const matchesModel = item.model?.toLowerCase().includes(q);
          return matchesPrompt || matchesResponse || matchesAgent || matchesModel;
        }
        return true;
      })
      .sort((a, b) => {
        return sortOrder === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
      });
  }, [allInteractions, selectedAgentFilter, selectedModelFilter, searchQuery, sortOrder]);

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
          <span className="text-[9px] text-zinc-500 uppercase block font-bold">Active Execution Model</span>
          <span className="text-xs font-bold text-purple-300 truncate block mt-0.5">
            {AI_MODELS.find(m => m.id === activeExecutionModel)?.name || activeExecutionModel}
          </span>
        </div>
      </div>

      {/* AI Model Selection Panel */}
      <div id="ai-model-selection-panel" className="bg-zinc-900/60 p-4 rounded-xl border border-brand-purple/30 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-brand-purple" />
            <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider">
              AI Model Engine & Execution Kernel
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
            <span>Selected for Re-runs & Chat:</span>
            <span className="font-bold text-purple-300 px-2 py-0.5 rounded bg-brand-purple/20 border border-brand-purple/30 font-mono">
              {AI_MODELS.find(m => m.id === activeExecutionModel)?.name || activeExecutionModel}
            </span>
          </div>
        </div>

        {/* Model Selection Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {AI_MODELS.map((m) => {
            const isSelected = activeExecutionModel === m.id;
            return (
              <button
                key={m.id}
                type="button"
                id={`btn-select-model-${m.id}`}
                onClick={() => handleModelChange(m.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-brand-purple/15 border-brand-purple/60 text-white ring-1 ring-brand-purple/40 shadow-lg shadow-brand-purple/10"
                    : "bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-zinc-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold font-display">{m.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand-purple shrink-0" />}
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border inline-block ${m.badgeColor}`}>
                    {m.tag}
                  </span>
                </div>
                <div className="mt-2 text-[9px] font-mono text-zinc-500 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>{m.speed}</span>
                  </div>
                  <div className="text-[8px] text-zinc-400 font-sans line-clamp-1 mt-1">
                    {m.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Agent Dropdown Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3 text-brand-purple" /> Agent:
            </span>
            <select
              id="agent-history-selector"
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/40 font-mono"
            >
              <option value="all">🌐 All Deployed Agents ({agents.length})</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  🤖 {ag.name} ({ag.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Model Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider shrink-0 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-brand-blue" /> Model:
            </span>
            <select
              id="model-history-filter"
              value={selectedModelFilter}
              onChange={(e) => setSelectedModelFilter(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/40 font-mono"
            >
              <option value="all">🧠 All AI Models</option>
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.tag})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input & Sort Toggle */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              id="input-search-agent-history"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts or responses..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-purple/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-zinc-500 hover:text-white text-xs font-mono"
              >
                ×
              </button>
            )}
          </div>

          <button
            id="btn-toggle-sort-order"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition-all flex items-center gap-1 shrink-0 cursor-pointer"
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

                    {targetAgent && (onLoadPromptToChat || onReRunPrompt) && (
                      <div className="flex items-center gap-1.5">
                        {onLoadPromptToChat && (
                          <button
                            id={`btn-load-prompt-${pair.id}`}
                            onClick={() => {
                              onLoadPromptToChat(targetAgent, pair.prompt, activeExecutionModel);
                              if (showToast) showToast(`Loaded prompt into ${targetAgent.name} chat (${activeExecutionModel})!`, "info");
                            }}
                            className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-all font-bold flex items-center gap-1 cursor-pointer"
                            title="Load prompt into chat input"
                          >
                            <Copy className="w-3 h-3" />
                            <span className="hidden sm:inline">Load</span>
                          </button>
                        )}
                        
                        {onReRunPrompt && (
                          <button
                            id={`btn-rerun-prompt-${pair.id}`}
                            onClick={() => {
                              onReRunPrompt(targetAgent, pair.prompt, activeExecutionModel);
                              if (showToast) showToast(`Re-running prompt with ${targetAgent.name} (${activeExecutionModel})...`, "success");
                            }}
                            className="px-2.5 py-1 rounded bg-brand-purple/20 hover:bg-brand-purple text-purple-300 hover:text-white border border-brand-purple/30 transition-all font-bold flex items-center gap-1 cursor-pointer"
                            title="Instantly re-execute this prompt"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Re-run</span>
                          </button>
                        )}
                      </div>
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
                      <ImageWithFallback 
                        src={pair.image.startsWith("data:") ? pair.image : `data:image/png;base64,${pair.image}`} 
                        alt="Attached image" 
                        fallbackText="IMG"
                        className="max-w-[150px] max-h-[100px] object-cover rounded border border-white/10 my-1" 
                      />
                    )}

                    <p className="text-xs text-zinc-200 font-sans whitespace-pre-wrap leading-relaxed">
                      {pair.prompt}
                    </p>
                  </div>

                  {/* AI Assistant Response Box */}
                  <div className="bg-zinc-900/60 p-3 rounded-lg border border-brand-purple/20 space-y-1 relative">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-wider mb-2">
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

                    {/* Syntax Highlighting Code Viewer */}
                    <div className={!isExpanded && pair.response.length > 350 ? "max-h-[220px] overflow-hidden relative" : ""}>
                      <CodeResponseViewer 
                        content={pair.response} 
                        isExpanded={isExpanded} 
                        showToast={showToast} 
                        agentName={pair.agentName} 
                      />
                      {!isExpanded && pair.response.length > 350 && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
                      )}
                    </div>

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
