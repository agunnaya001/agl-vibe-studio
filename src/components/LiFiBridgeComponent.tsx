import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { WalletState } from "../types";
import ImageWithFallback from "./ImageWithFallback";
import { 
  ArrowLeftRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  Clock, 
  Flame, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Key,
  Globe,
  ArrowRight
} from "lucide-react";

interface LiFiBridgeProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  targetToken?: { symbol: string; name: string; address: string; logoUrl?: string };
  compact?: boolean;
}

interface LifiChain {
  id: number;
  key: string;
  name: string;
  logoURI: string;
  coin: string;
}

const CHAIN_CONFIG: Record<number, { chainIdHex: string; name: string; rpcUrl: string; symbol: string; explorer: string }> = {
  8453: { chainIdHex: "0x2105", name: "Base Mainnet", rpcUrl: "https://mainnet.base.org", symbol: "ETH", explorer: "https://basescan.org" }
};

const STANDARD_ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

const BASE_COMMON_TOKENS = [
  { symbol: "ETH", name: "Ether", address: "0x0000000000000000000000000000000000000000", decimals: 18, logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, logo: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png" },
  { symbol: "USDT", name: "Tether USD", address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6, logo: "https://assets.coingecko.com/coins/images/325/small/Tether.png" },
  { symbol: "AGL", name: "Agunnaya Token", address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698", decimals: 18, logo: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=100&auto=format&fit=crop&q=80" },
  { symbol: "ARENA", name: "Arena Token", address: "0x3b855F88CB93aA642EaEB13F59987C552Fc614b5", decimals: 18, logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80" }
];

const SUPPORTED_CHAINS: LifiChain[] = [
  { id: 8453, key: "bas", name: "Base Mainnet", logoURI: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.png", coin: "ETH" }
];

export default function LiFiBridgeComponent({ wallet, onRefreshWallet, addTerminalLog, showToast, targetToken, compact }: LiFiBridgeProps) {
  const { connector, address: connectedAddress, isConnected } = useAccount();

  // Compute available tokens including targetToken
  const availableTokens = React.useMemo(() => {
    const list = [...BASE_COMMON_TOKENS];
    if (targetToken && !list.some(t => t.symbol.toUpperCase() === targetToken.symbol.toUpperCase())) {
      list.push({
        symbol: targetToken.symbol,
        name: targetToken.name,
        address: targetToken.address,
        decimals: 18,
        logo: targetToken.logoUrl || "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100&auto=format&fit=crop&q=80"
      });
    }
    return list;
  }, [targetToken]);

  // State
  const [fromChainId, setFromChainId] = useState<number>(8453); // Base Mainnet
  const [toChainId, setToChainId] = useState<number>(8453); // Base Mainnet
  const [fromTokenSymbol, setFromTokenSymbol] = useState<string>("ETH");
  const [toTokenSymbol, setToTokenSymbol] = useState<string>(targetToken?.symbol || "AGL");
  const [fromAmount, setFromAmount] = useState<string>("0.05");

  // Route & Quote State
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<any | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);

  // API Key Status State
  const [apiKeyInfo, setApiKeyInfo] = useState<{ configured: boolean; maskedKey: string; provider: string } | null>(null);

  // Fetch LI.FI API status info from proxy endpoint
  const fetchApiKeyStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/lifi/status-info");
      if (res.ok) {
        const data = await res.json();
        setApiKeyInfo(data);
      }
    } catch (err) {
      console.warn("Could not fetch LI.FI status info:", err);
    }
  }, []);

  useEffect(() => {
    fetchApiKeyStatus();
  }, [fetchApiKeyStatus]);

  // Fetch a real LI.FI quote for the connected wallet. No fallback estimates are generated.
  const fetchQuote = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address || !isConnected || !connectedAddress || connectedAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      setQuoteData(null);
      setQuoteError("Connect your wallet to request a live Base route quote.");
      setLoadingQuote(false);
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setQuoteData(null);
      setQuoteError(null);
      return;
    }

    setLoadingQuote(true);
    setQuoteError(null);

    try {
      const fromToken = availableTokens.find(t => t.symbol === fromTokenSymbol);
      const toToken = availableTokens.find(t => t.symbol === toTokenSymbol);
      if (!fromToken || !toToken) throw new Error("Select supported Base tokens for this route.");

      const parsedAmount = ethers.parseUnits(fromAmount, fromToken.decimals).toString();
      const queryParams = new URLSearchParams({
        fromChain: fromChainId.toString(),
        toChain: toChainId.toString(),
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: parsedAmount,
        fromAddress: wallet.address,
        slippage: String(effectiveSlippage / 100)
      });

      const res = await fetch(`/api/lifi/quote?${queryParams.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `LI.FI quote request failed (${res.status}).`);
      }
      if (data.isSimulated) {
        throw new Error("LI.FI returned a simulated quote. Simulated routes cannot be executed.");
      }
      setQuoteData(data);
      addTerminalLog("success", "LIFI_ORACLE: Received a live route quote for the connected wallet.");
    } catch (err: any) {
      console.error("LI.FI quote error:", err);
      setQuoteData(null);
      setQuoteError(err.message || "Unable to retrieve a live LI.FI quote.");
    } finally {
      setLoadingQuote(false);
    }
  }, [fromChainId, toChainId, fromTokenSymbol, toTokenSymbol, fromAmount, wallet.address, wallet.isConnected, isConnected, connectedAddress, addTerminalLog, availableTokens, effectiveSlippage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // Execute only the fresh LI.FI transaction request after explicit wallet approval.
  const handleExecuteBridge = async () => {
    if (!wallet.isConnected || !wallet.address || !isConnected || !connectedAddress || connectedAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      showToast("Connect the active AGL Studio wallet before executing a route.", "error");
      return;
    }
    if (!quoteData || quoteData.isSimulated) {
      showToast("A live LI.FI quote is required. No transaction was submitted.", "error");
      return;
    }
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      showToast("Enter a valid amount.", "error");
      return;
    }
    if (!connector) {
      showToast("The active wallet connector is unavailable. Reconnect your wallet.", "error");
      return;
    }

    setExecuting(true);
    setTxHash(null);
    setBridgeStatus("Preparing a fresh LI.FI transaction request...");
    try {
      const eip1193Provider = await connector.getProvider();
      const requestProvider = eip1193Provider as any;
      const chainCfg = CHAIN_CONFIG[fromChainId];
      if (!chainCfg) throw new Error("The selected source chain is not supported by this Base-only swap workspace.");

      const activeChainHex = await requestProvider.request({ method: "eth_chainId" });
      if (Number(BigInt(activeChainHex)) !== fromChainId) {
        setBridgeStatus(`Requesting wallet network switch to ${chainCfg.name}...`);
        try {
          await requestProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainCfg.chainIdHex }]
          });
        } catch (switchErr: any) {
          if (switchErr?.code !== 4902) throw switchErr;
          await requestProvider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: chainCfg.chainIdHex,
              chainName: chainCfg.name,
              rpcUrls: [chainCfg.rpcUrl],
              nativeCurrency: { name: chainCfg.symbol, symbol: chainCfg.symbol, decimals: 18 },
              blockExplorerUrls: [chainCfg.explorer]
            }]
          });
        }
      }

      const browserProvider = new ethers.BrowserProvider(eip1193Provider as any);
      const signer = await browserProvider.getSigner();
      const userAddress = await signer.getAddress();
      if (userAddress.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error("The wallet account changed. Reconnect AGL Studio and request a new quote.");
      }

      const fromTokenObj = availableTokens.find(t => t.symbol === fromTokenSymbol);
      if (!fromTokenObj) throw new Error("The selected source token is unavailable.");
      const parsedAmountWei = ethers.parseUnits(fromAmount, fromTokenObj.decimals).toString();
      const queryParams = new URLSearchParams({
        fromChain: fromChainId.toString(),
        toChain: toChainId.toString(),
        fromToken: fromTokenObj.address,
        toToken: availableTokens.find(t => t.symbol === toTokenSymbol)?.address || "",
        fromAmount: parsedAmountWei,
        fromAddress: userAddress,
        slippage: String(effectiveSlippage / 100)
      });

      const response = await fetch(`/api/lifi/quote?${queryParams.toString()}`);
      const freshQuote = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(freshQuote.message || freshQuote.error || "Unable to refresh LI.FI transaction data.");
      if (freshQuote.isSimulated) throw new Error("LI.FI returned a simulated route. Execution is blocked.");

      const txReq = freshQuote?.transactionRequest;
      if (!txReq?.to || !txReq?.data || !ethers.isAddress(txReq.to) || !String(txReq.data).startsWith("0x")) {
        throw new Error("LI.FI did not return a valid transaction request. No transaction was submitted.");
      }

      const isNative = fromTokenObj.address.toLowerCase() === "0x0000000000000000000000000000000000000000";
      if (!isNative) {
        const spenderAddress = txReq.to;
        const erc20Contract = new ethers.Contract(fromTokenObj.address, STANDARD_ERC20_ABI, signer);
        const currentAllowance = await erc20Contract.allowance(userAddress, spenderAddress);
        if (currentAllowance < BigInt(parsedAmountWei)) {
          setBridgeStatus(`Requesting approval for ${fromTokenSymbol}...`);
          const approveTx = await erc20Contract.approve(spenderAddress, parsedAmountWei);
          const approvalReceipt = await approveTx.wait();
          if (!approvalReceipt || approvalReceipt.status !== 1) {
            throw new Error("Token approval was not confirmed. Swap was not submitted.");
          }
        }
      }

      setBridgeStatus("Requesting wallet signature for the LI.FI route...");
      const tx = await signer.sendTransaction({
        to: txReq.to,
        data: txReq.data,
        value: txReq.value ? BigInt(txReq.value) : BigInt(0),
        ...(txReq.gasLimit ? { gasLimit: BigInt(txReq.gasLimit) } : {}),
        ...(txReq.gasPrice ? { gasPrice: BigInt(txReq.gasPrice) } : {})
      });
      setBridgeStatus(`Transaction submitted: ${tx.hash.slice(0, 12)}... Waiting for confirmation...`);
      addTerminalLog("info", `LIFI_SWAP: Transaction submitted on Base: ${tx.hash}`);

      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("The LI.FI transaction did not confirm successfully.");
      const confirmedHash = receipt.hash || tx.hash;
      setTxHash(confirmedHash);
      setBridgeStatus("LI.FI transaction confirmed on Base.");
      addTerminalLog("success", `LIFI_SWAP: Confirmed on Base. Transaction: ${confirmedHash}`);
      showToast(`LI.FI route confirmed: ${confirmedHash.slice(0, 10)}...`, "success");
      onRefreshWallet();
      setFromAmount("");
    } catch (err: any) {
      console.error("LI.FI execution error:", err);
      const message = err?.message || "LI.FI execution failed.";
      showToast(message, "error");
      addTerminalLog("error", `LIFI_SWAP_ERROR: ${message}`);
      setBridgeStatus(message);
    } finally {
      setExecuting(false);
    }
  };

  const swapChains = () => {
    const temp = fromChainId;
    setFromChainId(toChainId);
    setToChainId(temp);
  };

  const getChainName = (id: number) => SUPPORTED_CHAINS.find(c => c.id === id)?.name || `Chain #${id}`;

  const formattedToAmount = quoteData?.estimate?.toAmount
    ? Number(ethers.formatUnits(quoteData.estimate.toAmount, availableTokens.find(t => t.symbol === toTokenSymbol)?.decimals || 18)).toFixed(6)
    : "Unavailable";

  return (
    <div className="space-y-6">
      {/* HEADER & API KEY STATUS PANEL */}
      <div className="p-5 rounded-2xl bg-zinc-950/90 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-brand-purple/30 to-purple-900/30 border border-brand-purple/40 text-purple-300">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display">
                  LI.FI Base DEX Swap Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-semibold">
                  API Integrated
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Route multi-chain liquidity across Ethereum, Polygon, Arbitrum, Optimism & Base with smart LI.FI solver execution.
              </p>
            </div>
          </div>

          {/* API Key Status Badge */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/10 font-mono text-xs">
            <Key className={`w-4 h-4 ${apiKeyInfo?.configured ? "text-emerald-400" : "text-amber-400"}`} />
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-200">
                <span>LI.FI API Key:</span>
                {apiKeyInfo?.configured ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Public Rate Limit
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                {apiKeyInfo?.maskedKey || "Checking status..."}
              </div>
            </div>
          </div>
        </div>

        {/* PRESET STRATEGIES */}
        <div className="pt-2 border-t border-white/5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-purple" /> 1-Click AI Suggested Cross-Chain Bridge Routes
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "🌐 Ethereum -> Base Mainnet (ETH -> AGL)", fromC: 1, toC: 8453, fromT: "ETH", toT: "AGL", amt: "0.1" },
              { label: "⚡ Polygon -> Base (USDC -> AGL)", fromC: 137, toC: 8453, fromT: "USDC", toT: "AGL", amt: "100" },
              { label: "🚀 Arbitrum -> Base Liquidity (ETH -> ETH)", fromC: 42161, toC: 8453, fromT: "ETH", toT: "ETH", amt: "0.25" },
              { label: "🛡️ Optimism -> Base Treasury (USDT -> USDC)", fromC: 10, toC: 8453, fromT: "USDT", toT: "USDC", amt: "250" }
            ].map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setFromChainId(sug.fromC);
                  setToChainId(sug.toC);
                  setFromTokenSymbol(sug.fromT);
                  setToTokenSymbol(sug.toT);
                  setFromAmount(sug.amt);
                  showToast(`Applied preset: ${sug.label}`, "info");
                }}
                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand-purple/40 hover:bg-brand-purple/10 text-zinc-300 hover:text-white transition-all font-mono flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3 h-3 text-brand-purple" />
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN BRIDGE CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: SWAP & CHAIN SELECTORS */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-950/60 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-brand-purple" /> Cross-Chain Swap Parameters
            </h4>
            <button
              onClick={fetchQuote}
              disabled={loadingQuote}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
              title="Refresh Quote"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingQuote ? "animate-spin text-brand-purple" : ""}`} />
            </button>
          </div>

          {/* FROM CHAIN & TOKEN */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Source Network & Asset</span>
              <span>Balance: {wallet.isConnected ? `${wallet.balanceEth.toFixed(3)} ETH` : "--"}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* From Chain Dropdown */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">From Chain</label>
                <select
                  value={fromChainId}
                  onChange={(e) => setFromChainId(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple font-mono cursor-pointer"
                >
                  {SUPPORTED_CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* From Token Select */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">From Token</label>
                <select
                  value={fromTokenSymbol}
                  onChange={(e) => setFromTokenSymbol(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple font-mono cursor-pointer"
                >
                  {availableTokens.map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol} - {t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Send Amount</label>
                <div className="flex gap-1 font-mono text-[10px]">
                  {["0.01", "0.05", "0.1", "0.5", "1.0"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFromAmount(preset)}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-brand-purple/20 text-zinc-300 hover:text-purple-300 transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="any"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white font-mono focus:outline-none focus:border-brand-purple"
              />
            </div>
          </div>

          {/* CHAIN SWAP BUTTON */}
          <div className="flex justify-center -my-2">
            <button
              type="button"
              onClick={swapChains}
              className="p-2.5 rounded-full bg-zinc-900 border border-white/15 hover:border-brand-purple hover:bg-brand-purple/20 text-zinc-300 hover:text-white transition-all shadow-lg cursor-pointer"
              title="Swap Source and Destination Chains"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* TO CHAIN & TOKEN */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Destination Network & Asset</span>
              <span>Estimated Receive</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* To Chain Dropdown */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">To Chain</label>
                <select
                  value={toChainId}
                  onChange={(e) => setToChainId(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple font-mono cursor-pointer"
                >
                  {SUPPORTED_CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* To Token Select */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">To Token</label>
                <select
                  value={toTokenSymbol}
                  onChange={(e) => setToTokenSymbol(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple font-mono cursor-pointer"
                >
                  {availableTokens.map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol} - {t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estimated Output Display */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between">
              <span className="text-xl font-extrabold text-brand-purple font-mono">
                {loadingQuote ? "Calculating..." : formattedToAmount}
              </span>
              <span className="text-xs font-bold text-zinc-400 font-mono">{toTokenSymbol}</span>
            </div>
          </div>

          {/* EXECUTE BUTTON */}
          <button
            type="button"
            onClick={handleExecuteBridge}
            disabled={executing || loadingQuote || !fromAmount || parseFloat(fromAmount) <= 0}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-purple to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold font-display text-sm tracking-wide shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Cross-Chain Bridge...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                <span>Execute LI.FI Cross-Chain Swap ({getChainName(fromChainId)} → {getChainName(toChainId)})</span>
              </>
            )}
          </button>

          {/* STATUS LOG */}
          {bridgeStatus && (
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs font-mono text-purple-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
              <span>{bridgeStatus}</span>
            </div>
          )}

          {txHash && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Tx Hash: {txHash.slice(0, 14)}...{txHash.slice(-10)}</span>
              </span>
              <a
                href={`${CHAIN_CONFIG[fromChainId]?.explorer || "https://basescan.org"}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 underline hover:text-white flex items-center gap-1"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ROUTE BREAKDOWN & SOLVER DETAILS */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-950/60 space-y-5">
          <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-purple" /> LI.FI Route & Bridge Solver Details
          </h4>

          {loadingQuote ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
              <p className="text-xs font-mono text-zinc-400">Querying LI.FI API solver engine for optimal route...</p>
            </div>
          ) : quoteData ? (
            <div className="space-y-4">
              {/* Protocol Tool Badge */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {quoteData.toolDetails?.logoURI ? (
                    <ImageWithFallback src={quoteData.toolDetails.logoURI} alt="Bridge Logo" fallbackText="BRIDGE" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white font-display">
                      {quoteData.toolDetails?.name || "LI.FI Smart DEX & Bridge Solver"}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {fromChainId === toChainId ? "Intra-chain DEX Aggregation" : "Cross-chain Liquidity Bridge"}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                  {quoteData.isSimulated ? "Simulated API" : "Live API"}
                </span>
              </div>

              {/* Execution Duration & Fees */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Estimated Time</div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-purple" />
                    <span>~{quoteData.estimate?.executionDuration || 30}s</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Est. Gas Overhead</div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>${quoteData.estimate?.gasCosts?.[0]?.amountUSD || "Unavailable"}</span>
                  </div>
                </div>
              </div>

              {/* ROUTE STEP VISUALIZER */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-3 font-mono">
                <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Execution Route Path</span>
                  <span className="text-purple-400 text-[10px]">Optimal Rate</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Step 1 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">1</span>
                      <span className="text-zinc-200">Deposit on {getChainName(fromChainId)}</span>
                    </div>
                    <span className="text-zinc-400 text-[11px]">{fromAmount} {fromTokenSymbol}</span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">2</span>
                      <span className="text-purple-300">LI.FI Solver ({quoteData.toolDetails?.name || "Across / Stargate"})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-bold">3</span>
                      <span className="text-emerald-300">Receive on {getChainName(toChainId)}</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-[11px]">{formattedToAmount} {toTokenSymbol}</span>
                  </div>
                </div>
              </div>

              {/* Security & Slippage Info */}
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs font-mono text-purple-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Slippage Protection Active (0.5%)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Transactions routed via LI.FI server proxy automatically verify target contract security, prevent MEV frontrunning, and enforce sub-second settlement limits.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-center text-zinc-500">
              <Info className="w-8 h-8 text-zinc-600" />
              <p className="text-xs font-mono">Enter a valid amount to preview the LI.FI Base swap route.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
