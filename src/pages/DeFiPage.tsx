import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { getContractAddresses, isAddressConfigured } from "../lib/contracts";
import { ArrowLeftRight, Landmark, Lock, Coins, Sparkles, AlertCircle, TrendingUp, HelpCircle, Activity } from "lucide-react";

interface DeFiPageProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function DeFiPage({ wallet, onRefreshWallet, addTerminalLog, showToast }: DeFiPageProps) {
  // Swap State
  const [swapFrom, setSwapFrom] = useState("ETH");
  const [swapTo, setSwapTo] = useState("AGL");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapEstim, setSwapEstim] = useState("0");
  const [swapping, setSwapping] = useState(false);
  const [onChainRate, setOnChainRate] = useState<number>(20000); // 1 ETH = 20,000 AGL
  const [priceLoading, setPriceLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchOnChainPrice = async () => {
      try {
        const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const creditsContract = new ethers.Contract(
          "0x13866F31c60822Ff70684213b9727915Ddf2c183",
          ["function creditsPerAGL() external view returns (uint256)"],
          provider
        );
        const rate = await creditsContract.creditsPerAGL();
        const calculatedRate = 10000 + Number(rate) * 100;
        setOnChainRate(calculatedRate);
        setPriceLoading(false);
        addTerminalLog("system", `AMM_ORACLE: Updated AGL/ETH spot price from the configured credits contract. Rate: 1 ETH = ${calculatedRate.toLocaleString()} AGL.`);
      } catch (err) {
        console.error("Failed to fetch on-chain price ticker:", err);
        setOnChainRate(0);
        setPriceLoading(false);
      }
    };
    fetchOnChainPrice();
  }, []);

  // Staking State
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakedBalance, setStakedBalance] = useState(0);
  const [unclaimedRewards, setUnclaimedRewards] = useState(0);
  const [stakingLoading, setStakingLoading] = useState(false);

  const handleSwapAmountChange = (val: string) => {
    setSwapAmount(val);
    const num = parseFloat(val) || 0;
    if (swapFrom === "ETH") {
      setSwapEstim((num * onChainRate).toLocaleString(undefined, { maximumFractionDigits: 4 }));
    } else {
      setSwapEstim((num / onChainRate).toFixed(6));
    }
  };

  const handleExecuteSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    const amt = parseFloat(swapAmount) || 0;
    if (amt <= 0) return;
    const { aglCredits } = getContractAddresses();
    if (!isAddressConfigured(aglCredits) || onChainRate <= 0) {
      showToast("Swaps are disabled until live contract pricing is available.", "error");
      addTerminalLog("error", "SWAP_BLOCKED: No verified live pricing or credits contract is configured.");
      return;
    }
    showToast("This route is read-only until the verified swap router is configured.", "info");
    addTerminalLog("info", "SWAP_BLOCKED: Refused local balance mutation; a verified swap router is required.");
    return;

    /*
    setTimeout(() => {
      if (swapFrom === "ETH") {
        if (amt > wallet.balanceEth) {
          showToast("Insufficient ETH.", "error");
          setSwapping(false);
          return;
        }

        const outAgl = amt * onChainRate;
        const updated = { 
          ...wallet, 
          balanceEth: wallet.balanceEth - amt,
          aglTokenBalance: wallet.aglTokenBalance + outAgl
        };
        AgunnayaDatabase.saveWallet(updated);
        AgunnayaDatabase.addReferralPayout(wallet.address, "swap buy", amt * 0.005);
        onRefreshWallet();

        addTerminalLog("success", `Swap complete! Exchanged ${amt} ETH for +${outAgl.toLocaleString(undefined, { maximumFractionDigits: 2 })} AGL`);
      } else {
        if (amt > wallet.aglTokenBalance) {
          showToast("Insufficient AGL.", "error");
          setSwapping(false);
          return;
        }

        const outEth = amt / onChainRate;
        const updated = { 
          ...wallet, 
          balanceEth: wallet.balanceEth + outEth,
          aglTokenBalance: wallet.aglTokenBalance - amt
        };
        AgunnayaDatabase.saveWallet(updated);
        AgunnayaDatabase.addReferralPayout(wallet.address, "swap sell", outEth * 0.005);
        onRefreshWallet();

        addTerminalLog("success", `Swap complete! Exchanged ${amt.toLocaleString()} AGL for +${outEth.toFixed(6)} ETH`);
      }

      setSwapAmount("");
      setSwapEstim("0");
      setSwapping(false);
    }, 1500);
    */
  };

  const handleStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    const amt = parseFloat(stakeAmount) || 0;
    if (amt <= 0 || amt > wallet.aglTokenBalance) {
      showToast("Invalid or insufficient AGL balance.", "error");
      return;
    }
    showToast("Staking is disabled until a verified staking contract is configured.", "info");
    addTerminalLog("info", "STAKE_BLOCKED: Refused local balance mutation; no verified staking contract is configured.");
    return;

    setStakingLoading(true);

    addTerminalLog("info", `Locking ${amt} AGL in yield farming staking pool...`);

    setTimeout(() => {
      setStakedBalance(prev => prev + amt);
      const updated = { ...wallet, aglTokenBalance: wallet.aglTokenBalance - amt };
      AgunnayaDatabase.saveWallet(updated);
      onRefreshWallet();

      addTerminalLog("success", `Staked ${amt.toLocaleString()} AGL successfully! Dynamic APR set at 24.5%`);
      setStakeAmount("");
      setStakingLoading(false);

      // set unclaimed rewards to minor bonus
      setUnclaimedRewards(prev => prev + (amt * 0.05));
    }, 1500);
  };

  const handleClaimStakingRewards = () => {
    if (unclaimedRewards <= 0) return;
    showToast("Rewards are unavailable until staking is connected to a verified contract.", "info");
    addTerminalLog("info", "CLAIM_BLOCKED: No verified staking contract is configured.");
    return;
    
    const earned = unclaimedRewards;
    setUnclaimedRewards(0);
    
    const updated = { ...wallet, aglTokenBalance: wallet.aglTokenBalance + earned };
    AgunnayaDatabase.saveWallet(updated);
    onRefreshWallet();

    addTerminalLog("success", `Claimed +${earned.toLocaleString(undefined, { maximumFractionDigits: 2 })} AGL Staking Awards`);
  };

  return (
    <div id="defi-suite-root" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      
      {/* Swap card */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
        <div>
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-brand-purple" />
            Decentralized Swaps
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Instantly route, swap, and collateralize standard Base assets using fully automated liquidity routers.
          </p>
        </div>

        <form onSubmit={handleExecuteSwap} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[9px] uppercase font-bold text-zinc-500">Pay From</label>
            <div className="relative">
              <input
                id="swap-input-amount"
                type="number"
                step="0.0001"
                min="0"
                value={swapAmount}
                onChange={(e) => handleSwapAmountChange(e.target.value)}
                placeholder="0.1"
                required
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 pr-12 text-xs font-mono text-white focus:outline-none"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-zinc-500 font-bold font-mono">
                {swapFrom}
              </span>
            </div>
          </div>

          {/* Swap icon */}
          <div className="flex justify-center">
            <button
              id="swap-toggle-direction"
              type="button"
              onClick={() => {
                setSwapFrom(prev => prev === "ETH" ? "AGL" : "ETH");
                setSwapTo(prev => prev === "AGL" ? "ETH" : "AGL");
                setSwapAmount("");
                setSwapEstim("0");
              }}
              className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-brand-purple transition-all"
            >
              ⇅
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] uppercase font-bold text-zinc-500">Receive To (Estimated)</label>
            <div className="relative">
              <input
                id="swap-estimated-output"
                type="text"
                value={swapEstim}
                disabled
                className="w-full bg-zinc-950 border border-white/5 rounded-xl p-3 text-xs text-zinc-500 font-mono focus:outline-none"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-zinc-500 font-bold font-mono">
                {swapTo}
              </span>
            </div>
          </div>

          <button
            id="defi-swap-submit"
            type="submit"
            disabled={swapping || !swapAmount || parseFloat(swapAmount) <= 0}
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 text-xs font-bold font-display text-white shadow-lg shadow-brand-purple/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-1.5"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>{swapping ? "Executing contract routing..." : "Route Liquidity swap"}</span>
          </button>
        </form>
      </div>

      {/* Staking card */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
        <div>
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-brand-purple" />
            Yield Farming Staking
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Lock AGL tokens inside staking vaults to secure the ecosystem, claim fee discounts, and earn 24.5% dynamic APR.
          </p>
        </div>

        <form onSubmit={handleStake} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-black/40 p-3 rounded-xl border border-white/5">
            <div>
              <span className="block text-[8px] text-zinc-500 uppercase">Staked Balance</span>
              <span className="text-white font-bold">{stakedBalance.toLocaleString()} AGL</span>
            </div>
            <div className="text-right">
              <span className="block text-[8px] text-zinc-500 uppercase">Dynamic APR</span>
              <span className="text-emerald-400 font-bold">24.50% Yield</span>
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Lock Amount (AGL)</label>
            <div className="relative">
              <input
                id="stake-input-amount"
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="10,000"
                required
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 pr-14 text-xs font-mono text-white focus:outline-none"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-zinc-500 font-bold font-mono">
                AGL
              </span>
            </div>
          </div>

          <button
            id="defi-stake-submit"
            type="submit"
            disabled={stakingLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
            className="w-full py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-xs font-bold font-display text-white shadow-lg disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-1.5"
          >
            <Lock className="w-4 h-4" />
            <span>{stakingLoading ? "Locking tokens on-chain..." : "Lock & Stake AGL"}</span>
          </button>
        </form>
      </div>

      {/* Claim Staking Rewards panel */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-brand-purple/5 blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5 mb-2">
            <Coins className="w-4 h-4 text-brand-purple" /> Staking Claim Vault
          </h2>
          <p className="text-[11px] text-zinc-500 leading-normal mb-4">
            Collect accrued liquidity awards from custom-deployed contract interactions, linear curves trading volumes, and staking pools.
          </p>

          <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 text-center space-y-1 my-4">
            <span className="block text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Unclaimed Accruals</span>
            <span className="block text-2xl font-mono font-bold text-emerald-400">{unclaimedRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })} AGL</span>
          </div>
        </div>

        <button
          id="defi-claim-rewards-btn"
          onClick={handleClaimStakingRewards}
          disabled={unclaimedRewards <= 0}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white text-xs font-bold font-display shadow-lg disabled:opacity-40 transition-all"
        >
          Claim All Staking Awards
        </button>
      </div>

    </div>
  );
}
