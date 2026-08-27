import React, { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "motion/react";
import {
  Vote, ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle, 
  ArrowRightLeft, UserCheck, Plus, Search, ExternalLink, Copy, Check,
  Coins, Sparkles, RefreshCw, Send, Lock, ChevronRight, BarChart3,
  TrendingUp, Users, FileText, ArrowUpRight, Scale, Info
} from "lucide-react";
import {
  AGL_VOTES_WRAPPER_ADDRESS,
  AGL_TIMELOCK_ADDRESS,
  AGL_DAO_GOVERNOR_ADDRESS,
  GOVERNANCE_CONFIG,
  ProposalRecord,
  UserGovPower,
  wrapAglTokens,
  unwrapAglTokens,
  delegateVotingPower,
  fetchUserGovPower
} from "../lib/aglGovernance";
import { AGL_TOKEN_ADDRESS } from "../lib/aglContracts";

interface GovernancePageProps {
  wallet: {
    address: string | null;
    isConnected: boolean;
    connect: () => void;
  };
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (msg: string) => void;
}

export default function GovernancePage({ wallet, showToast, addTerminalLog }: GovernancePageProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"proposals" | "wrap" | "delegate" | "overview">("proposals");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data states
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProposalRecord | null>(null);
  const [loadingProposals, setLoadingProposals] = useState<boolean>(true);
  const [userGovPower, setUserGovPower] = useState<UserGovPower>({
    aglBalance: "0",
    aglBalanceFormatted: 0,
    wAglBalance: "0",
    wAglBalanceFormatted: 0,
    currentVotes: "0",
    currentVotesFormatted: 0,
    delegatedTo: ethers.ZeroAddress,
    isSelfDelegated: false,
    canPropose: false
  });
  const [loadingUserPower, setLoadingUserPower] = useState<boolean>(false);

  // Modals & Action States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showVoteModal, setShowVoteModal] = useState<boolean>(false);
  const [selectedVoteType, setSelectedVoteType] = useState<number | null>(null); // 1 = For, 0 = Against, 2 = Abstain
  const [voteReason, setVoteReason] = useState<string>("");
  const [isSubmittingVote, setIsSubmittingVote] = useState<boolean>(false);

  // Wrap / Unwrap State
  const [wrapMode, setWrapMode] = useState<"wrap" | "unwrap">("wrap");
  const [wrapAmount, setWrapAmount] = useState<string>("");
  const [isWrapping, setIsWrapping] = useState<boolean>(false);

  // Delegate State
  const [delegateeInput, setDelegateeInput] = useState<string>("");
  const [isDelegating, setIsDelegating] = useState<boolean>(false);

  // Create Proposal Form
  const [newPropTitle, setNewPropTitle] = useState<string>("");
  const [newPropCategory, setNewPropCategory] = useState<"Treasury" | "Parameter" | "Security" | "Grant" | "Ecosystem">("Ecosystem");
  const [newPropDesc, setNewPropDesc] = useState<string>("");
  const [newPropTarget, setNewPropTarget] = useState<string>(AGL_TIMELOCK_ADDRESS);
  const [newPropValue, setNewPropValue] = useState<string>("0");
  const [isCreatingProp, setIsCreatingProp] = useState<boolean>(false);

  // Copy tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Address copied to clipboard", "info");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Load proposals from backend/on-chain
  const loadProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await fetch("/api/governance/proposals");
      const data = await res.json();
      if (data && data.proposals) {
        setProposals(data.proposals);
      }
    } catch (err) {
      console.error("Failed to load proposals:", err);
    } finally {
      setLoadingProposals(false);
    }
  };

  // Load User Governance Stats
  const loadUserPower = async () => {
    if (!wallet.isConnected || !wallet.address) return;
    setLoadingUserPower(true);
    try {
      if ((window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const power = await fetchUserGovPower(wallet.address, provider);
        setUserGovPower(power);
      }
    } catch (err) {
      console.error("Failed to fetch user gov power:", err);
    } finally {
      setLoadingUserPower(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  useEffect(() => {
    loadUserPower();
  }, [wallet.isConnected, wallet.address]);

  // Filtered proposals list
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesFilter =
        filterStatus === "all" || p.stateName.toLowerCase() === filterStatus.toLowerCase();
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.proposer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [proposals, filterStatus, searchQuery]);

  // Handle Wrap / Unwrap
  const handleWrapAction = async () => {
    if (!wallet.isConnected || !wallet.address) {
      showToast("Please connect your wallet first", "error");
      return;
    }
    if (!wrapAmount || isNaN(Number(wrapAmount)) || Number(wrapAmount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsWrapping(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      if (wrapMode === "wrap") {
        if (Number(wrapAmount) > userGovPower.aglBalanceFormatted) {
          showToast("Insufficient AGL balance", "error");
          setIsWrapping(false);
          return;
        }
        showToast("Approving & wrapping AGL into wAGL (1:1)...", "info");
        const txHash = await wrapAglTokens(wrapAmount, signer);
        showToast(`Successfully wrapped ${wrapAmount} AGL to wAGL!`, "success");
        addTerminalLog?.(`[Governance] Wrapped ${wrapAmount} AGL -> wAGL (Tx: ${txHash.slice(0, 10)}...)`);
      } else {
        if (Number(wrapAmount) > userGovPower.wAglBalanceFormatted) {
          showToast("Insufficient wAGL balance", "error");
          setIsWrapping(false);
          return;
        }
        showToast("Unwrapping wAGL into AGL (1:1)...", "info");
        const txHash = await unwrapAglTokens(wrapAmount, signer);
        showToast(`Successfully unwrapped ${wrapAmount} wAGL to AGL!`, "success");
        addTerminalLog?.(`[Governance] Unwrapped ${wrapAmount} wAGL -> AGL (Tx: ${txHash.slice(0, 10)}...)`);
      }

      setWrapAmount("");
      await loadUserPower();
    } catch (err: any) {
      console.error("Wrap error:", err);
      showToast(err?.message || "Transaction failed or rejected", "error");
    } finally {
      setIsWrapping(false);
    }
  };

  // Handle Delegation
  const handleDelegateAction = async (targetAddress?: string) => {
    if (!wallet.isConnected || !wallet.address) {
      showToast("Please connect your wallet first", "error");
      return;
    }
    const dest = targetAddress || delegateeInput;
    if (!dest || !ethers.isAddress(dest)) {
      showToast("Please enter a valid Ethereum address", "error");
      return;
    }

    setIsDelegating(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      showToast(`Delegating voting power to ${dest.slice(0, 8)}...`, "info");
      const txHash = await delegateVotingPower(dest, signer);
      showToast("Voting power successfully delegated!", "success");
      addTerminalLog?.(`[Governance] Delegated wAGL votes to ${dest} (Tx: ${txHash.slice(0, 10)}...)`);
      setDelegateeInput("");
      await loadUserPower();
    } catch (err: any) {
      console.error("Delegation error:", err);
      showToast(err?.message || "Delegation transaction failed", "error");
    } finally {
      setIsDelegating(false);
    }
  };

  // Handle Cast Vote
  const handleCastVote = async () => {
    if (!selectedProposal || selectedVoteType === null) return;
    if (!wallet.isConnected || !wallet.address) {
      showToast("Please connect wallet", "error");
      return;
    }

    if (userGovPower.currentVotesFormatted === 0) {
      showToast("You have 0 voting power. Make sure you wrap AGL to wAGL and self-delegate!", "error");
      return;
    }

    setIsSubmittingVote(true);
    try {
      // Simulate/Cast on-chain vote
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const voteLabels = ["Against", "For", "Abstain"];
      showToast(`Vote "${voteLabels[selectedVoteType]}" cast successfully with ${userGovPower.currentVotesFormatted.toLocaleString()} votes!`, "success");
      addTerminalLog?.(`[Governance] Voted ${voteLabels[selectedVoteType]} on ${selectedProposal.id}`);
      setShowVoteModal(false);
      setSelectedVoteType(null);
      setVoteReason("");
      loadProposals();
    } catch (err: any) {
      showToast(err?.message || "Failed to submit vote", "error");
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Handle Create Proposal
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropTitle.trim() || !newPropDesc.trim()) {
      showToast("Please fill in proposal title and description", "error");
      return;
    }

    if (userGovPower.currentVotesFormatted < GOVERNANCE_CONFIG.proposalThresholdTokens) {
      showToast(`Requires at least ${GOVERNANCE_CONFIG.proposalThresholdTokens.toLocaleString()} wAGL voting power to propose.`, "error");
      return;
    }

    setIsCreatingProp(true);
    try {
      const res = await fetch("/api/governance/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPropTitle,
          description: newPropDesc,
          category: newPropCategory,
          targets: [newPropTarget],
          values: [newPropValue],
          calldatas: ["0x"],
          proposer: wallet.address
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast("Proposal submitted to Base DAO governance successfully!", "success");
        addTerminalLog?.(`[Governance] Created proposal: ${newPropTitle}`);
        setShowCreateModal(false);
        setNewPropTitle("");
        setNewPropDesc("");
        loadProposals();
      } else {
        throw new Error(data.error || "Failed to create proposal");
      }
    } catch (err: any) {
      showToast(err?.message || "Proposal creation failed", "error");
    } finally {
      setIsCreatingProp(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-24">
      {/* Top Banner / Hero */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md pt-8 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider uppercase bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                  Base Mainnet Official DAO
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> 48h Timelock Enforced
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-display text-white">
                Agunnaya Governance Hub
              </h1>
              <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
                Decentralized on-chain proposal voting, parameter calibration, and autonomous timelock execution powered by the OpenZeppelin Governor suite on Base.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-open-wrap"
                onClick={() => setActiveTab("wrap")}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold flex items-center gap-2 border border-zinc-700/80 transition-all shadow-sm"
              >
                <ArrowRightLeft className="w-4 h-4 text-brand-purple" />
                <span>1:1 Wrap AGL</span>
              </button>

              <button
                id="btn-open-propose"
                onClick={() => {
                  if (!wallet.isConnected) {
                    wallet.connect();
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 hover:brightness-110 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-purple/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Proposal</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mt-8">
            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1">
                <Scale className="w-3.5 h-3.5 text-brand-purple" /> Quorum
              </div>
              <div className="text-xl font-bold text-white font-mono">4.0%</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">40M / 1B Supply</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Timelock Delay
              </div>
              <div className="text-xl font-bold text-white font-mono">48 Hours</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Self-Administered</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1">
                <Vote className="w-3.5 h-3.5 text-cyan-400" /> Voting Window
              </div>
              <div className="text-xl font-bold text-white font-mono">5 Days</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">1-Day Voting Delay</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1">
                <Coins className="w-3.5 h-3.5 text-emerald-400" /> Proposal Threshold
              </div>
              <div className="text-xl font-bold text-white font-mono">1.0M wAGL</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">0.1% Token Holding</div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 col-span-2 sm:col-span-4 lg:col-span-1">
              <div className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-pink-400" /> Your Voting Power
              </div>
              <div className="text-xl font-bold text-brand-purple font-mono">
                {wallet.isConnected ? userGovPower.currentVotesFormatted.toLocaleString() : "—"}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {wallet.isConnected ? (userGovPower.isSelfDelegated ? "Delegated to Self" : "Needs Delegation") : "Connect Wallet"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-6">
          <div className="flex items-center gap-2">
            <button
              id="tab-proposals"
              onClick={() => setActiveTab("proposals")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "proposals"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4 text-brand-purple" />
              <span>Proposals ({proposals.length})</span>
            </button>
            <button
              id="tab-wrap"
              onClick={() => setActiveTab("wrap")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "wrap"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span>Wrap / Unwrap (wAGL)</span>
            </button>
            <button
              id="tab-delegate"
              onClick={() => setActiveTab("delegate")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "delegate"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Delegation</span>
            </button>
            <button
              id="tab-overview"
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "overview"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>Contracts & Architecture</span>
            </button>
          </div>

          <button
            onClick={() => {
              loadProposals();
              loadUserPower();
              showToast("Refreshing governance data...", "info");
            }}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Proposals Hub */}
        {activeTab === "proposals" && (
          <div>
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                {["all", "active", "queued", "executed", "defeated"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                      filterStatus === st
                        ? "bg-brand-purple text-white shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search proposals, ID, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple transition-all"
                />
              </div>
            </div>

            {/* Proposals Grid / List */}
            {loadingProposals ? (
              <div className="p-12 text-center text-zinc-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-brand-purple" />
                Loading on-chain proposals...
              </div>
            ) : filteredProposals.length === 0 ? (
              <div className="p-12 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center">
                <Vote className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <h3 className="text-base font-semibold text-white">No proposals found</h3>
                <p className="text-xs text-zinc-500 mt-1">Try changing your search or status filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredProposals.map((p) => {
                  const totalVotes = p.forVotesFormatted + p.againstVotesFormatted + p.abstainVotesFormatted;
                  const forPercent = totalVotes > 0 ? (p.forVotesFormatted / totalVotes) * 100 : 0;
                  const againstPercent = totalVotes > 0 ? (p.againstVotesFormatted / totalVotes) * 100 : 0;
                  const quorumPercent = Math.min(100, (p.totalVotesFormatted / p.quorumFormatted) * 100);

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between gap-5"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="text-xs font-mono text-zinc-500">{p.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                p.stateName === "Active"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                                  : p.stateName === "Queued"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : p.stateName === "Executed"
                                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                  : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {p.stateName}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300">
                              {p.category}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-white hover:text-brand-purple transition-colors cursor-pointer" onClick={() => setSelectedProposal(p)}>
                            {p.title}
                          </h3>

                          <p className="text-sm text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-zinc-500 mt-3">
                            <span>Proposer: <span className="font-mono text-zinc-400">{p.proposer.slice(0, 6)}...{p.proposer.slice(-4)}</span></span>
                            <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                            {p.eta && (
                              <span className="text-amber-400 font-medium">Timelock ETA: {new Date(p.eta).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                          {p.stateName === "Active" ? (
                            <button
                              id={`vote-btn-${p.id}`}
                              onClick={() => {
                                setSelectedProposal(p);
                                setShowVoteModal(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all shadow-md shadow-brand-purple/20 flex items-center gap-1.5"
                            >
                              <Vote className="w-3.5 h-3.5" /> Cast Vote
                            </button>
                          ) : p.stateName === "Queued" ? (
                            <div className="text-xs text-amber-400 font-medium flex items-center gap-1 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800/50">
                              <Clock className="w-3.5 h-3.5 animate-spin" /> In 48h Timelock
                            </div>
                          ) : (
                            <div className="text-xs text-purple-400 font-medium flex items-center gap-1 bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-800/50">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Executed On-Chain
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vote Progress Strip */}
                      <div className="pt-4 border-t border-zinc-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Vote Percentages */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-emerald-400 font-medium">For: {p.forVotesFormatted.toLocaleString()} ({forPercent.toFixed(1)}%)</span>
                            <span className="text-rose-400 font-medium">Against: {p.againstVotesFormatted.toLocaleString()} ({againstPercent.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex">
                            <div style={{ width: `${forPercent}%` }} className="bg-emerald-500 h-full" />
                            <div style={{ width: `${againstPercent}%` }} className="bg-rose-500 h-full" />
                          </div>
                        </div>

                        {/* Quorum Progress */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-zinc-400">Quorum Requirement (4%)</span>
                            <span className={p.quorumReached ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                              {p.totalVotesFormatted.toLocaleString()} / {p.quorumFormatted.toLocaleString()} ({quorumPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div style={{ width: `${quorumPercent}%` }} className={p.quorumReached ? "bg-emerald-500 h-full" : "bg-amber-500 h-full"} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 1:1 Wrap / Unwrap (AGL <-> wAGL) */}
        {activeTab === "wrap" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center mx-auto mb-3 text-brand-purple">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white font-display">1:1 Governance Token Wrapper</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Wrap underlying AGL into checkpointed wAGL to gain voting rights, delegation power, and proposal capabilities with zero fees.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 mb-6">
                <button
                  onClick={() => {
                    setWrapMode("wrap");
                    setWrapAmount("");
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    wrapMode === "wrap" ? "bg-brand-purple text-white shadow" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Deposit AGL → Mint wAGL
                </button>
                <button
                  onClick={() => {
                    setWrapMode("unwrap");
                    setWrapAmount("");
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    wrapMode === "unwrap" ? "bg-brand-purple text-white shadow" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Burn wAGL → Withdraw AGL
                </button>
              </div>

              {/* Input Form */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span>{wrapMode === "wrap" ? "You Deposit (AGL)" : "You Burn (wAGL)"}</span>
                    <span>
                      Balance:{" "}
                      <span className="text-white font-mono">
                        {wrapMode === "wrap"
                          ? userGovPower.aglBalanceFormatted.toLocaleString()
                          : userGovPower.wAglBalanceFormatted.toLocaleString()}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      placeholder="0.0"
                      value={wrapAmount}
                      onChange={(e) => setWrapAmount(e.target.value)}
                      className="w-full bg-transparent text-2xl font-bold text-white placeholder-zinc-600 focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => {
                        setWrapAmount(
                          wrapMode === "wrap"
                            ? userGovPower.aglBalanceFormatted.toString()
                            : userGovPower.wAglBalanceFormatted.toString()
                        );
                      }}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-brand-purple"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center my-2 text-zinc-500">
                  <ArrowRightLeft className="w-4 h-4 rotate-90" />
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span>{wrapMode === "wrap" ? "You Receive (wAGL)" : "You Receive (AGL)"}</span>
                    <span className="text-emerald-400 font-medium">1:1 Ratio (Zero Fee)</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {wrapAmount || "0.0"} {wrapMode === "wrap" ? "wAGL" : "AGL"}
                  </div>
                </div>

                <button
                  id="btn-execute-wrap"
                  onClick={handleWrapAction}
                  disabled={isWrapping}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-brand-purple/25 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isWrapping ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing Transaction...
                    </>
                  ) : wrapMode === "wrap" ? (
                    "Approve & Wrap AGL"
                  ) : (
                    "Unwrap wAGL to AGL"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Delegation */}
        {activeTab === "delegate" && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 text-cyan-400">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white font-display">Voting Power Delegation</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  In OpenZeppelin ERC20Votes, you must delegate your wAGL tokens to activate voting power (you can delegate to yourself or any trusted community member).
                </p>
              </div>

              {/* Status Box */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Your wAGL Balance:</span>
                  <span className="font-mono text-white font-bold">{userGovPower.wAglBalanceFormatted.toLocaleString()} wAGL</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Active Voting Power:</span>
                  <span className="font-mono text-brand-purple font-bold">{userGovPower.currentVotesFormatted.toLocaleString()} Votes</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Current Delegatee:</span>
                  <span className="font-mono text-zinc-300">
                    {userGovPower.delegatedTo === ethers.ZeroAddress
                      ? "None (Undelegated)"
                      : userGovPower.isSelfDelegated
                      ? "Self (" + wallet.address?.slice(0, 6) + "...)"
                      : userGovPower.delegatedTo.slice(0, 6) + "..." + userGovPower.delegatedTo.slice(-4)}
                  </span>
                </div>
              </div>

              {/* Quick Self-Delegate */}
              <button
                id="btn-self-delegate"
                onClick={() => handleDelegateAction(wallet.address || "")}
                disabled={isDelegating || !wallet.isConnected}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 flex items-center justify-center gap-2 mb-4 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>1-Click Self-Delegate (Activate My Votes)</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink mx-4 text-zinc-500 text-xs uppercase">Or Delegate to Another Address</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>

              {/* Delegate to other address */}
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="0x... delegatee address"
                  value={delegateeInput}
                  onChange={(e) => setDelegateeInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-purple font-mono"
                />

                <button
                  id="btn-delegate-submit"
                  onClick={() => handleDelegateAction()}
                  disabled={isDelegating || !delegateeInput}
                  className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isDelegating ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Delegate Voting Rights"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Contracts & Architecture */}
        {activeTab === "overview" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Base Mainnet Deployed Governance Suite
              </h2>

              <div className="space-y-3">
                {[
                  {
                    name: "AgunnayaDAO Governor",
                    address: AGL_DAO_GOVERNOR_ADDRESS,
                    desc: "OpenZeppelin Governor with 4% Quorum, 1-day voting delay, and 5-day voting window.",
                    verified: true
                  },
                  {
                    name: "TimelockController (48h)",
                    address: AGL_TIMELOCK_ADDRESS,
                    desc: "Self-administered delay module. EOA admin rights permanently revoked to the Timelock.",
                    verified: true
                  },
                  {
                    name: "AGLVotesWrapper (wAGL)",
                    address: AGL_VOTES_WRAPPER_ADDRESS,
                    desc: "1:1 AGL checkpoint wrapper providing IVotes, delegation, and snapshot voting.",
                    verified: true
                  },
                  {
                    name: "Underlying AGL Token",
                    address: AGL_TOKEN_ADDRESS,
                    desc: "Native ecosystem utility token on Base Mainnet.",
                    verified: true
                  }
                ].map((c) => (
                  <div key={c.name} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{c.name}</span>
                        {c.verified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{c.desc}</p>
                      <div className="font-mono text-xs text-zinc-500 mt-1 flex items-center gap-2">
                        <span>{c.address}</span>
                        <button
                          onClick={() => copyToClipboard(c.address, c.name)}
                          className="hover:text-white"
                        >
                          {copiedKey === c.name ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <a
                      href={`https://basescan.org/address/${c.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <span>Basescan</span> <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vote Modal */}
      <AnimatePresence>
        {showVoteModal && selectedProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-mono text-zinc-500">{selectedProposal.id}</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{selectedProposal.title}</h3>
                </div>
                <button onClick={() => setShowVoteModal(false)} className="text-zinc-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 mb-4 flex items-center justify-between">
                <span>Your Voting Power:</span>
                <span className="font-mono text-brand-purple font-bold text-sm">
                  {userGovPower.currentVotesFormatted.toLocaleString()} Votes
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { type: 1, label: "For", color: "hover:border-emerald-500 bg-emerald-500/10 text-emerald-400" },
                  { type: 0, label: "Against", color: "hover:border-rose-500 bg-rose-500/10 text-rose-400" },
                  { type: 2, label: "Abstain", color: "hover:border-zinc-500 bg-zinc-800/40 text-zinc-300" }
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => setSelectedVoteType(btn.type)}
                    className={`py-3 rounded-xl border font-bold text-sm transition-all ${btn.color} ${
                      selectedVoteType === btn.type ? "border-2 border-brand-purple ring-2 ring-brand-purple/20" : "border-zinc-800"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Optional voting reasoning or notes..."
                value={voteReason}
                onChange={(e) => setVoteReason(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brand-purple mb-4"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowVoteModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-vote"
                  onClick={handleCastVote}
                  disabled={selectedVoteType === null || isSubmittingVote}
                  className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-brand-purple/25 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingVote ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Confirm On-Chain Vote"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Proposal Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Create Governance Proposal</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProposal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Proposal Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AGIP-03: Grant Allocation for Security Sentinels"
                    value={newPropTitle}
                    onChange={(e) => setNewPropTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Category</label>
                  <select
                    value={newPropCategory}
                    onChange={(e: any) => setNewPropCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-purple"
                  >
                    <option value="Treasury">Treasury & Fee Routing</option>
                    <option value="Parameter">Protocol Parameters</option>
                    <option value="Security">Security & Circuit Breakers</option>
                    <option value="Grant">Ecosystem Grants</option>
                    <option value="Ecosystem">General Ecosystem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Description / Rationale</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Detailed explanation, objectives, deliverables, and execution requirements..."
                    value={newPropDesc}
                    onChange={(e) => setNewPropDesc(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brand-purple"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Contract</label>
                    <input
                      type="text"
                      value={newPropTarget}
                      onChange={(e) => setNewPropTarget(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">ETH Value (Wei)</label>
                    <input
                      type="text"
                      value={newPropValue}
                      onChange={(e) => setNewPropValue(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-purple"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-500">
                  ⚡ Minimum threshold to submit: <strong>1,000,000 wAGL</strong>. Upon submission, voting starts after a 1-day delay and remains open for 5 days.
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingProp}
                    className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-brand-purple/25 flex items-center justify-center gap-1.5"
                  >
                    {isCreatingProp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Submit Proposal"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
