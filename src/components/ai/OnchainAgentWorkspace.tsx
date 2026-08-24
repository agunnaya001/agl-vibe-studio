import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  Coins, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Terminal, 
  Wallet, 
  Lock, 
  ExternalLink,
  Code2,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";
import { 
  NetworkKey, 
  SUPPORTED_NETWORKS, 
  TokenBalanceItem, 
  TransactionSafetyPreFlight 
} from "../../types/aiSuite";
import { AIService } from "../../lib/aiSuiteService";

const SUGGESTED_QUERIES = [
  "What is my current ETH and token balance on Base?",
  "Why did my swap transaction revert with 'TRANSFER_FAILED'?",
  "Decode and simulate this approval: target 0x2626664c2603336E57B271c5C0b26F421741e481",
  "Is it safe to interact with this unverified bonding curve contract?",
  "What is the average gas price on Base right now?"
];

interface OnchainAgentProps {
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
  selectedNetwork?: NetworkKey;
  walletAddress?: string;
}

export default function OnchainAgentWorkspace({
  showToast,
  selectedNetwork = "base-mainnet",
  walletAddress
}: OnchainAgentProps) {
  const [network, setNetwork] = useState<NetworkKey>(selectedNetwork);
  const [query, setQuery] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant" | "system"; content: string; timestamp: number; dataEvidence?: any }[]>([
    {
      role: "assistant",
      content: `Hello! I am the **AGL Onchain AI Agent**. I can inspect your wallet holdings on Base, decode transactions, diagnose revert errors, and run pre-flight safety inspections before you sign.

🔒 **Security Directives**:
- I will **never** ask for your private key or seed phrase.
- I will **never** auto-sign transactions; you must always confirm in your wallet.`,
      timestamp: Date.now()
    }
  ]);

  // Live Wallet Balances
  const [balances, setBalances] = useState<TokenBalanceItem[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);

  // Pre-flight simulator state
  const [simContract, setSimContract] = useState<string>("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  const [simValue, setSimValue] = useState<string>("0.05");
  const [simData, setSimData] = useState<string>("0x095ea7b30000000000000000000000002626664c2603336e57b271c5c0b26f421741e481ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  const [simResult, setSimResult] = useState<TransactionSafetyPreFlight | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Load wallet data if address provided
  useEffect(() => {
    if (walletAddress) {
      loadWalletBalances();
    }
  }, [walletAddress, network]);

  const loadWalletBalances = async () => {
    if (!walletAddress) return;
    setIsLoadingBalances(true);
    try {
      const data = await AIService.getLiveWalletData(walletAddress, network);
      setBalances(data.balances);
    } catch (e) {
      console.warn("Could not load balances:", e);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Handle agent conversation query
  const handleSendQuery = async (customPrompt?: string) => {
    const promptToSend = customPrompt || query;
    if (!promptToSend.trim()) return;

    const userMsg = {
      role: "user" as const,
      content: promptToSend.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery("");
    setIsProcessing(true);

    try {
      const response = await AIService.queryOnchainAgent({
        prompt: promptToSend.trim(),
        walletAddress: walletAddress || undefined,
        network,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: response.reply,
          timestamp: Date.now(),
          dataEvidence: response.dataEvidence
        }
      ]);
    } catch (err: any) {
      showToast?.(err.message || "Agent query failed", "error");
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Sorry, I encountered an error communicating with the on-chain agent. Please try again.",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Pre-Flight Transaction Safety Check
  const handleSimulateTx = async () => {
    if (!simContract.trim()) {
      showToast?.("Enter a target contract address to inspect", "error");
      return;
    }

    setIsSimulating(true);
    setSimResult(null);

    try {
      showToast?.("Running Pre-Flight Transaction Inspection...", "info");
      const result = await AIService.simulateTransaction({
        targetContract: simContract.trim(),
        data: simData.trim() || undefined,
        value: simValue.trim() || "0",
        fromAddress: walletAddress || "0xUserWalletAddress",
        network,
      });

      setSimResult(result);
      showToast?.("Pre-flight safety inspection completed!", "success");
    } catch (err: any) {
      showToast?.(err.message || "Simulation failed", "error");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div id="ai-onchain-agent-workspace" className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/80 border border-brand-purple/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-brand-purple/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide font-display">AGL Onchain AI Agent</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Base L2 Autonomous Assistant
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live blockchain query assistant, transaction decoder, revert diagnostic engine & pre-flight safety inspector
            </p>
          </div>
        </div>

        {/* Network & Wallet Status */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="agent-network-select"
            value={network}
            onChange={(e) => setNetwork(e.target.value as NetworkKey)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-200 font-mono focus:outline-none focus:border-brand-purple"
          >
            {Object.values(SUPPORTED_NETWORKS).map((n) => (
              <option key={n.key} value={n.key}>
                {n.name} ({n.chainId})
              </option>
            ))}
          </select>

          {walletAddress ? (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 text-xs flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>No Wallet Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Conversational Assistant */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 flex flex-col h-[600px]">
            {/* Conversation Log */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 text-xs ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    msg.role === "user" ? "bg-brand-purple text-white" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {msg.role === "user" ? <Wallet className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.role === "user" ? "bg-brand-purple/20 border border-brand-purple/30 text-white" : "bg-zinc-900 border border-white/10 text-zinc-200"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.dataEvidence && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-[10px] font-mono text-zinc-400">
                        ⚡ Live evidence verified via Base RPC ({msg.dataEvidence.network})
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-zinc-900 text-zinc-400 text-xs w-fit">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Agent querying Base L2 RPC & decoding on-chain state...</span>
                </div>
              )}
            </div>

            {/* Suggested Prompts */}
            <div className="py-2 flex flex-wrap gap-1.5 border-t border-white/5">
              {SUGGESTED_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuery(q)}
                  disabled={isProcessing}
                  className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-[10px] text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex gap-2 pt-2">
              <input
                id="agent-chat-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendQuery()}
                placeholder="Ask about your wallet, decode a tx, or diagnose a revert..."
                className="flex-1 px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
              />
              <button
                id="btn-send-agent-query"
                onClick={() => handleSendQuery()}
                disabled={isProcessing || !query.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-purple hover:from-emerald-400 hover:to-brand-purple/90 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Flight Safety Inspector & Wallet Cards */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Holdings Card */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Live Wallet Holdings ({SUPPORTED_NETWORKS[network].name})
              </span>
              <button
                onClick={loadWalletBalances}
                disabled={isLoadingBalances || !walletAddress}
                className="p-1 text-zinc-400 hover:text-white"
                title="Refresh Balances"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalances ? "animate-spin" : ""}`} />
              </button>
            </div>

            {balances.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {balances.map((b) => (
                  <div key={b.symbol} className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{b.symbol}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">${b.usdValue || "0.00"}</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                      {b.balanceFormatted}
                    </div>
                    <span className="text-[9px] text-zinc-500 truncate block">{b.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5 text-center text-xs text-zinc-500">
                {walletAddress ? "No token balances detected on this network." : "Connect wallet to inspect live holdings."}
              </div>
            )}
          </div>

          {/* Pre-Flight Transaction Safety Inspector Card */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-brand-purple" />
                Pre-Flight Transaction Safety Inspector
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Before-you-sign analysis</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-0.5">Target Contract</label>
                <input
                  type="text"
                  value={simContract}
                  onChange={(e) => setSimContract(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Value (ETH)</label>
                  <input
                    type="text"
                    value={simValue}
                    onChange={(e) => setSimValue(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Network</label>
                  <div className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-300 font-mono">
                    {SUPPORTED_NETWORKS[network].name}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-0.5">Call Data (Hex / ABI)</label>
                <input
                  type="text"
                  value={simData}
                  onChange={(e) => setSimData(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <button
                id="btn-run-tx-simulation"
                onClick={handleSimulateTx}
                disabled={isSimulating || !simContract.trim()}
                className="w-full py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Simulate & Inspect Pre-Flight Safety</span>
              </button>
            </div>

            {/* Simulation Results */}
            {simResult && (
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-bold text-white">Function: {simResult.functionName || "transfer"}</span>
                  <span className="text-[10px] font-mono text-zinc-400">Gas: ~{simResult.estimatedGas}</span>
                </div>

                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {simResult.plainEnglishExplanation}
                </p>

                {/* Danger Flags */}
                {simResult.dangerFlags && simResult.dangerFlags.length > 0 && (
                  <div className="space-y-1">
                    {simResult.dangerFlags.map((flag, idx) => (
                      <div key={idx} className={`p-2 rounded-lg text-[10px] flex items-start gap-1.5 border ${
                        flag.level === "Critical" ? "bg-rose-500/10 border-rose-500/30 text-rose-300" :
                        flag.level === "Warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
                        "bg-blue-500/10 border-blue-500/30 text-blue-300"
                      }`}>
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{flag.title}: </span>
                          <span>{flag.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
