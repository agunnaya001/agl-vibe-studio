import React, { useState } from "react";
import { ethers } from "ethers";
import { Wallet, ShieldCheck, ChevronDown, AlertTriangle } from "lucide-react";
import { useAGLWallet } from "../hooks/useAGLWallet";
import ConnectedWalletMenu from "./ConnectedWalletMenu";
import UniversalWalletModal from "./UniversalWalletModal";
import { WalletState } from "../types";

interface UniversalConnectButtonProps {
  wallet?: WalletState;
  onRefreshWallet?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
  className?: string;
}

export default function UniversalConnectButton({
  wallet,
  onRefreshWallet,
  showToast,
  className = "",
}: UniversalConnectButtonProps) {
  const {
    isConnected,
    address,
    walletName,
    walletIcon,
    isBaseNetwork,
    chainName,
    nativeBalance,
    aglTokenBalance,
    isConnecting,
  } = useAGLWallet();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Shorten address helper
  const shorten = (addr?: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected || !address) {
    return (
      <>
        <button
          id="universal-connect-wallet-btn"
          onClick={() => setIsConnectModalOpen(true)}
          disabled={isConnecting}
          className={`px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue via-indigo-600 to-brand-purple hover:opacity-95 text-white font-bold font-display text-xs flex items-center gap-2 shadow-lg shadow-brand-blue/20 transition-all cursor-pointer disabled:opacity-50 ${className}`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
        </button>

        <UniversalWalletModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          showToast={showToast}
        />
      </>
    );
  }

  return (
    <>
      <button
        id="universal-connected-wallet-btn"
        onClick={() => setIsMenuOpen(true)}
        className={`flex items-center gap-2 p-1.5 pl-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border ${
          !isBaseNetwork ? "border-amber-500/50 text-amber-300" : "border-white/10 hover:border-brand-blue/40 text-white"
        } transition-all cursor-pointer font-mono text-xs ${className}`}
      >
        {/* Network indicator dot */}
        <span
          className={`w-2 h-2 rounded-full ${
            !isBaseNetwork ? "bg-amber-400 animate-ping" : "bg-emerald-400"
          }`}
          title={isBaseNetwork ? "Base Mainnet (8453)" : `Wrong Network: ${chainName}`}
        />

        {/* Wallet icon or symbol */}
        {walletIcon ? (
          <img src={walletIcon} alt={walletName} className="w-4 h-4 rounded-md object-contain" />
        ) : (
          <Wallet className="w-3.5 h-3.5 text-brand-blue" />
        )}

        {/* Short address */}
        <span className="font-bold">{shorten(address)}</span>

        {/* Balance Preview on desktop */}
        {nativeBalance && (
          <span className="hidden md:inline text-[11px] text-zinc-400 border-l border-white/10 pl-2">
            {parseFloat(ethers.formatUnits(nativeBalance.value, nativeBalance.decimals)).toFixed(3)} ETH
          </span>
        )}

        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-0.5" />
      </button>

      {/* Connected Menu Dropdown */}
      <ConnectedWalletMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        showToast={showToast}
        onOpenSubAccounts={() => setIsConnectModalOpen(true)}
      />

      {/* Sub-Accounts / Full Modal */}
      <UniversalWalletModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        wallet={wallet}
        onRefreshWallet={onRefreshWallet}
        showToast={showToast}
      />
    </>
  );
}
