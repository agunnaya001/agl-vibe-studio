import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowDownRight, ArrowUpRight, Wallet, ShieldCheck, Check, AlertTriangle, Loader2 } from "lucide-react";
import { AutonomousAgent } from "../../types/autonomousAgent";
import { WalletState } from "../../types";
import { AutonomousAgentService } from "../../lib/autonomousAgentService";

interface DepositWithdrawTreasuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AutonomousAgent | null;
  wallet: WalletState;
  onSuccess: (updatedAgent: AutonomousAgent) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function DepositWithdrawTreasuryModal({
  isOpen,
  onClose,
  agent,
  wallet,
  onSuccess,
  showToast,
}: DepositWithdrawTreasuryModalProps) {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [amountEth, setAmountEth] = useState<string>("0.05");
  const [amountAgl, setAmountAgl] = useState<string>("500");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen || !agent) return null;

  const handleAction = async () => {
    const ethNum = parseFloat(amountEth) || 0;
    const aglNum = parseFloat(amountAgl) || 0;

    if (ethNum <= 0 && aglNum <= 0) {
      showToast("Please enter a valid ETH or AGL amount", "error");
      return;
    }

    setIsLoading(true);
    try {
      let updated: AutonomousAgent;
      if (activeTab === "deposit") {
        if (ethNum > (wallet.balanceEth || 0)) {
          showToast(`Insufficient ETH in your wallet (balance: ${wallet.balanceEth || 0} ETH)`, "error");
          setIsLoading(false);
          return;
        }
        updated = await AutonomousAgentService.depositToTreasury(agent.id, ethNum, aglNum);
        showToast(`Successfully deposited ${ethNum} ETH & ${aglNum} AGL into ${agent.name}'s treasury`, "success");
      } else {
        updated = await AutonomousAgentService.withdrawFromTreasury(agent.id, ethNum, aglNum);
        showToast(`Successfully withdrew ${ethNum} ETH & ${aglNum} AGL to your connected wallet`, "success");
      }
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      showToast(err.message || "Treasury transfer failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">Manage Dedicated Treasury</h3>
                <p className="text-xs text-zinc-400">{agent.name} • {agent.symbol}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dedicated Treasury Info Card */}
          <div className="mt-4 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-400">Agent Treasury Address:</span>
              <span className="font-mono text-blue-400">
                {agent.treasury.treasuryAddress.slice(0, 8)}...{agent.treasury.treasuryAddress.slice(-6)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60 text-xs">
              <div>
                <span className="text-zinc-500">Current ETH:</span>
                <p className="text-sm font-semibold text-white">{agent.treasury.ethBalance.toFixed(4)} ETH</p>
              </div>
              <div>
                <span className="text-zinc-500">Current AGL:</span>
                <p className="text-sm font-semibold text-purple-400">{agent.treasury.aglBalance.toLocaleString()} AGL</p>
              </div>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab("deposit")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "deposit"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowDownRight className="w-4 h-4" /> Deposit to Agent
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "withdraw"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw to Wallet
            </button>
          </div>

          {/* Inputs */}
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>ETH Amount:</span>
                <span>
                  {activeTab === "deposit"
                    ? `Wallet: ${(wallet.balanceEth || 0).toFixed(4)} ETH`
                    : `Treasury: ${agent.treasury.ethBalance.toFixed(4)} ETH`}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountEth}
                  onChange={(e) => setAmountEth(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="0.05"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAmountEth(
                      activeTab === "deposit"
                        ? ((wallet.balanceEth || 0) * 0.5).toFixed(4)
                        : (agent.treasury.ethBalance * 0.5).toFixed(4)
                    )
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-semibold bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-300"
                >
                  Half
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>AGL Token Amount:</span>
                <span>
                  {activeTab === "deposit"
                    ? `Wallet: ${(wallet.aglTokenBalance || 0).toLocaleString()} AGL`
                    : `Treasury: ${agent.treasury.aglBalance.toLocaleString()} AGL`}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={amountAgl}
                  onChange={(e) => setAmountAgl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  placeholder="500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAmountAgl(
                      activeTab === "deposit"
                        ? String(Math.floor((wallet.aglTokenBalance || 0) * 0.5))
                        : String(Math.floor(agent.treasury.aglBalance * 0.5))
                    )
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-semibold bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-300"
                >
                  Half
                </button>
              </div>
            </div>
          </div>

          {/* Security Guarantee */}
          <div className="mt-4 p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 flex items-start gap-2.5 text-xs text-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              Funds are held in this agent's isolated treasury smart wallet on Base. Non-custodial, guarded by
              autonomous circuit breakers (max 5% draw-down per cycle).
            </p>
          </div>

          {/* Action Button */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAction}
              disabled={isLoading}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all ${
                activeTab === "deposit"
                  ? "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25"
                  : "bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/25"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : activeTab === "deposit" ? (
                <>
                  <ArrowDownRight className="w-4 h-4" />
                  Confirm Deposit
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Confirm Withdrawal
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
