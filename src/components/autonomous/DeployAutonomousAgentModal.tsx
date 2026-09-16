import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Bot, Sparkles, Wallet, BarChart2, Zap, Coins, 
  ShieldCheck, ArrowRight, Check, Loader2, Sliders, Globe
} from "lucide-react";
import { AutonomousAgent, AgentRole } from "../../types/autonomousAgent";
import { WalletState } from "../../types";
import { AutonomousAgentService } from "../../lib/autonomousAgentService";

interface DeployAutonomousAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletState;
  onSuccess: (newAgent: AutonomousAgent) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function DeployAutonomousAgentModal({
  isOpen,
  onClose,
  wallet,
  onSuccess,
  showToast,
}: DeployAutonomousAgentModalProps) {
  const [role, setRole] = useState<AgentRole>("market_making");
  const [name, setName] = useState<string>("");
  const [symbol, setSymbol] = useState<string>("");
  const [executionInterval, setExecutionInterval] = useState<number>(5);
  const [initialEth, setInitialEth] = useState<string>("0.1");
  const [initialAgl, setInitialAgl] = useState<string>("1000");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Market making specifics
  const [bidSpread, setBidSpread] = useState<string>("1.2");
  const [askSpread, setAskSpread] = useState<string>("1.2");
  const [orderSizeEth, setOrderSizeEth] = useState<string>("0.05");

  // Arbitrage specifics
  const [minProfitMargin, setMinProfitMargin] = useState<string>("0.8");
  const [maxTradeSizeEth, setMaxTradeSizeEth] = useState<string>("0.2");

  // Governance specifics
  const [votingStrategy, setVotingStrategy] = useState<"conservative" | "growth" | "ecosystem_first" | "treasury_protective">("ecosystem_first");
  const [voteWeight, setVoteWeight] = useState<string>("25000");

  if (!isOpen) return null;

  const handleRoleSelect = (selectedRole: AgentRole) => {
    setRole(selectedRole);
    if (!name || name.startsWith("Agent ")) {
      if (selectedRole === "market_making") {
        setName("Base Liquidity Provisioner");
        setSymbol("BLP");
      } else if (selectedRole === "arbitrage") {
        setName("Cross-DEX Arbitrage Sentinel");
        setSymbol("CAS");
      } else if (selectedRole === "governance") {
        setName("Community Governance Steward");
        setSymbol("CGS");
      } else {
        setName("Omni-Yield Autonomous Operator");
        setSymbol("OYO");
      }
    }
  };

  const handleDeploy = async () => {
    const finalName = name.trim() || `${role.replace("_", " ").toUpperCase()} Agent`;
    const finalSymbol = symbol.trim() || "AGNT";
    const ethDeposit = parseFloat(initialEth) || 0.1;
    const aglDeposit = parseFloat(initialAgl) || 1000;

    setIsLoading(true);
    try {
      // 1. Generate dedicated on-chain treasury wallet
      const treasuryInfo = await AutonomousAgentService.generateTreasuryWallet("base-sepolia", finalName);
      const treasuryAddress = treasuryInfo?.treasuryAddress || `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

      // 2. Form Autonomous Agent entity
      const newAgent: AutonomousAgent = {
        id: `agent-${Date.now()}`,
        name: finalName,
        symbol: finalSymbol.toUpperCase(),
        role,
        status: "active",
        network: "base-sepolia",
        treasury: {
          treasuryAddress,
          walletType: "smart_contract",
          ethBalance: ethDeposit,
          aglBalance: aglDeposit,
          tokenBalances: {
            AGL: { symbol: "AGL", balance: aglDeposit, usdValue: aglDeposit * 0.42 },
            ETH: { symbol: "ETH", balance: ethDeposit, usdValue: ethDeposit * 2850 },
          },
          totalValuationUsd: Number((ethDeposit * 2850 + aglDeposit * 0.42).toFixed(2)),
          maxDailySpendEth: 0.2,
          spentTodayEth: 0.0,
          circuitBreakerThresholdPct: 5.0,
          lastFundedAt: Date.now(),
        },
        marketMakingConfig: role === "market_making" || role === "hybrid" ? {
          targetTokenAddress: "0x4ed4E862860be51a91bD9bf9f8AC5ACF26871c42",
          targetTokenSymbol: "AGL",
          poolType: "bonding_curve",
          bidSpreadPct: parseFloat(bidSpread) || 1.2,
          askSpreadPct: parseFloat(askSpread) || 1.2,
          orderSizeEth: parseFloat(orderSizeEth) || 0.05,
          rebalanceThresholdPct: 10,
          inventoryRatioEthPct: 50,
        } : undefined,
        arbitrageConfig: role === "arbitrage" || role === "hybrid" ? {
          sourcePool: "Agunnaya Bonding Curve",
          targetPool: "Aerodrome Base",
          tokenPair: "AGL/ETH",
          minProfitMarginPct: parseFloat(minProfitMargin) || 0.8,
          maxSlippagePct: 0.5,
          maxTradeSizeEth: parseFloat(maxTradeSizeEth) || 0.2,
          atomicFlashLoanEnabled: true,
        } : undefined,
        governanceConfig: role === "governance" || role === "hybrid" ? {
          monitoredDaoAddresses: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
          votingStrategy,
          minQuorumParticipation: 50,
          voteWeightTokens: parseInt(voteWeight) || 25000,
          autoPublishDeliberation: true,
        } : undefined,
        executionIntervalMinutes: executionInterval,
        lastExecutedAt: Date.now(),
        nextExecutionAt: Date.now() + executionInterval * 60 * 1000,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalProfitEth: 0.0,
        gasSpentEth: 0.0,
        netYieldApr: role === "arbitrage" ? 48.5 : role === "market_making" ? 32.0 : 18.5,
        geminiModel: "gemini-3.8-flash",
        systemDirective: `Autonomous ${role.replace("_", " ")} agent with dedicated treasury wallet deployed on Base. Powered by Gemini 3.8 Flash.`,
        creatorAddress: wallet.address || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        createdAt: Date.now(),
      };

      await AutonomousAgentService.saveAgent(newAgent);
      onSuccess(newAgent);
      showToast(`Agent ${newAgent.name} deployed with dedicated treasury wallet!`, "success");
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to deploy agent", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-100 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Deploy Self-Executing AI Agent</h3>
                <p className="text-xs text-zinc-400">Equipped with a dedicated on-chain treasury wallet</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Strategy Selection */}
          <div className="mt-5 space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Choose Autonomous Specialization:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: "market_making", label: "Market Making", icon: BarChart2, color: "text-blue-400", border: "hover:border-blue-500/50" },
                { id: "arbitrage", label: "Arbitrage", icon: Zap, color: "text-emerald-400", border: "hover:border-emerald-500/50" },
                { id: "governance", label: "Governance", icon: Coins, color: "text-purple-400", border: "hover:border-purple-500/50" },
                { id: "hybrid", label: "Multi-Strategy", icon: Sparkles, color: "text-amber-400", border: "hover:border-amber-500/50" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleRoleSelect(item.id as AgentRole)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === item.id
                      ? "bg-zinc-800/90 border-blue-500 shadow-md shadow-blue-500/10"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 " + item.border
                  }`}
                >
                  <item.icon className={`w-5 h-5 mb-1.5 ${item.color}`} />
                  <p className="font-semibold text-xs text-white">{item.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Agent Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Base Liquidity Sentinel"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Ticker / Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. BLS"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>
          </div>

          {/* Initial Treasury Capital */}
          <div className="mt-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span>Initial Treasury Wallet Capital Allocation</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-zinc-400 mb-1 block">ETH Balance</span>
                <input
                  type="number"
                  step="0.05"
                  value={initialEth}
                  onChange={(e) => setInitialEth(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  placeholder="0.1"
                />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 mb-1 block">AGL Token Balance</span>
                <input
                  type="number"
                  step="500"
                  value={initialAgl}
                  onChange={(e) => setInitialAgl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  placeholder="1000"
                />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              A dedicated smart wallet address will be derived for this agent to store and execute trades independently.
            </p>
          </div>

          {/* Strategy Specifics */}
          <div className="mt-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Strategy Parameters
              </span>
              <span className="text-[11px] text-zinc-500">Powered by Gemini 3.8 Flash</span>
            </div>

            {role === "market_making" && (
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Bid Spread (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={bidSpread}
                    onChange={(e) => setBidSpread(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Ask Spread (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={askSpread}
                    onChange={(e) => setAskSpread(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Order Size (ETH)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={orderSizeEth}
                    onChange={(e) => setOrderSizeEth(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {role === "arbitrage" && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Min Profit Margin (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={minProfitMargin}
                    onChange={(e) => setMinProfitMargin(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Max Flash Trade (ETH)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={maxTradeSizeEth}
                    onChange={(e) => setMaxTradeSizeEth(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {role === "governance" && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Voting Mandate</span>
                  <select
                    value={votingStrategy}
                    onChange={(e: any) => setVotingStrategy(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="ecosystem_first">Ecosystem First</option>
                    <option value="conservative">Conservative</option>
                    <option value="growth">Aggressive Growth</option>
                    <option value="treasury_protective">Treasury Protective</option>
                  </select>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Vote Power (Tokens)</span>
                  <input
                    type="number"
                    step="5000"
                    value={voteWeight}
                    onChange={(e) => setVoteWeight(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {role === "hybrid" && (
              <p className="text-xs text-zinc-400">
                Hybrid multi-strategy combines continuous spread market making on bonding curves with opportunistic cross-DEX flash arbitrage.
              </p>
            )}

            <div>
              <span className="text-zinc-500 text-xs block mb-1">Autonomous Execution Loop Interval</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "1 min", val: 1 },
                  { label: "5 min", val: 5 },
                  { label: "15 min", val: 15 },
                  { label: "1 hour", val: 60 },
                ].map((intv) => (
                  <button
                    key={intv.val}
                    type="button"
                    onClick={() => setExecutionInterval(intv.val)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      executionInterval === intv.val
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    {intv.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deriving Wallet & Deploying...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  Deploy Autonomous Agent
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
