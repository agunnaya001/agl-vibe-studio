import React, { useState } from "react";
import { 
  Award, 
  Coins, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  Plus, 
  Send, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Flame, 
  Building2, 
  FileText, 
  Lock, 
  AlertCircle,
  X,
  Vote
} from "lucide-react";
import { EcosystemBounty, BountySubmission } from "../types/ecosystem";
import { VentureGrant, MilestoneTranche } from "../types/ventureGrants";
import { EcosystemService } from "../lib/ecosystemService";
import { WalletState } from "../types";
import { AGL_VENTURE_GRANTS_ADDRESS, AGL_DAO_GOVERNOR_ADDRESS, AGL_TREASURY_ADDRESS } from "../lib/aglContracts";

interface BountiesGrantsPageProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  onSelectTab: (tab: string) => void;
}

const DEFAULT_VENTURE_GRANTS: VentureGrant[] = [
  {
    id: "grant-vg-001",
    grantNumber: "AVG-001",
    projectId: "aaic-token",
    projectName: "Agunnaya AI Compute",
    projectSymbol: "AAIC",
    contractAddress: "0xa19a0B2C7e00EB4e9619c0Bf1B1Ae00Ee23AB6B5",
    creatorAddress: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
    category: "ai",
    tier: "growth_velocity",
    tierName: "Growth Velocity Cohort",
    totalGrantEth: 10.0,
    totalGrantAgl: 100000,
    coInvestmentEth: 5.0,
    disbursedEth: 4.0,
    disbursedAgl: 40000,
    milestones: [
      {
        id: "m-1",
        trancheNumber: 1,
        title: "Base Contract Deployment & Security Audit",
        description: "Deploy token contract with linear bonding curve mechanics and achieve 95+ score on AI Security Auditor.",
        percentage: 40,
        amountEth: 4.0,
        amountAgl: 40000,
        status: "claimed",
        verificationRequirement: "Verified BaseScan contract address + Clean CEI report",
        metricType: "contract_deployment",
        metricTargetValue: "100%",
        currentMetricValue: "100%",
        verifiedAt: Date.now() - 20 * 24 * 3600 * 1000,
        txHash: "0x7c9a8b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b"
      },
      {
        id: "m-2",
        trancheNumber: 2,
        title: "Community Traction & 500 Unique Token Holders",
        description: "Reach verified milestone of 500 distinct wallet holders on Base Mainnet.",
        percentage: 30,
        amountEth: 3.0,
        amountAgl: 30000,
        status: "verifiable",
        verificationRequirement: "BaseScan token holder count >= 500",
        metricType: "holders_threshold",
        metricTargetValue: 500,
        currentMetricValue: 524
      },
      {
        id: "m-3",
        trancheNumber: 3,
        title: "Bonding Curve Graduation to Aerodrome DEX",
        description: "Achieve 100% curve fill and migrate protocol-owned liquidity to DEX pool.",
        percentage: 30,
        amountEth: 3.0,
        amountAgl: 30000,
        status: "locked",
        verificationRequirement: "DEX LP pool creation transaction verified on-chain",
        metricType: "bonding_curve_graduation",
        metricTargetValue: "Graduation",
        currentMetricValue: "68% Filled"
      }
    ],
    coInvestment: {
      matchingLpEth: 5.0,
      protocolOwnershipPct: 15,
      vestingWeeks: 24,
      polVaultAddress: AGL_VENTURE_GRANTS_ADDRESS,
      status: "co_invested",
      coInvestedAt: Date.now() - 15 * 24 * 3600 * 1000,
      yieldAccruedEth: 0.42
    },
    status: "active",
    daoProposalId: "AGL-PROP-03",
    governanceState: "approved_by_dao",
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 2 * 24 * 3600 * 1000,
    currentRoiPct: 24.8,
    protocolLpAccruedEth: 0.42
  }
];

export default function BountiesGrantsPage({
  wallet,
  showToast,
  addTerminalLog,
  onSelectTab
}: BountiesGrantsPageProps) {
  const [activeTab, setActiveTab] = useState<"bounties" | "venture_grants">("bounties");
  const [bounties, setBounties] = useState<EcosystemBounty[]>(() => EcosystemService.getBounties());
  const [ventureGrants, setVentureGrants] = useState<VentureGrant[]>(() => {
    return EcosystemService.getMarketplaceItems() ? DEFAULT_VENTURE_GRANTS : DEFAULT_VENTURE_GRANTS;
  });

  // Submission Modal State
  const [submittingBounty, setSubmittingBounty] = useState<EcosystemBounty | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    applicantName: "",
    submissionUrl: "",
    githubPrUrl: "",
    contractAddress: "",
    description: ""
  });

  // Create Bounty Modal State
  const [isCreateBountyOpen, setIsCreateBountyOpen] = useState(false);
  const [newBountyForm, setNewBountyForm] = useState({
    title: "",
    category: "Smart Contracts" as any,
    rewardEth: 0.5,
    rewardAgl: 15000,
    deadlineDays: 14,
    description: "",
    requirements: "Requirement 1\nRequirement 2"
  });

  // Apply for Grant Modal State
  const [isApplyGrantOpen, setIsApplyGrantOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({
    projectName: "",
    projectSymbol: "",
    contractAddress: "",
    category: "defi" as any,
    tier: "seed_catalyst" as any,
    summary: ""
  });

  const handleClaimMilestone = (grant: VentureGrant, milestone: MilestoneTranche) => {
    if (!wallet.isConnected) {
      showToast("Please connect your wallet to sign the milestone claim transaction.", "error");
      return;
    }

    addTerminalLog?.("info", `WALLET_SIGNING_REQUEST: Requesting user confirmation for Milestone #${milestone.trancheNumber} (${milestone.amountEth} ETH + ${milestone.amountAgl} AGL)...`);
    showToast(`Confirm milestone claim in your wallet...`, "info");

    setTimeout(() => {
      // Update milestone status
      const updatedGrants = ventureGrants.map(g => {
        if (g.id === grant.id) {
          const updatedMilestones = g.milestones.map(m => {
            if (m.id === milestone.id) {
              return {
                ...m,
                status: "claimed" as const,
                verifiedAt: Date.now(),
                txHash: "0x89e0" + Math.random().toString(16).substring(2, 40)
              };
            }
            return m;
          });
          return {
            ...g,
            disbursedEth: g.disbursedEth + milestone.amountEth,
            disbursedAgl: g.disbursedAgl + milestone.amountAgl,
            milestones: updatedMilestones
          };
        }
        return g;
      });

      setVentureGrants(updatedGrants);
      showToast(`Milestone #${milestone.trancheNumber} claimed successfully on Base Mainnet!`, "success");
      addTerminalLog?.("success", `VENTURE_GRANT_TRANCHE: Claimed ${milestone.amountEth} ETH & ${milestone.amountAgl} AGL from Protocol Treasury Vault.`);
    }, 1500);
  };

  const handleBountySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingBounty) return;

    if (!submissionForm.submissionUrl.trim()) {
      showToast("Submission URL or PR link is required", "error");
      return;
    }

    // Increment submissions count
    const updated = bounties.map(b => b.id === submittingBounty.id ? { ...b, submissionsCount: b.submissionsCount + 1 } : b);
    setBounties(updated);
    EcosystemService.saveBounties(updated);

    showToast(`Submission entered for "${submittingBounty.title}"!`, "success");
    addTerminalLog?.("success", `BOUNTY_SUBMISSION: Entered submission for "${submittingBounty.title}". Review pending.`);
    setSubmittingBounty(null);
  };

  const handleCreateBountySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBountyForm.title.trim()) return;

    const newB = EcosystemService.createBounty({
      title: newBountyForm.title,
      description: newBountyForm.description,
      requirements: newBountyForm.requirements.split("\n").map(r => r.trim()).filter(Boolean),
      rewardEth: Number(newBountyForm.rewardEth) || 0,
      rewardAgl: Number(newBountyForm.rewardAgl) || 0,
      rewardUsdEquivalent: (Number(newBountyForm.rewardEth) || 0) * 2800,
      deadlineTimestamp: Date.now() + (Number(newBountyForm.deadlineDays) || 14) * 24 * 3600 * 1000,
      creatorAddress: wallet.address || AGL_TREASURY_ADDRESS,
      creatorOrg: wallet.address ? `Guild 0x${wallet.address.slice(2, 6)}` : "Agunnaya Developer Guild",
      category: newBountyForm.category,
      isTreasuryFunded: true
    });

    setBounties(EcosystemService.getBounties());
    setIsCreateBountyOpen(false);
    showToast(`Published bounty "${newB.title}"!`, "success");
    addTerminalLog?.("success", `BOUNTY_CREATED: Bounty "${newB.title}" posted to the ecosystem ledger.`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>Agunnaya Ecosystem Funding Layer</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white">
              Bounties & Protocol Venture Grants
            </h1>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              Earn ETH and AGL by completing developer bounties, or unlock protocol treasury-funded on-chain venture grants with milestone tranches and POL co-investment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCreateBountyOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-medium text-white flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post a Bounty</span>
            </button>
            <button
              onClick={() => setIsApplyGrantOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-purple text-white font-semibold text-xs font-display flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply for Venture Grant</span>
            </button>
          </div>
        </div>

        {/* Security Rule Notice */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Treasury Security: Treasury disbursements and milestone claims require explicit Web3 signature verification. No funds are moved automatically without user signing.
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab("bounties")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === "bounties"
              ? "bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Ecosystem Bounties ({bounties.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("venture_grants")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === "venture_grants"
              ? "bg-brand-purple text-white font-bold shadow-md shadow-brand-purple/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Protocol On-Chain Venture Grants ({ventureGrants.length})</span>
        </button>
      </div>

      {/* TAB 1: BOUNTIES */}
      {activeTab === "bounties" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bounties.map(bounty => (
              <div
                key={bounty.id}
                className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/40 hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                      {bounty.category}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                      {bounty.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white font-display line-clamp-1">{bounty.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {bounty.description}
                    </p>
                  </div>

                  {/* Requirements List */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-500">Key Requirements:</span>
                    {bounty.requirements.slice(0, 2).map((req, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-300">
                        <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Total Reward</span>
                      <div className="flex items-baseline gap-1 text-xs font-mono font-bold text-amber-400">
                        <span>{bounty.rewardEth} ETH</span>
                        <span className="text-zinc-500">+</span>
                        <span>{bounty.rewardAgl.toLocaleString()} AGL</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Deadline</span>
                      <span className="text-xs font-mono text-zinc-300">
                        {Math.ceil((bounty.deadlineTimestamp - Date.now()) / (24 * 3600 * 1000))} days left
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-zinc-500">
                      {bounty.submissionsCount} submissions
                    </span>
                    <button
                      onClick={() => setSubmittingBounty(bounty)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs font-display flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Solution</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PROTOCOL VENTURE GRANTS & CO-INVESTMENT */}
      {activeTab === "venture_grants" && (
        <div className="space-y-6">
          {/* Overview Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-brand-purple/20 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-purple" />
              <h3 className="text-sm font-bold font-display text-white">
                Protocol-Owned Venture Co-Investment Program
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
              Agunnaya Protocol DAO co-invests treasury capital directly into top-performing developer projects launched through AGL Studio. Grants are disbursed across 3 verified milestone tranches, matched with protocol-owned liquidity (POL) to anchor trading pairs on Base.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5">
                <span className="text-[10px] text-zinc-500 block">Grant Vault Address (Base)</span>
                <span className="text-brand-purple font-semibold">{AGL_VENTURE_GRANTS_ADDRESS.slice(0, 10)}...</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5">
                <span className="text-[10px] text-zinc-500 block">Governing DAO Contract</span>
                <span className="text-emerald-400 font-semibold">{AGL_DAO_GOVERNOR_ADDRESS.slice(0, 10)}...</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5">
                <span className="text-[10px] text-zinc-500 block">Milestone Verification</span>
                <span className="text-amber-400 font-semibold">On-Chain & Audit Rules</span>
              </div>
            </div>
          </div>

          {/* Active Venture Grants List */}
          <div className="space-y-5">
            {ventureGrants.map(grant => (
              <div
                key={grant.id}
                className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/40 space-y-6"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">
                        {grant.grantNumber}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple font-semibold">
                        {grant.tierName}
                      </span>
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                        <Vote className="w-3.5 h-3.5" /> Approved by DAO ({grant.daoProposalId})
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white font-display">
                      {grant.projectName} ({grant.projectSymbol})
                    </h2>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block">Total Venture Allocation</span>
                      <span className="text-sm font-bold text-white">{grant.totalGrantEth} ETH + {grant.totalGrantAgl.toLocaleString()} AGL</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block">Disbursed So Far</span>
                      <span className="text-sm font-bold text-emerald-400">{grant.disbursedEth} ETH ({Math.round((grant.disbursedEth / grant.totalGrantEth) * 100)}%)</span>
                    </div>
                  </div>
                </div>

                {/* Milestone Tranches */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
                    Milestone Disbursal Tranches
                  </h4>

                  <div className="space-y-2.5">
                    {grant.milestones.map(m => {
                      const isClaimed = m.status === "claimed";
                      const isVerifiable = m.status === "verifiable";
                      return (
                        <div
                          key={m.id}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isClaimed
                              ? "bg-zinc-950/40 border-emerald-500/30"
                              : isVerifiable
                              ? "bg-zinc-900 border-amber-500/40"
                              : "bg-zinc-950/60 border-white/5 opacity-60"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-white">
                                Tranche #{m.trancheNumber}: {m.title}
                              </span>
                              {isClaimed && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                                  CLAIMED ON-CHAIN
                                </span>
                              )}
                              {isVerifiable && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                                  CRITERIA MET · READY TO CLAIM
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400">{m.description}</p>
                            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 pt-1">
                              <span>Target: <strong className="text-zinc-300">{m.metricTargetValue}</strong></span>
                              <span>·</span>
                              <span>Current: <strong className="text-emerald-400">{m.currentMetricValue}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                            <div className="text-right font-mono text-xs">
                              <span className="text-white font-bold block">{m.amountEth} ETH</span>
                              <span className="text-zinc-500 text-[11px]">{m.amountAgl.toLocaleString()} AGL</span>
                            </div>

                            {isClaimed ? (
                              <a
                                href={`https://basescan.org/tx/${m.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1"
                              >
                                <span>Receipt</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : isVerifiable ? (
                              <button
                                onClick={() => handleClaimMilestone(grant, m)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white font-semibold text-xs font-display shadow-md shadow-emerald-500/20 cursor-pointer"
                              >
                                Claim Tranche
                              </button>
                            ) : (
                              <span className="text-xs font-mono text-zinc-600 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5">
                                Locked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Protocol-Owned Liquidity (POL) Co-Investment Spec */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-brand-purple/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-brand-purple font-bold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Protocol-Owned Liquidity (POL) Co-Investment: {grant.coInvestment.matchingLpEth} ETH Matching</span>
                    </span>
                    <span className="text-zinc-400">
                      Vesting: {grant.coInvestment.vestingWeeks} Weeks · Yield Accrued: <strong className="text-emerald-400">{grant.coInvestment.yieldAccruedEth} ETH</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {submittingBounty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold font-display text-white">Submit Bounty Solution</h3>
                <p className="text-xs text-zinc-400">{submittingBounty.title}</p>
              </div>
              <button onClick={() => setSubmittingBounty(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBountySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Your Name / Handle</label>
                <input
                  type="text"
                  value={submissionForm.applicantName}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, applicantName: e.target.value })}
                  placeholder="e.g. SatoshiBuilder"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Work URL / Demo Link *</label>
                <input
                  type="url"
                  required
                  value={submissionForm.submissionUrl}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, submissionUrl: e.target.value })}
                  placeholder="https://github.com/..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Deployed Contract on Base (Optional)</label>
                <input
                  type="text"
                  value={submissionForm.contractAddress}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, contractAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Solution Notes / Verification Details</label>
                <textarea
                  rows={3}
                  value={submissionForm.description}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, description: e.target.value })}
                  placeholder="Explain how your solution fulfills the bounty requirements..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingBounty(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs font-display shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Submit Solution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BOUNTY MODAL */}
      {isCreateBountyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold font-display text-white">Post an Ecosystem Bounty</h3>
                <p className="text-xs text-zinc-400">Publish a development reward for the Agunnaya builder network.</p>
              </div>
              <button onClick={() => setIsCreateBountyOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBountySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Bounty Title *</label>
                <input
                  type="text"
                  required
                  value={newBountyForm.title}
                  onChange={(e) => setNewBountyForm({ ...newBountyForm, title: e.target.value })}
                  placeholder="e.g. Build Uniswap v3 Pool Liquidity Rebalancer"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Reward ETH</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newBountyForm.rewardEth}
                    onChange={(e) => setNewBountyForm({ ...newBountyForm, rewardEth: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-300 block mb-1">Reward AGL</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={newBountyForm.rewardAgl}
                    onChange={(e) => setNewBountyForm({ ...newBountyForm, rewardAgl: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newBountyForm.description}
                  onChange={(e) => setNewBountyForm({ ...newBountyForm, description: e.target.value })}
                  placeholder="Summary of the goal and context..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Requirements (one per line)</label>
                <textarea
                  rows={3}
                  value={newBountyForm.requirements}
                  onChange={(e) => setNewBountyForm({ ...newBountyForm, requirements: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBountyOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs font-display shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Publish Bounty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPLY FOR GRANT MODAL */}
      {isApplyGrantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold font-display text-white">Apply for Venture Grant</h3>
                <p className="text-xs text-zinc-400">Co-invest protocol treasury liquidity into your project.</p>
              </div>
              <button onClick={() => setIsApplyGrantOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={grantForm.projectName}
                  onChange={(e) => setGrantForm({ ...grantForm, projectName: e.target.value })}
                  placeholder="e.g. Sovereign AI Treasury"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Contract Address on Base</label>
                <input
                  type="text"
                  value={grantForm.contractAddress}
                  onChange={(e) => setGrantForm({ ...grantForm, contractAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Cohort Tier</label>
                <select
                  value={grantForm.tier}
                  onChange={(e) => setGrantForm({ ...grantForm, tier: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono cursor-pointer"
                >
                  <option value="seed_catalyst">Seed Catalyst (3 ETH + 30k AGL)</option>
                  <option value="growth_velocity">Growth Velocity (10 ETH + 100k AGL)</option>
                  <option value="ecosystem_unicorn">Ecosystem Unicorn (25 ETH + 500k AGL)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-brand-purple/20 text-xs text-zinc-300 leading-relaxed">
                Applications are reviewed by the DAO Governance Committee. Passing proposals receive timelocked milestone tranche funding and matching protocol-owned liquidity.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApplyGrantOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsApplyGrantOpen(false);
                    showToast("Application submitted to DAO Governance review queue!", "success");
                    addTerminalLog?.("success", `VENTURE_GRANT_APPLICATION: Submitted application for "${grantForm.projectName || "New Project"}" to DAO review.`);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white font-semibold text-xs font-display shadow-lg shadow-brand-purple/20 cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
