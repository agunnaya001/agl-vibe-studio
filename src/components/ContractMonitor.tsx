import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { 
  Activity, 
  Radio, 
  ShieldCheck, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap, 
  Clock, 
  Coins, 
  Pause, 
  Play, 
  Database, 
  Cpu, 
  User, 
  Hash, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { 
  TOKEN_FACTORY_ADDRESS, 
  TOKEN_FACTORY_ABI, 
  BASE_MAINNET_RPC,
  getBaseProvider,
  fetchContractOwner,
  fetchOnChainTokenCount,
  fetchOnChainTokens
} from "../lib/tokenFactory";

interface ContractMonitorProps {
  contractAddress?: string;
  onSelectToken?: (address: string) => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

interface ActivityEvent {
  id: string;
  type: "block" | "TokenCreated" | "ContractCall";
  title: string;
  detail: string;
  blockNumber?: number;
  txHash?: string;
  tokenAddress?: string;
  creatorAddress?: string;
  timestamp: string;
}

export default function ContractMonitor({
  contractAddress = TOKEN_FACTORY_ADDRESS,
  onSelectToken,
  showToast
}: ContractMonitorProps) {
  const [isLive, setIsLive] = useState(true);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string>("Loading...");
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [totalTokensList, setTotalTokensList] = useState<string[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityEvent[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [blockPulse, setBlockPulse] = useState(false);
  const [gasPriceGwei, setGasPriceGwei] = useState<string | null>(null);

  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const contractRef = useRef<ethers.Contract | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [key]: false }));
    }, 2000);
    if (showToast) {
      showToast("Address copied to clipboard", "info");
    }
  };

  // Initial data loading & provider subscription setup
  useEffect(() => {
    let mounted = true;

    async function initContractData() {
      setIsInitializing(true);
      try {
        const provider = getBaseProvider(BASE_MAINNET_RPC);
        providerRef.current = provider;

        const contract = new ethers.Contract(contractAddress, TOKEN_FACTORY_ABI, provider);
        contractRef.current = contract;

        // Fetch Initial On-Chain State
        const [ownerRes, countRes, tokensRes, currentBlock, feeData] = await Promise.all([
          fetchContractOwner().catch(() => contractAddress),
          fetchOnChainTokenCount().catch(() => 0),
          fetchOnChainTokens().catch(() => []),
          provider.getBlockNumber().catch(() => null),
          provider.getFeeData().catch(() => null)
        ]);

        if (!mounted) return;

        setOwnerAddress(ownerRes || contractAddress);
        setTokenCount(countRes);
        setTotalTokensList(tokensRes);
        setLatestBlock(currentBlock);

        if (feeData && feeData.gasPrice) {
          const gwei = ethers.formatUnits(feeData.gasPrice, "gwei");
          setGasPriceGwei(parseFloat(gwei).toFixed(3));
        }

        // Add initial system boot log
        const now = new Date().toLocaleTimeString();
        setActivityLogs([
          {
            id: "init-1",
            type: "ContractCall",
            title: "Ethers.js Listener Connected",
            detail: `Monitoring contract ${contractAddress.slice(0, 8)}... on Base Mainnet (Chain 8453)`,
            blockNumber: currentBlock || undefined,
            timestamp: now
          },
          ...(tokensRes.length > 0
            ? [{
                id: "init-2",
                type: "ContractCall" as const,
                title: "On-Chain Registry Synchronized",
                detail: `Loaded ${tokensRes.length} deployed ERC20 tokens from Factory contract`,
                timestamp: now
              }]
            : [])
        ]);

        // Attach Real-Time Ethers.js Provider Listeners if Live is active
        if (isLive) {
          attachListeners(provider, contract);
        }
      } catch (err) {
        console.warn("Contract Monitor init warning:", err);
      } finally {
        if (mounted) setIsInitializing(false);
      }
    }

    initContractData();

    return () => {
      mounted = false;
      detachListeners();
    };
  }, [contractAddress]);

  // Handle attaching/detaching provider & contract listeners when toggling live switch
  const attachListeners = (provider: ethers.JsonRpcProvider, contract: ethers.Contract) => {
    detachListeners(); // prevent duplicates

    // 1. Provider Listener for incoming new Base blocks
    provider.on("block", async (blockNumber: number) => {
      setLatestBlock(blockNumber);
      setBlockPulse(true);
      setTimeout(() => setBlockPulse(false), 800);

      const timestampStr = new Date().toLocaleTimeString();

      // Fetch fee data periodically
      try {
        const feeData = await provider.getFeeData();
        if (feeData && feeData.gasPrice) {
          const gwei = ethers.formatUnits(feeData.gasPrice, "gwei");
          setGasPriceGwei(parseFloat(gwei).toFixed(3));
        }
      } catch (e) {
        // ignore fee error
      }

      setActivityLogs((prev) => [
        {
          id: `block-${blockNumber}-${Date.now()}`,
          type: "block",
          title: `New Base Block #${blockNumber}`,
          detail: `Block mined on Base Mainnet. Provider listener synced.`,
          blockNumber,
          timestamp: timestampStr
        },
        ...prev.slice(0, 49) // Keep last 50 activity logs
      ]);
    });

    // 2. Contract Event Listener for "TokenCreated"
    contract.on("TokenCreated", (token: string, creator: string, name: string, symbol: string, event: any) => {
      const timestampStr = new Date().toLocaleTimeString();
      const txHash = event?.log?.transactionHash || event?.transactionHash || "";
      const bNum = event?.log?.blockNumber || event?.blockNumber;

      setTokenCount((c) => (c !== null ? c + 1 : 1));
      setTotalTokensList((prev) => (prev.includes(token) ? prev : [token, ...prev]));

      setActivityLogs((prev) => [
        {
          id: `token-${token}-${Date.now()}`,
          type: "TokenCreated",
          title: `Token Deployed: ${name} (${symbol})`,
          detail: `New ERC20 deployed at ${token.slice(0, 10)}... by creator ${creator.slice(0, 8)}...`,
          blockNumber: bNum,
          txHash,
          tokenAddress: token,
          creatorAddress: creator,
          timestamp: timestampStr
        },
        ...prev.slice(0, 49)
      ]);

      if (showToast) {
        showToast(`Real-Time Event: New token ${name} (${symbol}) deployed!`, "success");
      }
    });
  };

  const detachListeners = () => {
    if (providerRef.current) {
      providerRef.current.removeAllListeners();
    }
    if (contractRef.current) {
      contractRef.current.removeAllListeners();
    }
  };

  const toggleLiveStatus = () => {
    if (isLive) {
      detachListeners();
      setIsLive(false);
      if (showToast) showToast("Contract monitor listener paused.", "info");
    } else {
      if (providerRef.current && contractRef.current) {
        attachListeners(providerRef.current, contractRef.current);
      }
      setIsLive(true);
      if (showToast) showToast("Contract monitor listener activated.", "success");
    }
  };

  const handleManualRefresh = async () => {
    setIsInitializing(true);
    try {
      if (providerRef.current) {
        const [cBlock, count, tokens, owner] = await Promise.all([
          providerRef.current.getBlockNumber(),
          fetchOnChainTokenCount(),
          fetchOnChainTokens(),
          fetchContractOwner()
        ]);
        setLatestBlock(cBlock);
        setTokenCount(count);
        setTotalTokensList(tokens);
        setOwnerAddress(owner);
        if (showToast) showToast("Refreshed contract on-chain state", "success");
      }
    } catch (err) {
      console.warn("Manual refresh warning:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl border border-[#0052FF]/30 bg-gradient-to-br from-zinc-950 via-zinc-950 to-blue-950/20 space-y-6 shadow-2xl relative overflow-hidden">
      {/* BACKGROUND DECORATIVE GLOW */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#0052FF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#0052FF]/20 text-[#0052FF] border border-[#0052FF]/30 relative">
            <Radio className={`w-6 h-6 ${isLive ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`} />
            {isLive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-display text-white">Base Mainnet Contract Monitor</h2>
              <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border flex items-center gap-1.5 ${
                isLive 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isLive ? "LIVE RPC Stream" : "Stream Paused"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
              <span>Target Contract:</span>
              <code className="text-blue-300 font-mono text-[11px] bg-zinc-900 px-2 py-0.5 rounded border border-white/10 select-all">
                {contractAddress}
              </code>
              <button
                onClick={() => copyToClipboard(contractAddress, "monitor_contract")}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                title="Copy Contract Address"
              >
                {copiedMap["monitor_contract"] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLiveStatus}
            className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold border flex items-center gap-2 transition-all ${
              isLive
                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            }`}
          >
            {isLive ? (
              <>
                <Pause className="w-4 h-4 text-amber-400" />
                <span>Pause Listener</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Resume Live Listener</span>
              </>
            )}
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isInitializing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all disabled:opacity-50"
            title="Refresh On-Chain State"
          >
            <RefreshCw className={`w-4 h-4 ${isInitializing ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <a
            href={`https://basescan.org/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-[#0052FF]/20 hover:bg-[#0052FF]/30 text-blue-300 border border-[#0052FF]/30 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            BaseScan
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* METRICS DASHBOARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* STAT 1: CONTRACT OWNER */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <User className="w-4 h-4 text-purple-400" />
              Contract Owner
            </span>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Verified
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-xs text-white font-bold truncate max-w-[170px]" title={ownerAddress}>
                {ownerAddress.slice(0, 10)}...{ownerAddress.slice(-6)}
              </span>
              <button
                onClick={() => copyToClipboard(ownerAddress, "owner_address")}
                className="p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors"
              >
                {copiedMap["owner_address"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <a
              href={`https://basescan.org/address/${ownerAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-blue-400 hover:underline flex items-center gap-1"
            >
              View Owner on BaseScan
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* STAT 2: TOTAL TOKENS CREATED */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <Coins className="w-4 h-4 text-amber-400" />
              Total Factory Tokens
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              getTokenCount()
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {tokenCount !== null ? tokenCount : "..."}
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {totalTokensList.length} in Registry
            </span>
          </div>
        </div>

        {/* STAT 3: LATEST BASE BLOCK */}
        <div className={`p-4 rounded-2xl bg-zinc-900/80 border transition-all space-y-2 ${
          blockPulse ? "border-emerald-500 shadow-lg shadow-emerald-500/10" : "border-white/10"
        }`}>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <Database className="w-4 h-4 text-emerald-400" />
              Latest Base Block
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${blockPulse ? "animate-ping" : ""}`} />
              Base Mainnet
            </span>
          </div>
          <div className="flex items-baseline justify-between font-mono">
            <span className="text-2xl font-bold text-white">
              {latestBlock !== null ? `#${latestBlock.toLocaleString()}` : "Syncing..."}
            </span>
            {gasPriceGwei && (
              <span className="text-[11px] text-zinc-400 font-bold">
                {gasPriceGwei} Gwei
              </span>
            )}
          </div>
        </div>

        {/* STAT 4: NETWORK & SPEED */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <Cpu className="w-4 h-4 text-blue-400" />
              Ethers.js Listener
            </span>
            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Chain 8453
            </span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">RPC Provider:</span>
              <span className="text-blue-300 font-bold">mainnet.base.org</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Block Time:</span>
              <span className="text-emerald-400 font-bold">~2.0s</span>
            </div>
          </div>
        </div>
      </div>

      {/* REAL-TIME TRANSACTION & EVENT ACTIVITY STREAM */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 text-white font-bold font-display text-sm">
            <Activity className="w-4 h-4 text-[#0052FF]" />
            <span>Real-Time Contract Event Stream ({activityLogs.length})</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Block Header
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> TokenCreated Event
            </span>
          </div>
        </div>

        {/* LOG FEED CONTAINER */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs custom-scrollbar">
          {activityLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs bg-zinc-900/40 rounded-2xl border border-white/5">
              Listening for new block headers and TokenCreated events on Base Mainnet...
            </div>
          ) : (
            activityLogs.map((log) => {
              const isTokenEvent = log.type === "TokenCreated";
              const isBlock = log.type === "block";

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isTokenEvent
                      ? "bg-emerald-950/30 border-emerald-500/30 shadow-md shadow-emerald-950/20"
                      : isBlock
                      ? "bg-zinc-900/90 border-white/5"
                      : "bg-blue-950/20 border-blue-500/20"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      isTokenEvent
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isBlock
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}>
                      {isTokenEvent ? (
                        <Coins className="w-4 h-4" />
                      ) : isBlock ? (
                        <Hash className="w-4 h-4" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">{log.title}</span>
                        {log.blockNumber && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 text-[10px]">
                            Block #{log.blockNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{log.detail}</p>

                      {log.tokenAddress && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 select-all">
                            {log.tokenAddress}
                          </span>
                          {onSelectToken && (
                            <button
                              onClick={() => onSelectToken(log.tokenAddress!)}
                              className="text-[10px] text-blue-400 hover:underline font-bold"
                            >
                              [Select in Factory]
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {log.timestamp}
                    </span>

                    {log.txHash && (
                      <a
                        href={`https://basescan.org/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        Tx
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
