import React, { useState, useEffect } from "react";
import { 
  Compass, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Bot, 
  Building2, 
  ArrowRightLeft, 
  Landmark, 
  Share2, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  HelpCircle
} from "lucide-react";

export interface TourStep {
  id: string;
  tabId: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  features: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "step-welcome",
    tabId: "dashboard",
    title: "Welcome to Agunnaya Studio",
    subtitle: "Full-Stack Web3 & AI Developer Hub",
    description: "Agunnaya Studio is a full-stack platform built on Base L2. Easily deploy smart contracts, launch meme & utility tokens, stake AGL for yield, and monitor automated protocol fees.",
    icon: Sparkles,
    badge: "Getting Started",
    features: [
      "Base L2 high-speed EVM ecosystem",
      "Unified multi-account wallet management",
      "Real-time BaseScan verification & activity tracking"
    ]
  },
  {
    id: "step-ai-builder",
    tabId: "ai-builder",
    title: "AI Smart Contract & Agent Builder",
    subtitle: "Gemini AI Code Generation & Security Audits",
    description: "Use Gemini AI to instantly draft gas-optimized ERC-20 tokens, NFT collections, and autonomous security sentinels directly on Base Mainnet.",
    icon: Bot,
    badge: "AI Powered",
    features: [
      "Natural language to audited Solidity code",
      "One-click deployment via Agunnaya Token Factory",
      "Integrated vulnerability scanner & gas optimizer"
    ]
  },
  {
    id: "step-treasury",
    tabId: "treasury-monitor",
    title: "Treasury Fee Auto-Sweep Service",
    subtitle: "Automated Fee Collection to 0x7256...632E",
    description: "Monitors DEX swap fees, token mints, and AI compute charges in real time. Automatically dispatches periodic transactions to sweep protocol revenue straight to the Treasury Wallet.",
    icon: Building2,
    badge: "Automated DeFi Service",
    features: [
      "Configurable ETH & AGL threshold triggers",
      "Automatic background worker dispatches",
      "Transparent audit logs with BaseScan transaction hashes"
    ]
  },
  {
    id: "step-dex",
    tabId: "defi",
    title: "DEX Aggregator & Bonding Curves",
    subtitle: "Optimal Swaps & Liquidity Pools",
    description: "Trade tokens across Uniswap V3, Aerodrome, and Agunnaya Bonding Curves with minimum slippage and automated 0.3% protocol fee route to Treasury.",
    icon: ArrowRightLeft,
    badge: "Liquidity & Swaps",
    features: [
      "Multi-DEX routing with live price depth",
      "Fair-launch bonding curves with automated LP migration",
      "Real-time DEX price alerts & candlestick charts"
    ]
  },
  {
    id: "step-governance",
    tabId: "staking-vault",
    title: "Staking Vaults & DAO Governance",
    subtitle: "Up to 28.5% APY Yield & Voting Power",
    description: "Lock AGL tokens in automated yield vaults to earn protocol fee distribution, vote on governance proposals, and manage community grants.",
    icon: Landmark,
    badge: "Yield & Governance",
    features: [
      "Flexible & locked AGL staking tiers",
      "On-chain DAO proposal voting with voting weight",
      "Automated fee share payout distributions"
    ]
  },
  {
    id: "step-sdk",
    tabId: "referrals",
    title: "Agunnaya SDK & Viral Growth",
    subtitle: "@agunnaya/sdk & Referral Rewards",
    description: "Integrate the official Agunnaya SDK into your dApps and share referral links to earn bonus AGL compute credits whenever friends deploy or swap.",
    icon: Share2,
    badge: "SDK & Viral Growth",
    features: [
      "TypeScript @agunnaya/sdk framework integration",
      "Instant native Web3 social referral links",
      "Free AI compute credit rewards"
    ]
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function OnboardingTour({
  isOpen,
  onClose,
  onSelectTab,
  showToast
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Switch active view to match current step
      const step = TOUR_STEPS[currentStepIndex];
      if (step) {
        onSelectTab(step.tabId);
      }
    }
  }, [isOpen, currentStepIndex, onSelectTab]);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const IconComponent = currentStep.icon;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      onSelectTab(TOUR_STEPS[nextIndex].tabId);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      onSelectTab(TOUR_STEPS[prevIndex].tabId);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("agunnaya_tour_completed_v1", "true");
    showToast("🎉 Onboarding Tour Completed! Enjoy building on Agunnaya Studio.", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Background Glow */}
      <div className="absolute w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Tour Card */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-purple-500/40 rounded-3xl p-6 md:p-8 shadow-2xl shadow-purple-950/80 space-y-6 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
              {currentStep.badge}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            title="Close Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/50 rounded-2xl text-purple-300 shadow-lg shrink-0">
            <IconComponent className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono text-purple-400 font-semibold">
              Step {currentStepIndex + 1} of {TOUR_STEPS.length}
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {currentStep.title}
            </h2>
            <p className="text-xs text-purple-300 font-medium">
              {currentStep.subtitle}
            </p>
          </div>
        </div>

        {/* Description Body */}
        <div className="text-sm text-zinc-300 leading-relaxed bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
          <p>{currentStep.description}</p>

          <div className="space-y-1.5 pt-2 border-t border-white/5">
            {currentStep.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  onSelectTab(step.tabId);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? "w-7 bg-purple-500 shadow-sm shadow-purple-500/50"
                    : "w-2 bg-zinc-700 hover:bg-zinc-600"
                }`}
                title={`Go to ${step.title}`}
              />
            ))}
          </div>

          <button
            onClick={handleComplete}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-medium underline"
          >
            Skip Tour
          </button>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2"
          >
            <span>{isLastStep ? "Finish Tour" : "Next Step"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
