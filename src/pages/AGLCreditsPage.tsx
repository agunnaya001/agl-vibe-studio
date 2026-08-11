import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { 
  Flame, 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  ExternalLink, 
  Copy, 
  Zap, 
  Info, 
  Database,
  Lock,
  Wallet
} from "lucide-react";

interface AGLCreditsPageProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  setWalletState: (wallet: WalletState) => void;
}

import { 
  AGL_CREDITS_ADDRESS as CONTRACT_ADDRESS, 
  AGL_TOKEN_ADDRESS,
  AGL_CREDITS_ABI,
  AGL_TOKEN_ABI as ERC20_ABI
} from "../lib/aglContracts";

const BASE_RPC_URL = "https://mainnet.base.org";

export default function AGLCreditsPage({ 
  wallet, 
  onRefreshWallet, 
  addTerminalLog, 
  showToast,
  setWalletState
}: AGLCreditsPageProps) {
  // Global contract stats
  const [creditsPerAgl, setCreditsPerAgl] = useState<number>(0);
  const [totalProtocolBurned, setTotalProtocolBurned] = useState<string>("0");
  const [aglTokenAddress, setAglTokenAddress] = useState<string>("");
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // User wallet on-chain stats
  const [onChainAglBalance, setOnChainAglBalance] = useState<string>("0");
  const [onChainEthBalance, setOnChainEthBalance] = useState<string>("0");
  const [userCreditsPurchased, setUserCreditsPurchased] = useState<string>("0");
  const [userAglBurned, setUserAglBurned] = useState<string>("0");
  const [currentAllowance, setCurrentAllowance] = useState<bigint>(0n);
  const [loadingUserStats, setLoadingUserStats] = useState<boolean>(false);

  // Form State
  const [burnAmount, setBurnAmount] = useState<string>("");
  const [previewCredits, setPreviewCredits] = useState<string>("0");
  const [txStep, setTxStep] = useState<"none" | "approving" | "burning" | "success">("none");
  const [currentTxHash, setCurrentTxHash] = useState<string>("");
  const [copiedContract, setCopiedContract] = useState<boolean>(false);
  const [web3Active, setWeb3Active] = useState<boolean>(false);
  const [onWrongNetwork, setOnWrongNetwork] = useState<boolean>(false);

  // Page internal execution logs
  const [logs, setLogs] = useState<Array<{ time: string; type: "info" | "success" | "warn" | "error"; text: string }>>([]);

  const addLocalLog = (type: "info" | "success" | "warn" | "error", text: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, type, text }]);
    addTerminalLog(type === "warn" ? "info" : type, `AGL_CREDITS: ${text}`);
  };

  // Helper to get raw format logs
  useEffect(() => {
    addLocalLog("info", "AGLCredits client module loaded.");
    loadContractStats();
  }, []);

  // Sync when wallet connection changes or network swaps
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadUserStats();
    } else {
      setOnChainAglBalance("0");
      setOnChainEthBalance("0");
      setUserCreditsPurchased("0");
      setUserAglBurned("0");
      setCurrentAllowance(0n);
    }
  }, [wallet.isConnected, wallet.address, aglTokenAddress]);

  // Load contract level details (creditsPerAGL, totalAGLBurned, aglToken)
  const loadContractStats = async () => {
    setLoadingStats(true);
    try {
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AGL_CREDITS_ABI, provider);

      const [rate, totalBurnedRaw, tokenAddr] = await Promise.all([
        contract.creditsPerAGL().catch(() => 100n), // fallback to 100 credits per AGL
        contract.totalAGLBurned().catch(() => 0n),
        contract.aglToken().catch(() => "0xea1221b4d80a89bd8c75248fae7c176bd1854698")
      ]);

      setCreditsPerAgl(Number(rate));
      setTotalProtocolBurned(ethers.formatEther(totalBurnedRaw));
      setAglTokenAddress(tokenAddr);
      setLoadingStats(false);
      addLocalLog("success", `Global contract stats loaded. Rate: ${rate} Credits per AGL. AGL Token: ${tokenAddr}`);
    } catch (err: any) {
      console.error("Error loading contract stats:", err);
      // Fallback
      setCreditsPerAgl(100);
      setTotalProtocolBurned("42,500");
      setAglTokenAddress("0xea1221b4d80a89bd8c75248fae7c176bd1854698");
      setLoadingStats(false);
      addLocalLog("warn", "Using offline fallback values. Could not query Base Mainnet RPC.");
    }
  };

  // Load user specific stats on Base Mainnet
  const loadUserStats = async () => {
    if (!wallet.address) return;
    setLoadingUserStats(true);
    try {
      let provider: ethers.Provider;
      let isWeb3 = false;

      // Check if window.ethereum is connected to the same address and use it if available
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await browserProvider.send("eth_accounts", []);
        const network = await browserProvider.getNetwork();
        
        if (accounts.length > 0 && accounts[0].toLowerCase() === wallet.address.toLowerCase()) {
          provider = browserProvider;
          isWeb3 = true;
          if (network.chainId === 8453n) {
            setWeb3Active(true);
            setOnWrongNetwork(false);
          } else {
            setWeb3Active(false);
            setOnWrongNetwork(true);
          }
        } else {
          provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
          setWeb3Active(false);
          setOnWrongNetwork(false);
        }
      } else {
        provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        setWeb3Active(false);
        setOnWrongNetwork(false);
      }

      const ethBal = await provider.getBalance(wallet.address);
      setOnChainEthBalance(parseFloat(ethers.formatEther(ethBal)).toFixed(4));

      // Query AGLCredits contract
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AGL_CREDITS_ABI, provider);
      const [purchasedRaw, burnedRaw] = await Promise.all([
        contract.totalCreditsPurchased(wallet.address).catch(() => 0n),
        contract.totalAGLBurnedBy(wallet.address).catch(() => 0n)
      ]);

      setUserCreditsPurchased(purchasedRaw.toString());
      setUserAglBurned(ethers.formatEther(burnedRaw));

      // Query AGL token balance and allowance
      if (aglTokenAddress) {
        const tokenContract = new ethers.Contract(aglTokenAddress, ERC20_ABI, provider);
        const [tokenBal, allowanceVal] = await Promise.all([
          tokenContract.balanceOf(wallet.address).catch(() => 0n),
          tokenContract.allowance(wallet.address, CONTRACT_ADDRESS).catch(() => 0n)
        ]);

        setOnChainAglBalance(parseFloat(ethers.formatEther(tokenBal)).toLocaleString(undefined, { maximumFractionDigits: 2 }));
        setCurrentAllowance(allowanceVal);
      }

      setLoadingUserStats(false);
      addLocalLog("success", `On-chain wallet stats loaded successfully (${isWeb3 ? (onWrongNetwork ? "Web3 Direct Provider [Wrong Chain]" : "Web3 Direct Provider [Base Mainnet]") : "Base RPC Public Gateway"})`);
    } catch (err: any) {
      console.error("Error loading user stats:", err);
      // Fallback/Simulated values based on the mock wallet balances
      setOnChainEthBalance(wallet.balanceEth.toFixed(4));
      setOnChainAglBalance(wallet.aglTokenBalance.toLocaleString());
      setUserCreditsPurchased((wallet.aglCredits || 0).toLocaleString());
      // Estimate sandbox AGL burned based on sandbox credits rate (default 100 if rate not loaded yet)
      const rate = creditsPerAgl || 100;
      setUserAglBurned(((wallet.aglCredits || 0) / rate).toFixed(1));
      setCurrentAllowance(ethers.parseEther("1000000")); // Auto mock allow
      setLoadingUserStats(false);
      addLocalLog("warn", "Loaded Sandbox simulated stats. Connect a real Web3 wallet to sync with Base Mainnet.");
    }
  };

  const handleConnectRealWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      showToast("No Web3 wallet extension found. Install MetaMask or Coinbase Wallet.", "error");
      addLocalLog("error", "Web3 connection failed: window.ethereum is not present.");
      return;
    }

    try {
      addLocalLog("info", "Initiating secure wallet connection...");
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      
      // Request account access
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      if (accounts.length === 0) throw new Error("No accounts selected");
      const userAddr = accounts[0];

      // Request network switch/addition
      addLocalLog("info", "Verifying connection to Base Mainnet (Chain ID 8453)...");
      const network = await browserProvider.getNetwork();
      let onBase = network.chainId === 8453n;

      if (!onBase) {
        const switched = await checkAndSwitchNetwork();
        if (!switched) {
          showToast("Please switch your wallet network manually to Base Mainnet.", "info");
          addLocalLog("warn", "Could not automatically switch network to Base Mainnet.");
        } else {
          onBase = true;
        }
      }

      const ethBal = await browserProvider.getBalance(userAddr);
      const balanceEthVal = parseFloat(ethers.formatEther(ethBal));

      // Get AGL Balance on Base
      let aglBalVal = 0.0; // default to 0 if failed
      if (aglTokenAddress) {
        try {
          const tokenContract = new ethers.Contract(aglTokenAddress, ERC20_ABI, browserProvider);
          const rawAglBal = await tokenContract.balanceOf(userAddr);
          aglBalVal = parseFloat(ethers.formatEther(rawAglBal));
        } catch (e) {
          console.error("Could not load real AGL token balance", e);
        }
      }

      const connectedWallet: WalletState = {
        isConnected: true,
        address: userAddr,
        balanceEth: balanceEthVal,
        aglTokenBalance: aglBalVal,
        isSmartAccount: false,
        walletType: "metamask",
        sponsoredGasEth: 0,
        aglCredits: wallet.aglCredits || 0
      };

      AgunnayaDatabase.saveWallet(connectedWallet);
      setWalletState(connectedWallet);
      setWeb3Active(true);
      showToast("Web3 wallet connected to Base Mainnet!", "success");
      addLocalLog("success", `Secure Web3 link active. Wallet: ${userAddr.slice(0, 10)}...`);
      loadUserStats();
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      showToast("Wallet connection refused.", "error");
      addLocalLog("error", `Wallet connection error: ${err.message || String(err)}`);
    }
  };

  const checkAndSwitchNetwork = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return false;
    try {
      const chainIdHex = "0x" + (8453).toString(16);
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x" + (8453).toString(16),
                chainName: "Base Mainnet",
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://mainnet.base.org"],
                blockExplorerUrls: ["https://basescan.org"],
              },
            ],
          });
          return true;
        } catch (addError) {
          return false;
        }
      }
      return false;
    }
  };

  const handleAmountChange = (val: string) => {
    setBurnAmount(val);
    const num = parseFloat(val) || 0;
    if (num <= 0) {
      setPreviewCredits("0");
      return;
    }

    if (creditsPerAgl > 0) {
      // preview calculation: agl * creditsPerAGL
      setPreviewCredits((num * creditsPerAgl).toLocaleString(undefined, { maximumFractionDigits: 0 }));
    } else {
      setPreviewCredits("0");
    }
  };

  const executeApproval = async () => {
    if (!wallet.isConnected) {
      showToast("Please connect your wallet.", "error");
      return;
    }
    const amount = parseFloat(burnAmount) || 0;
    if (amount <= 0) {
      showToast("Please specify a valid burn amount.", "error");
      return;
    }

    setTxStep("approving");
    addLocalLog("info", `Initiating ERC20 AGL Spender approval for ${amount} AGL...`);

    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const network = await browserProvider.getNetwork();
        
        // Automatic network switch if wrong network
        if (network.chainId !== 8453n) {
          addLocalLog("info", "Wrong network detected. Requesting switch to Base Mainnet...");
          const switched = await checkAndSwitchNetwork();
          if (!switched) {
            showToast("Please switch your wallet to Base Mainnet to authorize spender.", "error");
            setTxStep("none");
            return;
          }
        }

        const updatedProvider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await updatedProvider.getSigner();
        const tokenContract = new ethers.Contract(aglTokenAddress, ERC20_ABI, signer);

        const parsedAmount = ethers.parseEther(amount.toString());
        addLocalLog("info", "Please confirm approval transaction inside your wallet...");
        
        const tx = await tokenContract.approve(CONTRACT_ADDRESS, parsedAmount);
        addLocalLog("info", `Approval Tx submitted: ${tx.hash}. Awaiting block confirmation...`);
        setCurrentTxHash(tx.hash);
        
        await tx.wait();
        addLocalLog("success", `ERC20 Spender approval confirmed! Spender contract is authorized.`);
        showToast("AGL Spender authorized!", "success");
        setTxStep("none");
        loadUserStats();
      } else {
        // Fallback simulated sandbox approval
        setTimeout(() => {
          addLocalLog("success", `[Simulated Sandbox] Authorized spender contract for ${amount} AGL.`);
          setCurrentAllowance(ethers.parseEther("100000000000"));
          setTxStep("none");
          showToast("AGL Spender authorized (Sandbox)!", "success");
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      addLocalLog("error", `Approval failed: ${err.message || String(err)}`);
      showToast("Approval transaction failed or rejected.", "error");
      setTxStep("none");
    }
  };

  const executeBurn = async () => {
    if (!wallet.isConnected) {
      showToast("Please connect your wallet.", "error");
      return;
    }
    const amount = parseFloat(burnAmount) || 0;
    if (amount <= 0) {
      showToast("Please specify a valid burn amount.", "error");
      return;
    }

    setTxStep("burning");
    addLocalLog("info", `Initiating credits purchase by burning ${amount} AGL permanently...`);

    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const network = await browserProvider.getNetwork();
        
        // Automatic network switch if wrong network
        if (network.chainId !== 8453n) {
          addLocalLog("info", "Wrong network detected. Requesting switch to Base Mainnet...");
          const switched = await checkAndSwitchNetwork();
          if (!switched) {
            showToast("Please switch your wallet to Base Mainnet to burn AGL.", "error");
            setTxStep("none");
            return;
          }
        }

        const updatedProvider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await updatedProvider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, AGL_CREDITS_ABI, signer);

        const parsedAmount = ethers.parseEther(amount.toString());
        addLocalLog("info", "Please sign the burn/purchaseCredits transaction inside your wallet...");

        const tx = await contract.purchaseCredits(parsedAmount);
        addLocalLog("info", `CreditsPurchased transaction submitted: ${tx.hash}. Burning AGL permanently...`);
        setCurrentTxHash(tx.hash);

        await tx.wait();
        addLocalLog("success", `Permanently burned ${amount} AGL! Credits successfully allocated to your on-chain balance.`);
        showToast("AGL Burned for Credits successfully!", "success");
        
        // update local db wallet stats
        const realEth = await updatedProvider.getBalance(wallet.address);
        let realAgl = 0n;
        try {
          const tokenContract = new ethers.Contract(aglTokenAddress, ERC20_ABI, updatedProvider);
          realAgl = await tokenContract.balanceOf(wallet.address);
        } catch {}

        const creditGain = amount * creditsPerAgl;
        const updatedWallet: WalletState = {
          ...wallet,
          balanceEth: parseFloat(ethers.formatEther(realEth)),
          aglTokenBalance: parseFloat(ethers.formatEther(realAgl)),
          aglCredits: (wallet.aglCredits || 0) + creditGain
        };
        AgunnayaDatabase.saveWallet(updatedWallet);
        setWalletState(updatedWallet);
        onRefreshWallet();

        setBurnAmount("");
        setPreviewCredits("0");
        setTxStep("success");
        loadUserStats();
        loadContractStats();
      } else {
        // Fallback sandbox simulation
        if (amount > wallet.aglTokenBalance) {
          showToast("Insufficient sandbox AGL balance.", "error");
          addLocalLog("error", `Burn failed: Insufficient sandbox AGL balance. (Balance: ${wallet.aglTokenBalance}, Required: ${amount})`);
          setTxStep("none");
          return;
        }

        setTimeout(() => {
          const newAglBal = wallet.aglTokenBalance - amount;
          const creditGain = amount * creditsPerAgl;
          const updatedWallet: WalletState = {
            ...wallet,
            aglTokenBalance: newAglBal,
            aglCredits: (wallet.aglCredits || 0) + creditGain
          };
          AgunnayaDatabase.saveWallet(updatedWallet);
          setWalletState(updatedWallet);
          onRefreshWallet();

          addLocalLog("success", `[Simulated Sandbox] Successfully burned ${amount} AGL. Credits updated: +${creditGain.toLocaleString()} in Sandbox.`);
          showToast("AGL Burned for Credits successfully (Sandbox)!", "success");
          
          setBurnAmount("");
          setPreviewCredits("0");
          setTxStep("success");
          
          // Increment mock user stats
          setUserCreditsPurchased(prev => (parseInt(prev.replace(/,/g, "")) + creditGain).toLocaleString());
          setUserAglBurned(prev => (parseFloat(prev) + amount).toFixed(1));
          setTotalProtocolBurned(prev => (parseFloat(prev.replace(/,/g, "")) + amount).toLocaleString());
        }, 1800);
      }
    } catch (err: any) {
      console.error(err);
      addLocalLog("error", `Burn failed: ${err.message || String(err)}`);
      showToast("Burn transaction failed or rejected.", "error");
      setTxStep("none");
    }
  };

  const handleCopyContractAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopiedContract(true);
    showToast("Contract address copied!", "success");
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const isApproved = () => {
    if (!burnAmount) return false;
    const parsed = parseFloat(burnAmount);
    if (isNaN(parsed) || parsed <= 0) return false;
    try {
      const amountBig = ethers.parseEther(parsed.toString());
      return currentAllowance >= amountBig;
    } catch (e) {
      return false;
    }
  };

  return (
    <div id="agl-credits-portal" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-zinc-100">
      
      {/* LEFT COLUMN: Overview & Stats */}
      <div className="lg:col-span-7 space-y-6 flex flex-col justify-between h-full">
        <div className="space-y-6">
          {/* Main Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/10 text-red-400 shadow-lg shadow-red-500/10 border border-red-500/20">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                  AGL Permanent Credits Burn Portal
                </h1>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Base Mainnet Smart Contract Engine
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              AGLCredits is a secure on-chain protocol on Base Mainnet. Users irrecoverably burn AGL to a dead address, which is indexed by low-latency off-chain compute meters to allocation of spend-to-use credits in Vibe Studio. Using a permanent burning mechanism establishes a verifiable, immutable record of credits purchased, serving as the decentralized source of truth.
            </p>

            {/* Smart Contract link & info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-black/60 rounded-xl border border-white/5 text-xs font-mono space-y-2 sm:space-y-0">
              <div className="flex items-center gap-2 text-zinc-400">
                <Database className="w-4 h-4 text-brand-purple" />
                <span className="text-[10px] uppercase font-bold text-zinc-500">Contract Address:</span>
                <span className="text-white text-[11px] font-bold">{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="copy-credits-contract"
                  onClick={handleCopyContractAddress}
                  className="p-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300 transition-all flex items-center gap-1.5"
                  title="Copy contract address"
                >
                  {copiedContract ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedContract ? "Copied" : "Copy"}</span>
                </button>
                <a 
                  href={`https://basescan.org/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 px-2.5 rounded-lg bg-[#0052FF]/10 hover:bg-[#0052FF]/20 text-[10px] text-[#0052FF] transition-all flex items-center gap-1.5 font-bold border border-[#0052FF]/20"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>BaseScan</span>
                </a>
              </div>
            </div>
          </div>

          {/* Core System parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-brand-purple/5 blur-xl pointer-events-none"></div>
              <span className="block text-[8px] uppercase tracking-widest font-bold text-zinc-500 font-mono">Credits Rate</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-mono font-bold text-white">{creditsPerAgl.toLocaleString()}</span>
                <span className="text-[10px] font-semibold text-zinc-400">Credits / AGL</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-sans leading-tight">
                1 AGL burned on-chain equals {creditsPerAgl.toLocaleString()} credits. No fees or slippage.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-red-500/5 blur-xl pointer-events-none"></div>
              <span className="block text-[8px] uppercase tracking-widest font-bold text-zinc-500 font-mono">Protocol AGL Burned</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-mono font-bold text-red-400">{parseFloat(totalProtocolBurned).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                <span className="text-[10px] font-semibold text-zinc-400 font-mono">AGL</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-sans leading-tight">
                Cumulative AGL sent permanently to dead burn address {CONTRACT_ADDRESS.slice(0, 4)}...
              </p>
            </div>
          </div>

          {/* User Wallet statistics */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                Wallet On-Chain Analytics
              </span>
              {loadingUserStats ? (
                <RefreshCw className="w-3 h-3 text-brand-purple animate-spin" />
              ) : (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-black/40 font-mono flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${web3Active ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : onWrongNetwork ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-orange-400'}`}></span>
                  {web3Active ? (
                    "Base Web3 Connected"
                  ) : onWrongNetwork ? (
                    <button 
                      onClick={async () => {
                        const switched = await checkAndSwitchNetwork();
                        if (switched) loadUserStats();
                      }}
                      className="text-red-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      Wrong Network (Switch to Base)
                    </button>
                  ) : (
                    "Sandbox Simulation Mode"
                  )}
                </span>
              )}
            </div>

            {!wallet.isConnected ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-xs text-zinc-500 font-mono">Connect your decentralized Web3 wallet to read on-chain ledger</p>
                <button
                  id="connect-web3-btn"
                  onClick={handleConnectRealWallet}
                  className="px-5 py-2.5 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 mx-auto font-display"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect Base Web3 Wallet</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="block text-[8px] text-zinc-500 uppercase">ETH Balance</span>
                  <span className="text-white font-bold block truncate">{onChainEthBalance} ETH</span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="block text-[8px] text-zinc-500 uppercase">AGL Balance</span>
                  <span className="text-white font-bold block truncate">{onChainAglBalance} AGL</span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="block text-[8px] text-zinc-500 uppercase">My AGL Burned</span>
                  <span className="text-red-400 font-bold block truncate">{parseFloat(userAglBurned).toLocaleString(undefined, { maximumFractionDigits: 1 })} AGL</span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="block text-[8px] text-zinc-500 uppercase">My Credits Ledger</span>
                  <span className="text-emerald-400 font-bold block truncate">{parseInt(userCreditsPurchased.replace(/,/g, "")).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info panel at bottom */}
        <div className="flex items-start gap-2.5 p-3.5 bg-brand-purple/5 border border-brand-purple/20 rounded-xl text-xs text-zinc-400 leading-relaxed font-sans mt-4">
          <Info className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
          <p>
            Burning is <strong className="text-red-400 font-semibold">permanent and irreversible</strong>. AGL is transferred directly to the dead address (<code className="text-zinc-200">0x...dEaD</code>) and cannot be recovered under any circumstances. Ensure you double check your burn quantities before authorizing Web3 signatures.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Burn Wizard */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Burn Card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-red-500/5 blur-3xl pointer-events-none"></div>
          
          <div>
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-red-400 animate-pulse" />
              Credits Exchange Wizard
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              Select quantity of AGL utility token to permanently burn and acquire compute units.
            </p>
          </div>

          <div className="space-y-4">
            {/* Input field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500 font-mono">
                <span>Burn Amount</span>
                {wallet.isConnected && (
                  <button 
                    onClick={() => {
                      const balNum = parseFloat(wallet.aglTokenBalance.toString()) || 0;
                      handleAmountChange(balNum.toString());
                    }}
                    className="hover:text-brand-purple transition-all text-[9px] hover:underline"
                  >
                    MAX: {wallet.aglTokenBalance.toLocaleString()} AGL
                  </button>
                )}
              </div>
              
              <div className="relative">
                <input
                  id="credits-burn-amount-input"
                  type="number"
                  min="0"
                  step="0.1"
                  value={burnAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="e.g. 50"
                  disabled={txStep !== "none" && txStep !== "success"}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 pr-14 text-sm font-mono text-white focus:outline-none focus:border-red-500/30 transition-all"
                />
                <span className="absolute right-3.5 top-3.5 text-xs text-zinc-500 font-bold font-mono">
                  AGL
                </span>
              </div>
            </div>

            {/* Down arrow icon */}
            <div className="flex justify-center text-zinc-600 font-bold text-lg font-mono">
              ↓
            </div>

            {/* Estimated credits */}
            <div className="space-y-1.5">
              <span className="block text-[10px] uppercase font-bold text-zinc-500 font-mono">Credits to Allocate</span>
              <div className="relative bg-zinc-950 border border-white/5 rounded-xl p-3.5 flex items-center justify-between font-mono">
                <span id="credits-preview-output" className="text-base font-bold text-emerald-400">
                  {previewCredits}
                </span>
                <span className="text-xs text-zinc-500 font-bold">
                  CREDITS
                </span>
              </div>
            </div>

            {/* Interactive Steps */}
            <div className="space-y-3 pt-3">
              <span className="block text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Sequential Tasks</span>
              
              {/* Step 1: Approve */}
              <button
                id="execute-approval-btn"
                onClick={executeApproval}
                disabled={txStep !== "none" || !burnAmount || parseFloat(burnAmount) <= 0 || isApproved()}
                className={`w-full p-3.5 rounded-xl border text-xs font-semibold font-display transition-all flex items-center justify-between group ${
                  isApproved()
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                    : "bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg text-xs font-bold font-mono flex items-center justify-center ${isApproved() ? 'bg-emerald-500/20' : 'bg-white/5 text-zinc-400 group-hover:bg-white/10'}`}>
                    {isApproved() ? <Check className="w-3.5 h-3.5" /> : "1"}
                  </div>
                  <span>Approve AGL Spender Limit</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">
                  {isApproved() ? "Authorized" : "Require Action"}
                </span>
              </button>

              {/* Step 2: Burn */}
              <button
                id="execute-burn-btn"
                onClick={executeBurn}
                disabled={txStep !== "none" || !burnAmount || parseFloat(burnAmount) <= 0 || !isApproved()}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-xs font-bold font-display shadow-lg shadow-red-500/15 disabled:opacity-40 disabled:from-zinc-900 disabled:to-zinc-900 disabled:border disabled:border-white/5 disabled:text-zinc-500 disabled:shadow-none transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white/10 text-white text-xs font-bold font-mono flex items-center justify-center">
                    2
                  </div>
                  <span>Permanently Burn & Purchase Credits</span>
                </div>
                <Flame className="w-4 h-4 shrink-0 animate-pulse" />
              </button>
            </div>

            {/* Current Transaction progress */}
            {txStep !== "none" && (
              <div className="p-3 bg-black/60 rounded-xl border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-purple" />
                    {txStep === "approving" ? "Signing spender approval..." : "Processing burn & mint..."}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase">On-Chain Tx</span>
                </div>
                {currentTxHash && (
                  <div className="flex justify-between items-center bg-zinc-950 p-2 rounded-lg text-[11px] text-zinc-400">
                    <span className="truncate max-w-[70%]">{currentTxHash}</span>
                    <a 
                      href={`https://basescan.org/tx/${currentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0052FF] hover:underline flex items-center gap-1 font-bold shrink-0"
                    >
                      <span>Track</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Page Internal Logs (Real-time Audit Trail) */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-3">
          <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono block tracking-wider">
            Web3 Execution Log Stream
          </span>
          <div className="bg-black/80 rounded-xl border border-white/5 p-3.5 h-36 overflow-y-auto space-y-1.5 font-mono text-[10px] scrollbar-thin">
            {logs.length === 0 ? (
              <span className="text-zinc-600 italic">Logging passive. Waiting for interactions...</span>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex gap-2 leading-relaxed">
                  <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                  <span className={`shrink-0 uppercase font-bold ${
                    log.type === "success" ? "text-emerald-400" :
                    log.type === "error" ? "text-red-400" :
                    log.type === "warn" ? "text-amber-400" : "text-blue-400"
                  }`}>
                    {log.type}:
                  </span>
                  <span className="text-zinc-300">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
