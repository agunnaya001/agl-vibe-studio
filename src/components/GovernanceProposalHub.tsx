import React, { useState } from "react";
import { DAO, Proposal, ProposalComment, WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { 
  Users, 
  Vote, 
  Plus, 
  Wallet, 
  ShieldAlert, 
  Sparkles, 
  Building, 
  Landmark, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Send, 
  Search, 
  Filter, 
  Zap, 
  Sliders, 
  Check, 
  X, 
  ShieldCheck, 
  ChevronDown, 
  ExternalLink,
  Coins
} from "lucide-react";

interface GovernanceProposalHubProps {
  wallet: WalletState;
  daos: DAO[];
  onRefreshDAOs: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function GovernanceProposalHub({
  wallet,
  daos,
  onRefreshDAOs,
  addTerminalLog,
  showToast
}: GovernanceProposalHubProps) {
  const [activeTab, setActiveTab] = useState<"proposals" | "daos" | "create_proposal" | "create_dao">("proposals");

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Passed" | "Executed" | "Defeated">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "treasury" | "parameter" | "upgrade" | "general">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDaoFilter, setSelectedDaoFilter] = useState<string>("all");

  // Voting state
  const [votingId, setVotingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Expanded Discussion State
  const [expandedDiscussionId, setExpandedDiscussionId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  // Create Proposal Form State
  const [targetDaoAddress, setTargetDaoAddress] = useState<string>(daos[0]?.contractAddress || "");
  const [propCategory, setPropCategory] = useState<"treasury" | "parameter" | "upgrade" | "general">("treasury");
  const [propTitle, setPropTitle] = useState("");
  const [propDesc, setPropDesc] = useState("");
  const [requestedEth, setRequestedEth] = useState<string>("2.0");
  const [recipientAddress, setRecipientAddress] = useState<string>(wallet.address || "");
  const [quorumThreshold, setQuorumThreshold] = useState<string>("500000");
  const [submittingProp, setSubmittingProp] = useState(false);

  // Delegation Modal State
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [delegateAddress, setDelegateAddress] = useState(wallet.address || "");
  const [currentDelegate, setCurrentDelegate] = useState<string>(wallet.address || "Self-Delegated");

  // Create DAO Form State
  const [daoName, setDaoName] = useState("");
  const [daoSymbol, setDaoSymbol] = useState("");
  const [daoDesc, setDaoDesc] = useState("");
  const [govToken, setGovToken] = useState("0xea1221b4d80a89bd8c75248fae7c176bd1854698");
  const [creatingDao, setCreatingDao] = useState(false);

  // Aggregate stats
  const allProposals = daos.flatMap(d => d.proposals.map(p => ({ ...p, daoName: d.name, daoSymbol: d.symbol, daoAddress: d.contractAddress })));
  const totalTreasuryEth = daos.reduce((acc, d) => acc + d.treasuryBalanceEth, 0);
  const activeProposalsCount = allProposals.filter(p => p.status === "Active").length;
  const passedProposalsCount = allProposals.filter(p => p.status === "Passed" && !p.executed).length;

  // Filtered Proposals
  const filteredProposals = allProposals.filter(prop => {
    if (statusFilter !== "all" && prop.status !== statusFilter) return false;
    if (categoryFilter !== "all" && (prop.category || "general") !== categoryFilter) return false;
    if (selectedDaoFilter !== "all" && prop.daoAddress !== selectedDaoFilter) return false;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchesTitle = prop.title.toLowerCase().includes(q);
      const matchesDesc = prop.description.toLowerCase().includes(q);
      const matchesDao = prop.daoName.toLowerCase().includes(q);
      return matchesTitle || matchesDesc || matchesDao;
    }

    return true;
  });

  // AI Proposal Generator Prompt Preset Trigger
  const handleApplyAIPreset = (presetType: "hackathon" | "quorum" | "audit") => {
    if (presetType === "hackathon") {
      setPropCategory("treasury");
      setPropTitle("Fund Base L2 Ecosystem Hackathon & Builder Grants");
      setPropDesc("Allocate 3.5 ETH from the DAO Treasury to sponsor developer cash prizes for high-impact bonding curve dApps and AI agent tools launched on Base mainnet via Agunnaya Studio.");
      setRequestedEth("3.5");
      setQuorumThreshold("500000");
    } else if (presetType === "quorum") {
      setPropCategory("parameter");
      setPropTitle("Optimize Governance Quorum Threshold to 350k AGL");
      setPropDesc("Lower the proposal quorum threshold parameter from 500,000 AGL to 350,000 AGL to accelerate community voting response times and grant execution velocity.");
      setRequestedEth("0");
      setQuorumThreshold("350000");
    } else if (presetType === "audit") {
      setPropCategory("upgrade");
      setPropTitle("Commission Independent Smart Contract Security Audit");
      setPropDesc("Engage a top-tier L2 security audit firm to inspect the GovernorAlpha multi-sig treasury contracts and bonding curve liquidity pools.");
      setRequestedEth("2.0");
      setQuorumThreshold("600000");
    }
    showToast("AI proposal draft generated!", "success");
  };

  // Submit Proposal Handler
  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    if (!targetDaoAddress || !propTitle || !propDesc) return;
    setSubmittingProp(true);

    addTerminalLog("info", `Broadcasting governance proposal transaction to Governor Assembly ${targetDaoAddress}...`);

    setTimeout(() => {
      const all = AgunnayaDatabase.getDAOs();
      const dao = all.find(d => d.contractAddress === targetDaoAddress);

      if (dao) {
        const newProp: Proposal = {
          id: "prop_" + Math.random().toString(36).substr(2, 6),
          title: propTitle,
          description: propDesc,
          creator: wallet.address,
          status: "Active",
          votesFor: wallet.aglTokenBalance || 500, // Initial votes from creator
          votesAgainst: 0,
          endTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
          executed: false,
          category: propCategory,
          requestedEth: propCategory === "treasury" ? parseFloat(requestedEth) || 0 : undefined,
          recipientAddress: propCategory === "treasury" ? recipientAddress : undefined,
          quorumThreshold: parseInt(quorumThreshold) || 500000,
          createdAt: Date.now(),
          comments: [
            {
              id: "comm_init",
              author: wallet.address.slice(0, 6) + "..." + wallet.address.slice(-4),
              text: "Proposal created and submitted to on-chain governance queue.",
              timestamp: Date.now()
            }
          ]
        };

        dao.proposals.unshift(newProp);
        AgunnayaDatabase.saveDAOs(all);

        // Deduct small gas
        const updatedWallet = { ...wallet, balanceEth: Math.max(0, wallet.balanceEth - 0.002) };
        AgunnayaDatabase.saveWallet(updatedWallet);
        onRefreshDAOs();

        AgunnayaDatabase.addActivity({
          type: "vote",
          tokenSymbol: dao.symbol,
          tokenAddress: dao.contractAddress,
          user: wallet.address,
          amount: wallet.aglTokenBalance || 500,
          ethValue: 0,
          details: `Submitted Proposal: "${propTitle}" in ${dao.name}`
        });

        addTerminalLog("success", `Proposal ${newProp.id} broadcast successfully to ${dao.name}!`);
        showToast("Governance proposal submitted successfully!", "success");
      }

      setPropTitle("");
      setPropDesc("");
      setSubmittingProp(false);
      setActiveTab("proposals");
    }, 1500);
  };

  // Vote Handler
  const handleCastVote = (daoAddress: string, propId: string, support: boolean) => {
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    setVotingId(propId);

    const voteWeight = wallet.aglTokenBalance || 500;

    addTerminalLog("info", `Signing cryptographic vote transaction (${voteWeight.toLocaleString()} AGL weight ${support ? "FOR" : "AGAINST"})...`);

    setTimeout(() => {
      const all = AgunnayaDatabase.getDAOs();
      const dao = all.find(d => d.contractAddress === daoAddress);

      if (dao) {
        const prop = dao.proposals.find(p => p.id === propId);
        if (prop) {
          if (support) {
            prop.votesFor += voteWeight;
          } else {
            prop.votesAgainst += voteWeight;
          }

          // Track voter record
          if (!prop.voters) prop.voters = [];
          prop.voters.push({
            address: wallet.address,
            support,
            weight: voteWeight,
            timestamp: Date.now()
          });

          // Quorum check
          const q = prop.quorumThreshold || 500000;
          if (prop.votesFor >= q && prop.votesFor > prop.votesAgainst) {
            prop.status = "Passed";
          }

          AgunnayaDatabase.saveDAOs(all);
          onRefreshDAOs();

          AgunnayaDatabase.addActivity({
            type: "vote",
            tokenSymbol: dao.symbol,
            tokenAddress: dao.contractAddress,
            user: wallet.address,
            amount: voteWeight,
            ethValue: 0,
            details: `Cast ${voteWeight.toLocaleString()} votes ${support ? "FOR" : "AGAINST"} proposal "${prop.title}"`
          });

          addTerminalLog("success", `Vote recorded! Current FOR: ${prop.votesFor.toLocaleString()}, AGAINST: ${prop.votesAgainst.toLocaleString()}`);
          showToast(`Voted ${support ? "FOR" : "AGAINST"} using ${voteWeight.toLocaleString()} AGL voting power!`, "success");
        }
      }
      setVotingId(null);
    }, 1200);
  };

  // Execute Passed Proposal Handler
  const handleExecuteProposal = (daoAddress: string, propId: string) => {
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    setExecutingId(propId);

    addTerminalLog("info", `Executing passed governance proposal transaction via Governor Alpha Multi-Sig...`);

    setTimeout(() => {
      const all = AgunnayaDatabase.getDAOs();
      const dao = all.find(d => d.contractAddress === daoAddress);

      if (dao) {
        const prop = dao.proposals.find(p => p.id === propId);
        if (prop) {
          prop.executed = true;
          prop.status = "Executed";
          prop.executionTxHash = "0x" + Math.random().toString(16).substr(2, 40);

          // If treasury grant, deduct requested ETH from treasury
          if (prop.category === "treasury" && prop.requestedEth) {
            dao.treasuryBalanceEth = Math.max(0, dao.treasuryBalanceEth - prop.requestedEth);
          }

          AgunnayaDatabase.saveDAOs(all);
          onRefreshDAOs();

          AgunnayaDatabase.addActivity({
            type: "create",
            tokenSymbol: dao.symbol,
            tokenAddress: dao.contractAddress,
            user: wallet.address,
            amount: prop.requestedEth || 0,
            ethValue: prop.requestedEth || 0,
            details: `Executed Proposal #${prop.id}: "${prop.title}" (Tx: ${prop.executionTxHash.slice(0, 10)}...)`
          });

          addTerminalLog("success", `Governance proposal #${prop.id} executed successfully! Execution Hash: ${prop.executionTxHash}`);
          showToast(`Proposal executed! Treasury updated.`, "success");
        }
      }
      setExecutingId(null);
    }, 1800);
  };

  // Comment Submission Handler
  const handleAddComment = (daoAddress: string, propId: string) => {
    if (!newCommentText.trim()) return;

    const all = AgunnayaDatabase.getDAOs();
    const dao = all.find(d => d.contractAddress === daoAddress);

    if (dao) {
      const prop = dao.proposals.find(p => p.id === propId);
      if (prop) {
        if (!prop.comments) prop.comments = [];
        prop.comments.push({
          id: "comm_" + Math.random().toString(36).substr(2, 5),
          author: wallet.isConnected ? wallet.address.slice(0, 6) + "..." + wallet.address.slice(-4) : "Anonymous",
          text: newCommentText.trim(),
          timestamp: Date.now()
        });

        AgunnayaDatabase.saveDAOs(all);
        onRefreshDAOs();
        setNewCommentText("");
        showToast("Comment posted to governance log.", "info");
      }
    }
  };

  // Create DAO Handler
  const handleCreateDAO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    if (!daoName || !daoSymbol || !daoDesc) return;
    setCreatingDao(true);

    addTerminalLog("info", `Deploying GovernorAlpha Multi-Sig DAO structure: ${daoName}...`);

    setTimeout(() => {
      const generatedAddress = "0x" + Math.random().toString(16).substr(2, 40);
      const newDAO: DAO = {
        contractAddress: generatedAddress,
        name: daoName,
        symbol: daoSymbol.toUpperCase(),
        description: daoDesc,
        creator: wallet.address,
        governanceTokenAddress: govToken,
        treasuryBalanceEth: 5.0, // starts with 5 mock ETH treasury
        memberCount: 1,
        proposals: [],
        createdAt: Date.now()
      };

      const current = AgunnayaDatabase.getDAOs();
      current.push(newDAO);
      AgunnayaDatabase.saveDAOs(current);

      // Charge gas
      const updatedWallet = { ...wallet, balanceEth: Math.max(0, wallet.balanceEth - 0.01) };
      AgunnayaDatabase.saveWallet(updatedWallet);
      onRefreshDAOs();

      AgunnayaDatabase.addActivity({
        type: "create",
        tokenSymbol: newDAO.symbol,
        tokenAddress: newDAO.contractAddress,
        user: wallet.address,
        amount: 0,
        ethValue: 0.01,
        details: `Created decentralized governance DAO: ${newDAO.name} (${newDAO.symbol})`
      });

      addTerminalLog("success", `Governor contract deployed at ${newDAO.contractAddress}`);
      showToast(`DAO Assembly "${newDAO.name}" successfully created!`, "success");
      setCreatingDao(false);
      setDaoName("");
      setDaoSymbol("");
      setDaoDesc("");
      setTargetDaoAddress(generatedAddress);
      setActiveTab("daos");
    }, 2000);
  };

  // Delegate Votes Handler
  const handleSaveDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateAddress) return;
    setCurrentDelegate(delegateAddress === wallet.address ? "Self-Delegated" : delegateAddress.slice(0, 8) + "...");
    setShowDelegationModal(false);
    showToast(`Voting power delegated to ${delegateAddress.slice(0, 10)}...`, "success");
    addTerminalLog("success", `Delegated ${wallet.aglTokenBalance.toLocaleString()} AGL voting power to ${delegateAddress}`);
  };

  return (
    <div id="governance-hub-root" className="space-y-8 animate-fade-in">
      
      {/* Top Header & Voting Power Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-purple-950/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-purple/20 text-brand-purple border border-brand-purple/30 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-spin-slow" />
                Base Governance Portal
              </span>
              <span className="text-zinc-500 text-xs font-mono">• Governor Alpha Engine</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight">
              Community Governance & Proposals
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl mt-1 leading-relaxed">
              Submit, vote, and execute on-chain governance proposals across Base L2 community DAOs. Weighted by AGL utility token balances with multi-sig treasury protection.
            </p>
          </div>

          {/* User Voting Power Card */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 min-w-[260px] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Your Voting Weight</span>
              <span className="text-brand-purple font-mono font-bold">{wallet.aglTokenBalance.toLocaleString()} AGL</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-white/5">
              <span>Current Delegate:</span>
              <span className="text-white font-bold">{currentDelegate}</span>
            </div>
            <button
              id="btn-delegate-voting-power"
              onClick={() => setShowDelegationModal(true)}
              className="w-full py-1.5 bg-brand-purple/20 hover:bg-brand-purple/40 text-brand-purple hover:text-white border border-brand-purple/30 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Delegate Voting Power</span>
            </button>
          </div>
        </div>

        {/* Global Governance Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Managed Treasuries</span>
            <span className="text-lg font-display font-bold text-emerald-400 mt-0.5 block">{totalTreasuryEth.toFixed(1)} ETH</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Active Proposals</span>
            <span className="text-lg font-display font-bold text-amber-400 mt-0.5 block">{activeProposalsCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Ready to Execute</span>
            <span className="text-lg font-display font-bold text-brand-purple mt-0.5 block">{passedProposalsCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Deployed DAOs</span>
            <span className="text-lg font-display font-bold text-white mt-0.5 block">{daos.length}</span>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none font-mono text-xs">
          <button
            id="tab-gov-proposals"
            onClick={() => setActiveTab("proposals")}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "proposals"
                ? "bg-brand-purple text-white shadow-lg shadow-purple-500/20"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Proposals Stream ({allProposals.length})</span>
          </button>

          <button
            id="tab-gov-daos"
            onClick={() => setActiveTab("daos")}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "daos"
                ? "bg-brand-purple text-white shadow-lg shadow-purple-500/20"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>DAO Assemblies ({daos.length})</span>
          </button>

          <button
            id="tab-gov-create-prop"
            onClick={() => setActiveTab("create_proposal")}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "create_proposal"
                ? "bg-brand-purple text-white shadow-lg shadow-purple-500/20"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Draft New Proposal</span>
          </button>

          <button
            id="tab-gov-create-dao"
            onClick={() => setActiveTab("create_dao")}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "create_dao"
                ? "bg-brand-purple text-white shadow-lg shadow-purple-500/20"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Assemble New DAO</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PROPOSALS STREAM */}
      {activeTab === "proposals" && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-950/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                id="search-proposals-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search proposals by title, summary, or DAO..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-brand-purple/50"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto font-mono text-[11px] scrollbar-none">
              <span className="text-zinc-500 text-[10px] mr-1 uppercase font-bold">Status:</span>
              {[
                { id: "all", label: "All" },
                { id: "Active", label: "⚡ Active" },
                { id: "Passed", label: "✅ Passed" },
                { id: "Executed", label: "🚀 Executed" }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-3 py-1.5 rounded-lg shrink-0 font-bold transition-all ${
                    statusFilter === st.id
                      ? "bg-white/15 text-white border border-white/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[10px] font-mono uppercase font-bold">Type:</span>
              <select
                id="filter-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="treasury">💰 Treasury Grant</option>
                <option value="parameter">⚙️ Parameter Change</option>
                <option value="upgrade">🔒 Contract Upgrade</option>
                <option value="general">🗳️ Community Poll</option>
              </select>
            </div>
          </div>

          {/* Proposals List */}
          {filteredProposals.length === 0 ? (
            <div className="py-20 text-center glass-panel rounded-2xl border border-dashed border-white/10 space-y-3">
              <Vote className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400 font-mono">No governance proposals matching current filter settings.</p>
              <button
                onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); setSearchQuery(""); }}
                className="text-xs font-mono text-brand-purple underline"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProposals.map((prop) => {
                const totalVotes = prop.votesFor + prop.votesAgainst;
                const percentFor = totalVotes > 0 ? Math.round((prop.votesFor / totalVotes) * 100) : 0;
                const percentAgainst = totalVotes > 0 ? 100 - percentFor : 0;
                const quorum = prop.quorumThreshold || 500000;
                const quorumReached = prop.votesFor >= quorum;
                const isExpanded = expandedDiscussionId === prop.id;

                return (
                  <div 
                    key={prop.id}
                    className={`glass-panel p-6 rounded-3xl border transition-all space-y-5 bg-zinc-950/70 ${
                      prop.status === "Passed" && !prop.executed
                        ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Proposal Card Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${
                          prop.category === "treasury"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : prop.category === "parameter"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : prop.category === "upgrade"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-zinc-800 text-zinc-300 border-white/10"
                        }`}>
                          {prop.category === "treasury" ? "💰 Treasury Grant" : prop.category === "parameter" ? "⚙️ Parameter" : prop.category === "upgrade" ? "🔒 Contract Upgrade" : "🗳️ General"}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                          prop.status === "Active"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : prop.status === "Passed"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : prop.status === "Executed"
                            ? "bg-brand-purple/20 text-purple-300 border border-brand-purple/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {prop.status === "Active" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                          {prop.status}
                        </span>

                        {/* DAO Badge */}
                        <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-bold">
                          {prop.daoName} ({prop.daoSymbol})
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        Ends in 3 days • ID: {prop.id}
                      </span>
                    </div>

                    {/* Proposal Title & Description */}
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold font-display text-white tracking-tight">{prop.title}</h3>
                      <p className="text-xs text-zinc-300 leading-relaxed">{prop.description}</p>
                    </div>

                    {/* Requested ETH details if Treasury Grant */}
                    {prop.requestedEth && (
                      <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-200">Requested Treasury Payout:</span>
                        </div>
                        <span className="font-bold text-emerald-400">{prop.requestedEth} ETH → {prop.recipientAddress?.slice(0, 8)}...</span>
                      </div>
                    )}

                    {/* Voting Progress Breakdown Bar */}
                    <div className="space-y-2 bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold">FOR: {prop.votesFor.toLocaleString()} AGL ({percentFor}%)</span>
                        <span className="text-rose-400 font-bold">AGAINST: {prop.votesAgainst.toLocaleString()} AGL ({percentAgainst}%)</span>
                      </div>

                      {/* Bar Visual */}
                      <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${percentFor}%` }} />
                        <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${percentAgainst}%` }} />
                      </div>

                      {/* Quorum Progress */}
                      <div className="flex items-center justify-between text-[10px] pt-1 text-zinc-400">
                        <span>Quorum Needed: {quorum.toLocaleString()} AGL</span>
                        <span className={`font-bold ${quorumReached ? "text-emerald-400" : "text-amber-400"}`}>
                          {quorumReached ? "✓ Quorum Met" : `Progress: ${Math.round((prop.votesFor / quorum) * 100)}%`}
                        </span>
                      </div>
                    </div>

                    {/* Execution Hash Banner if Executed */}
                    {prop.executed && prop.executionTxHash && (
                      <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-purple-300 font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-400" /> Executed On-Chain
                        </span>
                        <span className="text-zinc-400 font-mono text-[10px]">{prop.executionTxHash}</span>
                      </div>
                    )}

                    {/* Interactive Action Bar (Vote, Execute, Discussion) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                      {/* Voting Buttons */}
                      {prop.status === "Active" ? (
                        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                          <button
                            id={`btn-vote-for-${prop.id}`}
                            onClick={() => handleCastVote(prop.daoAddress, prop.id, true)}
                            disabled={votingId === prop.id}
                            className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Vote FOR ({wallet.aglTokenBalance.toLocaleString()} AGL)</span>
                          </button>
                          <button
                            id={`btn-vote-against-${prop.id}`}
                            onClick={() => handleCastVote(prop.daoAddress, prop.id, false)}
                            disabled={votingId === prop.id}
                            className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Vote AGAINST</span>
                          </button>
                        </div>
                      ) : prop.status === "Passed" && !prop.executed ? (
                        /* Execute Governance Transaction Button */
                        <button
                          id={`btn-execute-prop-${prop.id}`}
                          onClick={() => handleExecuteProposal(prop.daoAddress, prop.id)}
                          disabled={executingId === prop.id}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-display font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Zap className="w-4 h-4 fill-current" />
                          <span>{executingId === prop.id ? "Executing multi-sig transaction..." : "⚡ Execute Passed Governance Transaction"}</span>
                        </button>
                      ) : (
                        <div className="text-xs text-zinc-500 font-mono italic">
                          Voting concluded for this proposal.
                        </div>
                      )}

                      {/* Discussion Comments Toggle */}
                      <button
                        id={`btn-discussion-toggle-${prop.id}`}
                        onClick={() => setExpandedDiscussionId(isExpanded ? null : prop.id)}
                        className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-brand-purple" />
                        <span>Discussion ({prop.comments?.length || 0})</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {/* Discussion Comments Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-3 bg-black/40 p-4 rounded-2xl">
                        <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block">Community Discussion Thread</span>

                        {/* Existing comments */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {(prop.comments && prop.comments.length > 0) ? (
                            prop.comments.map((comm) => (
                              <div key={comm.id} className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 space-y-1 text-xs">
                                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                  <span className="text-purple-300 font-bold">{comm.author}</span>
                                  <span>{new Date(comm.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-zinc-300">{comm.text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-zinc-500 italic">No comments posted yet. Be the first to comment!</p>
                          )}
                        </div>

                        {/* Post Comment Input */}
                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Share your feedback or questions..."
                            className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                          />
                          <button
                            id={`btn-post-comment-${prop.id}`}
                            onClick={() => handleAddComment(prop.daoAddress, prop.id)}
                            className="px-4 py-2 bg-brand-purple hover:bg-purple-600 text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" /> Post
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAO ASSEMBLIES DIRECTORY */}
      {activeTab === "daos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {daos.map((dao) => (
            <div key={dao.contractAddress} className="glass-panel p-6 rounded-3xl border border-white/10 bg-zinc-950/70 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-bold text-white text-base">{dao.name}</h3>
                  <span className="text-xs font-mono text-brand-purple font-bold uppercase">{dao.symbol}</span>
                </div>
                <span className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded-lg text-zinc-400 border border-white/5 truncate max-w-[140px]">
                  {dao.contractAddress}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">{dao.description}</p>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-black/40 p-3 rounded-2xl border border-white/5">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Treasury Vault</span>
                  <span className="text-emerald-400 font-bold text-sm">{dao.treasuryBalanceEth} ETH</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Proposals Active</span>
                  <span className="text-white font-bold text-sm">{dao.proposals.length}</span>
                </div>
              </div>

              <button
                id={`btn-select-dao-for-prop-${dao.contractAddress}`}
                onClick={() => {
                  setTargetDaoAddress(dao.contractAddress);
                  setActiveTab("create_proposal");
                }}
                className="w-full py-2.5 bg-brand-purple/20 hover:bg-brand-purple text-brand-purple hover:text-white border border-brand-purple/30 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Draft Proposal for {dao.symbol}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: CREATE PROPOSAL WIZARD */}
      {activeTab === "create_proposal" && (
        <div className="max-w-3xl mx-auto glass-panel p-8 rounded-3xl border border-white/10 bg-zinc-950/80 space-y-6">
          <div>
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-purple" /> Draft Governance Proposal
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Submit a structured action payload to the community Governor contract.
            </p>
          </div>

          {/* AI Prompt Presets */}
          <div className="p-4 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-brand-purple flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Gemini AI Draft Assistant
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleApplyAIPreset("hackathon")}
                className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-mono transition-all cursor-pointer"
              >
                💡 Fund Base L2 Hackathon (3.5 ETH)
              </button>
              <button
                type="button"
                onClick={() => handleApplyAIPreset("quorum")}
                className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-mono transition-all cursor-pointer"
              >
                💡 Lower Quorum to 350k AGL
              </button>
              <button
                type="button"
                onClick={() => handleApplyAIPreset("audit")}
                className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-mono transition-all cursor-pointer"
              >
                💡 Smart Contract Audit (2.0 ETH)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitProposal} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Target DAO Assembly</label>
              <select
                value={targetDaoAddress}
                onChange={(e) => setTargetDaoAddress(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white font-mono focus:outline-none"
              >
                {daos.map((d) => (
                  <option key={d.contractAddress} value={d.contractAddress}>
                    {d.name} ({d.symbol}) - Treasury: {d.treasuryBalanceEth} ETH
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Proposal Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                {[
                  { id: "treasury", label: "💰 Treasury Grant" },
                  { id: "parameter", label: "⚙️ Parameter" },
                  { id: "upgrade", label: "🔒 Upgrade" },
                  { id: "general", label: "🗳️ General Poll" }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPropCategory(cat.id as any)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      propCategory === cat.id
                        ? "bg-brand-purple text-white border-brand-purple"
                        : "bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Proposal Title</label>
              <input
                type="text"
                value={propTitle}
                onChange={(e) => setPropTitle(e.target.value)}
                placeholder="e.g. Fund Base Ecosystem Developer Grants"
                required
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Detailed Description & Execution Rationale</label>
              <textarea
                value={propDesc}
                onChange={(e) => setPropDesc(e.target.value)}
                rows={4}
                placeholder="Describe why this proposal benefits the ecosystem, specific spending breakdowns, and execution steps..."
                required
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple"
              />
            </div>

            {propCategory === "treasury" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/40 border border-white/5">
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Requested Treasury ETH</label>
                  <input
                    type="number"
                    step="0.1"
                    value={requestedEth}
                    onChange={(e) => setRequestedEth(e.target.value)}
                    placeholder="2.0"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Recipient Wallet Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingProp}
              className="w-full py-3.5 bg-brand-purple hover:bg-purple-600 text-white font-display font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{submittingProp ? "Broadcasting to Governor Contract..." : "Submit Governance Proposal"}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: ASSEMBLE NEW DAO */}
      {activeTab === "create_dao" && (
        <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl border border-white/10 bg-zinc-950/80 space-y-6">
          <div>
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-purple" /> Assemble DAO Multi-Sig Guild
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Deploy a Governor Alpha smart contract assembly on Base L2 with on-chain multi-sig treasury.
            </p>
          </div>

          <form onSubmit={handleCreateDAO} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Guild Name</label>
                <input
                  type="text"
                  value={daoName}
                  onChange={(e) => setDaoName(e.target.value)}
                  placeholder="Base Cyber Guild"
                  required
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Symbol</label>
                <input
                  type="text"
                  value={daoSymbol}
                  onChange={(e) => setDaoSymbol(e.target.value)}
                  placeholder="BCG"
                  required
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white font-mono uppercase focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">Constitution & Objective</label>
              <textarea
                value={daoDesc}
                onChange={(e) => setDaoDesc(e.target.value)}
                rows={3}
                placeholder="Declare the governing rules, grant criteria, and multi-sig policies..."
                required
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={creatingDao}
              className="w-full py-3.5 bg-brand-purple hover:bg-purple-600 text-white font-display font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Landmark className="w-4 h-4" />
              <span>{creatingDao ? "Deploying Governor Multi-Sig..." : "Deploy DAO Assembly (0.01 ETH Gas)"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Delegation Modal */}
      {showDelegationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-zinc-950 max-w-md w-full space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-white">Delegate AGL Voting Weight</h3>
              <button onClick={() => setShowDelegationModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-zinc-400">
              Delegate your {wallet.aglTokenBalance.toLocaleString()} AGL voting power to another wallet address or self-delegate.
            </p>

            <form onSubmit={handleSaveDelegation} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">Delegate Wallet Address</label>
                <input
                  type="text"
                  value={delegateAddress}
                  onChange={(e) => setDelegateAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDelegateAddress(wallet.address)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 rounded-xl"
                >
                  Self-Delegate
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-purple hover:bg-purple-600 text-white font-mono font-bold text-xs rounded-xl"
                >
                  Save Delegation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
