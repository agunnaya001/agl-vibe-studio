import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  Sliders, 
  Clock, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Terminal,
  ExternalLink,
  Flame,
  Info
} from "lucide-react";
import { sendMultiTurnChatMessage, MultiTurnChatMessage, MultiTurnChatResponse } from "../lib/gemini";
import { WalletState } from "../types";

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelUsed?: string;
  latencyMs?: number;
  roleName?: string;
  isFallback?: boolean;
}

interface GeminiChatbotViewProps {
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
  standalone?: boolean;
  wallet?: WalletState;
  onRefreshWallet?: () => void;
}

const MODEL_TIERS = [
  {
    id: "gemini-4-carbon",
    name: "Gemini 4 Carbon",
    tag: "Deep Reasoning",
    description: "Multi-step mathematical reasoning, formal smart contract audits, CEI verification & vulnerability modeling.",
    badgeClass: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    color: "#a855f7"
  },
  {
    id: "gemini-4-argon",
    name: "Gemini 4 Argon",
    tag: "Complex Interactive",
    description: "High-complexity dApp state machines, full-stack Wagmi v2 architecture, interactive simulation logic.",
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    color: "#3b82f6"
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    tag: "General Tasks",
    description: "Standard Web3 advisor: tokenomics, linear bonding curves, DAO governance, staking APY guidance.",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    color: "#10b981"
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    tag: "Ultra Fast",
    description: "Lowest latency execution: function selector decoding, quick syntax summaries, rapid EVM lookups.",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    color: "#f59e0b"
  }
];

const ROLES = [
  {
    id: "carbon-auditor",
    name: "Carbon Security Auditor",
    recommendedModel: "gemini-4-carbon",
    badge: "Formal CEI",
    icon: ShieldCheck,
    tagline: "Audits & Reentrancy Mitigation",
    defaultInstruction: "You are the Lead Smart Contract Security Auditor at Agunnaya Labs on Base L2. You specialize in deep mathematical reasoning, CEI validation, reentrancy protection, ERC-4337 paymaster exploit mitigation, and bonding curve safety. Review contracts with extreme rigor, cite exact code patterns, and provide remediation."
  },
  {
    id: "argon-dapp-master",
    name: "Argon dApp Master",
    recommendedModel: "gemini-4-argon",
    badge: "Full-Stack dApp",
    icon: Zap,
    tagline: "React 19 + Wagmi v2 Architecture",
    defaultInstruction: "You are the Principal dApp Architect at Agunnaya Labs. You excel at multi-file architecture, React 19 + TypeScript patterns, Tailwind CSS, Wagmi v2 / Viem hooks, Base L2 gas optimization, and LI.FI cross-chain bridging routes. Provide clean, production-ready TypeScript code."
  },
  {
    id: "flash-advisor",
    name: "Flash Protocol Advisor",
    recommendedModel: "gemini-3.8-flash",
    badge: "Core Web3",
    icon: Bot,
    tagline: "Bonding Curves & Base Economics",
    defaultInstruction: "You are the Agunnaya Labs Core Web3 Advisor powered by Gemini 3.8 Flash. You provide clear, accurate, and insightful explanations of linear bonding curves (P(S) = P0 + k*S), staking vault APYs, Base Network gas dynamics, and token factory standards."
  },
  {
    id: "lite-synthesizer",
    name: "Lite Rapid Synthesizer",
    recommendedModel: "gemini-3.1-flash-lite",
    badge: "Instant Summary",
    icon: Cpu,
    tagline: "Low-Latency EVM Lookups",
    defaultInstruction: "You are the Ultra-Fast Agunnaya Labs Synthesizer. Provide quick, accurate, bulleted answers with minimal latency. Summarize EVM topics, decode function signatures, and generate concise snippets on demand."
  }
];

const PROMPT_STARTERS = [
  {
    role: "carbon-auditor",
    title: "Audit Reentrancy & CEI",
    prompt: "Perform a rigorous security audit of a standard ERC-20 staking contract that allows emergency withdrawals. Highlight potential reentrancy attacks, state desynchronization risks, and provide an OpenZeppelin v5 CEI fix."
  },
  {
    role: "flash-advisor",
    title: "Bonding Curve Pricing Math",
    prompt: "Explain how Agunnaya Labs calculates token spot price and buy cost along the linear bonding curve P(S) = P_0 + k*S. Show the integral formula for buying ΔS tokens and how referral splits are deducted."
  },
  {
    role: "argon-dapp-master",
    title: "Build Base Paymaster Hook",
    prompt: "Write a React hook in TypeScript using Wagmi v2 and Viem to sponsor gas on Base Mainnet via an ERC-4337 Paymaster service, complete with error handling and transaction receipt tracking."
  },
  {
    role: "lite-synthesizer",
    title: "Decode ERC-20 Transfer Event",
    prompt: "What is the keccak256 topic0 hash of Transfer(address,address,uint256) and how do indexed vs non-indexed event topics work in EVM logs?"
  }
];

export default function GeminiChatbotView({
  showToast = () => {},
  standalone = false,
  wallet,
  onRefreshWallet
}: GeminiChatbotViewProps) {
  const [selectedRole, setSelectedRole] = useState(ROLES[2]); // default to Flash Advisor
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.8-flash");
  const [systemInstruction, setSystemInstruction] = useState<string>(ROLES[2].defaultInstruction);
  const [isSystemOpen, setIsSystemOpen] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<"HIGH" | "LOW" | "MINIMAL">("HIGH");
  
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: "initial-welcome",
      role: "assistant",
      content: "Hello! I am your multi-turn Gemini Web3 Assistant on Base L2. You can switch models between **Gemini 4 Carbon** (Deep Reasoning), **Gemini 4 Argon** (Complex Interactive), **Gemini 3.8 Flash** (General Tasks), and **Gemini 3.1 Flash Lite** (Ultra Fast). How can I assist your Web3 build today?",
      timestamp: Date.now(),
      modelUsed: "gemini-3.8-flash",
      roleName: "Flash Protocol Advisor"
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat thread
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Update role instruction when role changes
  const handleSelectRole = (role: typeof ROLES[0]) => {
    setSelectedRole(role);
    setSelectedModel(role.recommendedModel);
    setSystemInstruction(role.defaultInstruction);
  };

  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast("Copied to clipboard!", "success");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleClearThread = () => {
    if (confirm("Are you sure you want to clear conversation history?")) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: `Conversation reset. Active model: **${selectedModel}** (${selectedRole.name}). How can I help you?`,
          timestamp: Date.now(),
          modelUsed: selectedModel,
          roleName: selectedRole.name
        }
      ]);
      showToast("Conversation cleared.", "info");
    }
  };

  const handleExportTranscript = () => {
    const transcript = messages.map(m => {
      const header = m.role === "user" ? "### USER" : `### ASSISTANT (${m.roleName || m.modelUsed || "Gemini"})`;
      const time = new Date(m.timestamp).toLocaleTimeString();
      return `${header} - ${time}\n\n${m.content}\n\n---`;
    }).join("\n\n");

    const blob = new Blob([transcript], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini-chat-transcript-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Transcript downloaded as Markdown.", "success");
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation payload preserving multi-turn history
      const apiPayload: MultiTurnChatMessage[] = newHistory.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));

      const res: MultiTurnChatResponse = await sendMultiTurnChatMessage({
        messages: apiPayload,
        model: selectedModel,
        roleId: selectedRole.id,
        customSystemInstruction: systemInstruction,
        thinkingLevel: selectedModel === "gemini-4-carbon" ? thinkingLevel : undefined
      });

      const assistantMessage: ChatMessageItem = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        timestamp: res.timestamp || Date.now(),
        modelUsed: res.modelUsed,
        latencyMs: res.latencyMs,
        roleName: res.roleName,
        isFallback: res.isFallback
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err: any) {
      console.error("[GeminiChatbotView] Error:", err);
      const errorMessage: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Request Notice**: ${err.message || "Unable to reach Gemini endpoint"}. Please ensure the server has process.env.GEMINI_API_KEY configured.`,
        timestamp: Date.now(),
        modelUsed: selectedModel,
        roleName: selectedRole.name
      };
      setMessages(prev => [...prev, errorMessage]);
      showToast(err.message || "Gemini chat request failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render markdown-like code blocks cleanly
  const renderMessageContent = (content: string, msgId: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let codeIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index)
        });
      }
      parts.push({
        type: "code",
        language: match[1] || "typescript",
        code: match[2].trim(),
        id: `${msgId}-code-${codeIndex++}`
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex)
      });
    }

    if (parts.length === 0) {
      parts.push({ type: "text", content });
    }

    return (
      <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
        {parts.map((p, idx) => {
          if (p.type === "code") {
            return (
              <div key={idx} className="my-2 rounded-xl overflow-hidden border border-white/10 bg-black/80 font-mono text-xs">
                <div className="px-3 py-1.5 bg-white/5 border-b border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-brand-purple" />
                    <span className="font-bold text-zinc-300 uppercase">{p.language}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(p.code || "", p.id || `${idx}`)}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    {copiedId === p.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto text-zinc-200 text-xs">
                  <code>{p.code}</code>
                </pre>
              </div>
            );
          }

          // Format basic bold and bullet lines
          const paragraphs = p.content?.split("\n\n") || [];
          return (
            <div key={idx} className="space-y-1.5">
              {paragraphs.map((para, pIdx) => (
                <p key={pIdx} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${standalone ? "min-h-[82vh]" : "min-h-[72vh]"} bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl`}>
      {/* Top Bar: Model Selector, Role Presets & Utility Controls */}
      <div className="p-4 bg-zinc-900/90 border-b border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display text-white">
                  Gemini Multi-Turn AI Chatbot
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
                  Base L2
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Persistent conversation context across turns with dynamic role-based instructions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsSystemOpen(!isSystemOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 border transition-all ${
                isSystemOpen 
                  ? "bg-brand-purple text-white border-purple-400" 
                  : "bg-white/5 text-zinc-400 hover:text-white border-white/10 hover:bg-white/10"
              }`}
              title="Inspect or edit System Instructions"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>System Prompt</span>
              {isSystemOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleExportTranscript}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors"
              title="Export Transcript (Markdown)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleClearThread}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition-colors"
              title="Clear Thread"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Model Engine Selector Strip */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>MODEL ENGINE:</span>
            <span className="text-zinc-500">Auto-routes to recommended model on role change</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {MODEL_TIERS.map(tier => {
              const isSelected = selectedModel === tier.id;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedModel(tier.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all relative overflow-hidden ${
                    isSelected 
                      ? "bg-zinc-800 border-white/30 shadow-md shadow-brand-purple/10" 
                      : "bg-black/40 border-white/5 hover:border-white/15 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-white font-mono truncate">{tier.name}</span>
                    <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full border ${tier.badgeClass}`}>
                      {tier.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">
                    {tier.description}
                  </p>
                  {isSelected && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-0.5" 
                      style={{ backgroundColor: tier.color }} 
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          <span className="text-[11px] font-mono text-zinc-400 uppercase shrink-0 mr-1">ROLES:</span>
          {ROLES.map(role => {
            const Icon = role.icon;
            const isSelected = selectedRole.id === role.id;
            return (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all border ${
                  isSelected
                    ? "bg-brand-purple/20 text-white border-brand-purple font-semibold shadow-sm shadow-brand-purple/20"
                    : "bg-white/5 text-zinc-400 hover:text-white border-white/5 hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{role.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-400">
                  {role.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Collapsible System Instruction Inspector */}
        {isSystemOpen && (
          <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-zinc-300 font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-brand-purple" />
                Active System Instruction ({selectedRole.name})
              </span>
              <button
                onClick={() => setSystemInstruction(selectedRole.defaultInstruction)}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Default
              </button>
            </div>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-lg bg-zinc-950 border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand-purple transition-colors resize-y"
              placeholder="Custom system instructions sent directly to Gemini with every turn..."
            />
            {selectedModel === "gemini-4-carbon" && (
              <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                <span className="text-purple-300">Carbon Thinking Budget:</span>
                {(["HIGH", "LOW", "MINIMAL"] as const).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setThinkingLevel(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      thinkingLevel === lvl 
                        ? "bg-purple-600 text-white border-purple-400" 
                        : "bg-white/5 text-zinc-400 border-white/5"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-lg ${
                  isUser
                    ? "bg-brand-blue text-white rounded-br-none"
                    : "bg-zinc-900/90 border border-white/10 text-zinc-200 rounded-bl-none"
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/5 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-brand-purple font-bold">
                      <Bot className="w-4 h-4" />
                      <span>{m.roleName || "Gemini AI"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      {m.modelUsed && (
                        <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] border border-white/5 text-zinc-400">
                          {m.modelUsed}
                        </span>
                      )}
                      {m.latencyMs !== undefined && (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <Clock className="w-3 h-3" />
                          {m.latencyMs}ms
                        </span>
                      )}
                      {m.isFallback && (
                        <span className="text-amber-400 text-[9px] font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          Fallback
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {renderMessageContent(m.content, m.id)}

                <div className="mt-2 flex items-center justify-between text-[10px] opacity-60">
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <button
                    onClick={() => handleCopy(m.content, m.id)}
                    className="hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity"
                    title="Copy full message"
                  >
                    {copiedId === m.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 rounded-bl-none max-w-sm flex items-center gap-3">
              <Bot className="w-5 h-5 text-brand-purple animate-bounce" />
              <div>
                <div className="text-xs text-white font-medium">Gemini is reasoning...</div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  Engine: {selectedModel} | Turn {messages.length}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Suggested Starters (Only when conversation is fresh) */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-white/5 bg-zinc-950/60">
          <div className="text-[11px] font-mono text-zinc-500 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-purple" />
            <span>QUICK PROMPT STARTERS:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROMPT_STARTERS.map((starter, sIdx) => (
              <button
                key={sIdx}
                onClick={() => handleSendMessage(starter.prompt)}
                className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-white/5 hover:border-brand-purple/30 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-brand-purple flex items-center justify-between">
                  <span>{starter.title}</span>
                  <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                  {starter.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Composer */}
      <div className="p-3 sm:p-4 bg-zinc-900/95 border-t border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={Math.min(4, Math.max(1, input.split("\n").length))}
              placeholder={`Message ${selectedRole.name} on ${selectedModel}... (Shift+Enter for new line)`}
              className="w-full p-3 pr-10 rounded-xl bg-black/60 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple transition-all resize-none font-sans"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-brand-purple hover:bg-purple-600 disabled:opacity-40 disabled:hover:bg-brand-purple text-white font-bold transition-all shadow-lg shadow-brand-purple/20 shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Multi-Turn Session: {messages.length} messages</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Server-Side Proxy | Model: {selectedModel}
          </span>
        </div>
      </div>
    </div>
  );
}
