import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { 
  Landmark, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Unlock, 
  TrendingUp, 
  Coins, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Calculator, 
  RefreshCw, 
  AlertTriangle, 
  ArrowUpRight, 
  Layers, 
  Flame, 
  Award, 
  ChevronRight,
  BarChart3,
  HelpCircle,
  Percent,
  Sliders
} from "lucide-react";
import { WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";

interface StakingVaultPageProps {
  wallet: WalletState;
  onOpenConnectWallet: () => void;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export interface VaultTier {
  id: number;
  name: string;
  tagline: string;
  apy: number;
  multiplier: string;
  durationDays: number;
  durationSec: number;
  minDeposit: number;
  lockType: "Flexible" | "Locked";
  badgeColor: string;
  tvlAgl: number;
  tvlUsd: number;
}

export interface StakedPosition {
  id: string;
  vaultId: number;
  vaultName: string;
  amount: number;
  startTime: number; // timestamp ms
  unlockTime: number; // timestamp ms
  apy: number;
  accumulatedRewards: number;
  lastClaimTime: number;
  autoCompound: boolean;
  status: "active" | "matured" | "withdrawn";
}

const VAULT_TIERS: VaultTier[] = [
  {
    id: 0,
    name: "Flex Saver Vault",
    tagline: "Instant liquidity with zero lockup penalty",
    apy: 12.5,
    multiplier: "1.0x",
    durationDays: 0,
    durationSec: 0,
    minDeposit: 10,
    lockType: "Flexible",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    tvlAgl: 4250000,
    tvlUsd: 690625
  },
  {
    id: 1,
    name: "30-Day Velocity Vault",
    tagline: "Balanced lockup with boosted yield multiplier",
    apy: 28.5,
    multiplier: "2.2x",
    durationDays: 30,
    durationSec: 30 * 86400,
    minDeposit: 100,
    lockType: "Locked",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    tvlAgl: 8900000,
    tvlUsd: 1446250
  },
  {
    id: 2,
    name: "90-Day High-Yield Vault",
    tagline: "High annual returns for strategic holders",
    apy: 48.0,
    multiplier: "3.8x",
    durationDays: 90,
    durationSec: 90 * 86400,
    minDeposit: 250,
    lockType: "Locked",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    tvlAgl: 15400000,
    tvlUsd: 2502500
  },
  {
    id: 3,
    name: "180-Day Diamond Vault",
    tagline: "Maximum APY for long-term governance conviction",
    apy: 72.5,
    multiplier: "5.5x",
    durationDays: 180,
    durationSec: 180 * 86400,
    minDeposit: 500,
    lockType: "Locked",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    tvlAgl: 28600000,
    tvlUsd: 4647500
  }
];

const STAKING_CONTRACT_ADDRESS = "0xd4B61B4876c15e78e0275EbA52cf62D55ED5fD30";
const AGL_PRICE_USD = 0.1625;

export default function StakingVaultPage({
  wallet,
  onOpenConnectWallet,
  onRefreshWallet,
  addTerminalLog,
  showToast
}: StakingVaultPageProps) {
  // Selected vault tier for staking
  const [selectedVaultId, setSelectedVaultId] = useState<number>(1);
  const [stakeAmount, setStakeAmount] = useState<string>("500");
  const [autoCompoundToggle, setAutoCompoundToggle] = useState<boolean>(true);

  // Staking execution loaders
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [stakeStep, setStakeStep] = useState<number>(0);
  const [claimingPositionId, setClaimingPositionId] = useState<string | null>(null);

  // Active positions state (persisted in localStorage + default demo positions)
  const [positions, setPositions] = useState<StakedPosition[]>(() => {
    try {
      const saved = localStorage.getItem("agl_staking_positions");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: "pos-1",
        vaultId: 1,
        vaultName: "30-Day Velocity Vault",
        amount: 2500,
        startTime: Date.now() - 15 * 86400 * 1000,
        unlockTime: Date.now() + 15 * 86400 * 1000,
        apy: 28.5,
        accumulatedRewards: 29.28,
        lastClaimTime: Date.now() - 15 * 86400 * 1000,
        autoCompound: true,
        status: "active"
      },
      {
        id: "pos-2",
        vaultId: 0,
        vaultName: "Flex Saver Vault",
        amount: 1000,
        startTime: Date.now() - 5 * 86400 * 1000,
        unlockTime: Date.now(),
        apy: 12.5,
        accumulatedRewards: 1.71,
        lastClaimTime: Date.now() - 5 * 86400 * 1000,
        autoCompound: false,
        status: "active"
      }
    ];
  });

  // Save positions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("agl_staking_positions", JSON.stringify(positions));
    } catch (e) {
      console.error(e);
    }
  }, [positions]);

  // Real-time ticker effect to increment rewards dynamically every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setPositions(prevPositions =>
        prevPositions.map(pos => {
          if (pos.status !== "active") return pos;
          // Calculate reward increment per second based on APY
          const annualReward = pos.amount * (pos.apy / 100);
          const perSecondReward = annualReward / (365 * 86400);
          return {
            ...pos,
            accumulatedRewards: pos.accumulatedRewards + perSecondReward
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // APY Calculator interactive state
  const [calcDeposit, setCalcDeposit] = useState<number>(1000);
  const [calcVaultId, setCalcVaultId] = useState<number>(3);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const selectedVault = VAULT_TIERS.find(v => v.id === selectedVaultId) || VAULT_TIERS[0];
  const userBalance = wallet.isConnected ? (wallet.aglTokenBalance || 0) : 0;

  // Percentage quick selection
  const handleSelectPercentage = (pct: number) => {
    const amt = (userBalance * (pct / 100)).toFixed(2);
    setStakeAmount(amt);
  };

  // Execute Deposit / Lock into Vault
  const handleStake = async () => {
    if (!wallet.isConnected) {
      onOpenConnectWallet();
      return;
    }

    const amt = parseFloat(stakeAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid deposit amount.", "error");
      return;
    }

    if (amt > userBalance) {
      showToast(`Insufficient balance. You have ${userBalance.toLocaleString()} AGL.`, "error");
      return;
    }

    if (amt < selectedVault.minDeposit) {
      showToast(`Minimum deposit for ${selectedVault.name} is ${selectedVault.minDeposit} AGL.`, "error");
      return;
    }

    setIsStaking(true);
    setStakeStep(1);
    addTerminalLog("info", `STAKING_VAULT: Approving smart contract allowance for ${selectedVault.name}...`);

    setTimeout(() => {
      setStakeStep(2);
      addTerminalLog("info", `STAKING_VAULT: Signing Web3 deposit transaction for ${amt} AGL...`);

      setTimeout(() => {
        setStakeStep(3);
        addTerminalLog("system", `BASE_MAINNET: Confirming transaction on contract ${STAKING_CONTRACT_ADDRESS.slice(0, 10)}...`);

        setTimeout(() => {
          const now = Date.now();
          const unlockTime = now + selectedVault.durationSec * 1000;

          const newPos: StakedPosition = {
            id: `pos-${Date.now()}`,
            vaultId: selectedVault.id,
            vaultName: selectedVault.name,
            amount: amt,
            startTime: now,
            unlockTime: unlockTime,
            apy: selectedVault.apy,
            accumulatedRewards: 0,
            lastClaimTime: now,
            autoCompound: autoCompoundToggle,
            status: "active"
          };

          setPositions(prev => [newPos, ...prev]);

          // Update wallet balance
          const updatedBalance = Math.max(0, userBalance - amt);
          const updatedWallet = {
            ...wallet,
            aglTokenBalance: updatedBalance
          };
          AgunnayaDatabase.saveWallet(updatedWallet);
          onRefreshWallet();

          setIsStaking(false);
          setStakeStep(0);
          showToast(`Successfully deposited ${amt} AGL into ${selectedVault.name}!`, "success");
          addTerminalLog("success", `STAKE_SUCCESS: ${amt} AGL locked in ${selectedVault.name} @ ${selectedVault.apy}% APY.`);
          setStakeAmount("");
        }, 1200);
      }, 1000);
    }, 800);
  };

  // Claim accrued yield
  const handleClaimYield = (posId: string) => {
    const pos = positions.find(p => p.id === posId);
    if (!pos || pos.accumulatedRewards <= 0) return;

    setClaimingPositionId(posId);
    addTerminalLog("info", `STAKING_VAULT: Claiming ${pos.accumulatedRewards.toFixed(4)} AGL yield...`);

    setTimeout(() => {
      const claimedAmt = pos.accumulatedRewards;
      setPositions(prev =>
        prev.map(p =>
          p.id === posId ? { ...p, accumulatedRewards: 0, lastClaimTime: Date.now() } : p
        )
      );

      // Add claimed rewards to wallet balance
      const updatedWallet = {
        ...wallet,
        aglTokenBalance: wallet.aglTokenBalance + claimedAmt
      };
      AgunnayaDatabase.saveWallet(updatedWallet);
      onRefreshWallet();

      setClaimingPositionId(null);
      showToast(`Claimed ${claimedAmt.toFixed(4)} AGL staking yield!`, "success");
      addTerminalLog("success", `CLAIM_SUCCESS: ${claimedAmt.toFixed(4)} AGL transferred to wallet.`);
    }, 800);
  };

  // Unstake position
  const handleUnstake = (posId: string) => {
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;

    const isLocked = pos.unlockTime > Date.now();
    if (isLocked) {
      if (!confirm(`Warning: This position is locked until ${new Date(pos.unlockTime).toLocaleDateString()}. Early unstaking incurs a 10% emergency fee. Continue?`)) {
        return;
      }
    }

    addTerminalLog("info", `STAKING_VAULT: Unstaking ${pos.amount} AGL from ${pos.vaultName}...`);

    setTimeout(() => {
      const penalty = isLocked ? pos.amount * 0.10 : 0;
      const returnAmt = pos.amount - penalty + pos.accumulatedRewards;

      setPositions(prev => prev.filter(p => p.id !== posId));

      const updatedWallet = {
        ...wallet,
        aglTokenBalance: wallet.aglTokenBalance + returnAmt
      };
      AgunnayaDatabase.saveWallet(updatedWallet);
      onRefreshWallet();

      showToast(`Successfully unstaked position! Returned ${returnAmt.toFixed(2)} AGL to wallet.`, "success");
      addTerminalLog("success", `UNSTAKE_COMPLETE: ${returnAmt.toFixed(2)} AGL returned to wallet balance.`);
    }, 900);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast(`${label} copied to clipboard!`, "info");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Aggregated Portfolio Stats
  const totalUserStaked = positions.reduce((acc, p) => acc + (p.status === "active" ? p.amount : 0), 0);
  const totalUserRewards = positions.reduce((acc, p) => acc + (p.status === "active" ? p.accumulatedRewards : 0), 0);
  const totalProtocolTvlAgl = VAULT_TIERS.reduce((acc, v) => acc + v.tvlAgl, 0);
  const totalProtocolTvlUsd = totalProtocolTvlAgl * AGL_PRICE_USD;

  // Calculation for APY Calculator
  const calcVaultObj = VAULT_TIERS.find(v => v.id === calcVaultId) || VAULT_TIERS[3];
  const calcDailyEst = (calcDeposit * (calcVaultObj.apy / 100)) / 365;
  const calcMonthlyEst = calcDailyEst * 30;
  const calcYearlyEst = calcDeposit * (calcVaultObj.apy / 100);

  return (
    <div id="staking-vault-page" className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      
      {/* Top Banner Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-brand-purple/40 via-blue-950/40 to-zinc-950 border border-brand-purple/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-brand-purple/15 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/20 border border-brand-purple/40 text-brand-purple font-mono text-xs font-bold">
              <Landmark className="w-3.5 h-3.5 text-brand-purple" />
              <span>AUTOMATED SMART CONTRACT VAULTS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
              AGL Automated Staking Vaults
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Lock your native AGL tokens in audited automated smart contract vaults on Base Mainnet to earn up to <span className="text-amber-300 font-bold">72.5% APY</span> with real-time compounding yield.
            </p>
          </div>

          {/* Quick Wallet Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {wallet.isConnected ? (
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs space-y-1">
                <div className="flex items-center justify-between gap-4 text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    AGL Wallet Balance
                  </span>
                  <span className="text-emerald-400 font-bold">Base L2</span>
                </div>
                <div className="text-white font-extrabold text-sm flex items-center gap-2">
                  <span>{wallet.aglTokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} AGL</span>
                  <span className="text-zinc-500 font-normal text-xs">≈ ${(wallet.aglTokenBalance * AGL_PRICE_USD).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <button
                id="vault-connect-wallet-btn"
                onClick={onOpenConnectWallet}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-purple to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-xl font-display flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Connect Wallet to Stake</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Vault Statistics Header Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 font-mono text-xs">
          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase">Protocol Total Value Locked</span>
            <span className="text-white font-bold text-base mt-0.5 block">
              {totalProtocolTvlAgl.toLocaleString()} AGL
            </span>
            <span className="text-emerald-400 text-[10px] font-bold">≈ ${totalProtocolTvlUsd.toLocaleString()} USD</span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase">Your Active Staked Amount</span>
            <span className="text-amber-300 font-bold text-base mt-0.5 block">
              {totalUserStaked.toLocaleString()} AGL
            </span>
            <span className="text-zinc-400 text-[10px]">≈ ${(totalUserStaked * AGL_PRICE_USD).toFixed(2)} USD</span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase">Pending Live Rewards</span>
            <span className="text-emerald-400 font-bold text-base mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              {totalUserRewards.toFixed(4)} AGL
            </span>
            <span className="text-emerald-400 text-[10px]">Updating Live</span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase">Vault Smart Contract</span>
            <span className="text-zinc-200 font-bold text-xs truncate mt-1 flex items-center justify-between">
              <span>0xd4B6...5fD30</span>
              <button onClick={() => copyToClipboard(STAKING_CONTRACT_ADDRESS, "Contract Address")} className="text-zinc-500 hover:text-white">
                <Copy className="w-3 h-3" />
              </button>
            </span>
            <span className="text-blue-400 text-[10px] font-bold">OpenZeppelin Audited</span>
          </div>
        </div>
      </div>

      {/* Vault Tier Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-purple" />
            Select Staking Vault Tier
          </h2>
          <span className="text-xs font-mono text-zinc-400">Click a tier to configure deposit parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VAULT_TIERS.map(vault => {
            const isSelected = selectedVaultId === vault.id;

            return (
              <div
                key={vault.id}
                onClick={() => setSelectedVaultId(vault.id)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? "bg-gradient-to-b from-brand-purple/20 to-black border-brand-purple shadow-[0_0_25px_rgba(168,85,247,0.25)] scale-[1.02]"
                    : "bg-zinc-900/80 border-white/10 hover:border-white/20 hover:bg-zinc-900"
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${vault.badgeColor}`}>
                    {vault.lockType === "Flexible" ? "INSTANT UNSTAKE" : `${vault.durationDays}-DAY LOCK`}
                  </span>
                  <span className="text-xs font-mono font-extrabold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                    {vault.multiplier} APY
                  </span>
                </div>

                {/* Vault Name & APY */}
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-display text-white">{vault.name}</h3>
                  <p className="text-[11px] text-zinc-400 leading-tight">{vault.tagline}</p>
                </div>

                <div className="p-3 rounded-2xl bg-black/60 border border-white/5 font-mono">
                  <span className="text-[10px] text-zinc-500 block uppercase">Annual Rate</span>
                  <div className="text-2xl font-extrabold text-emerald-400 flex items-baseline gap-1">
                    {vault.apy}% <span className="text-xs text-zinc-400 font-normal">APY</span>
                  </div>
                </div>

                {/* TVL info */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>Vault TVL:</span>
                  <span className="text-white font-bold">{vault.tvlAgl.toLocaleString()} AGL</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Interactive Staking Form (7 cols) vs Active Positions (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stake Execution Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-white/10 space-y-6 shadow-2xl relative">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold font-display text-white">
                  Deposit into {selectedVault.name}
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${selectedVault.badgeColor}`}>
                {selectedVault.apy}% Guaranteed APY
              </span>
            </div>

            {/* Staking Amount Input Box */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Stake Amount (AGL):</span>
                <span>Available: {userBalance.toLocaleString()} AGL</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent text-2xl font-extrabold font-mono text-white focus:outline-none"
                />
                <span className="text-sm font-bold text-zinc-400">AGL</span>
              </div>

              {/* Quick % Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                <span className="text-[11px] text-zinc-500">
                  ≈ ${((parseFloat(stakeAmount) || 0) * AGL_PRICE_USD).toFixed(2)} USD
                </span>
                <div className="flex items-center gap-1.5">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSelectPercentage(pct)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-brand-purple text-zinc-300 hover:text-white text-[11px] font-bold transition-all"
                    >
                      {pct === 100 ? "MAX" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto-Compound Toggle & Strategy Parameters */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin-slow" />
                    Auto-Compound Staking Yield
                  </span>
                  <p className="text-[10px] text-zinc-400">Automatically reinvest accrued rewards every 30 seconds to compound annual APY.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCompoundToggle(!autoCompoundToggle)}
                  className={`w-12 h-6 rounded-full transition-all relative p-1 cursor-pointer ${
                    autoCompoundToggle ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoCompoundToggle ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 text-zinc-300">
                <div>
                  <span className="text-zinc-500 text-[10px] block">LOCK DURATION</span>
                  <span className="font-bold text-white">{selectedVault.durationDays === 0 ? "Flexible (No Lock)" : `${selectedVault.durationDays} Days`}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">ESTIMATED ANNUAL RETURN</span>
                  <span className="font-bold text-emerald-400">+${(((parseFloat(stakeAmount) || 0) * (selectedVault.apy / 100)) * AGL_PRICE_USD).toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Execute Deposit Button */}
            <button
              id="execute-stake-btn"
              onClick={handleStake}
              disabled={isStaking}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-brand-purple via-indigo-600 to-blue-600 hover:opacity-95 text-white font-bold text-base shadow-2xl font-display flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isStaking ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Staking into {selectedVault.name}...</span>
                </>
              ) : (
                <>
                  <Landmark className="w-5 h-5 text-amber-300" />
                  <span>Deposit {stakeAmount || "0"} AGL into {selectedVault.name}</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive APY Yield Calculator Widget */}
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-white/10 space-y-5 shadow-xl font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                Yield & Compound Projections
              </h3>
              <span className="text-[10px] text-zinc-400">Interactive Estimator</span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Slider for deposit */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Simulated Deposit Amount:</span>
                  <span className="text-white font-bold">{calcDeposit.toLocaleString()} AGL (${(calcDeposit * AGL_PRICE_USD).toFixed(2)})</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="100000"
                  step="500"
                  value={calcDeposit}
                  onChange={(e) => setCalcDeposit(Number(e.target.value))}
                  className="w-full accent-brand-purple cursor-pointer"
                />
              </div>

              {/* Vault duration radio chips */}
              <div className="space-y-1.5">
                <span className="text-zinc-400 block">Select Vault Duration:</span>
                <div className="grid grid-cols-4 gap-2">
                  {VAULT_TIERS.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setCalcVaultId(v.id)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                        calcVaultId === v.id ? "bg-brand-purple text-white border-brand-purple" : "bg-black/40 text-zinc-400 border-white/5 hover:border-white/20"
                      }`}
                    >
                      {v.durationDays === 0 ? "Flex" : `${v.durationDays}D`} ({v.apy}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Projected Returns Box */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-black/60 border border-white/10 text-center">
                <div>
                  <span className="text-zinc-500 text-[10px] block">DAILY RETURN</span>
                  <span className="text-emerald-400 font-bold text-sm">+{calcDailyEst.toFixed(2)} AGL</span>
                  <span className="text-[9px] text-zinc-400 block">≈ ${(calcDailyEst * AGL_PRICE_USD).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">MONTHLY RETURN</span>
                  <span className="text-emerald-400 font-bold text-sm">+{calcMonthlyEst.toFixed(2)} AGL</span>
                  <span className="text-[9px] text-zinc-400 block">≈ ${(calcMonthlyEst * AGL_PRICE_USD).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">1-YEAR YIELD</span>
                  <span className="text-amber-300 font-bold text-sm">+{calcYearlyEst.toFixed(2)} AGL</span>
                  <span className="text-[9px] text-amber-400 block">≈ ${(calcYearlyEst * AGL_PRICE_USD).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User Staking Portfolio Positions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-white/10 space-y-5 shadow-xl font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-300" />
                Active Staking Positions ({positions.length})
              </h3>
              <button
                onClick={onRefreshWallet}
                className="text-zinc-400 hover:text-white transition-colors"
                title="Refresh Staking State"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {positions.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No active staking positions. Select a vault on the left to stake your AGL tokens!
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {positions.map(pos => {
                  const isLocked = pos.unlockTime > Date.now();
                  const isClaiming = claimingPositionId === pos.id;
                  const totalDays = pos.unlockTime > pos.startTime ? Math.max(1, (pos.unlockTime - pos.startTime) / (86400 * 1000)) : 1;
                  const elapsedDays = Math.max(0, (Date.now() - pos.startTime) / (86400 * 1000));
                  const progressPct = Math.min(100, (elapsedDays / totalDays) * 100);

                  return (
                    <div
                      key={pos.id}
                      className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 relative overflow-hidden"
                    >
                      {/* Position Top Row */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-300" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                          {pos.vaultName}
                        </span>
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {pos.apy}% APY
                        </span>
                      </div>

                      {/* Staked Amount & Live Accumulated Reward */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-900/80 border border-white/5 text-xs">
                        <div>
                          <span className="text-zinc-500 text-[10px] block">STAKED AMOUNT</span>
                          <span className="font-extrabold text-white">{pos.amount.toLocaleString()} AGL</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[10px] block">LIVE REWARDS ACCRUED</span>
                          <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                            {pos.accumulatedRewards.toFixed(4)} AGL
                          </span>
                        </div>
                      </div>

                      {/* Lockup Progress Bar */}
                      {pos.unlockTime > pos.startTime && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between text-zinc-400">
                            <span>Lock Progress:</span>
                            <span>{isLocked ? `Unlocks ${new Date(pos.unlockTime).toLocaleDateString()}` : "Unlocked & Ready"}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-brand-purple to-emerald-400 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Action buttons: Claim Yield & Unstake */}
                      <div className="flex gap-2 pt-1 text-xs">
                        <button
                          onClick={() => handleClaimYield(pos.id)}
                          disabled={pos.accumulatedRewards <= 0 || isClaiming}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                        >
                          {isClaiming ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>Claim Yield</span>
                        </button>

                        <button
                          onClick={() => handleUnstake(pos.id)}
                          className={`px-3 py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                            isLocked 
                              ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" 
                              : "bg-zinc-800 border-white/10 text-zinc-300 hover:text-white"
                          }`}
                        >
                          {isLocked ? "Emergency Unstake" : "Unstake"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staking Execution Progress Overlay Modal */}
      {isStaking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-zinc-900 border border-white/10 space-y-6 shadow-2xl font-mono text-center">
            <div className="relative mx-auto w-16 h-16 rounded-full bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center">
              <Landmark className="w-8 h-8 text-brand-purple animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white">Staking into Smart Contract Vault</h3>
              <p className="text-xs text-zinc-400">Please confirm signature in your connected Web3 wallet</p>
            </div>

            <div className="space-y-3 text-left text-xs">
              {[
                { step: 1, title: "Approving ERC-20 Token Allowance" },
                { step: 2, title: "Constructing Vault Deposit Smart Contract Call" },
                { step: 3, title: "Broadcasting Block Confirmation on Base Mainnet" }
              ].map(s => (
                <div
                  key={s.step}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    stakeStep === s.step 
                      ? "bg-brand-purple/20 border-brand-purple text-white font-bold" 
                      : stakeStep > s.step 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-black/40 border-white/5 text-zinc-600"
                  }`}
                >
                  {stakeStep > s.step ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : stakeStep === s.step ? (
                    <span className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-zinc-700 text-[10px] flex items-center justify-center shrink-0">
                      {s.step}
                    </span>
                  )}
                  <span>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
