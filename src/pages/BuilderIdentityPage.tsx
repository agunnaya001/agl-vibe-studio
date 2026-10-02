import React, { useState, useEffect } from "react";
import { 
  User, 
  ShieldCheck, 
  Award, 
  Rocket, 
  Code2, 
  Bot, 
  Globe, 
  ExternalLink, 
  Flame, 
  CheckCircle2, 
  Vote, 
  Edit3, 
  Save, 
  Clock, 
  Github, 
  Twitter, 
  Compass, 
  Copy, 
  Check 
} from "lucide-react";
import { BuilderIdentity } from "../types/ecosystem";
import { EcosystemService } from "../lib/ecosystemService";
import { WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";

interface BuilderIdentityPageProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  targetAddress?: string; // Optional target address if viewing another developer
  onSelectTab: (tab: string) => void;
}

export default function BuilderIdentityPage({
  wallet,
  showToast,
  targetAddress,
  onSelectTab
}: BuilderIdentityPageProps) {
  const activeAddress = targetAddress || wallet.address || "0x725615639B760DAa64b3e794AA49B5A9a8A7632E";
  const [builder, setBuilder] = useState<BuilderIdentity>(() => EcosystemService.getBuilderIdentity(activeAddress));
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: builder.displayName,
    bio: builder.bio,
    githubUsername: builder.githubUsername || "",
    twitterHandle: builder.twitterHandle || "",
    websiteUrl: builder.websiteUrl || ""
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fresh = EcosystemService.getBuilderIdentity(activeAddress);
    setBuilder(fresh);
    setEditForm({
      displayName: fresh.displayName,
      bio: fresh.bio,
      githubUsername: fresh.githubUsername || "",
      twitterHandle: fresh.twitterHandle || "",
      websiteUrl: fresh.websiteUrl || ""
    });
  }, [activeAddress]);

  const handleCopy = () => {
    if (!builder.walletAddress) return;
    navigator.clipboard.writeText(builder.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Address copied to clipboard", "success");
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BuilderIdentity = {
      ...builder,
      displayName: editForm.displayName.trim() || builder.displayName,
      bio: editForm.bio.trim() || builder.bio,
      githubUsername: editForm.githubUsername.trim(),
      twitterHandle: editForm.twitterHandle.trim(),
      websiteUrl: editForm.websiteUrl.trim()
    };
    EcosystemService.saveBuilderIdentity(updated);
    setBuilder(updated);
    setIsEditing(false);
    showToast("Builder profile updated successfully", "success");
  };

  const isOwner = wallet.isConnected && wallet.address.toLowerCase() === activeAddress.toLowerCase();

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/20 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-brand-purple/20 shrink-0">
              {builder.displayName ? builder.displayName.slice(0, 2).toUpperCase() : "AG"}
            </div>

            {/* Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black font-display text-white">
                  {builder.displayName}
                </h1>
                {builder.isVerifiedDeveloper && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Builder
                  </span>
                )}
              </div>

              {/* Wallet Address with Copy */}
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>{builder.walletAddress ? `${builder.walletAddress.slice(0, 10)}...${builder.walletAddress.slice(-8)}` : "No Wallet Connected"}</span>
                {builder.walletAddress && (
                  <button onClick={handleCopy} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                {builder.walletAddress && (
                  <a
                    href={`https://basescan.org/address/${builder.walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-500 hover:text-brand-purple transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <p className="text-xs text-zinc-300 max-w-xl leading-relaxed pt-1">
                {builder.bio}
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3 pt-2">
                {builder.githubUsername && (
                  <a
                    href={`https://github.com/${builder.githubUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-white text-xs flex items-center gap-1 font-mono transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>{builder.githubUsername}</span>
                  </a>
                )}
                {builder.twitterHandle && (
                  <a
                    href={`https://x.com/${builder.twitterHandle.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-white text-xs flex items-center gap-1 font-mono transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    <span>{builder.twitterHandle}</span>
                  </a>
                )}
                {builder.websiteUrl && (
                  <a
                    href={builder.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-white text-xs flex items-center gap-1 font-mono transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start">
            {isOwner && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono font-medium text-white flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 text-brand-purple" />
                <span>{isEditing ? "Cancel Edit" : "Edit Profile"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-white/10 space-y-4 max-w-xl animate-fade-in">
            <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Update Builder Profile</h4>
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Display Name</label>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Bio</label>
              <textarea
                rows={2}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">GitHub Username</label>
                <input
                  type="text"
                  value={editForm.githubUsername}
                  onChange={(e) => setEditForm({ ...editForm, githubUsername: e.target.value })}
                  placeholder="e.g. SatoshiDev"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Twitter / X Handle</label>
                <input
                  type="text"
                  value={editForm.twitterHandle}
                  onChange={(e) => setEditForm({ ...editForm, twitterHandle: e.target.value })}
                  placeholder="e.g. @SatoshiDev"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-semibold text-xs font-display flex items-center gap-1.5 shadow-lg shadow-brand-purple/20 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </form>
        )}
      </div>

      {/* Verifiable Studio Activity Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">
            Verifiable Studio & Base Mainnet Activity
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">Derived from on-chain & studio ledger</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">Contracts Deployed</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-white">{builder.contractsDeployedCount}</span>
              <span className="text-[10px] text-zinc-500 font-mono">on Base</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">Apps Published</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-brand-blue">{builder.applicationsPublishedCount}</span>
              <span className="text-[10px] text-zinc-500 font-mono">in App Store</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">Agents Published</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-brand-purple">{builder.agentsPublishedCount}</span>
              <span className="text-[10px] text-zinc-500 font-mono">in Marketplace</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">Audits Executed</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400">{builder.auditsPerformedCount}</span>
              <span className="text-[10px] text-zinc-500 font-mono">CEI verified</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">DAO Proposals Voted</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400">{builder.daoProposalsVotedCount}</span>
              <span className="text-[10px] text-zinc-500 font-mono">governance</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">Total Studio Credits</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-amber-300">{builder.totalStudioCreditsConsumed}</span>
              <span className="text-[10px] text-zinc-500 font-mono">consumed</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">Apps Created</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-white">{builder.applicationsCreatedCount}</span>
              <span className="text-[10px] text-zinc-500 font-mono">workspaces</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">Agents Built</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-white">{builder.agentsCreatedCount}</span>
              <span className="text-[10px] text-zinc-500 font-mono">custom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Earned Badges & Achievements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Verifiable Badges & Credentials</span>
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">Cryptographically verifiable</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {builder.badges.map(badge => (
            <div
              key={badge.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                badge.isEarned
                  ? "bg-zinc-900/70 border-brand-purple/40 shadow-md shadow-brand-purple/5"
                  : "bg-zinc-950/40 border-white/5 opacity-50"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    badge.isEarned ? "bg-brand-purple/20 text-brand-purple" : "bg-zinc-800 text-zinc-600"
                  }`}>
                    <Award className="w-5 h-5" />
                  </div>
                  {badge.isEarned ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      EARNED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                      LOCKED
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white font-display pt-1">{badge.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{badge.description}</p>
              </div>

              {badge.earnedAt && (
                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500">
                  Earned: {new Date(badge.earnedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
