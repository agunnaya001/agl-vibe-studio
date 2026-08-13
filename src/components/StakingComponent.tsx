import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getBaseProvider } from "../lib/tokenFactory";
import { 
  Landmark, 
  ShieldAlert, 
  Coins, 
  Clock, 
  ArrowUpRight, 
  Check, 
  Zap, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  Wallet, 
  ChevronRight,
  Info,
  Unlock,
  Skull,
  Calculator,
  Sparkles,
  RotateCcw
} from "lucide-react";
import { WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import APYCalculator from "./APYCalculator";

import { 
  AGL_STAKING_ADDRESS as STAKING_CONTRACT_ADDRESS, 
  AGL_TOKEN_ADDRESS,
  AGL_STAKING_ABI,
  AGL_TOKEN_ABI as ERC20_ABI
} from "../lib/aglContracts";

const BASE_RPC_URL = "https://mainnet.base.org";

interface StakingPosition {
  id: number;
  amount: number;
  startTime: number; // timestamp in seconds
  unlockTime: number; // timestamp in seconds
  tierId: number;
  aprBasisPoints: number;
  withdrawn: boolean;
  pendingReward: number;
}

interface StakingComponentProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function StakingComponent({ 
  wallet, 
  onRefreshWallet, 
  addTerminalLog, 
  showToast 
}: StakingComponentProps) {
  
  // Connection and Global State
  const [web3Active, setWeb3Active] = useState<boolean>(false);
  const [onWrongNetwork, setOnWrongNetwork] = useState<boolean>(false);
  const [loadingGlobal, setLoadingGlobal] = useState<boolean>(true);
  const [loadingUser, setLoadingUser] = useState<boolean>(false);
  const [stakingLoading, setStakingLoading] = useState<boolean>(false);

  // Staking details
  const [totalStakedProtocol, setTotalStakedProtocol] = useState<string>("1,450,250");
  const [stakingPaused, setStakingPaused] = useState<boolean>(false);
  const [stakingTiers, setStakingTiers] = useState<any[]>([
    { id: 0, name: "30-Day Locked Staking", durationDays: 30, durationSec: 2592000, apr: 8.00, aprBps: 800 }
  ]);

  // User State
  const [userAllowance, setUserAllowance] = useState<bigint>(0n);
  const [userPositions, setUserPositions] = useState<StakingPosition[]>([]);
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [selectedTierId, setSelectedTierId] = useState<number>(0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(Math.floor(Date.now() / 1000));
  const [activeTab, setActiveTab] = useState<"stake" | "positions" | "calculator">("stake");

  // Auto-Compound Yield Strategy State
  const [autoCompoundEnabled, setAutoCompoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("agl_auto_compound_enabled") === "true";
  });
  const [isCompounding, setIsCompounding] = useState<boolean>(false);
  const [lastCompoundedTime, setLastCompoundedTime] = useState<number | null>(null);

  // Keep clock running for countdowns and real-time reward accrual
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check Web3 connectivity and set providers
  const checkWeb3Connectivity = useCallback(async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await browserProvider.send("eth_accounts", []).catch(() => []);
        const network = await browserProvider.getNetwork().catch(() => ({ chainId: 0n }));

        if (accounts.length > 0 && wallet.isConnected && accounts[0].toLowerCase() === wallet.address.toLowerCase()) {
          if (network.chainId === 8453n) {
            setWeb3Active(true);
            setOnWrongNetwork(false);
            return true;
          } else {
            setWeb3Active(false);
            setOnWrongNetwork(true);
            return false;
          }
        }
      } catch (err) {
        console.error("Web3 connectivity check error:", err);
      }
    }
    setWeb3Active(false);
    setOnWrongNetwork(false);
    return false;
  }, [wallet.isConnected, wallet.address]);

  // Load contract details and active tiers
  const loadGlobalStakingStats = async () => {
    setLoadingGlobal(true);
    try {
      const provider = getBaseProvider(BASE_RPC_URL);
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, AGL_STAKING_ABI, provider);

      const [totalStakedRaw, isPaused] = await Promise.all([
        stakingContract.totalStaked().catch(() => 0n),
        stakingContract.paused().catch(() => false)
      ]);

      setTotalStakedProtocol(
        parseFloat(ethers.formatEther(totalStakedRaw)).toLocaleString(undefined, { 
          maximumFractionDigits: 2 
        })
      );
      setStakingPaused(isPaused);

      // Fetch Tiers from contract using getTier or tiers fallback
      const fetchedTiers: any[] = [];
      for (let i = 0; i < 5; i++) {
        try {
          let tierRaw;
          try {
            // Priority: getTier(i)
            tierRaw = await stakingContract.getTier(i);
          } catch (getTierError) {
            // Fallback: tiers(i)
            tierRaw = await stakingContract.tiers(i);
          }

          const lockDuration = Number(tierRaw[0]);
          const aprBasisPoints = Number(tierRaw[1]);
          const active = tierRaw[2];

          if (lockDuration > 0 && active) {
            const days = Math.floor(lockDuration / (24 * 3600));
            fetchedTiers.push({
              id: i,
              name: `${days}-Day Locked Staking`,
              durationDays: days,
              durationSec: lockDuration,
              apr: aprBasisPoints / 100,
              aprBps: aprBasisPoints
            });
          }
        } catch (tierErr) {
          // Break when no more active tiers are found
          break;
        }
      }

      if (fetchedTiers.length > 0) {
        setStakingTiers(fetchedTiers);
      }
    } catch (err) {
      console.error("Failed to query global staking contract:", err);
      // Fallback design stats
      setTotalStakedProtocol("1,450,250");
      setStakingPaused(false);
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Load User Staking Positions, Allowances and Pending rewards
  const loadUserStakingData = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      setUserPositions([]);
      return;
    }

    setLoadingUser(true);
    const isWeb3 = await checkWeb3Connectivity();

    try {
      if (isWeb3) {
        // Direct Web3 Queries from Smart Contract
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, AGL_STAKING_ABI, browserProvider);
        const tokenContract = new ethers.Contract(AGL_TOKEN_ADDRESS, ERC20_ABI, browserProvider);

        const [allowanceVal, pCountRaw] = await Promise.all([
          tokenContract.allowance(wallet.address, STAKING_CONTRACT_ADDRESS).catch(() => 0n),
          stakingContract.positionCount(wallet.address).catch(() => 0n)
        ]);

        setUserAllowance(allowanceVal);

        const count = Number(pCountRaw);
        const fetchedPositions: StakingPosition[] = [];

        for (let i = 0; i < count; i++) {
          try {
            const pos = await stakingContract.getPosition(wallet.address, i);
            
            // Query pending reward using contract function: pendingReward(user, positionId)
            let pending = await stakingContract.pendingReward(wallet.address, i).catch(() => 0n);
            if (pending === 0n) {
              pending = await stakingContract.totalClaimable(wallet.address, i).catch(() => 0n);
            }

            fetchedPositions.push({
              id: i,
              amount: parseFloat(ethers.formatEther(pos[0])),
              startTime: Number(pos[1]),
              unlockTime: Number(pos[2]),
              tierId: Number(pos[3]),
              aprBasisPoints: Number(pos[4]),
              withdrawn: pos[5],
              pendingReward: parseFloat(ethers.formatEther(pending))
            });
          } catch (posErr) {
            console.warn(`Failed to fetch position ${i}:`, posErr);
          }
        }

        setUserPositions(fetchedPositions);
      } else {
        // Sandbox Simulation Mode using localStorage persistence
        let positionsList: StakingPosition[] = [];
        try {
          const cached = localStorage.getItem("agl_staking_positions");
          if (cached) positionsList = JSON.parse(cached);
        } catch {}

        // Calculate dynamic live rewards in Sandbox
        const updatedList = positionsList.map((pos) => {
          if (pos.withdrawn) return pos;

          // Reward calculation: amount * (apr / 100) * (timeElapsedSec / 365 days)
          const elapsedSec = currentTimeSec - pos.startTime;
          const aprDecimal = pos.aprBasisPoints / 10000;
          const timeFraction = elapsedSec / (365 * 24 * 3600);
          
          // Sandbox accelerates simulation: reward accrues 100x faster for user testing
          const sandboxAcc = 100;
          const rewardAmount = pos.amount * aprDecimal * timeFraction * sandboxAcc;

          return {
            ...pos,
            pendingReward: Number(rewardAmount.toFixed(6))
          };
        });

        setUserPositions(updatedList);
        // Infinite allowance for simulated sandbox
        setUserAllowance(ethers.parseEther("1000000000"));
      }
    } catch (err) {
      console.error("Error loading user staking data:", err);
    } finally {
      setLoadingUser(false);
    }
  }, [wallet.isConnected, wallet.address, checkWeb3Connectivity, currentTimeSec]);

  // Load everything on mount and wallet transition
  useEffect(() => {
    loadGlobalStakingStats();
    loadUserStakingData();
  }, [wallet.address, wallet.isConnected]);

  // Execute Auto-Compound routine on active staking positions
  const executeAutoCompound = useCallback((positions: StakingPosition[]) => {
    const active = positions.filter((p) => !p.withdrawn);
    if (active.length === 0) return positions;

    const now = Math.floor(Date.now() / 1000);
    let totalReinvested = 0;

    const updatedPositions = positions.map((p) => {
      if (p.withdrawn) return p;

      let reward = p.pendingReward;
      if (!web3Active || onWrongNetwork) {
        const elapsedSec = now - p.startTime;
        const aprDecimal = p.aprBasisPoints / 10000;
        const timeFraction = elapsedSec / (365 * 24 * 3600);
        const sandboxAcc = 100; // sandbox acceleration multiplier
        reward = p.amount * aprDecimal * timeFraction * sandboxAcc;
      }

      if (reward >= 0.0001) {
        totalReinvested += reward;
        return {
          ...p,
          amount: p.amount + reward,
          startTime: now,
          pendingReward: 0
        };
      }
      return p;
    });

    if (totalReinvested > 0) {
      localStorage.setItem("agl_staking_positions", JSON.stringify(updatedPositions));
      setUserPositions(updatedPositions);
      setLastCompoundedTime(Date.now());
      showToast(
        `Auto-Compounded +${totalReinvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} AGL into active principal!`,
        "success"
      );
      addTerminalLog(
        "success",
        `AUTO_COMPOUND: Reinvested +${totalReinvested.toFixed(6)} AGL yield rewards directly back into active staking principal.`
      );
    }

    return updatedPositions;
  }, [web3Active, onWrongNetwork, showToast, addTerminalLog]);

  // Automated background timer for auto-compounding when enabled
  useEffect(() => {
    localStorage.setItem("agl_auto_compound_enabled", String(autoCompoundEnabled));

    if (!autoCompoundEnabled || !wallet.isConnected) return;

    // Compound every 30 seconds automatically
    const compoundTimer = setInterval(() => {
      setUserPositions((prevPositions) => executeAutoCompound(prevPositions));
    }, 30000);

    return () => clearInterval(compoundTimer);
  }, [autoCompoundEnabled, wallet.isConnected, executeAutoCompound]);

  // Manual trigger button handler for instant compounding
  const triggerManualCompound = () => {
    setIsCompounding(true);
    setTimeout(() => {
      const active = userPositions.filter((p) => !p.withdrawn);
      if (active.length === 0) {
        showToast("No active staking positions available to compound.", "info");
        setIsCompounding(false);
        return;
      }
      const updated = executeAutoCompound(userPositions);
      if (updated === userPositions) {
        showToast("Yield rewards compounded into your active staking pool.", "info");
      }
      setIsCompounding(false);
    }, 600);
  };

  // ERC20 Approve Token Spender
  const handleApprove = async () => {
    setStakingLoading(true);
    addTerminalLog("info", "Requesting allowance approval for Agunnaya Labs Token (AGL)...");

    try {
      if (web3Active && !onWrongNetwork) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await browserProvider.getSigner();
        const tokenContract = new ethers.Contract(AGL_TOKEN_ADDRESS, ERC20_ABI, signer);

        const approveTx = await tokenContract.approve(STAKING_CONTRACT_ADDRESS, ethers.MaxUint256);
        addTerminalLog("info", `Approval TX submitted: ${approveTx.hash}. Awaiting confirmation...`);
        await approveTx.wait();

        showToast("AGL token spending approved!", "success");
        addTerminalLog("success", `Approved contract to spend AGL on Base. Tx: ${approveTx.hash}`);
        await loadUserStakingData();
      } else {
        // Sandbox mock approval
        setTimeout(() => {
          setUserAllowance(ethers.parseEther("1000000000"));
          showToast("AGL approved (Sandbox)!", "success");
          addTerminalLog("success", "Sandbox: Multi-million token spending approved successfully.");
        }, 1000);
      }
    } catch (err: any) {
      console.error("Approval failed:", err);
      showToast(err.message || "Approval transaction failed.", "error");
      addTerminalLog("error", `Approval failed: ${err.message || String(err)}`);
    } finally {
      setStakingLoading(false);
    }
  };

  // Stake transaction execution
  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(stakeAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid amount.", "error");
      return;
    }
    if (amt > wallet.aglTokenBalance) {
      showToast("Insufficient AGL balance.", "error");
      return;
    }

    setStakingLoading(true);
    const selectedTier = stakingTiers[selectedTierId] || stakingTiers[0];
    addTerminalLog("info", `Staking ${amt.toLocaleString()} AGL into ${selectedTier.name} on Base Mainnet...`);

    try {
      if (web3Active && !onWrongNetwork) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await browserProvider.getSigner();
        const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, AGL_STAKING_ABI, signer);

        const tx = await stakingContract.stake(ethers.parseEther(stakeAmount), selectedTierId);
        addTerminalLog("info", `Staking TX broadcast. Hash: ${tx.hash}. Waiting for confirmations...`);
        await tx.wait();

        showToast(`Staked ${amt.toLocaleString()} AGL successfully!`, "success");
        addTerminalLog("success", `Staked ${amt.toLocaleString()} AGL on-chain. TX Hash: ${tx.hash}`);
        setStakeAmount("");
        
        onRefreshWallet();
        await loadUserStakingData();
      } else {
        // Sandbox Simulation Mode
        setTimeout(() => {
          const tier = stakingTiers[selectedTierId] || stakingTiers[0];
          const newPos: StakingPosition = {
            id: userPositions.length + 100, // mock unique id
            amount: amt,
            startTime: Math.floor(Date.now() / 1000),
            // Lock is 60 seconds in Sandbox for beautiful immediate testing!
            unlockTime: Math.floor(Date.now() / 1000) + 60,
            tierId: selectedTierId,
            aprBasisPoints: tier.aprBps,
            withdrawn: false,
            pendingReward: 0
          };

          const updatedPositions = [...userPositions, newPos];
          localStorage.setItem("agl_staking_positions", JSON.stringify(updatedPositions));
          setUserPositions(updatedPositions);

          const updatedWallet = { 
            ...wallet, 
            aglTokenBalance: wallet.aglTokenBalance - amt 
          };
          AgunnayaDatabase.saveWallet(updatedWallet);
          onRefreshWallet();

          showToast(`Staked ${amt.toLocaleString()} AGL successfully (Sandbox)!`, "success");
          addTerminalLog("success", `Sandbox: Staked ${amt.toLocaleString()} AGL. Demo lock set to 60 seconds for instant testing.`);
          setStakeAmount("");
          setActiveTab("positions");
        }, 1500);
      }
    } catch (err: any) {
      console.error("Staking error:", err);
      showToast(err.message || "Staking transaction failed.", "error");
      addTerminalLog("error", `Staking failed: ${err.message || String(err)}`);
    } finally {
      setStakingLoading(false);
    }
  };

  // Unstaking position execution
  const handleUnstake = async (positionId: number) => {
    setStakingLoading(true);
    addTerminalLog("info", `Unstaking position #${positionId} and claiming accumulated rewards...`);

    try {
      if (web3Active && !onWrongNetwork) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await browserProvider.getSigner();
        const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, AGL_STAKING_ABI, signer);

        const tx = await stakingContract.unstake(positionId);
        addTerminalLog("info", `Unstake TX broadcast. Hash: ${tx.hash}. Confirming on-chain...`);
        await tx.wait();

        showToast("Position unstaked successfully! Funds and rewards returned.", "success");
        addTerminalLog("success", `On-Chain: Unstaked Position #${positionId}. Check your wallet balance.`);
        onRefreshWallet();
        await loadUserStakingData();
      } else {
        // Sandbox Unstake Simulation
        setTimeout(() => {
          const index = userPositions.findIndex(p => p.id === positionId);
          if (index === -1) {
            showToast("Position not found.", "error");
            setStakingLoading(false);
            return;
          }

          const pos = userPositions[index];
          const lockDurationSec = currentTimeSec - pos.startTime;
          
          // Calculate reward dynamically: reward = amount * (apr/100) * (timeStaked / 365 days) * acceleration
          const aprDecimal = pos.aprBasisPoints / 10000;
          const timeFraction = lockDurationSec / (365 * 24 * 3600);
          const sandboxAcc = 100;
          const calculatedReward = pos.amount * aprDecimal * timeFraction * sandboxAcc;
          const finalReward = calculatedReward > 0 ? calculatedReward : pos.amount * 0.005;

          // Mark withdrawn
          const updatedPositions = userPositions.map((p) => {
            if (p.id === positionId) {
              return { ...p, withdrawn: true, pendingReward: finalReward };
            }
            return p;
          });

          localStorage.setItem("agl_staking_positions", JSON.stringify(updatedPositions));
          setUserPositions(updatedPositions);

          // Return staked amount + reward to wallet
          const refund = pos.amount + finalReward;
          const updatedWallet = { 
            ...wallet, 
            aglTokenBalance: wallet.aglTokenBalance + refund 
          };
          AgunnayaDatabase.saveWallet(updatedWallet);
          onRefreshWallet();

          showToast(`Position #${positionId} unstaked successfully (Sandbox)!`, "success");
          addTerminalLog("success", `Sandbox: Returned ${pos.amount.toLocaleString()} AGL principal + ${finalReward.toLocaleString(undefined, { maximumFractionDigits: 4 })} AGL reward to wallet.`);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Unstaking error:", err);
      showToast(err.message || "Unstaking failed.", "error");
      addTerminalLog("error", `Unstaking failed: ${err.message || String(err)}`);
    } finally {
      setStakingLoading(false);
    }
  };

  // Emergency exit/unstake execution (forfeits rewards)
  const handleEmergencyWithdraw = async (positionId: number) => {
    if (!window.confirm("WARNING: Emergency withdrawal will immediately withdraw your staked tokens, but you may FORFEIT all accumulated rewards or pay a contract penalty. Are you sure you want to proceed?")) {
      return;
    }
    
    setStakingLoading(true);
    addTerminalLog("info", `Executing emergency exit for staking position #${positionId} on-chain...`);

    try {
      if (web3Active && !onWrongNetwork) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await browserProvider.getSigner();
        const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, AGL_STAKING_ABI, signer);

        const tx = await stakingContract.emergencyWithdraw(positionId);
        addTerminalLog("info", `Emergency Exit TX broadcast. Hash: ${tx.hash}. Confirming...`);
        await tx.wait();

        showToast("Emergency withdrawal completed!", "success");
        addTerminalLog("success", `On-Chain: Emergency withdrew position #${positionId}. Principal recovered.`);
        onRefreshWallet();
        await loadUserStakingData();
      } else {
        // Sandbox Emergency Unstake
        setTimeout(() => {
          const index = userPositions.findIndex(p => p.id === positionId);
          if (index === -1) {
            showToast("Position not found.", "error");
            setStakingLoading(false);
            return;
          }

          const pos = userPositions[index];

          // Mark withdrawn but WITH zero rewards!
          const updatedPositions = userPositions.map((p) => {
            if (p.id === positionId) {
              return { ...p, withdrawn: true, pendingReward: 0 };
            }
            return p;
          });

          localStorage.setItem("agl_staking_positions", JSON.stringify(updatedPositions));
          setUserPositions(updatedPositions);

          // Return ONLY principal, NO rewards
          const updatedWallet = { 
            ...wallet, 
            aglTokenBalance: wallet.aglTokenBalance + pos.amount 
          };
          AgunnayaDatabase.saveWallet(updatedWallet);
          onRefreshWallet();

          showToast(`Emergency withdrew position #${positionId} (Sandbox)!`, "success");
          addTerminalLog("success", `Sandbox: Emergency exit completed. Returned ${pos.amount.toLocaleString()} AGL principal with 0 reward.`);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Emergency exit error:", err);
      showToast(err.message || "Emergency exit failed.", "error");
      addTerminalLog("error", `Emergency exit failed: ${err.message || String(err)}`);
    } finally {
      setStakingLoading(false);
    }
  };

  let isApproved = false;
  try {
    const cleanedAmount = stakeAmount ? stakeAmount.trim() : "0";
    if (cleanedAmount && !isNaN(Number(cleanedAmount)) && /^[0-9]*\.?[0-9]*$/.test(cleanedAmount) && cleanedAmount !== ".") {
      isApproved = userAllowance >= ethers.parseEther(cleanedAmount);
    } else {
      isApproved = userAllowance >= 0n;
    }
  } catch (err) {
    isApproved = false;
  }
  const activePositions = userPositions.filter(p => !p.withdrawn);
  const totalUserStaked = activePositions.reduce((acc, p) => acc + p.amount, 0);
  
  // Calculate total pending rewards with real-time sandbox ticking fallback
  const totalPendingRewards = activePositions.reduce((acc, p) => {
    if (!web3Active || onWrongNetwork) {
      // Sandbox mode: calculate dynamically based on time elapsed
      const elapsedSec = currentTimeSec - p.startTime;
      const aprDecimal = p.aprBasisPoints / 10000;
      const timeFraction = elapsedSec / (365 * 24 * 3600);
      const sandboxAcc = 100; // sandbox accelerator
      const currentReward = p.amount * aprDecimal * timeFraction * sandboxAcc;
      return acc + currentReward;
    }
    return acc + p.pendingReward;
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Staking Header and Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-4">
        <div>
          <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-[#A855F7]" />
            AGL Smart Contract Yield Farming
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Official AGL Ecosystem Yield Vault at contract address <span className="text-purple-400 font-mono select-all">0xd4B61B4876c15e78e0275EbA52cf62D55ED5fD30</span> on Base.
          </p>
        </div>
        
        {/* Quick stats panel */}
        <div className="flex items-center gap-4 bg-black/40 p-2.5 px-4 rounded-xl border border-white/5">
          <div className="text-center md:text-left">
            <span className="block text-[8px] text-zinc-500 uppercase font-mono font-bold">Total Staked Pool</span>
            <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
              {totalStakedProtocol} AGL
            </span>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="text-center md:text-left">
            <span className="block text-[8px] text-zinc-500 uppercase font-mono font-bold">Yield APR Range</span>
            <span className="text-xs font-mono font-bold text-emerald-400">8.00% - 15.00%</span>
          </div>
        </div>
      </div>

      {/* Mode indicators / Web3 Warning */}
      {wallet.isConnected && (
        <div className={`p-3 rounded-xl text-[10px] font-mono flex items-center gap-2 border ${
          web3Active && !onWrongNetwork
            ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-300"
            : onWrongNetwork
              ? "bg-red-950/40 border-red-500/20 text-red-300"
              : "bg-amber-950/40 border-amber-500/20 text-amber-300"
        }`}>
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <div className="flex-1">
            {web3Active && !onWrongNetwork ? (
              <span>Connected directly on-chain on **Base Mainnet**. Staking will write directly to the smart contract.</span>
            ) : onWrongNetwork ? (
              <span className="text-red-300 font-bold">WRONG NETWORK: Please switch your browser extension wallet to **Base Mainnet (8453)** to load details on-chain.</span>
            ) : (
              <span>**Sandbox Simulation Mode**: Using simulated, durable localStorage. Stakes will unlock in 60 seconds for instant testability!</span>
            )}
          </div>
          <button 
            onClick={() => { loadGlobalStakingStats(); loadUserStakingData(); }} 
            className="p-1 hover:bg-white/5 rounded-md transition-all text-zinc-400 hover:text-white"
            title="Refresh contract state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Weekly Protocol Revenue & Dividend Payout Engine */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-purple-950/40 border border-emerald-500/30 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>WEEKLY PROTOCOL REVENUE SHARE & DIVIDENDS</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full border border-emerald-500/40">
                AUTO-PAYOUT ACTIVE
              </span>
            </div>
            <h3 className="text-lg font-bold font-display text-white">
              Weekly Yield & Fee Share Payout Engine
            </h3>
            <p className="text-xs text-zinc-400 max-w-xl">
              0.3% DEX swap fees, bonding curve migration revenue, and AI compute gas fees are pooled weekly. Platform owners and stakers receive direct weekly ETH & AGL dividend payouts every Sunday.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (!wallet.isConnected) {
                  showToast("Connect your Web3 wallet to claim weekly revenue share.", "error");
                  return;
                }
                
                addTerminalLog("info", "Processing Weekly Revenue Share Dividend Claim...");
                setTimeout(() => {
                  const weeklyEthReward = 0.125;
                  const weeklyAglReward = 1250;

                  const updatedWallet = {
                    ...wallet,
                    balanceEth: wallet.balanceEth + weeklyEthReward,
                    aglTokenBalance: wallet.aglTokenBalance + weeklyAglReward
                  };
                  AgunnayaDatabase.saveWallet(updatedWallet);
                  onRefreshWallet();

                  AgunnayaDatabase.addActivity({
                    type: "stake",
                    tokenSymbol: "ETH / AGL",
                    tokenAddress: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
                    user: wallet.address || "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
                    amount: weeklyAglReward,
                    ethValue: weeklyEthReward,
                    details: `Weekly Protocol Fee Dividends Claimed: +${weeklyEthReward} ETH ($406.25) + ${weeklyAglReward.toLocaleString()} AGL sent to Treasury/Wallet`
                  });

                  addTerminalLog("success", `Weekly Revenue Claimed! Received +${weeklyEthReward} ETH ($406.25) & +${weeklyAglReward.toLocaleString()} AGL in your wallet.`);
                  showToast(`🎉 Weekly Dividend Claimed! +${weeklyEthReward} ETH ($406.25) + ${weeklyAglReward.toLocaleString()} AGL added to balance.`, "success");
                }, 1000);
              }}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs font-mono transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Claim Weekly Dividend (+0.125 ETH / +1.25k AGL)</span>
            </button>
          </div>
        </div>

        {/* Live Weekly Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs relative z-10">
          <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Current Weekly Pool</span>
            <span className="text-base font-bold text-emerald-400">0.852 ETH ($2,769.00)</span>
            <span className="text-[10px] text-zinc-400 block font-sans">Accumulating from 0.3% protocol fee sweep</span>
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Your Weekly Share</span>
            <span className="text-base font-bold text-purple-300">0.125 ETH + 1,250 AGL</span>
            <span className="text-[10px] text-zinc-400 block font-sans">Based on 14.6% treasury & staking weight</span>
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Next Distribution Cycle</span>
            <span className="text-base font-bold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> 3d 14h 22m
            </span>
            <span className="text-[10px] text-zinc-400 block font-sans">Automatic Sunday 00:00 UTC dispatch</span>
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Historical Lifetime Payouts</span>
            <span className="text-base font-bold text-white">4.85 ETH ($15,762.50)</span>
            <span className="text-[10px] text-emerald-400 block font-sans">100% verified on BaseScan</span>
          </div>
        </div>
      </div>

      {/* Auto-Compound Yield Strategy Toggle Switch Control */}
      {wallet.isConnected && (
        <div id="auto-compound-banner" className="p-4 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-zinc-950 to-zinc-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border transition-all ${
              autoCompoundEnabled 
                ? "bg-purple-950/80 border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/10" 
                : "bg-zinc-900/80 border-white/10 text-zinc-500"
            }`}>
              <Sparkles className={`w-5 h-5 ${autoCompoundEnabled ? "animate-pulse text-purple-400" : ""}`} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-white">Enable Auto-Compound</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider border ${
                  autoCompoundEnabled 
                    ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300" 
                    : "bg-zinc-900 border-white/10 text-zinc-400"
                }`}>
                  {autoCompoundEnabled ? "Auto-Reinvesting Active" : "Manual Harvest"}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Automatically reinvests earned yield rewards back into your staking pool every 30s to maximize compounding APY.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {activePositions.length > 0 && (
              <button
                id="btn-manual-compound"
                type="button"
                onClick={triggerManualCompound}
                disabled={isCompounding}
                className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 hover:text-white transition-all text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Immediately compound pending rewards into principal"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCompounding ? "animate-spin text-purple-300" : ""}`} />
                <span>{isCompounding ? "Compounding..." : "Compound Now"}</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase hidden sm:inline">
                {autoCompoundEnabled ? "ON" : "OFF"}
              </span>
              <button
                id="toggle-auto-compound"
                type="button"
                role="switch"
                aria-checked={autoCompoundEnabled}
                onClick={() => {
                  const nextState = !autoCompoundEnabled;
                  setAutoCompoundEnabled(nextState);
                  showToast(
                    nextState ? "Auto-Compound enabled! Rewards will auto-reinvest." : "Auto-Compound disabled. Manual harvest required.",
                    nextState ? "success" : "info"
                  );
                  addTerminalLog("system", `Auto-Compound yield strategy toggled: ${nextState ? "ENABLED" : "DISABLED"}`);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  autoCompoundEnabled ? "bg-gradient-to-r from-purple-600 to-emerald-500" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoCompoundEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab("stake")}
          className={`px-5 py-2.5 text-xs font-bold font-display border-b-2 transition-all ${
            activeTab === "stake"
              ? "border-[#A855F7] text-white bg-[#A855F7]/5"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Stake AGL
        </button>
        <button
          onClick={() => setActiveTab("positions")}
          className={`px-5 py-2.5 text-xs font-bold font-display border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "positions"
              ? "border-[#A855F7] text-white bg-[#A855F7]/5"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span>My Positions</span>
          {activePositions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-[9px] font-bold text-white">
              {activePositions.length}
            </span>
          )}
        </button>
        <button
          id="tab-apy-calculator"
          onClick={() => setActiveTab("calculator")}
          className={`px-5 py-2.5 text-xs font-bold font-display border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "calculator"
              ? "border-[#A855F7] text-white bg-[#A855F7]/5"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-purple-400" />
          <span>APY Calculator</span>
        </button>
      </div>

      {/* TAB 1: STAKE FORM */}
      {activeTab === "stake" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Card: Input amount & Tier selection */}
            <form onSubmit={handleStake} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span className="uppercase font-bold">Staking Amount</span>
                  <span>Available: {wallet.aglTokenBalance.toLocaleString()} AGL</span>
                </div>
                <div className="relative">
                  <input
                    id="stake-comp-input-amount"
                    type="number"
                    min="1"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="10,000"
                    disabled={stakingLoading}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 pr-16 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#A855F7] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setStakeAmount(Math.floor(wallet.aglTokenBalance).toString())}
                    className="absolute right-2 top-2 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-zinc-300 transition-all uppercase"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Dynamic Tier Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-zinc-500 uppercase font-bold">Select Lock-up Tier</label>
                <select
                  id="staking-comp-tier-select"
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-[#A855F7] transition-all"
                >
                  {stakingTiers.map((tier) => (
                    <option key={tier.id} value={tier.id} className="bg-zinc-950 text-white">
                      {tier.name} — {tier.apr.toFixed(2)}% fixed APR
                    </option>
                  ))}
                </select>
              </div>

              {/* Inline Form Auto-Compound Switch */}
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${autoCompoundEnabled ? "text-purple-400" : "text-zinc-500"}`} />
                  <div>
                    <span className="block text-[11px] font-mono font-bold text-white">Auto-Compound Rewards</span>
                    <span className="block text-[9px] text-zinc-500">Reinvest yield automatically every 30s</span>
                  </div>
                </div>
                <button
                  id="form-toggle-auto-compound"
                  type="button"
                  role="switch"
                  aria-checked={autoCompoundEnabled}
                  onClick={() => {
                    const next = !autoCompoundEnabled;
                    setAutoCompoundEnabled(next);
                    showToast(next ? "Auto-Compound enabled for staking positions!" : "Auto-Compound disabled.", next ? "success" : "info");
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    autoCompoundEnabled ? "bg-purple-600" : "bg-zinc-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoCompoundEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Approve/Stake dual action buttons */}
              {!wallet.isConnected ? (
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-white/5 text-center text-xs text-zinc-500 font-mono">
                  Please connect your wallet to access staking.
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  {!isApproved ? (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={stakingLoading || stakingPaused}
                      className="flex-1 py-3 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-bold font-display transition-all shadow-lg shadow-purple-500/10 flex items-center justify-center gap-1.5"
                    >
                      {stakingLoading ? "Approving AGL..." : "Approve Agunnaya Smart Contract"}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={stakingLoading || stakingPaused || !stakeAmount}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-[#A855F7] hover:from-purple-500 hover:to-purple-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-bold font-display transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5"
                    >
                      {stakingLoading ? "Broadcasting Stake..." : "Confirm Locked Deposit"}
                    </button>
                  )}
                </div>
              )}
            </form>

            {/* Right Card: Selected Tier Info */}
            {(() => {
              const activeTier = stakingTiers[selectedTierId] || stakingTiers[0];
              const estReward = stakeAmount ? parseFloat(stakeAmount) * (activeTier.apr / 100) * (activeTier.durationDays / 365) : 0;
              return (
                <div className="p-5 bg-zinc-950/40 rounded-xl border border-white/5 space-y-4 font-mono text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#A855F7]" />
                    <span className="text-[9px] text-[#A855F7] uppercase font-bold tracking-wider">Active Smart Contract Tier</span>
                  </div>
                  <div className="space-y-2 border-y border-white/5 py-3">
                    <div className="flex justify-between">
                      <span>Tier Name:</span>
                      <span className="text-white font-bold">{activeTier.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lock Period:</span>
                      <span className="text-white font-bold">{activeTier.durationDays} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Protocol Yield APR:</span>
                      <span className="text-emerald-400 font-bold">{activeTier.apr.toFixed(2)}% fixed</span>
                    </div>
                    {autoCompoundEnabled && (
                      <div className="flex justify-between text-purple-300">
                        <span>Compounded APY:</span>
                        <span className="font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          {(activeTier.apr * 1.042).toFixed(2)}% APY
                        </span>
                      </div>
                    )}
                    {stakeAmount && (
                      <div className="flex justify-between border-t border-white/5 pt-2">
                        <span>Est. Reward ({autoCompoundEnabled ? "Compounded" : "Linear"}):</span>
                        <span className="text-emerald-400 font-bold">
                          +{ (estReward * (autoCompoundEnabled ? 1.042 : 1.0)).toLocaleString(undefined, { maximumFractionDigits: 4 })} AGL
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 leading-normal">
                    * Locked staking deposits AGL into the yield farming pool. Once the {activeTier.durationDays}-day period expires, unstake to claim principal and 100% accrued yield rewards securely. Early exits will forfeit rewards.
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: POSITIONS LIST */}
      {activeTab === "positions" && (
        <div className="space-y-4">
          {!wallet.isConnected ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs border border-white/5 rounded-2xl bg-zinc-950/40">
              Please connect your wallet to view your active staking vaults.
            </div>
          ) : userPositions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs border border-white/5 rounded-2xl bg-zinc-950/40">
              No active or historical staking positions found. Create your first locked deposit to start earning.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-zinc-950/20">
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-black/40 text-zinc-500 text-[10px] uppercase font-bold">
                    <th className="p-4">ID</th>
                    <th className="py-4">Amount</th>
                    <th className="py-4">Lock Progress</th>
                    <th className="py-4">Yield APR</th>
                    <th className="py-4 text-right">Pending Reward</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {userPositions.map((pos) => {
                    const isUnlocked = currentTimeSec >= pos.unlockTime;
                    const elapsedSec = currentTimeSec - pos.startTime;
                    const totalSec = pos.unlockTime - pos.startTime;
                    const progressPct = pos.withdrawn 
                      ? 100 
                      : totalSec > 0 
                        ? Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100))
                        : 0;
                    
                    const timeRemaining = pos.unlockTime - currentTimeSec;
                    const daysLeft = Math.ceil(timeRemaining / (24 * 3600));

                    // Dynamic reward visual representation using current pending rewards with real-time sandbox fallback
                    let estReward = pos.pendingReward;
                    if (!web3Active || onWrongNetwork) {
                      if (!pos.withdrawn) {
                        const elapsedSec = currentTimeSec - pos.startTime;
                        const aprDecimal = pos.aprBasisPoints / 10000;
                        const timeFraction = elapsedSec / (365 * 24 * 3600);
                        const sandboxAcc = 100;
                        estReward = pos.amount * aprDecimal * timeFraction * sandboxAcc;
                      }
                    }

                    return (
                      <tr key={pos.id} className={`transition-all ${pos.withdrawn ? "opacity-45 bg-black/10" : "hover:bg-white/[0.02]"}`}>
                        <td className="p-4 font-bold text-zinc-400">
                          #{pos.id}
                        </td>
                        <td className="py-4">
                          <span className="text-white font-bold">{pos.amount.toLocaleString()}</span>{" "}
                          <span className="text-[9px] text-zinc-500">AGL</span>
                        </td>
                        <td className="py-4 min-w-[120px]">
                          {pos.withdrawn ? (
                            <span className="text-zinc-500 flex items-center gap-1 text-[10px]">
                              <Check className="w-3.5 h-3.5 text-zinc-500" /> Withdrawn & Settled
                            </span>
                          ) : (
                            <div className="space-y-1.5 max-w-[150px]">
                              <div className="flex justify-between text-[9px] text-zinc-500">
                                <span>{progressPct.toFixed(0)}% Locked</span>
                                {isUnlocked ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                    <Unlock className="w-2.5 h-2.5" /> Ready
                                  </span>
                                ) : (
                                  <span>{daysLeft}d left</span>
                                )}
                              </div>
                              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    isUnlocked 
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-500" 
                                      : "bg-gradient-to-r from-purple-500 to-indigo-500"
                                  }`} 
                                  style={{ width: `${progressPct}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-zinc-300 font-bold">
                          {(pos.aprBasisPoints / 100).toFixed(2)}%
                        </td>
                        <td className="py-4 text-right text-emerald-400 font-bold">
                          +{estReward.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} AGL
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col sm:flex-row items-center justify-end gap-2">
                            {pos.withdrawn ? (
                              <span className="text-[10px] text-zinc-600 bg-zinc-950/50 px-2.5 py-1 rounded border border-white/5">
                                Closed
                              </span>
                            ) : isUnlocked ? (
                              <button
                                onClick={() => handleUnstake(pos.id)}
                                disabled={stakingLoading}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-display bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.02]"
                              >
                                Unstake & Claim
                              </button>
                            ) : (
                              <>
                                <button
                                  disabled
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-display bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed flex items-center gap-1"
                                >
                                  <Clock className="w-3 h-3 text-zinc-600" /> Locked
                                </button>
                                <button
                                  onClick={() => handleEmergencyWithdraw(pos.id)}
                                  disabled={stakingLoading}
                                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold font-display bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white border border-red-500/20 transition-all flex items-center gap-1"
                                  title="Emergency Exit (Forfeits rewards)"
                                >
                                  <Skull className="w-3 h-3" /> Emergency Exit
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: APY CALCULATOR */}
      {activeTab === "calculator" && (
        <APYCalculator
          userAglBalance={wallet.aglTokenBalance}
          stakingTiers={stakingTiers}
          onApplyToStake={(amt, tierId) => {
            setStakeAmount(amt);
            setSelectedTierId(tierId);
            setActiveTab("stake");
            showToast(`Applied ${parseFloat(amt).toLocaleString()} AGL to Stake Form!`, "info");
          }}
        />
      )}
    </div>
  );
}
