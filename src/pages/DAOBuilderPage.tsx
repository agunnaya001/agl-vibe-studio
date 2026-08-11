import React, { useState } from "react";
import { DAO, Proposal, WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { Users, Vote, Plus, Wallet, ShieldAlert, Sparkles, Building, Landmark, CheckCircle } from "lucide-react";

interface DAOBuilderPageProps {
  wallet: WalletState;
  daos: DAO[];
  onRefreshDAOs: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function DAOBuilderPage({ wallet, daos, onRefreshDAOs, addTerminalLog, showToast }: DAOBuilderPageProps) {
  const [daoName, setDaoName] = useState("");
  const [daoSymbol, setDaoSymbol] = useState("");
  const [daoDesc, setDaoDesc] = useState("");
  const [govToken, setGovToken] = useState("0xea1221b4d80a89bd8c75248fae7c176bd1854698"); // default to AGL
  const [creatingDao, setCreatingDao] = useState(false);

  // Proposal Form State
  const [selectedDaoAddress, setSelectedDaoAddress] = useState<string | null>(null);
  const [propTitle, setPropTitle] = useState("");
  const [propDesc, setPropDesc] = useState("");
  const [submittingProp, setSubmittingProp] = useState(false);

  // Voting state
  const [votingId, setVotingId] = useState<string | null>(null);

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
        treasuryBalanceEth: 5.0, // starts with 5 mock ETH treasury!
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

      addTerminalLog("success", `Governor contract active at ${newDAO.contractAddress}`);
      setCreatingDao(false);
      setDaoName("");
      setDaoSymbol("");
      setDaoDesc("");
    }, 2000);
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDaoAddress || !propTitle || !propDesc) return;
    setSubmittingProp(true);

    addTerminalLog("info", `Broadcasting proposal spending transaction to selected DAO...`);

    setTimeout(() => {
      const all = AgunnayaDatabase.getDAOs();
      const dao = all.find(d => d.contractAddress === selectedDaoAddress);

      if (dao) {
        const newProp: Proposal = {
          id: "prop_" + Math.random().toString(36).substr(2, 5),
          title: propTitle,
          description: propDesc,
          creator: wallet.address,
          status: "Active",
          votesFor: 100, // starts with initial votes from creator
          votesAgainst: 0,
          endTime: Date.now() + 3 * 24 * 60 * 60 * 1000,
          executed: false
        };

        dao.proposals.unshift(newProp);
        AgunnayaDatabase.saveDAOs(all);

        // Deduct small gas
        const updatedWallet = { ...wallet, balanceEth: Math.max(0, wallet.balanceEth - 0.001) };
        AgunnayaDatabase.saveWallet(updatedWallet);
        onRefreshDAOs();

        AgunnayaDatabase.addActivity({
          type: "vote",
          tokenSymbol: dao.symbol,
          tokenAddress: dao.contractAddress,
          user: wallet.address,
          amount: 100,
          ethValue: 0,
          details: `Submitted governance Proposal: "${propTitle}" in ${dao.name} DAO`
        });

        addTerminalLog("success", `Proposal ${newProp.id} broadcast successfully!`);
      }

      setPropTitle("");
      setPropDesc("");
      setSubmittingProp(false);
      setSelectedDaoAddress(null);
    }, 1500);
  };

  const handleVote = (daoAddress: string, propId: string, support: boolean) => {
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    setVotingId(propId);

    setTimeout(() => {
      const all = AgunnayaDatabase.getDAOs();
      const dao = all.find(d => d.contractAddress === daoAddress);
      
      if (dao) {
        const prop = dao.proposals.find(p => p.id === propId);
        if (prop) {
          const voteWeight = wallet.aglTokenBalance || 100; // votes weighted by user's AGL balance!
          if (support) {
            prop.votesFor += voteWeight;
          } else {
            prop.votesAgainst += voteWeight;
          }

          // If votesFor is high, passed!
          if (prop.votesFor > prop.votesAgainst + 500) {
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
            details: `Cast ${voteWeight.toLocaleString()} votes ${support ? "FOR" : "AGAINST"} proposal: "${prop.title}"`
          });

          addTerminalLog("success", `Voted successfully using ${voteWeight} voting weight!`);
        }
      }
      setVotingId(null);
    }, 1200);
  };

  return (
    <div id="dao-builder-root" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      
      {/* Create form panel */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
          <div>
            <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-purple" />
              DAO Governance Assembly
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Assemble fully decentralized governance forums with on-chain treasury controls, token-weighted voting thresholds, and executive multi-sig overrides.
            </p>
          </div>

          <form onSubmit={handleCreateDAO} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">DAO Guild Name</label>
                <input
                  id="dao-name-input"
                  type="text"
                  value={daoName}
                  onChange={(e) => setDaoName(e.target.value)}
                  placeholder="e.g. Base Developers Alliance"
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Guild Symbol</label>
                <input
                  id="dao-symbol-input"
                  type="text"
                  value={daoSymbol}
                  onChange={(e) => setDaoSymbol(e.target.value)}
                  placeholder="e.g. BDA"
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white uppercase focus:outline-none focus:border-brand-purple/40 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Guild Objective & Constitution</label>
              <textarea
                id="dao-desc-input"
                value={daoDesc}
                onChange={(e) => setDaoDesc(e.target.value)}
                rows={3}
                placeholder="Declare the governing objectives, funding criteria, or staking structures of this community..."
                required
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Governance Token Hookup</label>
              <select
                id="dao-govtoken-select"
                value={govToken}
                onChange={(e) => setGovToken(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-brand-purple/40 font-mono"
              >
                <option value="0xea1221b4d80a89bd8c75248fae7c176bd1854698">Agunnaya Utility Token (AGL)</option>
                <option value="custom">Deployer Custom ERC-20 Asset</option>
              </select>
            </div>

            <button
              id="dao-create-submit-btn"
              type="submit"
              disabled={creatingDao}
              className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 font-semibold font-display text-xs text-white shadow-lg shadow-brand-purple/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-2"
            >
              <Landmark className="w-4 h-4" />
              <span>{creatingDao ? "Deploying DAO alpha governance..." : "Create DAO Assembly"}</span>
            </button>
          </form>
        </div>

        {/* Selected DAO proposal form */}
        {selectedDaoAddress && (
          <div className="glass-panel p-6 rounded-2xl border border-brand-purple/30 bg-brand-purple/5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-display">Submit Community Proposal</span>
              <button 
                id="close-prop-form"
                onClick={() => setSelectedDaoAddress(null)} 
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Proposal Title</label>
                <input
                  id="prop-title-input"
                  type="text"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  placeholder="e.g. Upgrade contract security multi-sig"
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Action Details & Execution Parameters</label>
                <textarea
                  id="prop-desc-input"
                  value={propDesc}
                  onChange={(e) => setPropDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe what resources are required, treasury payouts, or specific contract changes..."
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                id="prop-submit-btn"
                type="submit"
                disabled={submittingProp}
                className="w-full py-2.5 rounded-xl bg-brand-purple hover:bg-purple-600 text-xs font-semibold font-display text-white transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{submittingProp ? "Broadcasting proposal..." : "Submit Proposal"}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Deployed DAOs and active proposals */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Vote className="w-4 h-4 text-brand-purple" /> Deployed Assemblies
        </h3>

        {daos.length === 0 ? (
          <div className="text-center py-24 bg-zinc-950/20 border border-dashed border-white/5 rounded-2xl">
            <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">No community assemblies deployed.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {daos.map((dao) => (
              <div key={dao.contractAddress} className="glass-panel rounded-2xl border border-white/5 p-4 bg-zinc-900/10 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-display font-bold text-white text-xs">{dao.name}</h4>
                    <span className="text-[9px] font-mono font-bold text-brand-purple uppercase">{dao.symbol}</span>
                  </div>
                  <span className="block text-[8px] font-mono text-zinc-500 truncate">Governance: {dao.contractAddress}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/40 p-2 rounded-lg border border-white/5">
                  <div>
                    <span className="text-zinc-500">Treasury: </span>
                    <span className="text-emerald-400 font-bold">{dao.treasuryBalanceEth} ETH</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500">Members: </span>
                    <span className="text-white font-bold">{dao.memberCount}</span>
                  </div>
                </div>

                {/* Proposal Submission Trigger */}
                <button
                  id={`trigger-prop-form-${dao.contractAddress}`}
                  onClick={() => setSelectedDaoAddress(dao.contractAddress)}
                  className="w-full py-1.5 bg-brand-purple/20 hover:bg-brand-purple text-brand-purple hover:text-white border border-brand-purple/30 text-[9px] font-bold font-mono rounded-lg transition-all"
                >
                  + Submit Proposal
                </button>

                {/* Proposals stream */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <span className="block text-[8px] uppercase font-bold text-zinc-500">Active Proposals ({dao.proposals.length})</span>
                  {dao.proposals.map((prop) => (
                    <div key={prop.id} className="p-2.5 bg-black/30 rounded-xl border border-white/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200 truncate pr-2">{prop.title}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          prop.status === "Passed" ? "bg-emerald-500/20 text-emerald-400" : "bg-brand-purple/20 text-brand-purple"
                        }`}>
                          {prop.status}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[10px] leading-normal">{prop.description}</p>
                      
                      {/* Vote Buttons */}
                      <div className="flex gap-2 font-mono text-[9px]">
                        <button
                          id={`vote-for-${prop.id}`}
                          onClick={() => handleVote(dao.contractAddress, prop.id, true)}
                          disabled={votingId === prop.id}
                          className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded transition-all"
                        >
                          For ({prop.votesFor})
                        </button>
                        <button
                          id={`vote-against-${prop.id}`}
                          onClick={() => handleVote(dao.contractAddress, prop.id, false)}
                          disabled={votingId === prop.id}
                          className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded transition-all"
                        >
                          Against ({prop.votesAgainst})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
