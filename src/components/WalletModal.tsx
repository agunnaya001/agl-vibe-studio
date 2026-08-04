import { useEffect, type MouseEvent } from "react";
import { Wallet, Shield, Zap, Key } from "lucide-react";
import { WalletState } from "../types";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: WalletState["walletType"]) => void;
}

export default function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
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

  if (!isOpen) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      id="wallet-modal-container" 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overscroll-contain"
    >
      <div 
        id="wallet-modal-panel"
        className="relative w-full max-w-md p-6 overflow-hidden rounded-2xl glass-panel border border-white/10 glow-border-purple animate-fade-in"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-brand-blue/10 blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-purple/20">
              <Wallet className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <h3 className="text-lg font-semibold font-display tracking-tight text-white">Connect Wallet</h3>
              <p className="text-xs text-zinc-400">Select how you want to connect to Base</p>
            </div>
          </div>
          <button 
            id="close-wallet-modal"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* Smart Account */}
          <button
            id="connect-smart-account"
            onClick={() => onConnect("smart")}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-brand-purple/30 bg-brand-purple/5 hover:bg-brand-purple/10 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-brand-purple/20 text-brand-purple">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white group-hover:text-brand-purple transition-all flex items-center gap-1.5">
                  Smart Account <span className="text-[10px] bg-brand-blue/20 text-brand-blue px-1.5 py-0.5 rounded font-mono font-bold">SPONSORED</span>
                </span>
                <span className="block text-xs text-zinc-400">Social login, gasless trades, batch minter</span>
              </div>
            </div>
            <span className="text-zinc-500 font-mono text-xs group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* MetaMask */}
          <button
            id="connect-metamask"
            onClick={() => onConnect("metamask")}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white group-hover:text-orange-400 transition-all">MetaMask</span>
                <span className="block text-xs text-zinc-400">Browser extension or mobile app wallet</span>
              </div>
            </div>
            <span className="text-zinc-500 font-mono text-xs group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* Coinbase Wallet */}
          <button
            id="connect-coinbase"
            onClick={() => onConnect("coinbase")}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-brand-blue/10 text-brand-blue">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white group-hover:text-brand-blue transition-all">Coinbase Wallet</span>
                <span className="block text-xs text-zinc-400">Easiest sign-in for Coinbase users</span>
              </div>
            </div>
            <span className="text-zinc-500 font-mono text-xs group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* WalletConnect */}
          <button
            id="connect-walletconnect"
            onClick={() => onConnect("walletconnect")}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white group-hover:text-sky-400 transition-all">WalletConnect</span>
                <span className="block text-xs text-zinc-400">Scan QR code using any mobile wallet</span>
              </div>
            </div>
            <span className="text-zinc-500 font-mono text-xs group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-zinc-500">
            By connecting, you agree to Agunnaya Labs' Terms of Service.
            <br />
            Secure sandbox environment - all operations are executed on simulated Base devnet.
          </p>
        </div>
      </div>
    </div>
  );
}
