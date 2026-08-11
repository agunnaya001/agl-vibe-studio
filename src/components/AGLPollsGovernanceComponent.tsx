import React, { useState, useEffect } from "react";
import { 
  Vote, 
  CheckCircle2, 
  Plus, 
  Clock, 
  Sparkles, 
  Users, 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  X, 
  BarChart3, 
  Layers, 
  RefreshCw,
  Flame,
  Award
} from "lucide-react";
import { AGLPoll, WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";

interface AGLPollsGovernanceComponentProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
}

export default function AGLPollsGovernanceComponent({
  wallet,
  onRefreshWallet,
  showToast,
  addTerminalLog
}: AGLPollsGovernanceComponentProps) {
  const [polls, setPolls] = useState<AGLPoll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<AGLPoll | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [isVoting, setIsVoting] = useState(false);

  // New Poll Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollDescription, setPollDescription] = useState("");
  const [pollCategory, setPollCategory] = useState<"pair" | "fee" | "grant" | "param">("pair");
  const [pollOptions, setPollOptions] = useState<string[]>(["AGL / SOL (Cross-chain)", "AGL / UNI (Uniswap V3)", "AGL / LINK (Chainlink Oracles)"]);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = () => {
    const list = AgunnayaDatabase.getAGLPolls();
    setPolls(list);
    if (list.length > 0 && !selectedPoll) {
      setSelectedPoll(list[0]);
    }
  };

  const handleCastVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoll || !selectedOptionId) {
      showToast("Please select a poll option to cast your vote", "error");
      return;
    }

    // Voting weight equals user's AGL balance + Staked AGL balance (min 1 vote weight for preview)
    const userAglBalance = wallet.aglTokenBalance || 0;
    const userStakedAgl = wallet.aglLiquidityStaked || 0;
    const voteWeight = Math.max(1000, userAglBalance + userStakedAgl);

    setIsVoting(true);

    setTimeout(() => {
      try {
        const { updatedPoll } = AgunnayaDatabase.voteOnAGLPoll(selectedPoll.id, selectedOptionId, voteWeight);
        setSelectedPoll(updatedPoll);
        loadPolls();
        setIsVoting(false);

        const chosenOption = updatedPoll.options.find(o => o.id === selectedOptionId);
        if (addTerminalLog) {
          addTerminalLog("success", `AGL Poll Vote Cast! Voted ${voteWeight.toLocaleString()} $AGL weight on "${chosenOption?.label}" in "${updatedPoll.title}"`);
        }
        showToast(`Cast ${voteWeight.toLocaleString()} $AGL vote on "${chosenOption?.label}"!`, "success");
      } catch (err: any) {
        setIsVoting(false);
        showToast(`Failed to cast vote: ${err.message}`, "error");
      }
    }, 800);
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollTitle.trim() || !pollDescription.trim()) {
      showToast("Please fill in poll title and description", "error");
      return;
    }

    const validOptions = pollOptions.filter(o => o.trim().length > 0);
    if (validOptions.length < 2) {
      showToast("Poll must have at least 2 valid options", "error");
      return;
    }

    try {
      const created = AgunnayaDatabase.addAGLPoll({
        title: pollTitle.trim(),
        description: pollDescription.trim(),
        category: pollCategory,
        options: validOptions.map((opt, i) => ({
          id: `opt_custom_${i}_${Date.now()}`,
          label: opt.trim(),
          votes: 0,
          voters: []
        })),
        status: "active",
        endTime: Date.now() + 86400000 * 7
      });

      loadPolls();
      setSelectedPoll(created);
      setShowCreateModal(false);
      setPollTitle("");
      setPollDescription("");
      showToast(`Created new AGL Poll "${created.title}"!`, "success");
    } catch (err: any) {
      showToast(`Failed to create poll: ${err.message}`, "error");
    }
  };

  const votingWeight = Math.max(1000, (wallet.aglTokenBalance || 0) + (wallet.aglLiquidityStaked || 0));

  return (
    <div id="agl-polls-governance-container" className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-purple/20 via-brand-blue/15 to-emerald-500/10 border border-white/10 glow-border-purple relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand-purple font-mono text-[10px] font-bold uppercase tracking-widest">
              <Vote className="w-4 h-4 text-brand-purple" />
              <span>Agunnaya On-Chain DAO Governance & Pair Voting</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-display font-bold text-white flex items-center gap-3">
              AGL Liquidity & Protocol Polls
              <span className="text-xs font-mono font-bold bg-brand-purple/20 text-purple-300 border border-brand-purple/30 px-2.5 py-1 rounded-full">
                WEIGHT: {votingWeight.toLocaleString()} $AGL
              </span>
            </h2>
            <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
              Vote on live AGL liquidity pair additions, protocol fee splits, and AI agent grants using your $AGL token and staked LP balances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-create-agl-poll"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg shadow-brand-purple/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create AGL Poll
            </button>
            <button
              id="btn-refresh-polls"
              onClick={loadPolls}
              className="p-2.5 bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer"
              title="Refresh Polls"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Poll List (6 cols) + Active Voting Inspector (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Poll Cards List (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-zinc-400 px-1">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-purple" /> Active AGL Polls ({polls.length})
            </span>
            <span>Your Vote Power: {votingWeight.toLocaleString()} $AGL</span>
          </div>

          <div className="space-y-3">
            {polls.map((poll) => {
              const isSelected = selectedPoll?.id === poll.id;
              const hasVoted = poll.options.some(o => o.voters.includes(wallet.address));

              return (
                <div
                  key={poll.id}
                  onClick={() => {
                    setSelectedPoll(poll);
                    setSelectedOptionId("");
                  }}
                  className={`p-5 rounded-2xl bg-zinc-900/90 border transition-all cursor-pointer space-y-3 relative ${
                    isSelected
                      ? "border-brand-purple ring-1 ring-brand-purple/40 bg-zinc-900 shadow-xl"
                      : "border-white/10 hover:border-white/20 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-brand-purple/20 text-purple-300 border border-brand-purple/30">
                          #{poll.category}
                        </span>
                        {hasVoted && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Voted
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold font-display text-white line-clamp-2">{poll.title}</h3>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-400 bg-black/50 px-2 py-1 rounded-lg border border-white/5 shrink-0">
                      {poll.totalVotes.toLocaleString()} Votes
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 font-sans line-clamp-2">
                    {poll.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-purple" /> Ends in {Math.ceil((poll.endTime - Date.now()) / (1000*60*60*24))} days
                    </span>
                    <span>{poll.options.length} Options</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Poll Voting Inspector (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-zinc-900/90 border border-white/10 space-y-5 shadow-2xl relative">
          {selectedPoll ? (
            <form onSubmit={handleCastVote} className="space-y-5">
              <div className="border-b border-white/10 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-brand-purple bg-brand-purple/20 px-2.5 py-0.5 rounded-full border border-brand-purple/30">
                    Category: {selectedPoll.category.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    Total Tally: <strong className="text-white">{selectedPoll.totalVotes.toLocaleString()} Votes</strong>
                  </span>
                </div>
                <h3 className="text-lg font-bold font-display text-white">{selectedPoll.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{selectedPoll.description}</p>
              </div>

              {/* Options List with Live Tally Percentage Bars */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold uppercase text-zinc-400 block">
                  Select Poll Option & Vote:
                </label>

                {selectedPoll.options.map((opt) => {
                  const pct = selectedPoll.totalVotes > 0 
                    ? ((opt.votes / selectedPoll.totalVotes) * 100).toFixed(1)
                    : "0.0";
                  const isChecked = selectedOptionId === opt.id;
                  const isUserVoted = opt.voters.includes(wallet.address);

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative overflow-hidden ${
                        isChecked
                          ? "border-brand-purple bg-brand-purple/10 ring-1 ring-brand-purple/40"
                          : "border-white/10 bg-black/40 hover:border-white/20"
                      }`}
                    >
                      {/* Background Progress Bar Fill */}
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-brand-purple/20 transition-all duration-500 pointer-events-none"
                        style={{ width: `${pct}%` }}
                      ></div>

                      <div className="relative z-10 flex items-center justify-between gap-3 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="poll_option"
                            checked={isChecked}
                            onChange={() => setSelectedOptionId(opt.id)}
                            className="accent-purple-500 cursor-pointer"
                          />
                          <span className="font-bold text-white">{opt.label}</span>
                          {isUserVoted && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                              Your Choice
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-purple-300 block">{pct}%</span>
                          <span className="text-[9px] text-zinc-500 block">{opt.votes.toLocaleString()} votes</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vote Submit Action */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span>Voting Weight (AGL + Staked):</span>
                  <span className="font-bold text-emerald-400">{votingWeight.toLocaleString()} $AGL</span>
                </div>

                <button
                  type="submit"
                  disabled={isVoting || !selectedOptionId}
                  className="w-full py-3 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20 cursor-pointer disabled:opacity-50"
                >
                  {isVoting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Recording On-Chain Vote...
                    </>
                  ) : (
                    <>
                      <Vote className="w-4 h-4" /> Cast On-Chain Vote
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12 text-zinc-500 font-mono text-xs">
              Select an AGL poll to view details and cast votes.
            </div>
          )}
        </div>
      </div>

      {/* Modal to Create New AGL Poll */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/15 rounded-3xl p-6 max-w-lg w-full space-y-5 relative shadow-2xl font-mono text-xs">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white p-1 rounded-lg bg-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                <Vote className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">Create AGL Poll</h3>
                <p className="text-xs text-zinc-400 font-sans">Propose new liquidity pair boost, fee split, or agent grant.</p>
              </div>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Poll Title</label>
                <input
                  type="text"
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="e.g. AGL Liquidity Pair Boost: AGL / SOL"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-brand-purple"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Category</label>
                <select
                  value={pollCategory}
                  onChange={(e) => setPollCategory(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-purple"
                >
                  <option value="pair">Pair Addition & Boost</option>
                  <option value="fee">Protocol Fee Distribution</option>
                  <option value="grant">AI Agent Treasury Grant</option>
                  <option value="param">Protocol Parameter</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Description</label>
                <textarea
                  value={pollDescription}
                  onChange={(e) => setPollDescription(e.target.value)}
                  rows={2}
                  placeholder="Provide context for voters..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white font-sans focus:outline-none focus:border-brand-purple"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 font-bold block">Poll Options (At least 2)</label>
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[i] = e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option #${i + 1}`}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-purple"
                  />
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl font-bold shadow-lg shadow-brand-purple/20 cursor-pointer"
                >
                  Create Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
