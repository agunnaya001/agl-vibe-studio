import React, { useState, useEffect } from "react";
import { 
  Gauge, 
  Zap, 
  TrendingUp, 
  History, 
  Award, 
  Cpu, 
  Activity, 
  HelpCircle, 
  Loader2, 
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";

interface GasDashboardPageProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

// Generate some mock historical gas trend data
const initialTrendData = [
  { time: "12:00", gasPrice: 0.012, sponsoredTx: 24 },
  { time: "13:00", gasPrice: 0.009, sponsoredTx: 18 },
  { time: "14:00", gasPrice: 0.015, sponsoredTx: 35 },
  { time: "15:00", gasPrice: 0.022, sponsoredTx: 41 },
  { time: "16:00", gasPrice: 0.011, sponsoredTx: 29 },
  { time: "17:00", gasPrice: 0.010, sponsoredTx: 32 },
  { time: "18:00", gasPrice: 0.014, sponsoredTx: 48 },
];

export default function GasDashboardPage({ wallet, onRefreshWallet, addTerminalLog, showToast }: GasDashboardPageProps) {
  const [gasPrice, setGasPrice] = useState<number>(0.010);
  const [networkLoad, setNetworkLoad] = useState<"Low" | "Medium" | "High">("Low");
  const [blockTime, setBlockTime] = useState<number>(2.0);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [trendData, setTrendData] = useState(initialTrendData);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Tick gas price simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 0.004;
      const nextPrice = Math.max(0.005, parseFloat((gasPrice + fluctuation).toFixed(4)));
      setGasPrice(nextPrice);
      
      let load: "Low" | "Medium" | "High" = "Low";
      let time = 2.0;
      if (nextPrice > 0.018) {
        load = "High";
        time = 2.4;
      } else if (nextPrice > 0.012) {
        load = "Medium";
        time = 2.1;
      } else {
        load = "Low";
        time = 1.9;
      }
      setNetworkLoad(load);
      setBlockTime(time);

      // Add to trend data
      setTrendData(prev => {
        const nextTrend = [...prev.slice(1)];
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        nextTrend.push({
          time: timeStr,
          gasPrice: nextPrice,
          sponsoredTx: Math.floor(Math.random() * 30) + 15
        });
        return nextTrend;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [gasPrice]);

  // Handle claiming mock gas sponsorship allowance
  const handleClaimAllowance = async () => {
    if (!wallet.isConnected) {
      showToast("Please connect your wallet first.", "error");
      return;
    }
    
    setClaiming(true);
    addTerminalLog("info", "GAS_SPONSOR_FAUCET: Requesting Account Abstraction gas allowance from Base Paymaster...");

    setTimeout(() => {
      const currentGas = wallet.sponsoredGasEth || 0;
      if (currentGas >= 0.05) {
        showToast("Maximum sponsored developer gas allowance already claimed (0.05 ETH).", "info");
        addTerminalLog("system", "GAS_SPONSOR_FAUCET: Claim rejected. User has already reached maximum developer gas subsidy allocation.");
        setClaiming(false);
        return;
      }

      const claimAmount = 0.05 - currentGas;
      const updatedWallet = {
        ...wallet,
        sponsoredGasEth: 0.05
      };

      AgunnayaDatabase.saveWallet(updatedWallet);
      onRefreshWallet();
      addTerminalLog("success", `GAS_SPONSOR_FAUCET: Successfully claimed ${claimAmount.toFixed(4)} ETH gas sponsorship allowance!`);
      showToast(`Claimed ${claimAmount.toFixed(4)} ETH Paymaster allowance`, "success");
      setClaiming(false);
    }, 2000);
  };

  const gasSponsorshipPct = Math.min(100, ((wallet.sponsoredGasEth || 0) / 0.05) * 100);

  const faqs = [
    {
      q: "What is Account Abstraction (AA) Gas Sponsorship?",
      a: "Standard blockchains require user accounts (EOAs) to pay native gas tokens for every state change. Under ERC-4337, smart accounts can leverage 'paymasters' to pay gas on their behalf, allowing gasless deployments, swaps, and token launches."
    },
    {
      q: "How do I use my sponsored gas balance?",
      a: "Once you connect a Smart Account or claim developer gas, transactions inside Agunnaya Labs Studio (such as launching tokens on bonding curves, deploying contracts, or voting in DAOs) automatically run through our sponsored relayers and consume this allowance instead of your personal EOA balance!"
    },
    {
      q: "Is there a real-world cost for these transactions?",
      a: "While this platform operates in a sandbox environment simulating Base Sepolia and Base Mainnet, we fully sponsor gas limits here to enable developers to stress-test token mechanics, multi-sig upgrades, and AI generation features without friction."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-brand-purple" /> Paymaster & Gas Sponsorship Dashboard
          </h2>
          <p className="text-[11px] text-zinc-400 font-mono mt-1">
            Monitor real-time Base L2 network congestion, track account abstraction gas reserves, and claim free developer allowances.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500">Node Status:</span>
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live On Base
          </span>
        </div>
      </div>

      {/* Grid: Network metrics and claiming faucet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric 1: Live Gas Price */}
        <div className="bg-[#0e0e11] border border-white/5 rounded-2xl p-5 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-purple/5 blur-2xl"></div>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Base Sepolia Gas Price</span>
            <Activity className="w-4 h-4 text-brand-purple animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white tracking-tight">{gasPrice.toFixed(4)}</span>
            <span className="text-xs text-zinc-500 font-mono">GWEI</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] font-mono">
            <span className="text-zinc-500">Est. Tx Fee (Standard)</span>
            <span className="text-zinc-300">~0.000021 ETH</span>
          </div>
        </div>

        {/* Metric 2: Network Load */}
        <div className="bg-[#0e0e11] border border-white/5 rounded-2xl p-5 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-blue/5 blur-2xl"></div>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Network Congestion</span>
            <Cpu className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono tracking-tight ${
              networkLoad === "Low" ? "text-emerald-400" :
              networkLoad === "Medium" ? "text-amber-400" : "text-rose-400"
            }`}>{networkLoad}</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] font-mono">
            <span className="text-zinc-500">Mean Block Confirmation</span>
            <span className="text-zinc-300">{blockTime.toFixed(1)}s</span>
          </div>
        </div>

        {/* Metric 3: Active Paymaster Savings */}
        <div className="bg-[#0e0e11] border border-white/5 rounded-2xl p-5 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl"></div>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Aggregated AA Gas Saved</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">0.1420</span>
            <span className="text-xs text-zinc-500 font-mono">ETH</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] font-mono">
            <span className="text-zinc-500">Value Sponsored (USD)</span>
            <span className="text-emerald-400 font-bold">~$495.20 USD</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Claim faucet & FAQs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Faucet Card */}
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 relative overflow-hidden space-y-6 shadow-xl shadow-brand-purple/5">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-brand-purple/5 blur-3xl pointer-events-none"></div>
            
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-brand-purple font-mono flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 animate-pulse" /> Gas Sponsorship Faucet
              </span>
              <h3 className="text-lg font-display font-bold text-white">Refuel Developer Gas Allowance</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect your account abstraction wallet or request a sponsored developer allowance from the Agunnaya Paymaster. Claims grant up to <strong className="text-zinc-200">0.05 ETH</strong> to fully eliminate contract compilation, token creation, and governance gas requirements.
              </p>
            </div>

            {/* Allowance Progress */}
            <div className="space-y-2 font-mono">
              <div className="flex justify-between text-xs text-zinc-500 font-bold">
                <span>ACTIVE SPONSORED RESERVES</span>
                <span className="text-brand-purple">{wallet.sponsoredGasEth ? wallet.sponsoredGasEth.toFixed(4) : "0.0000"} / 0.0500 ETH</span>
              </div>
              <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div 
                  className="bg-gradient-to-r from-brand-purple to-brand-blue h-full transition-all duration-500 rounded-full"
                  style={{ width: `${gasSponsorshipPct}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                Reserves are consumed only during AI generation, token launches, DAO drafts, or multi-sig trades inside Agunnaya Labs.
              </p>
            </div>

            {/* Faucet action button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                id="claim-gas-faucet-btn"
                onClick={handleClaimAllowance}
                disabled={claiming || (wallet.sponsoredGasEth >= 0.05)}
                className="flex-1 py-3 bg-brand-purple hover:bg-purple-600 disabled:bg-zinc-900 disabled:border-white/5 disabled:text-zinc-600 text-white font-bold font-display text-xs rounded-xl transition-all shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-2 border border-transparent"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Broadcasting Sponsorship Claim...</span>
                  </>
                ) : wallet.sponsoredGasEth >= 0.05 ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Allowance Fully Topped Up</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-white animate-bounce" />
                    <span>Claim Free Developer Gas Allowance</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* FAQs section */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-widest text-zinc-500 font-mono flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> Understanding Paymaster Subsidies
            </h3>
            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-[#0e0e11] border border-white/5 rounded-xl overflow-hidden">
                  <button
                    id={`faq-btn-${idx}`}
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-white hover:text-brand-purple transition-all font-mono"
                  >
                    <span>{faq.q}</span>
                    <span className="text-zinc-500 font-bold">{activeFaq === idx ? "−" : "+"}</span>
                  </button>
                  {activeFaq === idx && (
                    <div className="px-4 pb-4 text-[11px] text-zinc-400 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Gas trend chart & Sponsorship logs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Trend Chart Card */}
          <div className="bg-[#0e0e11] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-brand-blue font-mono flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Real-time Trend Analyzer
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Interval: 8s tick</span>
            </div>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                  <XAxis dataKey="time" stroke="#52525b" fontSize={9} />
                  <YAxis stroke="#52525b" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }}
                    labelStyle={{ color: "#a1a1aa", fontSize: 10, fontFamily: "monospace" }}
                    itemStyle={{ color: "#ffffff", fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Area type="monotone" dataKey="gasPrice" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorGas)" strokeWidth={2} name="Gas (gwei)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-zinc-500 font-mono text-center">
              *Fluctuations simulate random base fee adjustments on the Base Layer 2.
            </p>
          </div>

          {/* History logs card */}
          <div className="bg-[#0e0e11] border border-white/5 rounded-2xl p-5 space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Active Sponsorship Logs
            </span>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 font-mono text-[10px] scrollbar-thin">
              <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                <div className="flex justify-between font-bold text-zinc-300">
                  <span className="text-brand-purple">LAUNCH_TOKEN</span>
                  <span>-0.0020 ETH</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500">
                  <span>0x7099...79C8</span>
                  <span>Base L2 Block #189283</span>
                </div>
              </div>

              <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                <div className="flex justify-between font-bold text-zinc-300">
                  <span className="text-brand-purple">DEPLOY_CONTRACT</span>
                  <span>-0.0020 ETH</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500">
                  <span>0x3C44...4970</span>
                  <span>Base L2 Block #189124</span>
                </div>
              </div>

              <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                <div className="flex justify-between font-bold text-zinc-300">
                  <span className="text-emerald-400">CLAIM_FAUCET</span>
                  <span className="text-emerald-400">+0.0500 ETH</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500">
                  <span>Agunnaya Paymaster</span>
                  <span>Base L2 Block #189041</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
