import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Token } from "../types";
import ImageWithFallback from "./ImageWithFallback";
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Flame, 
  Coins, 
  X, 
  AlertTriangle,
  Info,
  Zap,
  DollarSign,
  Layers,
  Fuel
} from "lucide-react";

interface TradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tradeMode: "buy" | "sell";
  token: Token;
  inputAmount: number; // ETH for buy, Tokens for sell
  estimatedOutput: number; // Tokens for buy, ETH for sell
  priceImpact: number;
  slippage: number;
  gasMode: "standard" | "fast" | "instant";
  gasFee: number;
  isSmartAccount: boolean;
  walletBalanceEth: number;
  isLoading: boolean;
}

export default function TradeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  tradeMode,
  token,
  inputAmount,
  estimatedOutput,
  priceImpact,
  slippage,
  gasMode,
  gasFee,
  isSmartAccount,
  walletBalanceEth,
  isLoading
}: TradeConfirmationModalProps) {
  if (!isOpen) return null;

  const isBuy = tradeMode === "buy";

  // Financial calculations
  const creatorFeeEth = isBuy ? inputAmount * 0.01 : estimatedOutput * 0.01;
  const effectiveGasFee = isSmartAccount ? 0 : gasFee;
  const totalEthCost = isBuy ? inputAmount + effectiveGasFee : effectiveGasFee;
  const netEthReceived = isBuy ? 0 : Math.max(0, estimatedOutput - effectiveGasFee);
  
  const minimumOutput = estimatedOutput * (1 - slippage / 100);
  const remainingEthBalance = isBuy 
    ? walletBalanceEth - totalEthCost 
    : walletBalanceEth + netEthReceived;

  const gasGweiLabel = isSmartAccount 
    ? "0 Gwei (AA Sponsored)" 
    : gasMode === "standard" 
    ? "~15 Gwei (Standard)" 
    : gasMode === "fast" 
    ? "~25 Gwei (Fast)" 
    : "~50 Gwei (Instant)";

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="trade-confirmation-modal-backdrop"
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          id="trade-confirmation-modal-panel"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg my-auto rounded-2xl glass-panel border border-white/10 glow-border-purple shadow-2xl bg-zinc-950 text-white overflow-hidden"
        >
          {/* Top Decorative Ambient Glow */}
          <div 
            className={`absolute top-0 inset-x-0 h-1.5 ${
              isBuy ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" : "bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600"
            }`}
          />
          
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isBuy 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display tracking-tight text-white flex items-center gap-2">
                    {isBuy ? "Confirm Token Purchase" : "Confirm Token Sale"}
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                      isBuy ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}>
                      {tradeMode}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">Review total cost in ETH, slippage, and gas estimate</p>
                </div>
              </div>

              <button
                id="close-confirm-modal-btn"
                onClick={onClose}
                disabled={isLoading}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Token & Swapping Visual Banner */}
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/5 flex items-center justify-between gap-3 font-mono">
              {/* Left Side: Paying */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
                  {isBuy ? "You Pay" : "You Sell"}
                </span>
                <span className="text-sm font-extrabold text-white block">
                  {isBuy ? `${inputAmount.toFixed(4)} ETH` : `${inputAmount.toLocaleString()} ${token.symbol}`}
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  {isBuy ? `@ ~$${(inputAmount * 3200).toFixed(2)} USD` : `@ ~$${(token.currentPrice * 3200).toFixed(6)} / token`}
                </span>
              </div>

              {/* Center Arrow */}
              <div className="p-2.5 rounded-full bg-black/60 border border-white/10 text-brand-purple shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Right Side: Receiving */}
              <div className="space-y-1 text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
                  {isBuy ? "You Receive (Est.)" : "You Receive (Est.)"}
                </span>
                <span className={`text-sm font-extrabold block ${isBuy ? "text-emerald-400" : "text-white"}`}>
                  {isBuy 
                    ? `${estimatedOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol}`
                    : `${estimatedOutput.toFixed(5)} ETH`}
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  {isBuy ? `@ ~${(token.currentPrice * 1000000).toFixed(3)} μETH / token` : `@ ~$${(estimatedOutput * 3200).toFixed(2)} USD`}
                </span>
              </div>
            </div>

            {/* Comprehensive Cost & Fee Breakdown Table */}
            <div className="space-y-2 bg-black/50 p-4 rounded-xl border border-white/10 text-xs font-mono">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2 font-display">
                Order Financial Breakdown
              </span>

              {/* Purchase Base Cost */}
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-300">
                <span className="text-zinc-400">Token Cost:</span>
                <span className="font-bold text-white">
                  {isBuy ? `${inputAmount.toFixed(4)} ETH` : `${inputAmount.toLocaleString()} ${token.symbol}`}
                </span>
              </div>

              {/* Creator Fee */}
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-300">
                <span className="text-zinc-400">Creator & Protocol Fee (1%):</span>
                <span className="text-zinc-200">{creatorFeeEth.toFixed(6)} ETH</span>
              </div>

              {/* Gas Fee Estimate */}
              <div className="flex justify-between py-1 border-b border-white/5 text-zinc-300">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-amber-400" /> Gas Fee Estimate:
                </span>
                {isSmartAccount ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 0.0000 ETH (Sponsored)
                  </span>
                ) : (
                  <span className="text-amber-300 font-bold">
                    {effectiveGasFee.toFixed(4)} ETH ({gasGweiLabel})
                  </span>
                )}
              </div>

              {/* Total Cost in ETH */}
              <div className="flex justify-between py-1.5 border-b border-white/10 text-sm font-bold">
                <span className="text-white">Total Cost in ETH:</span>
                <span className="text-brand-purple font-extrabold text-base">
                  {isBuy ? `${totalEthCost.toFixed(5)} ETH` : `${effectiveGasFee.toFixed(5)} ETH Gas`}
                </span>
              </div>

              {/* Expected Slippage & Price Impact */}
              <div className="pt-2 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Expected Slippage Tolerance:</span>
                  <span className="font-bold text-zinc-200">{slippage.toFixed(1)}%</span>
                </div>

                <div className="flex justify-between text-zinc-400">
                  <span>Price Impact:</span>
                  <span className={`font-bold ${
                    priceImpact < 1 ? "text-emerald-400" : priceImpact < 5 ? "text-amber-400" : "text-rose-400"
                  }`}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between text-zinc-400">
                  <span>Minimum Guaranteed Output:</span>
                  <span className="font-semibold text-zinc-300">
                    {isBuy 
                      ? `${minimumOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol}`
                      : `${minimumOutput.toFixed(5)} ETH`}
                  </span>
                </div>
              </div>

              {/* Balance Impact */}
              <div className="mt-3 pt-2 border-t border-white/10 flex justify-between text-[11px] text-zinc-400">
                <span>Wallet ETH Balance After Trade:</span>
                <span className={`font-bold ${remainingEthBalance < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {remainingEthBalance.toFixed(4)} ETH
                </span>
              </div>
            </div>

            {/* Warnings or Highlights */}
            {priceImpact > 3.0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-mono">
                  High price impact ({priceImpact.toFixed(2)}%). Large order sizes shift the linear bonding curve spot price significantly.
                </p>
              </div>
            )}

            {isSmartAccount && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-[11px] font-mono">
                  Account Abstraction Relayer active: Gas fee is 100% sponsored by Agunnaya Vault.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                id="cancel-trade-btn"
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs transition-all border border-white/10 font-display disabled:opacity-50"
              >
                Cancel / Edit
              </button>

              <button
                id="confirm-trade-btn"
                type="button"
                onClick={onConfirm}
                disabled={isLoading || (isBuy && totalEthCost > walletBalanceEth)}
                className={`flex-1 py-3 rounded-xl font-bold font-display text-xs text-white shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isBuy 
                    ? "bg-emerald-500 hover:bg-emerald-600 text-black shadow-emerald-500/20" 
                    : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Broadcasting to Base L2...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm {isBuy ? "Purchase" : "Sale"} Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
