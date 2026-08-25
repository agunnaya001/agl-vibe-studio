import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  Fuel, 
  Coins, 
  FileCode, 
  Layers, 
  ArrowRight,
  AlertTriangle
} from "lucide-react";
import { AgentTransactionApprovalRequest } from "../../types/agentWorkflow";

interface AgentApprovalModalProps {
  isOpen: boolean;
  approval: AgentTransactionApprovalRequest | null;
  onApprove: () => void;
  onReject: () => void;
  isSimulated?: boolean;
}

export default function AgentApprovalModal({
  isOpen,
  approval,
  onApprove,
  onReject,
  isSimulated = false,
}: AgentApprovalModalProps) {
  if (!isOpen || !approval) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl bg-zinc-950 border border-brand-purple/40 rounded-3xl shadow-2xl shadow-brand-purple/20 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Human-in-the-Loop Transaction Approval
                  </h3>
                  {isSimulated && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Demo Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  Review transaction parameters before signing with your Web3 wallet
                </p>
              </div>
            </div>
            <button
              onClick={onReject}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-sm">
            {/* Target Network & Action Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider block mb-1">
                  Target Network
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white">
                    {approval.network === "base-mainnet" ? "Base Mainnet" : "Base Sepolia"}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    (Chain ID {approval.chainId})
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider block mb-1">
                  Contract / Method
                </span>
                <div className="flex items-center gap-2 font-mono font-bold text-brand-purple">
                  <FileCode className="w-4 h-4 text-brand-purple" />
                  <span>{approval.contractName}.{approval.functionName}</span>
                </div>
              </div>
            </div>

            {/* Expected Result Box */}
            <div className="p-4 rounded-2xl bg-brand-purple/10 border border-brand-purple/25 space-y-1">
              <span className="text-xs font-mono font-bold text-brand-purple uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Expected Outcome
              </span>
              <p className="text-zinc-200 text-xs leading-relaxed">
                {approval.expectedResult}
              </p>
            </div>

            {/* Parameters Table */}
            <div className="space-y-2">
              <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider block">
                Transaction Parameters
              </span>
              <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/40">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Parameter</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {approval.parameters.map((param, i) => (
                      <tr key={i} className="hover:bg-zinc-800/30 transition">
                        <td className="p-3 font-semibold text-white">{param.name}</td>
                        <td className="p-3 text-zinc-400">{param.type}</td>
                        <td className="p-3 truncate max-w-[200px] text-amber-300 font-medium" title={String(param.value)}>
                          {String(param.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost & Gas Breakdown */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-zinc-400" />
                  Value Sent
                </span>
                <p className="text-base font-bold text-white font-mono">{approval.valueEth} ETH</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                  Est. Gas (Base L2)
                </span>
                <p className="text-base font-bold text-emerald-400 font-mono">
                  {approval.estimatedGasEth} <span className="text-xs text-zinc-400">(~&lt;$0.05)</span>
                </p>
              </div>
            </div>

            {/* Danger Flags / Safeguards */}
            {approval.dangerFlags && approval.dangerFlags.length > 0 && (
              <div className="space-y-2">
                {approval.dangerFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 mr-1">{flag.title}:</span>
                      {flag.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between gap-4">
            <button
              onClick={onReject}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition"
            >
              Reject / Cancel
            </button>

            <button
              onClick={onApprove}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Broadcast to Base</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
