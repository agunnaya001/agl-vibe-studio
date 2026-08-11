import { useState, useEffect } from "react";
import { Bot, Send, BrainCircuit, X, MessageSquare, Zap, Coins, Pin, PinOff } from "lucide-react";
import { chatWithAgentAI } from "../lib/gemini";
import { WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { validateAndConsumeCredits, CREDIT_COSTS } from "../lib/credits";
import InsufficientCreditsModal from "./InsufficientCreditsModal";

interface AIAssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletState;
  onRefreshWallet: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
}

export default function AIAssistantSidebar({ 
  isOpen, 
  onClose, 
  wallet, 
  onRefreshWallet, 
  showToast,
  isLocked = false,
  onToggleLock
}: AIAssistantSidebarProps) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Greetings! I am the Agunnaya Labs AI Assistant. Ask me anything about building dApps, deploying on Base, staking, or modeling bonding curve mathematics." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const predefinedCategories = [
    {
      label: "Tokens & Curve",
      questions: [
        "Explain the bonding curve price math $P(S) = P_0 + k \\cdot S$",
        "How do 20% referral fee splits work on token buys?",
        "What is the standard ERC-20 contract ABI structure?"
      ]
    },
    {
      label: "AI Agents",
      questions: [
        "How to build an autonomous AI Agent on Base?",
        "Generate system prompt for a DeFi Yield Auditor",
        "How do AI Agent prompt fees and subscriptions pay creators?"
      ]
    },
    {
      label: "DeFi & DAOs",
      questions: [
        "What is the APY for AGL Staking Vaults?",
        "How does Account Abstraction (AA) gas sponsorship work?",
        "How do DAO proposal voting thresholds work?"
      ]
    }
  ];

  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false);
  const [creditsModalData, setCreditsModalData] = useState({ featureName: "", required: 0, available: 0 });

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const creditResult = validateAndConsumeCredits({
      wallet,
      onRefreshWallet,
      requiredCredits: CREDIT_COSTS.AI_ADVISOR_CHAT,
      featureName: "AI Advisor Query",
      showToast,
      onRequestCreditsModal: (featureName, required, available) => {
        setCreditsModalData({ featureName, required, available });
        setInsufficientCreditsModalOpen(true);
      }
    });

    if (!creditResult.success) {
      setMessages(prev => [...prev, { 
        role: "user", 
        content: textToSend.trim() 
      }, {
        role: "assistant",
        content: "⚠️ SYSTEM NOTICE: Insufficient computational credits! Each query to the AI Advisor consumes 5 AGL Credits.\n\nPlease click 'Burn AGL Tokens to Buy Credits' or navigate to the AGL Credits page to top up."
      }]);
      setInput("");
      return;
    }

    const userMsg = textToSend.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatWithAgentAI(
        [...messages, { role: "user", content: userMsg }],
        {
          name: "Agunnaya General Assistant",
          symbol: "AGL-AI",
          description: "Decentralized AI Assistant powering Agunnaya Labs Studio.",
          contractAddress: "0xGeneralAssistantContractAddress"
        }
      );

      const words = response.split(" ");
      let currentText = "";
      let wordIdx = 0;
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const interval = setInterval(() => {
        if (wordIdx < words.length) {
          currentText += (wordIdx === 0 ? "" : " ") + words[wordIdx];
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: currentText };
            return updated;
          });
          wordIdx++;
        } else {
          clearInterval(interval);
          setIsLoading(false);
        }
      }, 20);

    } catch (err: any) {
      console.error(err);
      creditResult.refund();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Sorry, I encountered an issue: ${err.message || "Connection refused. Please make sure process.env.GEMINI_API_KEY is configured."}. Your 5 AGL Credits have been refunded.`
      }]);
      setIsLoading(false);
    }
  };

  // Lock document body scroll on mobile touch when open
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          id="ai-assistant-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 animate-fade-in"
          style={{ touchAction: "none" }}
        />
      )}

      <div 
        id="ai-assistant-drawer" 
        className={`fixed inset-y-0 right-0 w-80 bg-zinc-950/95 border-l border-white/10 z-50 flex flex-col justify-between shadow-2xl backdrop-blur-md overscroll-contain transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"}
        `}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/5 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-purple/20 text-brand-purple">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold font-display text-white">AI Web3 Advisor</h3>
                {isLocked && (
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5" /> Locked
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Powered by Gemini 3.6</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onToggleLock && (
              <button
                type="button"
                onClick={onToggleLock}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLocked 
                    ? "text-purple-300 bg-purple-500/20 border border-purple-500/30" 
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
                title={isLocked ? "Pinned open (Click to unlock auto-close)" : "Lock drawer pinned open"}
              >
                {isLocked ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            )}
            <button 
              id="close-ai-drawer"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-blue text-white rounded-br-none"
                  : "bg-zinc-900 border border-white/5 text-zinc-200 rounded-bl-none"
              }`}>
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-brand-purple font-bold uppercase tracking-wider">
                    <Bot className="w-3.5 h-3.5" />
                    <span>AGL Core</span>
                  </div>
                )}
                <p className="whitespace-pre-line">{m.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-3 text-xs text-zinc-400 rounded-bl-none flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-brand-purple animate-bounce" />
                <span>Thinking on Base...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Questions with Categories */}
        <div className="p-4 border-t border-white/5 bg-zinc-950/50 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                <Zap className="w-3 h-3 text-brand-purple" /> AI Suggested Queries
              </span>
              <button
                type="button"
                id="add-all-ai-sidebar-suggestions-btn"
                onClick={() => {
                  const activeCategory = predefinedCategories[selectedCategoryIdx];
                  const masterQuery = `Give me a comprehensive overview of ${activeCategory.label}:\n- ${activeCategory.questions.join("\n- ")}`;
                  setInput(masterQuery);
                  showToast("Loaded all AI suggestions for active category!", "info");
                }}
                className="text-[9px] px-2 py-0.5 rounded-md bg-brand-purple/20 border border-brand-purple/40 hover:bg-brand-purple text-purple-300 hover:text-white transition-all font-mono font-bold flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-2.5 h-2.5 text-purple-400" />
                <span>Add All AI Suggestions</span>
              </button>
            </div>

            {/* Category Selector Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {predefinedCategories.map((cat, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => setSelectedCategoryIdx(cIdx)}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-md whitespace-nowrap transition-all ${
                    selectedCategoryIdx === cIdx
                      ? "bg-brand-purple text-white font-bold"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Questions for Active Category */}
            <div className="flex flex-col gap-1">
              {predefinedCategories[selectedCategoryIdx].questions.map((q, idx) => (
                <button
                  id={`pref-q-${selectedCategoryIdx}-${idx}`}
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="w-full text-left text-[10px] text-zinc-300 hover:text-brand-purple bg-zinc-900 hover:bg-brand-purple/5 p-2 rounded-lg border border-white/5 hover:border-brand-purple/20 transition-all font-mono line-clamp-2"
                >
                  ⚡ {q}
                </button>
              ))}
            </div>
          </div>

          {/* Form Input */}
          <form 
            id="ai-assistant-input-form"
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }} 
            className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 p-1 rounded-xl focus-within:border-brand-purple/40 transition-all"
          >
            <input
              id="ai-assistant-text-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask a technical question..."
              className="bg-transparent flex-1 focus:outline-none px-2.5 py-1 text-xs text-white placeholder:text-zinc-600"
            />
            <button
              id="ai-assistant-send-button"
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-1.5 bg-brand-purple hover:bg-purple-600 text-white rounded-lg disabled:bg-zinc-800 disabled:text-zinc-500 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      <InsufficientCreditsModal
        isOpen={insufficientCreditsModalOpen}
        onClose={() => setInsufficientCreditsModalOpen(false)}
        featureName={creditsModalData.featureName}
        requiredCredits={creditsModalData.required}
        availableCredits={creditsModalData.available}
        onNavigateToCredits={() => {
          window.location.href = "/?tab=agl-credits";
        }}
      />
    </>
  );
}
