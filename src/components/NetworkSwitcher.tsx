import React from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { useAGLWallet } from "../hooks/useAGLWallet";
import { BASE_MAINNET, BASE_SEPOLIA, SUPPORTED_CHAINS } from "../lib/chains";

interface NetworkSwitcherProps {
  className?: string;
  showDetails?: boolean;
}

export default function NetworkSwitcher({
  className = "",
  showDetails = false,
}: NetworkSwitcherProps) {
  const { chainId, chainName, isBaseNetwork, switchToBase, isConnected } = useAGLWallet();

  if (!isConnected) return null;

  if (isBaseNetwork) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold">Base Mainnet</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-mono animate-fade-in ${className}`}>
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-bold">Wrong Network: {chainName || `Chain ${chainId}`}</span>
        {showDetails && (
          <p className="text-[10px] text-zinc-300 mt-0.5">
            AGL Studio requires Base Mainnet (8453) for contract interactions and rewards.
          </p>
        )}
      </div>
      <button
        onClick={switchToBase}
        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] cursor-pointer shadow-sm transition-colors shrink-0"
      >
        Switch to Base
      </button>
    </div>
  );
}
