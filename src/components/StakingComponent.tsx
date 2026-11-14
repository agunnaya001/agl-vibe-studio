import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { ethers } from "ethers";
import { WalletState } from "../types";
import { getBaseProvider } from "../lib/tokenFactory";
import { AGL_STAKING_ADDRESS, AGL_STAKING_ABI } from "../lib/aglContracts";

interface StakingComponentProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

interface OnChainStake {
  index: number;
  amount: string;
  startTime: number;
  lockPeriodDays: number;
  lastClaimTime: number;
  active: boolean;
  pendingReward: string | null;
}

export default function StakingComponent({ wallet, onRefreshWallet, addTerminalLog, showToast }: StakingComponentProps) {
  const [totalStaked, setTotalStaked] = useState<string | null>(null);
  const [aprRateRaw, setAprRateRaw] = useState<string | null>(null);
  const [positions, setPositions] = useState<OnChainStake[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const loadOnChainData = useCallback(async () => {
    setLoading(true);
    setReadError(null);
    try {
      const provider = getBaseProvider("https://mainnet.base.org");
      const contract = new ethers.Contract(AGL_STAKING_ADDRESS, AGL_STAKING_ABI, provider);

      const [totalRaw, aprRaw] = await Promise.all([
        contract.totalStaked(),
        contract.aprRate()
      ]);

      setTotalStaked(Number(ethers.formatEther(totalRaw)).toLocaleString(undefined, { maximumFractionDigits: 4 }));
      // The checked-in ABI does not document APR units. Display the raw contract value rather than guessing percent/bps.
      setAprRateRaw(aprRaw.toString());

      if (wallet.address && ethers.isAddress(wallet.address)) {
        const stakes = await contract.getUserStakes(wallet.address);
        const parsed: OnChainStake[] = await Promise.all(
          stakes.map(async (stake: any, index: number) => {
            let reward: string | null = null;
            try {
              const rewardRaw = await contract.calculateReward(wallet.address, index);
              reward = Number(ethers.formatEther(rewardRaw)).toLocaleString(undefined, { maximumFractionDigits: 6 });
            } catch (error) {
              console.warn(`Unable to read reward for staking position ${index}:`, error);
            }

            return {
              index,
              amount: Number(ethers.formatEther(stake.amount ?? stake[0])).toLocaleString(undefined, { maximumFractionDigits: 6 }),
              startTime: Number(stake.startTime ?? stake[1]),
              lockPeriodDays: Number(stake.lockPeriodDays ?? stake[2]),
              lastClaimTime: Number(stake.lastClaimTime ?? stake[3]),
              active: Boolean(stake.active ?? stake[4]),
              pendingReward: reward
            };
          })
        );
        setPositions(parsed);
      } else {
        setPositions([]);
      }

      setLastUpdated(new Date());
      addTerminalLog("success", "AGL_STAKING_READ: Base staking contract data refreshed.");
    } catch (error: any) {
      console.error("AGL staking contract read failed:", error);
      setTotalStaked(null);
      setAprRateRaw(null);
      setPositions([]);
      const message = error?.shortMessage || error?.message || "Unable to read the configured AGL staking contract.";
      setReadError(message);
      addTerminalLog("error", `AGL_STAKING_READ_ERROR: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [wallet.address, addTerminalLog]);

  useEffect(() => {
    void loadOnChainData();
  }, [loadOnChainData]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Unavailable";
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AGL Staking</h2>
              <p className="text-xs text-zinc-400">Base Mainnet · Contract-backed read-only monitor</p>
            </div>
          </div>
          <button type="button" onClick={() => { onRefreshWallet(); void loadOnChainData(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-amber-200">Staking transactions temporarily locked</div>
            <p className="text-xs leading-relaxed text-zinc-300">
              The checked-in ABI does not match the functions used by the former staking UI. Reads below use only functions present in the declared ABI. Stake, claim, and unstake actions remain disabled until the deployed Base contract source and ABI are verified.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-400">Total staked</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{totalStaked ?? "Unavailable"} <span className="text-xs text-zinc-400">AGL</span></div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-400">APR contract value (raw)</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{aprRateRaw ?? "Unavailable"}</div>
            <p className="mt-1 text-[10px] text-zinc-500">Units are not documented in the checked-in ABI.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400"><Wallet className="h-4 w-4" /> Your AGL wallet balance</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{Number(wallet.aglTokenBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} AGL</div>
          </div>
        </div>

        {readError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-xs text-red-300">
            Contract read failed: {readError}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">On-chain staking positions</h3>
            <span className="text-[10px] text-zinc-500">{positions.length} returned by contract</span>
          </div>

          {!wallet.address ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
              Connect a wallet to read its staking positions. Global contract reads remain available.
            </div>
          ) : positions.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
              {loading ? "Reading positions from Base..." : "No positions were returned for this wallet, or the contract read is unavailable."}
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => (
                <div key={position.index} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">Position #{position.index}</span>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${position.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"}`}>
                      {position.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div><div className="text-zinc-500">Principal</div><div className="mt-1 font-mono text-white">{position.amount} AGL</div></div>
                    <div><div className="text-zinc-500">Lock period</div><div className="mt-1 font-mono text-white">{position.lockPeriodDays} days</div></div>
                    <div><div className="text-zinc-500">Start time</div><div className="mt-1 text-zinc-300">{formatDate(position.startTime)}</div></div>
                    <div><div className="text-zinc-500">Last claim</div><div className="mt-1 text-zinc-300">{formatDate(position.lastClaimTime)}</div></div>
                  </div>
                  <div className="border-t border-white/5 pt-3 text-xs">
                    <span className="text-zinc-500">Calculated reward: </span>
                    <span className="font-mono font-bold text-emerald-300">{position.pendingReward === null ? "Unavailable" : `${position.pendingReward} AGL`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="text-[10px] text-zinc-500">
            {lastUpdated ? `Last read: ${lastUpdated.toLocaleString()}` : "Waiting for first Base RPC read"}
          </div>
          <a href={`https://basescan.org/address/${AGL_STAKING_ADDRESS}#code`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 hover:text-blue-200">
            Inspect staking contract <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
