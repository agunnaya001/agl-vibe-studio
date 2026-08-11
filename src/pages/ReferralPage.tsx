import React, { useState, useEffect } from "react";
import { WalletState, ReferralRecord, ReferralPayout } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import ViralSocialPromotionComponent from "../components/ViralSocialPromotionComponent";
import { 
  Users, 
  Gift, 
  Copy, 
  Check, 
  Coins, 
  Award, 
  Edit3, 
  History, 
  Info, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Flame 
} from "lucide-react";

interface ReferralPageProps {
  wallet: WalletState;
  onOpenConnect: () => void;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function ReferralPage({ 
  wallet, 
  onOpenConnect, 
  onRefreshWallet, 
  addTerminalLog, 
  showToast 
}: ReferralPageProps) {
  const [record, setRecord] = useState<ReferralRecord>({
    code: "",
    ownerAddress: "",
    totalReferredCount: 0,
    totalFeesGeneratedEth: 0,
    unclaimedRewardsAgl: 0,
    claimedRewardsAgl: 0
  });
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Load record and payouts when wallet is connected
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      const rec = AgunnayaDatabase.getReferralRecord(wallet.address);
      setRecord(rec);
      setCustomCodeInput(rec.code);
      
      const payList = AgunnayaDatabase.getReferralPayouts(wallet.address);
      setPayouts(payList);
    }
  }, [wallet.isConnected, wallet.address]);

  const refreshReferralState = () => {
    if (wallet.address) {
      const rec = AgunnayaDatabase.getReferralRecord(wallet.address);
      setRecord(rec);
      const payList = AgunnayaDatabase.getReferralPayouts(wallet.address);
      setPayouts(payList);
    }
  };

  const getReferralUrl = () => {
    const code = record.code || `agl_${wallet.address?.slice(2, 8).toLowerCase()}`;
    return `${window.location.origin}${window.location.pathname}?ref=${code}`;
  };

  const handleCopyLink = () => {
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    const url = getReferralUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast("Referral link copied to clipboard!", "success");
    addTerminalLog("info", `COPIED: Shared referral link copied: ${url}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCustomCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) return;
    
    const code = customCodeInput.trim().toLowerCase();
    if (!code) {
      showToast("Code cannot be empty.", "error");
      return;
    }
    
    // Simple validation (alphanumeric and underscores)
    const regex = /^[a-z0-9_]{3,15}$/;
    if (!regex.test(code)) {
      showToast("Code must be 3-15 characters, lowercase, numbers, or underscores.", "error");
      return;
    }

    // Check if code is already taken
    const allRecords = AgunnayaDatabase.getReferralRecords();
    const taken = allRecords.some(r => r.code.toLowerCase() === code && r.ownerAddress.toLowerCase() !== wallet.address.toLowerCase());
    if (taken) {
      showToast("Referral code already taken by another user.", "error");
      return;
    }

    const updatedRecord = { ...record, code };
    AgunnayaDatabase.updateReferralRecord(updatedRecord);
    setRecord(updatedRecord);
    setIsEditingCode(false);
    showToast(`Referral code customized to "${code}"!`, "success");
    addTerminalLog("success", `REFERRAL_CODE_UPDATE: Updated user alias code to "${code}". Link: ?ref=${code}`);
  };

  const handleClaimRewards = () => {
    if (!wallet.isConnected) return;
    if (record.unclaimedRewardsAgl <= 0) {
      showToast("No unclaimed rewards available.", "error");
      return;
    }

    setClaiming(true);
    addTerminalLog("info", `Initiating on-chain payout settlement for ${record.unclaimedRewardsAgl.toLocaleString()} AGL...`);

    setTimeout(() => {
      const result = AgunnayaDatabase.claimReferralRewards(wallet.address);
      if (result.success) {
        showToast(`Successfully claimed ${result.claimedAmount.toLocaleString()} AGL!`, "success");
        addTerminalLog("success", `SETTLEMENT_COMPLETE: Claimed +${result.claimedAmount.toLocaleString()} AGL rewards to wallet.`);
        onRefreshWallet();
        refreshReferralState();
      } else {
        showToast("Claim settlement failed.", "error");
      }
      setClaiming(false);
    }, 1500);
  };

  // Mock a test user signup to trigger immediate payout for evaluation
  const handleSimulateSignup = () => {
    if (!wallet.isConnected) return;
    
    // Simulate a random address trade
    const randomAddresses = [
      "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
      "0x0d28235b77d6ec96ff910fca10283021f1d1fc42",
      "0x429abff8c5120a8309de993ca39a3ea8de4d5bef"
    ];
    const mockRef = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    
    // Register mockRef as referred by current user
    AgunnayaDatabase.registerReferral(mockRef, record.code);
    
    // Trigger a mock trade of 0.25 ETH which has a 1% curve fee (0.0025 ETH)
    const mockFee = 0.0025;
    AgunnayaDatabase.addReferralPayout(mockRef, "mock trade", mockFee);
    
    showToast("Mock referral signup & trade simulated!", "success");
    addTerminalLog("system", `TEST_HARNESS: Simulated referral signup for ${mockRef.slice(0, 6)}... executing a 0.25 ETH trade.`);
    
    refreshReferralState();
    onRefreshWallet();
  };

  return (
    <div id="referral-dashboard-root" className="space-y-6 animate-fade-in text-zinc-100">
      
      {/* Upper Brand / Pitch Section */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#0c0d12] p-8">
        <div className="absolute right-0 top-0 h-64 w-64 bg-gradient-to-br from-brand-purple/20 to-blue-500/10 blur-[80px] pointer-events-none"></div>
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-semibold uppercase tracking-wider font-mono">
            <Gift className="w-3.5 h-3.5" />
            <span>Agunnaya Affiliate Program</span>
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white">
            Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">20% Platform Fees</span> in Real-Time AGL
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Invite friends to build, launch, and trade decentralized assets on Agunnaya Labs.
            Receive 20% of all bonding curve transaction and DeFi swap fees generated by your referrals, paid dynamically in AGL utility tokens based on live spot pricing.
          </p>
        </div>
      </div>

      {/* Main Viewport Grid */}
      {!wallet.isConnected ? (
        /* DISCONNECTED WALLET VIEW */
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm p-12 text-center max-w-lg mx-auto space-y-6 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-800/80 flex items-center justify-center border border-white/10 text-zinc-500 shadow-inner">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white font-display">Connect Wallet to Generate Invitation Link</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We require an active on-chain identity (Base smart wallet or EOA) to anchor your referral ledger so you can claim earned fee payouts securely.
            </p>
          </div>
          <button
            onClick={onOpenConnect}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0052FF] to-purple-600 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-purple-500/10 font-display flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" />
            <span>Connect Wallet to Access Program</span>
          </button>
        </div>
      ) : (
        /* CONNECTED DASHBOARD */
        <div className="space-y-6">
          
          {/* STATS SUMMARY BOXES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="glass-panel p-5 rounded-xl border border-white/10 bg-zinc-900/30 space-y-2 relative group hover:border-white/20 transition-all">
              <div className="flex justify-between items-start text-zinc-500">
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Referred Friends</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-extrabold font-display text-white">{record.totalReferredCount}</h2>
                <p className="text-[10px] text-zinc-500">Active connections registered</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-white/10 bg-zinc-900/30 space-y-2 relative group hover:border-white/20 transition-all">
              <div className="flex justify-between items-start text-zinc-500">
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Volume Referred</span>
                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-extrabold font-display text-white">{record.totalFeesGeneratedEth.toFixed(4)} ETH</h2>
                <p className="text-[10px] text-zinc-500">Total fees paid by invites</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-[#A855F7]/30 bg-gradient-to-b from-zinc-900/40 to-purple-950/20 space-y-2 relative group hover:border-[#A855F7]/50 transition-all">
              <div className="flex justify-between items-start text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-purple-400">Unclaimed AGL</span>
                <Coins className="w-4 h-4 text-purple-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold font-display text-white">{record.unclaimedRewardsAgl.toLocaleString()} AGL</h2>
                <button
                  onClick={handleClaimRewards}
                  disabled={claiming || record.unclaimedRewardsAgl <= 0}
                  className={`w-full py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                    record.unclaimedRewardsAgl > 0 
                      ? "bg-brand-purple hover:bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)] active:scale-95 cursor-pointer"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  }`}
                >
                  {claiming ? "SETTLING..." : "CLAIM FEE REWARDS"}
                </button>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-white/10 bg-zinc-900/30 space-y-2 relative group hover:border-white/20 transition-all">
              <div className="flex justify-between items-start text-zinc-500">
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Claimed To Date</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-extrabold font-display text-emerald-400">{record.claimedRewardsAgl.toLocaleString()} AGL</h2>
                <p className="text-[10px] text-zinc-500">Settled to EOA wallet</p>
              </div>
            </div>

          </div>

          {/* SHAREABLE LINK BUILDER & TEST HARNESS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* LINK GENERATOR CONTAINER */}
            <div className="md:col-span-8 p-6 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md space-y-6">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Configure Invitation Profile</span>
              </h3>

              {/* Shareable Link Display */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Your Direct Referral Link</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono select-all overflow-x-auto whitespace-nowrap text-zinc-300">
                    {getReferralUrl()}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 rounded-xl text-white border border-white/5 transition-all flex items-center justify-center relative group"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Custom Invite Alias Code Form */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Custom Invite Code Alias</label>
                  {!isEditingCode && (
                    <button
                      onClick={() => setIsEditingCode(true)}
                      className="text-[10px] font-bold text-brand-purple hover:underline flex items-center gap-1 font-mono"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Customize Alias</span>
                    </button>
                  )}
                </div>

                {isEditingCode ? (
                  <form onSubmit={handleSaveCustomCode} className="flex gap-2">
                    <input
                      type="text"
                      value={customCodeInput}
                      onChange={(e) => setCustomCodeInput(e.target.value)}
                      placeholder="e.g. neonalchemist"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-purple font-mono"
                      maxLength={15}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-zinc-100 hover:bg-white text-black font-semibold text-xs rounded-xl active:scale-95 transition-all font-display"
                    >
                      Save Alias
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomCodeInput(record.code);
                        setIsEditingCode(false);
                      }}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl active:scale-95 transition-all font-display"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500">Current Alias:</span>
                    <span className="text-white font-bold bg-brand-purple/10 border border-brand-purple/20 px-2.5 py-1 rounded-lg">
                      {record.code}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* TEST HARNESS SIMULATOR BOX */}
            <div className="md:col-span-4 p-6 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Sandbox Test Harness</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Test and evaluate your referral pipeline immediately! Force a simulated friend to join using your link, execute a 0.25 ETH bonding curve trade, and check your claimable AGL rewards instantly.
                </p>
              </div>
              <button
                onClick={handleSimulateSignup}
                className="w-full py-2.5 px-4 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-300 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
              >
                <span>🚀 Simulate Referral Trade</span>
              </button>
            </div>

          </div>

          {/* VIRAL SOCIAL MEDIA & AD CAMPAIGN SUITE */}
          <ViralSocialPromotionComponent
            userRefCode={record.code}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />

          {/* HOW IT WORKS / GUIDANCE */}
          <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-400" />
              <span>How the Agunnaya Labs Referral Loop Works</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 flex items-center justify-center text-xs font-bold font-mono">1</span>
                  <span className="text-xs font-bold text-zinc-200">Share Your Custom Link</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed pl-7">
                  Copy and share your link containing your custom alias. When users open the app through it, our tracking system registers the active referral immediately.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 flex items-center justify-center text-xs font-bold font-mono">2</span>
                  <span className="text-xs font-bold text-zinc-200">Friend Connects & Trades</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed pl-7">
                  Once your friend connects their wallet, they are hardcoded under your address. Any swap or linear curve trade they execute accrues 20% of the flat platform fee straight to you.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">3</span>
                  <span className="text-xs font-bold text-zinc-200">Claim Compound APY Staking</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed pl-7">
                  Claim your accrued AGL rewards with a single sandbox transaction to add them to your wallet balance. Then, lock them inside staking pools to earn passive high-yield APR.
                </p>
              </div>
            </div>
          </div>

          {/* HISTORICAL REWARD PAYOUTS LIST */}
          <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md space-y-4">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              <span>On-Chain Payout History</span>
            </h3>

            {payouts.length === 0 ? (
              <div className="border border-white/5 rounded-xl p-8 text-center text-zinc-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
                <p className="text-xs font-semibold">No referral payouts recorded yet</p>
                <p className="text-[10px] text-zinc-600 leading-normal max-w-sm mx-auto">
                  Share your link with colleagues or use our sandbox test harness on the right to simulate live trading action instantly.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/5 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/40 border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      <th className="p-4">Referred address</th>
                      <th className="p-4">Event source</th>
                      <th className="p-4 text-right">Fee Generated (ETH)</th>
                      <th className="p-4 text-right text-purple-400">Your Reward (AGL)</th>
                      <th className="p-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono">
                    {payouts.map((pay) => (
                      <tr key={pay.id} className="hover:bg-white/5 transition-all">
                        <td className="p-4 text-zinc-300 font-bold">
                          0x{pay.referredUser.slice(2, 8)}...{pay.referredUser.slice(-4)}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 capitalize">
                            {pay.txType}
                          </span>
                        </td>
                        <td className="p-4 text-right text-zinc-400 font-semibold">
                          {pay.feeEth.toFixed(6)} ETH
                        </td>
                        <td className="p-4 text-right text-purple-400 font-bold">
                          +{pay.rewardAgl.toLocaleString()} AGL
                        </td>
                        <td className="p-4 text-right text-zinc-500 text-[10px]">
                          {new Date(pay.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
