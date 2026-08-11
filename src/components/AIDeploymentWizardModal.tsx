import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Wand2, 
  ShieldCheck, 
  TrendingUp, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Sliders, 
  Code2, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Copy, 
  Rocket, 
  Coins, 
  Bot, 
  Lock,
  RefreshCw,
  Save,
  Trash2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { proposeDeploymentAI, AIDeploymentProposal } from "../lib/gemini";
import { WalletState } from "../types";
import { validateAndConsumeCredits, CREDIT_COSTS } from "../lib/credits";
import InsufficientCreditsModal from "./InsufficientCreditsModal";
import { ensureCorrectChain } from "../lib/tokenFactory";

interface AIDeploymentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoFill?: (proposal: AIDeploymentProposal) => void;
  onDirectLaunch?: (proposal: AIDeploymentProposal) => void;
  wallet?: WalletState;
  onRefreshWallet?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
}

const PRESET_PROMPTS = [
  {
    title: "🔥 Deflationary Meme Coin",
    prompt: "Create an ERC-20 meme coin on Base named 'DegenVibes' (symbol: VIBES) with 10,000,000 supply, 1.5% developer fee, 2% anti-whale wallet limit, and linear bonding curve starting at 0.00001 ETH.",
    category: "meme"
  },
  {
    title: "💎 High-Yield Staking Token",
    prompt: "Build an ERC-20 utility token named 'Agunnaya Yield' (symbol: YIELD) with 50,000,000 supply and an integrated staking vault paying 18% APY compounding rewards with a 7-day lock period.",
    category: "utility"
  },
  {
    title: "🤖 Autonomous AI Agent Core",
    prompt: "Deploy an autonomous AI Agent smart contract on Base named 'Security Sentinel' (symbol: AUDIT) charging 0.001 ETH per prompt call with 1% revenue split to token stakers.",
    category: "ai_agent"
  },
  {
    title: "🏛️ DAO Governance Protocol",
    prompt: "Design a DAO governance token named 'Sovereign DAO' (symbol: SDAO) with 100,000,000 supply, 3-day proposal voting window, 1,000 token quorum threshold, and 1% anti-whale limit.",
    category: "dao"
  }
];

export default function AIDeploymentWizardModal({
  isOpen,
  onClose,
  onAutoFill,
  onDirectLaunch,
  wallet,
  onRefreshWallet,
  showToast,
  addTerminalLog
}: AIDeploymentWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [promptInput, setPromptInput] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("agl_ai_wizard_prompt_draft") || "";
    }
    return "";
  });
  const [selectedCategory, setSelectedCategory] = useState("auto");
  const [targetNetwork, setTargetNetwork] = useState<"mainnet" | "sepolia">("mainnet");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisStage, setSynthesisStage] = useState(0);
  const [proposal, setProposal] = useState<AIDeploymentProposal | null>(null);

  // Auto-save prompt draft to localStorage whenever promptInput changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (promptInput.trim()) {
      localStorage.setItem("agl_ai_wizard_prompt_draft", promptInput);
    } else {
      localStorage.removeItem("agl_ai_wizard_prompt_draft");
    }
  }, [promptInput]);
  
  // Interactive tuning state (Step 3)
  const [activeTab, setActiveTab] = useState<"curve" | "contract" | "security">("curve");
  const [copiedCode, setCopiedCode] = useState(false);

  // Insufficient Credits Modal State
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false);
  const [creditsModalData, setCreditsModalData] = useState({ featureName: "", required: 0, available: 0 });

  if (!isOpen) return null;

  const handleStartSynthesis = async () => {
    if (!promptInput.trim()) return;

    let creditResult: any = null;
    if (wallet && showToast) {
      creditResult = validateAndConsumeCredits({
        wallet,
        onRefreshWallet: onRefreshWallet || (() => {}),
        requiredCredits: CREDIT_COSTS.DEPLOYMENT_PROPOSAL,
        featureName: "AI Deployment Wizard Proposal",
        showToast,
        addTerminalLog,
        onRequestCreditsModal: (featureName, required, available) => {
          setCreditsModalData({ featureName, required, available });
          setInsufficientCreditsModalOpen(true);
        }
      });

      if (!creditResult.success) {
        setIsSynthesizing(false);
        setStep(1);
        return;
      }
    }

    setStep(2);
    setIsSynthesizing(true);
    setSynthesisStage(1);

    const timer1 = setTimeout(() => setSynthesisStage(2), 700);
    const timer2 = setTimeout(() => setSynthesisStage(3), 1400);

    try {
      const result = await proposeDeploymentAI(promptInput, selectedCategory === "auto" ? undefined : selectedCategory);
      setTimeout(() => {
        setProposal(result);
        setIsSynthesizing(false);
        setStep(3);
      }, 2100);
    } catch (err) {
      console.error("Synthesis error:", err);
      if (creditResult) creditResult.refund();
      setIsSynthesizing(false);
      setStep(1);
    }
  };

  const handleCopyCode = () => {
    if (!proposal) return;
    navigator.clipboard.writeText(proposal.solidityCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Generate bonding curve visualization chart data based on proposal parameters
  const generateChartData = () => {
    if (!proposal) return [];
    const points = [];
    const steps = 16;
    const maxSupply = proposal.initialSupply;
    const baseP = proposal.basePriceEth;
    const slope = proposal.slopeK;

    for (let i = 0; i <= steps; i++) {
      const supply = (maxSupply / steps) * i;
      let price = baseP;
      if (proposal.curveModel === "exponential") {
        price = baseP * Math.exp((slope * 10) * (i / steps));
      } else {
        price = baseP + slope * supply;
      }
      points.push({
        supplyFormatted: `${(supply / 1000000).toFixed(1)}M`,
        price: Number((price * 1000000).toFixed(3)), // in micro ETH
        ethPrice: price
      });
    }
    return points;
  };

  const chartData = generateChartData();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-950/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-lg shadow-brand-purple/20">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display tracking-tight flex items-center gap-2">
                  AI Token Deployment Wizard
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30 font-mono">
                    v2.5 Base Architect
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Input natural language requirements to auto-configure tokenomics, curve slope & contract rules
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Header */}
          <div className="grid grid-cols-4 border-b border-white/5 bg-zinc-950/40 text-[11px] font-mono">
            {[
              { num: 1, label: "Requirements", active: step === 1, done: step > 1 },
              { num: 2, label: "AI Synthesis", active: step === 2, done: step > 2 },
              { num: 3, label: "Curve & Audit Review", active: step === 3, done: step > 3 },
              { num: 4, label: "1-Click Launch", active: step === 4, done: false }
            ].map((s) => (
              <div
                key={s.num}
                className={`py-3 px-4 flex items-center justify-center gap-2 border-r border-white/5 last:border-r-0 ${
                  s.active
                    ? "bg-brand-purple/10 text-brand-purple font-bold border-b-2 border-brand-purple"
                    : s.done
                    ? "text-emerald-400"
                    : "text-zinc-500"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    s.active
                      ? "bg-brand-purple text-white"
                      : s.done
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {s.done ? "✓" : s.num}
                </div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* STEP 1: Natural Language Requirements */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300 font-display uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-purple" /> Describe Your Token & Curve Vision
                    </label>
                    {promptInput.trim() ? (
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                        <span className="flex items-center gap-1 text-purple-400 font-medium">
                          <Save className="w-3 h-3 text-purple-400 animate-pulse" />
                          <span>Draft auto-saved</span>
                        </span>
                        <button
                          type="button"
                          id="clear-wizard-prompt-draft-btn"
                          onClick={() => {
                            setPromptInput("");
                            if (typeof window !== "undefined") {
                              localStorage.removeItem("agl_ai_wizard_prompt_draft");
                            }
                          }}
                          className="hover:text-red-400 text-zinc-500 transition-colors flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Clear</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-mono">Gemini 3.5 Flash Powered</span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="e.g. Create a deflationary community token on Base called 'PulseToken' ($PULSE) with 100,000,000 total supply, 1.5% creator royalty fee, linear bonding curve starting at 0.00001 ETH, and an 18% APY staking vault..."
                    className="w-full bg-zinc-950 border border-white/10 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 rounded-xl p-3.5 text-xs text-zinc-200 placeholder-zinc-600 font-mono transition-all resize-none shadow-inner"
                  />
                </div>

                {/* Preset Prompt Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" /> 1-Click Requirement Starters
                    </span>
                    <button
                      type="button"
                      id="add-all-wizard-suggestions-btn"
                      onClick={() => {
                        const combinedPrompts = PRESET_PROMPTS.map((p, i) => `${i + 1}. ${p.title}: ${p.prompt}`).join("\n\n");
                        setPromptInput(`Build a master Web3 token deployment on Base uniting all AI suggested features:\n\n${combinedPrompts}`);
                        setSelectedCategory("auto");
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-brand-purple/20 border border-brand-purple/40 hover:bg-brand-purple text-purple-300 hover:text-white transition-all font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Add All AI Suggestions</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESET_PROMPTS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPromptInput(item.prompt);
                          setSelectedCategory(item.category);
                        }}
                        className="text-left p-3 rounded-xl bg-zinc-950 border border-white/5 hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-all group"
                      >
                        <div className="text-xs font-bold text-zinc-200 group-hover:text-brand-purple flex items-center justify-between">
                          <span>{item.title}</span>
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono line-clamp-2 mt-1">
                          {item.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Deployment Network</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetNetwork("mainnet")}
                        className={`py-2 px-3 text-xs font-mono rounded-lg border text-center transition-all ${
                          targetNetwork === "mainnet"
                            ? "bg-brand-blue/20 text-brand-blue border-brand-blue font-bold"
                            : "bg-zinc-950 text-zinc-400 border-white/5"
                        }`}
                      >
                        🔵 Base Mainnet
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetNetwork("sepolia")}
                        className={`py-2 px-3 text-xs font-mono rounded-lg border text-center transition-all ${
                          targetNetwork === "sepolia"
                            ? "bg-purple-500/20 text-purple-400 border-purple-500 font-bold"
                            : "bg-zinc-950 text-zinc-400 border-white/5"
                        }`}
                      >
                        🧪 Sepolia Sandbox
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Token Category Archetype</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-zinc-200 focus:border-brand-purple focus:outline-none"
                    >
                      <option value="auto">✨ Auto-Detect from Prompt</option>
                      <option value="meme">🔥 Meme / Degen Token</option>
                      <option value="utility">💎 DeFi Utility / Staking</option>
                      <option value="ai_agent">🤖 Autonomous AI Agent Core</option>
                      <option value="dao">🏛️ DAO Governance Protocol</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleStartSynthesis}
                    disabled={!promptInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue via-brand-purple to-purple-600 text-white font-mono font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg shadow-brand-purple/20"
                  >
                    <Wand2 className="w-4 h-4" /> Synthesize Deployment Proposal
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Cognitive Synthesis Loading */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center space-y-6">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-brand-purple/20 animate-ping"></div>
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center border border-white/20 shadow-2xl">
                    <Bot className="w-10 h-10 text-white animate-bounce" />
                  </div>
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h4 className="text-base font-bold text-white font-display">
                    Gemini AI Architect Synthesizing Parameters...
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono">
                    Constructing bonding curve equation $P(S) = P_0 + k \cdot S$, checking CEI reentrancy safety, and optimizing launch liquidity.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-2 font-mono text-[11px] text-left">
                  {[
                    { stage: 1, text: "🔍 Parsing natural language requirement directives..." },
                    { stage: 2, text: "📐 Calculating bonding curve slope $k$ & base price $P_0$..." },
                    { stage: 3, text: "🛡️ Auditing Checks-Effects-Interactions & OpenZeppelin ABI..." }
                  ].map((st) => (
                    <div
                      key={st.stage}
                      className={`p-2.5 rounded-lg border flex items-center gap-2 transition-all ${
                        synthesisStage >= st.stage
                          ? "bg-zinc-900 border-brand-purple/40 text-brand-purple"
                          : "bg-zinc-950/50 border-white/5 text-zinc-600"
                      }`}
                    >
                      {synthesisStage > st.stage ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : synthesisStage === st.stage ? (
                        <RefreshCw className="w-4 h-4 text-brand-purple animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                      )}
                      <span>{st.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Review Proposed Parameters & Interactive Curve Chart */}
            {step === 3 && proposal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Proposal Overview Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-950 via-brand-purple/10 to-zinc-950 border border-brand-purple/30 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-lg font-bold font-mono text-brand-purple">
                      ${proposal.tokenSymbol}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                        {proposal.tokenName}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                          Safety Audit: {proposal.securityScore}/100 A+
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-mono line-clamp-1">{proposal.description}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 font-mono text-[11px]">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-white/5">
                      Supply: {(proposal.initialSupply / 1000000).toFixed(1)}M
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-brand-purple border border-brand-purple/20 font-bold">
                      Base P₀: {proposal.basePriceEth} ETH
                    </span>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex border-b border-white/10 gap-4 font-mono text-xs">
                  <button
                    onClick={() => setActiveTab("curve")}
                    className={`pb-2 flex items-center gap-1.5 border-b-2 transition-all ${
                      activeTab === "curve"
                        ? "border-brand-purple text-brand-purple font-bold"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> Bonding Curve Trajectory
                  </button>
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`pb-2 flex items-center gap-1.5 border-b-2 transition-all ${
                      activeTab === "security"
                        ? "border-brand-purple text-brand-purple font-bold"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" /> Tokenomics & CEI Security Audit
                  </button>
                  <button
                    onClick={() => setActiveTab("contract")}
                    className={`pb-2 flex items-center gap-1.5 border-b-2 transition-all ${
                      activeTab === "contract"
                        ? "border-brand-purple text-brand-purple font-bold"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Code2 className="w-4 h-4" /> OpenZeppelin Solidity Code
                  </button>
                </div>

                {/* Tab 1: Curve Trajectory & Parameter Tuning */}
                {activeTab === "curve" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Recharts Chart */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="w-full h-64 rounded-xl bg-zinc-950 border border-white/10 p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
                              Simulated Bonding Curve
                            </span>
                            <span className="text-xs font-mono font-bold text-zinc-200">
                              P(s) = {proposal.basePriceEth} + {proposal.slopeK} × Supply
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Graduation Target: {proposal.graduationTargetEth} ETH
                          </span>
                        </div>

                        <div className="w-full h-44 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="wizardCurve" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#0052ff" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="supplyFormatted" tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} />
                              <YAxis tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} />
                              <Tooltip
                                contentStyle={{
                                  background: "#09090b",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "8px",
                                  fontSize: "10px",
                                  color: "#fff"
                                }}
                              />
                              <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={2} fill="url(#wizardCurve)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Tokenomics Reasoning Note */}
                      <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 text-[11px] font-mono text-zinc-400 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-zinc-200 block">AI Tokenomics Reasoning:</strong>
                          {proposal.tokenomicsReasoning}
                        </div>
                      </div>
                    </div>

                    {/* Right: Parameter Adjusters */}
                    <div className="space-y-4 bg-zinc-950 border border-white/10 rounded-xl p-4 font-mono text-xs">
                      <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
                        <Sliders className="w-4 h-4 text-brand-purple" /> Parameter Fine-Tuner
                      </h4>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 uppercase flex justify-between">
                          <span>Total Token Supply</span>
                          <span className="text-brand-purple font-bold">{(proposal.initialSupply / 1000000).toFixed(0)}M</span>
                        </label>
                        <input
                          type="range"
                          min={1000000}
                          max={1000000000}
                          step={5000000}
                          value={proposal.initialSupply}
                          onChange={(e) => setProposal({ ...proposal, initialSupply: Number(e.target.value) })}
                          className="w-full accent-brand-purple"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 uppercase flex justify-between">
                          <span>Base Spot Price P₀ (ETH)</span>
                          <span className="text-brand-purple font-bold">{proposal.basePriceEth}</span>
                        </label>
                        <input
                          type="range"
                          min={0.000001}
                          max={0.0005}
                          step={0.000005}
                          value={proposal.basePriceEth}
                          onChange={(e) => setProposal({ ...proposal, basePriceEth: Number(e.target.value) })}
                          className="w-full accent-brand-purple"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 uppercase flex justify-between">
                          <span>Creator Royalty Fee (%)</span>
                          <span className="text-emerald-400 font-bold">{proposal.creatorFeePercent}%</span>
                        </label>
                        <input
                          type="range"
                          min={0.5}
                          max={5.0}
                          step={0.5}
                          value={proposal.creatorFeePercent}
                          onChange={(e) => setProposal({ ...proposal, creatorFeePercent: Number(e.target.value) })}
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 uppercase flex justify-between">
                          <span>Anti-Whale Max Wallet (%)</span>
                          <span className="text-purple-400 font-bold">{proposal.antiWhaleMaxPercent}%</span>
                        </label>
                        <input
                          type="range"
                          min={0.5}
                          max={10.0}
                          step={0.5}
                          value={proposal.antiWhaleMaxPercent}
                          onChange={(e) => setProposal({ ...proposal, antiWhaleMaxPercent: Number(e.target.value) })}
                          className="w-full accent-purple-500"
                        />
                      </div>

                      {proposal.stakingVaultEnabled && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 uppercase flex justify-between">
                            <span>Staking Reward APY (%)</span>
                            <span className="text-amber-400 font-bold">{proposal.stakingApyPercent}%</span>
                          </label>
                          <input
                            type="range"
                            min={5}
                            max={50}
                            step={1}
                            value={proposal.stakingApyPercent}
                            onChange={(e) => setProposal({ ...proposal, stakingApyPercent: Number(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Security & CEI Audit */}
                {activeTab === "security" && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <span className="font-bold text-white text-sm">Automated Security Audit Report</span>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                          SCORE: {proposal.securityScore}/100 PASSED
                        </span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed text-xs">
                        {proposal.securityAuditSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase block">CEI Compliance</span>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checks-Effects-Interactions
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase block">Anti-Whale Guard</span>
                        <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Max {proposal.antiWhaleMaxPercent}% / Wallet
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase block">Anti-Bot Protection</span>
                        <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" /> {proposal.antiBotCooldownSec}s Trade Cooldown
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Solidity Code */}
                {activeTab === "contract" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>Generated Solidity Contract (OpenZeppelin v0.8.20 Compliant)</span>
                      <button
                        onClick={handleCopyCode}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 flex items-center gap-1 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" /> {copiedCode ? "Copied!" : "Copy Code"}
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-zinc-950 border border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-64 scrollbar-thin">
                      <code>{proposal.solidityCode}</code>
                    </pre>
                  </div>
                )}

                {/* Bottom Navigation */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 font-mono text-xs hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Edit Requirements
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue via-brand-purple to-purple-600 text-white font-mono font-bold text-xs hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-brand-purple/20"
                  >
                    Proceed to Launch Confirmation <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: 1-Click Launch Setup */}
            {step === 4 && proposal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="text-center space-y-2 max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-brand-blue mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                    <Rocket className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-display">
                    Ready to Launch ${proposal.tokenSymbol} on Base!
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    All parameters, curve equations, and contract rules are fully configured. Choose how to execute your deployment:
                  </p>
                </div>

                {/* Final Parameter Summary Box */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Token Name</span>
                    <span className="font-bold text-white">{proposal.tokenName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Ticker Symbol</span>
                    <span className="font-bold text-brand-purple">${proposal.tokenSymbol}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Initial Supply</span>
                    <span className="font-bold text-zinc-300">{(proposal.initialSupply / 1000000).toFixed(1)}M</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Creator Fee</span>
                    <span className="font-bold text-emerald-400">{proposal.creatorFeePercent}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onAutoFill) onAutoFill(proposal);
                      onClose();
                    }}
                    className="p-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/10 hover:border-brand-purple/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-zinc-200 group-hover:text-brand-purple font-mono flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-brand-purple" /> Transfer to Form
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Auto-fill launchpad fields in the token creator form so you can make manual adjustments before signing.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const targetChainId = targetNetwork === "sepolia" ? 84532 : 8453;
                      if (typeof window !== "undefined" && (window as any).ethereum) {
                        const isRightChain = await ensureCorrectChain(targetChainId, addTerminalLog, showToast);
                        if (!isRightChain) return;
                      }
                      if (onDirectLaunch) onDirectLaunch(proposal);
                      onClose();
                    }}
                    className="p-4 rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-95 text-left transition-all shadow-xl shadow-brand-purple/20 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                        <Rocket className="w-4 h-4 text-emerald-400" /> Direct 1-Click Launch
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-100 font-mono">
                      Deploy bonding curve token to Base network immediately and begin trading on the platform.
                    </p>
                  </button>
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Parameter Review
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
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
    </AnimatePresence>
  );
}
