import React from "react";
import { Flame, AlertTriangle, Sparkles, X, ArrowRight, ShieldAlert, Coins } from "lucide-react";

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredCredits: number;
  availableCredits: number;
  onNavigateToCredits: () => void;
}

export default function InsufficientCreditsModal({
  isOpen,
  onClose,
  featureName,
  requiredCredits,
  availableCredits,
  onNavigateToCredits
}: InsufficientCreditsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-md p-6 bg-zinc-950 border border-purple-500/40 rounded-3xl shadow-2xl space-y-5 text-white overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white">
                Insufficient AI Credits
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Computational Quota Exhausted
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message body */}
        <div className="space-y-3 relative z-10 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500 text-[11px] uppercase font-bold">Requested Feature:</span>
              <span className="font-bold text-purple-300">{featureName || "AI Generation"}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-red-500/30 text-center">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">Required</span>
                <span className="text-red-400 text-sm font-bold block">{requiredCredits} Credits</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-amber-500/30 text-center">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">Your Balance</span>
                <span className="text-amber-300 text-sm font-bold block">{availableCredits} Credits</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            AI generation requires computational credits backed by permanently burned AGL tokens on Base Mainnet. 
            Top up your balance on the AGL Credits Burn portal to unlock uninterrupted AI contract generation, image/video rendering, and advisor queries.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 relative z-10 pt-2 font-mono">
          <button
            type="button"
            id="btn-modal-burn-credits"
            onClick={() => {
              onClose();
              onNavigateToCredits();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Burn AGL Tokens to Buy Credits</span>
            <ArrowRight className="w-4 h-4 ml-auto text-purple-200" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-xs transition-all cursor-pointer text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
