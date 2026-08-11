import React, { useState, useEffect } from "react";
import { Wallet, Shield, Zap, Key, Plus, Copy, Check, Edit2, Trash2, ArrowRightLeft, Coins, Database, RefreshCw, CheckCircle2, UserCheck, Bot } from "lucide-react";
import { WalletState, SubAccount } from "../types";
import { AgunnayaDatabase } from "../lib/db";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: WalletState["walletType"]) => void;
  wallet?: WalletState;
  onRefreshWallet?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function WalletModal({ 
  isOpen, 
  onClose, 
  onConnect, 
  wallet,
  onRefreshWallet,
  showToast
}: WalletModalProps) {
  const [activeTab, setActiveTab] = useState<"subaccounts" | "providers" | "transfer">("subaccounts");
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // New sub-account form state
  const [isAddingSubAccount, setIsAddingSubAccount] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddressType, setNewAddressType] = useState<"smart" | "metamask" | "coinbase" | "walletconnect">("smart");
  const [customAddressInput, setCustomAddressInput] = useState("");
  const [initialEth, setInitialEth] = useState("0.1");
  const [initialAgl, setInitialAgl] = useState("250");

  // Rename sub-account state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  // Transfer state
  const [transferFromId, setTransferFromId] = useState<string>("");
  const [transferToId, setTransferToId] = useState<string>("");
  const [transferAsset, setTransferAsset] = useState<"ETH" | "AGL">("ETH");
  const [transferAmount, setTransferAmount] = useState<string>("0.05");

  // Load sub-accounts whenever modal opens or wallet refreshes
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
    }
  }, [isOpen, wallet]);

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

  // Calculate aggregate portfolio metrics
  const totalAggregateEth = subAccounts.reduce((acc, sub) => acc + (sub.balanceEth || 0), 0);
  const totalAggregateAgl = subAccounts.reduce((acc, sub) => acc + (sub.aglTokenBalance || 0), 0);
  const totalAggregateCredits = subAccounts.reduce((acc, sub) => acc + (sub.aglCredits || 0), 0);

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
    showToast?.("Address copied to clipboard", "info");
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
    const labelToUse = newLabel.trim() || `Sub-Account #${subAccounts.length + 1}`;
    
    let addrToUse = customAddressInput.trim();
    if (!addrToUse) {
      if (newAddressType === "smart") {
        addrToUse = "0xAA" + Array.from({length: 38}, () => Math.floor(Math.random()*16).toString(16)).join("");
      } else {
        addrToUse = "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join("");
      }
    }

    const ethVal = parseFloat(initialEth) || 0;
    const aglVal = parseFloat(initialAgl) || 0;

    const result = AgunnayaDatabase.addSubAccount({
      label: labelToUse,
      address: addrToUse,
      walletType: newAddressType,
      balanceEth: ethVal,
      aglTokenBalance: aglVal,
      aglCredits: newAddressType === "smart" ? 200 : 50,
      isSmartAccount: newAddressType === "smart"
    });

    setSubAccounts(result.subAccounts);
    setIsAddingSubAccount(false);
    setNewLabel("");
    setCustomAddressInput("");
    if (onRefreshWallet) onRefreshWallet();
    showToast?.(`Created sub-account "${labelToUse}"!`, "success");
  };

  const handleSaveRename = (id: string) => {
    if (!editingLabel.trim()) {
      setEditingId(null);
      return;
    }
    const updated = AgunnayaDatabase.updateSubAccount(id, { label: editingLabel.trim() });
    setSubAccounts(updated);
    setEditingId(null);
    setEditingLabel("");
    if (onRefreshWallet) onRefreshWallet();
    showToast?.("Sub-account label updated", "info");
  };

  const handleFundSubAccount = (subId: string) => {
    const target = subAccounts.find(s => s.id === subId);
    if (!target) return;

    const updated = AgunnayaDatabase.updateSubAccount(subId, {
      balanceEth: target.balanceEth + 0.1,
      aglTokenBalance: target.aglTokenBalance + 250,
      aglCredits: target.aglCredits + 50
    });

    setSubAccounts(updated);
    if (onRefreshWallet) onRefreshWallet();
    showToast?.(`Funded ${target.label} with +0.10 ETH, +250 AGL & +50 Credits!`, "success");
  };

  const handleRemoveSubAccount = (subId: string) => {
    if (subAccounts.length <= 1) {
      showToast?.("Cannot remove the last sub-account.", "error");
      return;
    }
    const result = AgunnayaDatabase.removeSubAccount(subId);
    setSubAccounts(result.subAccounts);
    if (onRefreshWallet) onRefreshWallet();
    showToast?.("Sub-account removed", "info");
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFromId === transferToId) {
      showToast?.("Source and destination sub-accounts must be different.", "error");
      return;
    }

    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast?.("Enter a valid transfer amount.", "error");
      return;
    }

    const res = AgunnayaDatabase.transferBetweenSubAccounts(transferFromId, transferToId, transferAsset, amt);
    if (res.success) {
      setSubAccounts(AgunnayaDatabase.getSubAccounts());
      if (onRefreshWallet) onRefreshWallet();
      showToast?.(res.message, "success");
    } else {
      showToast?.(res.message, "error");
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      id="wallet-modal-container" 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overscroll-contain"
    >
      <div 
        id="wallet-modal-panel"
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl glass-panel border border-white/10 glow-border-purple animate-fade-in text-white"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#0052FF]/10 blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight flex items-center gap-2">
                Multi-Account Wallet Studio
                <span className="text-[10px] bg-brand-purple/20 border border-brand-purple/30 text-brand-purple px-2 py-0.5 rounded-full font-mono font-bold">
                  {subAccounts.length} TRACKED
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Manage multiple sub-accounts & track total portfolio reserves on Base</p>
            </div>
          </div>
          <button 
            id="close-wallet-modal"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>

        {/* Aggregate Balance Summary Header Card */}
        <div className="mx-5 mt-4 p-4 rounded-xl bg-gradient-to-r from-[#0052FF]/15 via-purple-900/20 to-emerald-900/15 border border-white/10 shadow-lg shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#0052FF]" /> Aggregate Portfolio Reserves
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              Live Aggregate Summary
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono">
            {/* Total ETH */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-400 block mb-0.5">Total ETH</span>
              <span className="text-sm md:text-base font-bold text-white flex items-center gap-1">
                <span className="text-[#0052FF] font-semibold text-xs">Ξ</span>
                {totalAggregateEth.toFixed(4)}
              </span>
            </div>

            {/* Total AGL */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-400 block mb-0.5">Total AGL</span>
              <span className="text-sm md:text-base font-bold text-[#0052FF] flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-[#0052FF]" />
                {totalAggregateAgl.toLocaleString()}
              </span>
            </div>

            {/* Total AI Credits */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-400 block mb-0.5">Total Credits</span>
              <span className="text-sm md:text-base font-bold text-emerald-400 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                {totalAggregateCredits.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 mt-4 flex items-center gap-2 border-b border-white/10 shrink-0 font-mono text-xs">
          <button
            onClick={() => setActiveTab("subaccounts")}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "subaccounts"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Tracked Accounts ({subAccounts.length})
          </button>

          <button
            onClick={() => setActiveTab("providers")}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "providers"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Provider
          </button>

          <button
            onClick={() => setActiveTab("transfer")}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "transfer"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Internal Transfer
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: SUB-ACCOUNTS MANAGER */}
          {activeTab === "subaccounts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Select active account or manage sub-accounts:
                </span>
                <button
                  onClick={() => setIsAddingSubAccount(!isAddingSubAccount)}
                  className="px-3 py-1.5 rounded-lg bg-brand-purple/20 hover:bg-brand-purple/30 text-brand-purple border border-brand-purple/40 text-xs font-bold font-mono transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddingSubAccount ? "Cancel" : "Add Sub-Account"}
                </button>
              </div>

              {/* Add Sub-Account Form */}
              {isAddingSubAccount && (
                <form onSubmit={handleCreateSubAccount} className="p-4 rounded-xl bg-zinc-900/90 border border-brand-purple/40 space-y-3 animate-fade-in">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-purple font-mono">Create / Track New Sub-Account</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Account Label</label>
                      <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="e.g. Staking Vault #2"
                        className="w-full h-8 px-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand-purple font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Wallet Provider Type</label>
                      <select
                        value={newAddressType}
                        onChange={(e: any) => setNewAddressType(e.target.value)}
                        className="w-full h-8 px-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand-purple font-mono"
                      >
                        <option value="smart">Smart Account (AA Sponsored)</option>
                        <option value="metamask">MetaMask Extension</option>
                        <option value="coinbase">Coinbase Wallet</option>
                        <option value="walletconnect">WalletConnect Mobile</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">
                      Custom Address (Optional - leave blank to auto-generate)
                    </label>
                    <input
                      type="text"
                      value={customAddressInput}
                      onChange={(e) => setCustomAddressInput(e.target.value)}
                      placeholder="0x..."
                      className="w-full h-8 px-2.5 bg-black/60 border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-brand-purple"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Initial ETH Balance</label>
                      <input
                        type="number"
                        step="0.01"
                        value={initialEth}
                        onChange={(e) => setInitialEth(e.target.value)}
                        className="w-full h-8 px-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Initial AGL Balance</label>
                      <input
                        type="number"
                        value={initialAgl}
                        onChange={(e) => setInitialAgl(e.target.value)}
                        className="w-full h-8 px-2.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingSubAccount(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs shadow-md"
                    >
                      Create & Link Account
                    </button>
                  </div>
                </form>
              )}

              {/* List of Sub-Accounts */}
              <div className="space-y-2.5">
                {subAccounts.map((sub) => {
                  const isActive = wallet?.isConnected && wallet?.address?.toLowerCase() === sub.address.toLowerCase();

                  return (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive 
                          ? "bg-brand-purple/10 border-brand-purple shadow-[0_0_20px_rgba(139,92,246,0.15)]" 
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {sub.isSmartAccount ? (
                            <div className="p-2 rounded-lg bg-brand-purple/20 text-brand-purple shrink-0">
                              <Zap className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-[#0052FF]/20 text-[#0052FF] shrink-0">
                              <Shield className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            {editingId === sub.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingLabel}
                                  onChange={(e) => setEditingLabel(e.target.value)}
                                  className="px-2 py-0.5 bg-black border border-brand-purple rounded text-xs text-white font-semibold font-mono focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveRename(sub.id)}
                                  className="text-xs text-emerald-400 hover:underline font-mono"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white truncate">{sub.label}</h4>
                                <button
                                  onClick={() => {
                                    setEditingId(sub.id);
                                    setEditingLabel(sub.label);
                                  }}
                                  className="text-zinc-500 hover:text-zinc-300"
                                  title="Rename sub-account"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-400">
                              <span>{sub.address.slice(0, 6)}...{sub.address.slice(-4)}</span>
                              <button
                                onClick={() => handleCopyAddress(sub.address)}
                                className="text-zinc-500 hover:text-white"
                                title="Copy address"
                              >
                                {copiedAddress === sub.address ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <span className="capitalize text-[10px] bg-white/10 px-1.5 py-0.2 rounded text-zinc-300">
                                {sub.walletType}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge or Switch Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isActive ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-mono font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSwitchSubAccount(sub.id)}
                              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-brand-purple/80 hover:text-white text-zinc-200 text-xs font-mono font-bold transition-all"
                            >
                              Switch
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Balances & Sub-Account Actions */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono text-xs">
                        <div className="flex items-center gap-4 text-zinc-300">
                          <span>
                            <strong className="text-white">{sub.balanceEth.toFixed(4)}</strong> ETH
                          </span>
                          <span>
                            <strong className="text-[#0052FF]">{(sub.aglTokenBalance || 0).toLocaleString()}</strong> AGL
                          </span>
                          <span className="hidden sm:inline">
                            <strong className="text-emerald-400">{(sub.aglCredits || 0).toLocaleString()}</strong> Credits
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-500">
                          <button
                            onClick={() => handleFundSubAccount(sub.id)}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
                            title="Top up simulated test balances"
                          >
                            <RefreshCw className="w-3 h-3" /> Faucet
                          </button>
                          {subAccounts.length > 1 && (
                            <button
                              onClick={() => handleRemoveSubAccount(sub.id)}
                              className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                              title="Unlink sub-account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CONNECT NEW PROVIDER */}
          {activeTab === "providers" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Connect a external wallet or generate an AA Smart Account to add it as an active sub-account:
              </p>

              {/* Smart Account */}
              <button
                id="connect-smart-account"
                onClick={() => {
                  onConnect("smart");
                  onClose();
                }}
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
                onClick={() => {
                  onConnect("metamask");
                  onClose();
                }}
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
                onClick={() => {
                  onConnect("coinbase");
                  onClose();
                }}
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
                onClick={() => {
                  onConnect("walletconnect");
                  onClose();
                }}
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
          )}

          {/* TAB 3: INTERNAL TRANSFER */}
          {activeTab === "transfer" && (
            <form onSubmit={handleExecuteTransfer} className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-brand-purple" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Transfer Between Sub-Accounts</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* From Account */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">From Sub-Account</label>
                  <select
                    value={transferFromId}
                    onChange={(e) => setTransferFromId(e.target.value)}
                    className="w-full h-9 px-3 bg-black border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-brand-purple"
                  >
                    {subAccounts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.balanceEth.toFixed(3)} ETH / {s.aglTokenBalance} AGL)
                      </option>
                    ))}
                  </select>
                </div>

                {/* To Account */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">To Sub-Account</label>
                  <select
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    className="w-full h-9 px-3 bg-black border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-brand-purple"
                  >
                    {subAccounts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.balanceEth.toFixed(3)} ETH / {s.aglTokenBalance} AGL)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Asset */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Asset Token</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferAsset("ETH")}
                      className={`flex-1 py-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                        transferAsset === "ETH"
                          ? "bg-brand-purple/20 border-brand-purple text-brand-purple"
                          : "bg-black border-white/10 text-zinc-400"
                      }`}
                    >
                      Ξ ETH
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferAsset("AGL")}
                      className={`flex-1 py-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                        transferAsset === "AGL"
                          ? "bg-[#0052FF]/20 border-[#0052FF] text-[#0052FF]"
                          : "bg-black border-white/10 text-zinc-400"
                      }`}
                    >
                      AGL Token
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Transfer Amount</label>
                  <input
                    type="number"
                    step="any"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 bg-black border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs shadow-lg transition-all font-display flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Execute Internal Transfer
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/5 bg-black/40 text-center shrink-0">
          <p className="text-[10px] text-zinc-500 font-mono">
            Simultaneous multi-account tracking active. Total aggregate reserves automatically synchronized across Agunnaya Studio modules.
          </p>
        </div>
      </div>
    </div>
  );
}
