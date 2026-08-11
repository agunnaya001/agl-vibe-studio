import React, { useState, useMemo } from "react";
import { 
  Fuel, 
  Zap, 
  Globe, 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  Check, 
  RefreshCw, 
  ArrowRight, 
  Info,
  Clock,
  Sparkles,
  Flame
} from "lucide-react";

export interface NetworkGasOption {
  id: string;
  name: string;
  symbol: string;
  nativeTokenPriceUsd: number;
  baseFeeGwei: number;
  priorityFeeGwei: number;
  l1DataFeeUsd: number; // Layer 2 roll-up data submission cost
  iconColor: string;
  isL2: boolean;
}

export const NETWORKS: NetworkGasOption[] = [
  {
    id: "base-mainnet",
    name: "Base Mainnet",
    symbol: "ETH",
    nativeTokenPriceUsd: 3100,
    baseFeeGwei: 0.005,
    priorityFeeGwei: 0.001,
    l1DataFeeUsd: 0.002,
    iconColor: "text-blue-400",
    isL2: true
  },
  {
    id: "base-sepolia",
    name: "Base Sepolia (Testnet)",
    symbol: "ETH",
    nativeTokenPriceUsd: 0,
    baseFeeGwei: 0.001,
    priorityFeeGwei: 0.0005,
    l1DataFeeUsd: 0,
    iconColor: "text-emerald-400",
    isL2: true
  },
  {
    id: "ethereum-mainnet",
    name: "Ethereum L1 Mainnet",
    symbol: "ETH",
    nativeTokenPriceUsd: 3100,
    baseFeeGwei: 18.5,
    priorityFeeGwei: 1.5,
    l1DataFeeUsd: 0,
    iconColor: "text-[#8C8C8C]",
    isL2: false
  },
  {
    id: "arbitrum-one",
    name: "Arbitrum One",
    symbol: "ETH",
    nativeTokenPriceUsd: 3100,
    baseFeeGwei: 0.1,
    priorityFeeGwei: 0.02,
    l1DataFeeUsd: 0.015,
    iconColor: "text-cyan-400",
    isL2: true
  },
  {
    id: "optimism",
    name: "Optimism Mainnet",
    symbol: "ETH",
    nativeTokenPriceUsd: 3100,
    baseFeeGwei: 0.008,
    priorityFeeGwei: 0.002,
    l1DataFeeUsd: 0.003,
    iconColor: "text-rose-400",
    isL2: true
  },
  {
    id: "polygon",
    name: "Polygon POS",
    symbol: "MATIC",
    nativeTokenPriceUsd: 0.65,
    baseFeeGwei: 35.0,
    priorityFeeGwei: 30.0,
    l1DataFeeUsd: 0,
    iconColor: "text-purple-400",
    isL2: false
  }
];

export interface CongestionLevel {
  id: "low" | "normal" | "high" | "extreme";
  name: string;
  multiplier: number;
  badgeColor: string;
  estimatedSec: number;
}

export const CONGESTION_LEVELS: CongestionLevel[] = [
  { id: "low", name: "Low Traffic", multiplier: 0.8, badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", estimatedSec: 2 },
  { id: "normal", name: "Standard", multiplier: 1.0, badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30", estimatedSec: 3 },
  { id: "high", name: "High Congestion", multiplier: 1.75, badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30", estimatedSec: 8 },
  { id: "extreme", name: "Peak Gas Surge", multiplier: 3.5, badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30", estimatedSec: 15 }
];

export interface ContractComplexity {
  id: string;
  name: string;
  gasUnits: number;
  description: string;
}

export const CONTRACT_TYPES: ContractComplexity[] = [
  { id: "standard-erc20", name: "Standard ERC-20 Token", gasUnits: 850000, description: "Basic mintable & burnable token deployment" },
  { id: "bonding-curve", name: "Agunnaya Bonding Curve Token", gasUnits: 1450000, description: "Full automated liquidity pool & bonding curve factory deployment" },
  { id: "governance-token", name: "DAO Governance & Staking Token", gasUnits: 2200000, description: "Includes vote tracking, delegation & timelock hooks" }
];

interface GasCostEstimatorProps {
  onSelectNetwork?: (networkId: string) => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function GasCostEstimator({ onSelectNetwork, showToast }: GasCostEstimatorProps) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("base-mainnet");
  const [selectedCongestion, setSelectedCongestion] = useState<"low" | "normal" | "high" | "extreme">("normal");
  const [selectedContractType, setSelectedContractType] = useState<string>("bonding-curve");
  const [customPriorityTip, setCustomPriorityTip] = useState<number>(0.001);

  const activeNetwork = useMemo(() => {
    return NETWORKS.find((n) => n.id === selectedNetworkId) || NETWORKS[0];
  }, [selectedNetworkId]);

  const activeCongestion = useMemo(() => {
    return CONGESTION_LEVELS.find((c) => c.id === selectedCongestion) || CONGESTION_LEVELS[1];
  }, [selectedCongestion]);

  const activeContract = useMemo(() => {
    return CONTRACT_TYPES.find((c) => c.id === selectedContractType) || CONTRACT_TYPES[1];
  }, [selectedContractType]);

  // Calculations
  const calculations = useMemo(() => {
    const baseGwei = activeNetwork.baseFeeGwei * activeCongestion.multiplier;
    const priorityGwei = activeNetwork.priorityFeeGwei + customPriorityTip;
    const totalGweiPerGas = baseGwei + priorityGwei;

    // Total Gas in Wei = GasUnits * (TotalGwei * 1e9)
    // 1 Gwei = 1e-9 ETH
    const totalGwei = totalGweiPerGas * activeContract.gasUnits;
    const nativeCost = totalGwei * 1e-9;
    const executionCostUsd = nativeCost * activeNetwork.nativeTokenPriceUsd;
    const totalCostUsd = executionCostUsd + activeNetwork.l1DataFeeUsd;

    // Compare with Ethereum L1 Mainnet Cost for savings badge
    const ethL1Network = NETWORKS.find((n) => n.id === "ethereum-mainnet")!;
    const ethL1Gwei = (ethL1Network.baseFeeGwei * activeCongestion.multiplier) + ethL1Network.priorityFeeGwei;
    const ethL1NativeCost = ethL1Gwei * activeContract.gasUnits * 1e-9;
    const ethL1UsdCost = ethL1NativeCost * ethL1Network.nativeTokenPriceUsd;
    const savingsUsd = Math.max(0, ethL1UsdCost - totalCostUsd);
    const savingsPct = ethL1UsdCost > 0 ? ((ethL1UsdCost - totalCostUsd) / ethL1UsdCost) * 100 : 0;

    return {
      baseGwei,
      priorityGwei,
      totalGweiPerGas,
      totalGwei,
      nativeCost,
      executionCostUsd,
      totalCostUsd,
      ethL1UsdCost,
      savingsUsd,
      savingsPct
    };
  }, [activeNetwork, activeCongestion, activeContract, customPriorityTip]);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-zinc-950/90 space-y-6 shadow-2xl font-sans text-xs animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold font-display text-white">Smart Network Gas Cost Estimator</h2>
            <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
              EIP-1559 Dynamic Fee Engine
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Estimate contract deployment fees based on target chain architecture, EVM gas complexity, and real-time congestion.
          </p>
        </div>

        {/* Real-time Base L2 Gas Savings Badge */}
        {activeNetwork.isL2 && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <div>
              <span className="font-bold block text-white text-[11px]">Save ~{calculations.savingsPct.toFixed(1)}% vs Ethereum L1</span>
              <span className="text-[9px] text-emerald-400">Save ${calculations.savingsUsd.toFixed(2)} USD per deployment</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Column - 7 Cols */}
        <div className="lg:col-span-7 space-y-5 bg-zinc-900/60 p-5 rounded-2xl border border-white/5">
          {/* Step 1: Select Network */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" /> 1. Select Blockchain Network
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NETWORKS.map((net) => {
                const isSelected = selectedNetworkId === net.id;
                return (
                  <button
                    key={net.id}
                    type="button"
                    onClick={() => {
                      setSelectedNetworkId(net.id);
                      if (onSelectNetwork) onSelectNetwork(net.id);
                      if (showToast) showToast(`Selected Network: ${net.name}`, "info");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#0052FF]/20 border-[#0052FF] text-white shadow-lg shadow-[#0052FF]/10"
                        : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs ${net.iconColor}`}>{net.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0052FF]" />}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-1 flex justify-between">
                      <span>{net.symbol}</span>
                      <span>{net.baseFeeGwei} Gwei</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Network Congestion */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> 2. Network Congestion Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONGESTION_LEVELS.map((cong) => {
                const isSelected = selectedCongestion === cong.id;
                return (
                  <button
                    key={cong.id}
                    type="button"
                    onClick={() => setSelectedCongestion(cong.id)}
                    className={`p-2 rounded-xl border text-center font-mono text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                        : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="block">{cong.name}</span>
                    <span className="text-[9px] text-zinc-500 block">{cong.multiplier}x Fee Multiplier</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Select Contract Complexity */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" /> 3. Contract Bytecode Complexity
            </label>
            <div className="space-y-2">
              {CONTRACT_TYPES.map((ct) => {
                const isSelected = selectedContractType === ct.id;
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setSelectedContractType(ct.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-purple-950/40 border-purple-500 text-white shadow-md"
                        : "bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">{ct.name}</span>
                      <span className="text-[10px] text-zinc-500 font-sans">{ct.description}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-purple-300">
                      {ct.gasUnits.toLocaleString()} Gas
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Output Column - 5 Cols */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
          {/* Main Total Cost Hero Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0052FF]/20 via-purple-950/40 to-zinc-950 border border-[#0052FF]/40 space-y-3 shadow-xl">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300 block">
              Estimated Deployment Fee
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-white">
                ${calculations.totalCostUsd < 0.001 ? "< $0.001" : calculations.totalCostUsd.toFixed(4)} USD
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                ({calculations.nativeCost.toFixed(6)} {activeNetwork.symbol})
              </span>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>Estimated Execution Time:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> ~{activeCongestion.estimatedSec} Seconds
              </span>
            </div>
          </div>

          {/* Gas Fee Breakdown */}
          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-white/5 space-y-2.5 font-mono text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Gas Breakdown Details
            </h4>

            <div className="space-y-1.5 divide-y divide-white/5">
              <div className="flex justify-between items-center text-zinc-300 pt-1">
                <span className="text-zinc-500">Base Fee Rate:</span>
                <span className="font-bold text-white">{calculations.baseGwei.toFixed(4)} Gwei</span>
              </div>

              <div className="flex justify-between items-center text-zinc-300 pt-1.5">
                <span className="text-zinc-500">Priority Tip (Miner Fee):</span>
                <span className="font-bold text-purple-300">+{calculations.priorityGwei.toFixed(4)} Gwei</span>
              </div>

              <div className="flex justify-between items-center text-zinc-300 pt-1.5">
                <span className="text-zinc-500">Gas Limit (Max Units):</span>
                <span className="font-bold text-white">{activeContract.gasUnits.toLocaleString()}</span>
              </div>

              {activeNetwork.isL2 && (
                <div className="flex justify-between items-center text-zinc-300 pt-1.5">
                  <span className="text-zinc-500">L1 Calldata Overhead:</span>
                  <span className="font-bold text-emerald-400">${activeNetwork.l1DataFeeUsd.toFixed(3)} USD</span>
                </div>
              )}

              <div className="flex justify-between items-center text-white font-bold pt-2 text-xs">
                <span className="text-blue-300">Effective Gas Price:</span>
                <span className="text-emerald-300 font-extrabold">{calculations.totalGweiPerGas.toFixed(4)} Gwei</span>
              </div>
            </div>
          </div>

          {/* Action to Apply Selected Network */}
          <button
            id="btn-apply-gas-estimate-network"
            type="button"
            onClick={() => {
              if (onSelectNetwork) onSelectNetwork(activeNetwork.id);
              if (showToast) showToast(`Applied ${activeNetwork.name} gas profile for token creation!`, "success");
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0052FF] to-purple-600 hover:from-[#0052FF]/90 hover:to-purple-600/90 text-white font-bold font-mono text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#0052FF]/20"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Confirm & Apply {activeNetwork.name} Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
