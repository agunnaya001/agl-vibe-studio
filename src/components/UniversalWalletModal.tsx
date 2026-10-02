import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  Shield, 
  Zap, 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Edit2, 
  Trash2, 
  ArrowRightLeft, 
  Coins, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  UserCheck, 
  Bot, 
  Cpu,
  QrCode,
  Smartphone,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  Info,
  X,
  Layers,
  Sparkles
} from "lucide-react";
import { useAGLWallet } from "../hooks/useAGLWallet";
import { EIP6963ProviderDetail } from "../types/eip6963";
import { WalletState, SubAccount } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { CoinbaseSmartWalletInspectorModal } from "./CoinbaseSmartWalletInspectorModal";
import { BASE_MAINNET } from "../lib/chains";

interface UniversalWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet?: WalletState;
  onRefreshWallet?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function UniversalWalletModal({
  isOpen,
  onClose,
  wallet,
  onRefreshWallet,
  showToast,
}: UniversalWalletModalProps) {
  const {
    isConnected,
    address,
    eip6963Providers,
    hasEIP6963Providers,
    connectWithProvider,
    connectInjected,
    connectWalletConnect,
    connectCoinbase,
    rescanEIP6963,
    isConnecting,
    error: walletError,
  } = useAGLWallet();

  const [activeTab, setActiveTab] = useState<"universal" | "subaccounts" | "transfer">("universal");
  const [connectingProviderUuid, setConnectingProviderUuid] = useState<string | null>(null);
  const [showSmartWalletModal, setShowSmartWalletModal] = useState(false);

  // Sub-accounts management state
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isAddingSubAccount, setIsAddingSubAccount] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddressType, setNewAddressType] = useState<"smart" | "metamask" | "coinbase" | "walletconnect">("smart");
  const [customAddressInput, setCustomAddressInput] = useState("");
  const [initialEth, setInitialEth] = useState("0.1");
  const [initialAgl, setInitialAgl] = useState("250");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  // Transfer state
  const [transferFromId, setTransferFromId] = useState<string>("");
  const [transferToId, setTransferToId] = useState<string>("");
  const [transferAsset, setTransferAsset] = useState<"ETH" | "AGL">("ETH");
  const [transferAmount, setTransferAmount] = useState<string>("0.05");

  // Load sub-accounts whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const subs = AgunnayaDatabase.getSubAccounts();
      setSubAccounts(subs);
      if (subs.length > 0) {
        setTransferFromId(subs[0].id);
        if (subs.length > 1) {
          setTransferToId(subs[1].id);
        }
      }
      rescanEIP6963();
    }
  }, [isOpen, rescanEIP6963]);

  // Lock document body scroll on mobile
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

  const handleConnectEIP6963 = async (providerDetail: EIP6963ProviderDetail) => {
    setConnectingProviderUuid(providerDetail.info.uuid);
    try {
      await connectWithProvider(providerDetail);
      showToast?.(`Connected to ${providerDetail.info.name}!`, "success");
      onClose();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      console.error("Connection failed:", err);
      showToast?.(`Failed to connect ${providerDetail.info.name}: ${err.message || 'Rejected'}`, "error");
    } finally {
      setConnectingProviderUuid(null);
    }
  };

  const handleConnectInjected = async () => {
    try {
      await connectInjected();
      showToast?.("Connected via Injected Wallet", "success");
      onClose();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      console.error("Injected connection error:", err);
      showToast?.(`Injected Wallet: ${err.message || 'Connection failed'}`, "error");
    }
  };

  const handleConnectWC = async () => {
    try {
      await connectWalletConnect();
      showToast?.("WalletConnect session initiated", "info");
      onClose();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      console.error("WalletConnect error:", err);
      showToast?.(`WalletConnect: ${err.message || 'Session cancelled'}`, "error");
    }
  };

  const handleConnectCoinbase = async () => {
    try {
      await connectCoinbase();
      showToast?.("Connected to Coinbase Wallet", "success");
      onClose();
      if (onRefreshWallet) onRefreshWallet();
    } catch (err: any) {
      console.error("Coinbase connection error:", err);
      showToast?.(`Coinbase: ${err.message || 'Failed'}`, "error");
    }
  };

  // Sub-account handlers
  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
    showToast?.("Address copied", "info");
  };

  const handleSwitchSubAccount = (subId: string) => {
    const result = AgunnayaDatabase.switchSubAccount(subId);
    setSubAccounts(result.subAccounts);
    if (onRefreshWallet) onRefreshWallet();
    const switchedSub = result.subAccounts.find(s => s.id === subId);
    showToast?.(`Switched active wallet to "${switchedSub?.label || 'Sub-Account'}"`, "success");
  };

  const handleCreateSubAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    let targetAddr = customAddressInput.trim();
    if (!targetAddr || !targetAddr.startsWith("0x") || targetAddr.length !== 42) {
      targetAddr = "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join("");
    }

    const result = AgunnayaDatabase.addSubAccount({
      label: newLabel.trim(),
      address: targetAddr,
      walletType: newAddressType,
      balanceEth: parseFloat(initialEth) || 0.05,
      aglTokenBalance: parseFloat(initialAgl) || 100,
      aglCredits: 200,
      isSmartAccount: newAddressType === "smart",
    });

    setSubAccounts(result.subAccounts);
    setIsAddingSubAccount(false);
    setNewLabel("");
    setCustomAddressInput("");
    if (onRefreshWallet) onRefreshWallet();
    showToast?.(`Sub-account "${newLabel.trim()}" created!`, "success");
  };

  const handleDeleteSubAccount = (id: string, label: string) => {
    const result = AgunnayaDatabase.removeSubAccount(id);
    setSubAccounts(result.subAccounts);
    if (onRefreshWallet) onRefreshWallet();
    showToast?.(`Deleted sub-account "${label}"`, "info");
  };

  const handleSaveRename = (id: string) => {
    if (!editingLabel.trim()) return;
    const updated = AgunnayaDatabase.updateSubAccount(id, { label: editingLabel.trim() });
    setSubAccounts(updated);
    setEditingId(null);
    setEditingLabel("");
    if (onRefreshWallet) onRefreshWallet();
    showToast?.("Sub-account renamed", "success");
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast?.("Invalid transfer amount", "error");
      return;
    }
    if (transferFromId === transferToId) {
      showToast?.("Source and destination accounts must be different", "error");
      return;
    }

    const res = AgunnayaDatabase.transferBetweenSubAccounts(
      transferFromId,
      transferToId,
      transferAsset,
      amountNum
    );

    if (res.success) {
      setSubAccounts(AgunnayaDatabase.getSubAccounts());
      if (onRefreshWallet) onRefreshWallet();
      showToast?.(`Transferred ${amountNum} ${transferAsset} successfully!`, "success");
      setTransferAmount("0.05");
    } else {
      showToast?.(res.message || "Transfer failed", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white shadow-md shadow-brand-purple/20">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white">Connect EVM Wallet</h2>
              <p className="text-xs text-zinc-400 font-mono">Base Mainnet (8453) Universal Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 text-xs font-mono">
          <button
            onClick={() => setActiveTab("universal")}
            className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "universal"
                ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Connect Wallet</span>
          </button>
          <button
            onClick={() => setActiveTab("subaccounts")}
            className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "subaccounts"
                ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sub-Accounts ({subAccounts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("transfer")}
            className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "transfer"
                ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        {/* TAB 1: UNIVERSAL WALLET CONNECT (EIP-6963 + WALLETCONNECT + MOBILE) */}
        {activeTab === "universal" && (
          <div className="space-y-6">
            {/* AREA 1: DETECTED WALLETS (EIP-6963 Multi-Injected Discovery) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Detected Injected Wallets ({eip6963Providers.length})</span>
                </span>
                <button
                  onClick={rescanEIP6963}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rescan</span>
                </button>
              </div>

              {hasEIP6963Providers ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {eip6963Providers.map((providerDetail) => {
                    const isSelected = connectingProviderUuid === providerDetail.info.uuid;
                    return (
                      <button
                        key={providerDetail.info.uuid}
                        onClick={() => handleConnectEIP6963(providerDetail)}
                        disabled={isConnecting}
                        className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/10 hover:border-brand-blue/50 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={providerDetail.info.icon}
                            alt={providerDetail.info.name}
                            className="w-7 h-7 rounded-xl shrink-0 object-contain p-0.5 bg-zinc-950 border border-white/5"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white font-display block truncate group-hover:text-brand-blue transition-colors">
                              {providerDetail.info.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono block truncate">
                              {providerDetail.info.rdns || "EIP-6963 Discovered"}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-bold shrink-0">
                          {isSelected ? "Connecting..." : "Connect"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 text-center space-y-2">
                  <p className="text-xs text-zinc-400 font-mono">
                    No EIP-6963 browser extensions announced in this window.
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    You can still connect below via WalletConnect QR / Mobile, Coinbase Wallet, or standard injected fallback.
                  </p>
                </div>
              )}
            </div>

            {/* AREA 2: MOBILE / UNIVERSAL WALLET CONNECT */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-brand-purple" />
                <span>Mobile & Cross-Platform Options</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* WalletConnect */}
                <button
                  onClick={handleConnectWC}
                  disabled={isConnecting}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900/80 to-purple-950/30 border border-brand-purple/30 hover:border-brand-purple text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/30">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white font-display block group-hover:text-purple-300 transition-colors">
                        WalletConnect
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono block">
                        Mobile App / QR Code
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-purple/20 text-purple-300 font-bold">
                    Universal
                  </span>
                </button>

                {/* Coinbase Smart Wallet */}
                <button
                  onClick={handleConnectCoinbase}
                  disabled={isConnecting}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-zinc-900/60 border border-blue-500/30 hover:border-blue-400 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/30">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white font-display block group-hover:text-blue-300 transition-colors">
                        Coinbase Wallet
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono block">
                        Passkey / App / Smart AA
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                    Base L2
                  </span>
                </button>

                {/* Injected Browser Wallet Fallback */}
                <button
                  onClick={handleConnectInjected}
                  disabled={isConnecting}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-zinc-900/80 to-zinc-900/60 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/30">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white font-display block group-hover:text-emerald-300 transition-colors">
                        Injected Provider
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono block">
                        Browser Extension / In-App
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    EIP-1193
                  </span>
                </button>
              </div>
            </div>

            {/* AREA 3: CONNECTION HELP & SECURITY NOTICE */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                <Shield className="w-3.5 h-3.5" />
                <span>Base-First Cryptographic Security</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Connect once to access all 31+ AGL Studio tools, AGL Tokens, AGL Credits, DAO Staking, and Autonomous AI Agents on Base Mainnet.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: SUB-ACCOUNTS & MULTI-WALLET MANAGEMENT */}
        {activeTab === "subaccounts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  Studio Sub-Accounts
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono">Switch active wallet contexts without disconnecting.</p>
              </div>
              <button
                onClick={() => setIsAddingSubAccount(!isAddingSubAccount)}
                className="px-3 py-1.5 rounded-xl bg-brand-purple/20 hover:bg-brand-purple/30 text-purple-300 border border-brand-purple/40 font-mono text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingSubAccount ? "Cancel" : "New Account"}</span>
              </button>
            </div>

            {/* Add Sub Account Form */}
            {isAddingSubAccount && (
              <form onSubmit={handleCreateSubAccount} className="p-4 rounded-2xl bg-zinc-900 border border-brand-purple/30 space-y-3 animate-fade-in font-mono text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Account Label *</label>
                    <input
                      type="text"
                      required
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Treasury Ops / Staking"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Account Type</label>
                    <select
                      value={newAddressType}
                      onChange={(e) => setNewAddressType(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white cursor-pointer"
                    >
                      <option value="smart">ERC-4337 Smart Account</option>
                      <option value="metamask">Injected Web3 Wallet</option>
                      <option value="coinbase">Coinbase Wallet</option>
                      <option value="walletconnect">WalletConnect</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Custom Base Address (Optional)</label>
                  <input
                    type="text"
                    value={customAddressInput}
                    onChange={(e) => setCustomAddressInput(e.target.value)}
                    placeholder="0x... (Leave empty to generate new account)"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    Save Sub-Account
                  </button>
                </div>
              </form>
            )}

            {/* Sub-Accounts List */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 font-mono text-xs">
              {subAccounts.map((sub) => {
                const isActive = sub.isActive || (address && sub.address.toLowerCase() === address.toLowerCase());
                const isEditing = editingId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? "bg-zinc-900 border-brand-purple shadow-md shadow-brand-purple/10"
                        : "bg-zinc-900/40 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              className="bg-zinc-950 border border-brand-purple rounded px-2 py-1 text-xs text-white"
                            />
                            <button onClick={() => handleSaveRename(sub.id)} className="text-emerald-400 hover:text-emerald-300">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-white truncate">{sub.label}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => handleSwitchSubAccount(sub.id)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Switch Active
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(sub.id);
                            setEditingLabel(sub.label);
                          }}
                          className="p-1 text-zinc-400 hover:text-white"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {subAccounts.length > 1 && (
                          <button
                            onClick={() => handleDeleteSubAccount(sub.id, sub.label)}
                            className="p-1 text-zinc-400 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[180px]">{sub.address}</span>
                        <button
                          onClick={() => handleCopyAddress(sub.address)}
                          className="p-0.5 text-zinc-500 hover:text-white"
                        >
                          {copiedAddress === sub.address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold">{sub.balanceEth.toFixed(3)} ETH</span>
                        <span className="text-purple-300">{sub.aglTokenBalance.toFixed(0)} AGL</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT ASSET TRANSFER BETWEEN SUB-ACCOUNTS */}
        {activeTab === "transfer" && (
          <form onSubmit={handleExecuteTransfer} className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">From Account</label>
              <select
                value={transferFromId}
                onChange={(e) => setTransferFromId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white cursor-pointer"
              >
                {subAccounts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.address.slice(0, 6)}...{s.address.slice(-4)}) - {s.balanceEth.toFixed(3)} ETH
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">To Account</label>
              <select
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white cursor-pointer"
              >
                {subAccounts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.address.slice(0, 6)}...{s.address.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Asset</label>
                <select
                  value={transferAsset}
                  onChange={(e) => setTransferAsset(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white cursor-pointer"
                >
                  <option value="ETH">Native ETH (Base)</option>
                  <option value="AGL">AGL Token</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Amount</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-purple/20 hover:opacity-95 cursor-pointer mt-2"
            >
              Execute Instant Internal Transfer
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
