import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { ethers } from "ethers";
import { WalletState } from "../types";
import { getBaseProvider } from "../lib/tokenFactory";
import {
  AGL_STAKING_ADDRESS,
  AGL_STAKING_ABI,
  AGL_TOKEN_ADDRESS
} from "../lib/aglContracts";

interface StakingComponentProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

interface TierView {
  id: number;
  lockDuration: number;
  aprBasisPoints: number;
  active: boolean;
}

interface PositionView {
  id: number;
  amount: string;
  startTime: number;
  unlockTime: number;
  tierId: number;
  aprBasisPoints: number;
  withdrawn: boolean;
  pendingReward: string;
  totalClaimable: string;
}

const BASE_CHAIN_ID = 8453n;
const ERC20_DECIMALS_ABI = ["function decimals() view returns (uint8)"];

function formatAgl(value: bigint, decimals: number): string {
  return Number(ethers.formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6
  });
}

function formatDate(timestamp: number): string {
  return timestamp ? new Date(timestamp * 1000).toLocaleString() : "Unavailable";
}

function formatDuration(seconds: number): string {
  const days = seconds / 86400;
  return Number.isInteger(days) ? `${days} days` : `${days.toFixed(2)} days`;
}

export default function StakingComponent({ wallet, onRefreshWallet, addTerminalLog }: StakingComponentProps) {
  const [totalStaked, setTotalStaked] = useState<string | null>(null);
  const [rewardPool, setRewardPool] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TierView[]>([]);
  const [positions, setPositions] = useState<PositionView[]>([]);
  const [positionCount, setPositionCount] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [tokenMatch, setTokenMatch] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const loadOnChainData = useCallback(async () => {
    setLoading(true);
    setReadError(null);
    try {
      const provider = getBaseProvider("https://mainnet.base.org");
      const network = await provider.getNetwork();
      if (network.chainId !== BASE_CHAIN_ID) {
        throw new Error(`RPC network mismatch: expected Base (8453), received chain ${network.chainId.toString()}.`);
      }

      const contract = new ethers.Contract(AGL_STAKING_ADDRESS, AGL_STAKING_ABI, provider);
      const [tokenAddress, totalRaw, rewardPoolRaw, tierCountRaw, paused] = await Promise.all([
        contract.aglToken(),
        contract.totalStaked(),
        contract.rewardPoolBalance(),
        contract.tierCount(),
        contract.paused()
      ]);

      const matchesExpectedToken = ethers.getAddress(tokenAddress) === ethers.getAddress(AGL_TOKEN_ADDRESS);
      setTokenMatch(matchesExpectedToken);
      if (!matchesExpectedToken) {
        throw new Error(`Staking contract token mismatch. Contract reports ${tokenAddress}; expected ${AGL_TOKEN_ADDRESS}. Reads are blocked to avoid displaying data for the wrong asset.`);
      }

      const token = new ethers.Contract(AGL_TOKEN_ADDRESS, ERC20_DECIMALS_ABI, provider);
      const decimals = Number(await token.decimals());
      if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
        throw new Error("AGL token returned an invalid decimals value.");
      }

      const tierCount = Number(tierCountRaw);
      if (!Number.isSafeInteger(tierCount) || tierCount < 0 || tierCount > 256) {
        throw new Error("The staking contract returned an unsupported tier count.");
      }

      const tierRows = await Promise.all(
        Array.from({ length: tierCount }, async (_, id) => {
          const tier = await contract.getTier(id);
          return {
            id,
            lockDuration: Number(tier.lockDuration ?? tier[0]),
            aprBasisPoints: Number(tier.aprBasisPoints ?? tier[1]),
            active: Boolean(tier.active ?? tier[2])
          };
        })
      );

      setTotalStaked(formatAgl(totalRaw, decimals));
      setRewardPool(formatAgl(rewardPoolRaw, decimals));
      setTiers(tierRows);
      setIsPaused(Boolean(paused));

      if (wallet.address && ethers.isAddress(wallet.address)) {
        const countRaw = await contract.positionCount(wallet.address);
        const count = Number(countRaw);
        if (!Number.isSafeInteger(count) || count < 0) {
          throw new Error("The staking contract returned an invalid position count.");
        }
        setPositionCount(count);

        // Limit a single refresh to the latest 50 positions to avoid excessive RPC calls.
        const firstIndex = Math.max(0, count - 50);
        const indices = Array.from({ length: count - firstIndex }, (_, offset) => firstIndex + offset);
        const parsed = await Promise.all(indices.map(async (id) => {
          const [position, rewardRaw, claimableRaw] = await Promise.all([
            contract.getPosition(wallet.address, id),
            contract.pendingReward(wallet.address, id),
            contract.totalClaimable(wallet.address, id)
          ]);
          return {
            id,
            amount: formatAgl(position.amount ?? position[0], decimals),
            startTime: Number(position.startTime ?? position[1]),
            unlockTime: Number(position.unlockTime ?? position[2]),
            tierId: Number(position.tierId ?? position[3]),
            aprBasisPoints: Number(position.aprBasisPoints ?? position[4]),
            withdrawn: Boolean(position.withdrawn ?? position[5]),
            pendingReward: formatAgl(rewardRaw, decimals),
            totalClaimable: formatAgl(claimableRaw, decimals)
          } satisfies PositionView;
        }));
        setPositions(parsed.reverse());
      } else {
        setPositionCount(null);
        setPositions([]);
      }

      setLastUpdated(new Date());
      addTerminalLog("success", "AGL_STAKING_READ: Tiered staking data refreshed from Base mainnet.");
    } catch (error: any) {
      console.error("AGL staking contract read failed:", error);
      setTotalStaked(null);
      setRewardPool(null);
      setTiers([]);
      setPositions([]);
      setPositionCount(null);
      setIsPaused(null);
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

  const now = Math.floor(Date.now() / 1000);

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
              <p className="text-xs text-zinc-400">Base Mainnet · Live contract reads</p>
            </div>
          </div>
          <button type="button" onClick={() => { onRefreshWallet(); void loadOnChainData(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-amber-200">Transaction controls are not enabled yet</div>
            <p className="text-xs leading-relaxed text-zinc-300">
              This dashboard now reads the tiered AGLStaking interface. Stake, approval, unstake, and emergency-exit actions remain disabled until the deployed bytecode and verified source are independently matched and transaction safeguards are reviewed. No transaction is submitted by this monitor.
            </p>
          </div>
        </div>

        {tokenMatch === true && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">
            On-chain asset check passed: the staking contract reports the configured AGL token address.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-400">Total principal staked</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{totalStaked ?? "Unavailable"} <span className="text-xs text-zinc-400">AGL</span></div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-400">Reward pool balance</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{rewardPool ?? "Unavailable"} <span className="text-xs text-zinc-400">AGL</span></div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400"><Wallet className="h-4 w-4" /> Your AGL wallet balance</div>
            <div className="mt-2 text-lg font-mono font-bold text-white">{Number(wallet.aglTokenBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} AGL</div>
            <p className="mt-1 text-[10px] text-zinc-500">Wallet balance supplied by the connected wallet context.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full border px-3 py-1 ${isPaused === false ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"}`}>
            {isPaused === null ? "Pause state unavailable" : isPaused ? "Staking paused" : "Staking active"}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-400">Chain ID 8453</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-400">Tiered fixed APY</span>
        </div>

        {readError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-xs text-red-300">
            Contract read failed: {readError}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Staking tiers</h3>
            <span className="text-[10px] text-zinc-500">{tiers.length} tiers returned by contract</span>
          </div>
          {tiers.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">Tier data will appear after a successful Base read.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tiers.map((tier) => (
                <div key={tier.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-300">Tier {tier.id}</span>
                    <span className={`text-[10px] font-bold ${tier.active ? "text-emerald-300" : "text-zinc-500"}`}>{tier.active ? "ACTIVE" : "INACTIVE"}</span>
                  </div>
                  <div className="mt-3 text-2xl font-mono font-bold text-white">{(tier.aprBasisPoints / 100).toFixed(2)}%</div>
                  <div className="mt-1 text-xs text-zinc-400">APY · {formatDuration(tier.lockDuration)}</div>
                  <div className="mt-2 text-[10px] text-zinc-500">{tier.aprBasisPoints.toLocaleString()} basis points</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Your on-chain positions</h3>
            <span className="text-[10px] text-zinc-500">{positionCount === null ? "Connect wallet" : `${positionCount} total positions`}</span>
          </div>

          {!wallet.address ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
              Connect a wallet to read your staking positions. Global contract reads remain available.
            </div>
          ) : positions.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
              {loading ? "Reading positions from Base..." : "No positions found for this wallet."}
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => {
                const matured = !position.withdrawn && now >= position.unlockTime;
                const status = position.withdrawn ? "Withdrawn" : matured ? "Matured · Ready to unstake" : "Locked";
                return (
                  <div key={position.id} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">Position #{position.id}</span>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${position.withdrawn ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" : matured ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>{status}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                      <div><div className="text-zinc-500">Principal</div><div className="mt-1 font-mono text-white">{position.amount} AGL</div></div>
                      <div><div className="text-zinc-500">Locked tier</div><div className="mt-1 font-mono text-white">Tier {position.tierId} · {(position.aprBasisPoints / 100).toFixed(2)}% APY</div></div>
                      <div><div className="text-zinc-500">Started</div><div className="mt-1 text-zinc-300">{formatDate(position.startTime)}</div></div>
                      <div><div className="text-zinc-500">Unlock time</div><div className="mt-1 text-zinc-300">{formatDate(position.unlockTime)}</div></div>
                    </div>
                    <div className="grid gap-3 border-t border-white/5 pt-3 sm:grid-cols-2 text-xs">
                      <div><span className="text-zinc-500">Accrued reward: </span><span className="font-mono font-bold text-emerald-300">{position.pendingReward} AGL</span></div>
                      <div><span className="text-zinc-500">Principal + reward: </span><span className="font-mono font-bold text-white">{position.totalClaimable} AGL</span></div>
                    </div>
                    <p className="text-[10px] text-zinc-500">The APR shown is snapshotted from this position; later tier changes do not alter it.</p>
                  </div>
                );
              })}
            </div>
          )}
          {positionCount !== null && positionCount > 50 && (
            <p className="text-[10px] text-zinc-500">Showing the latest 50 of {positionCount} positions to limit RPC load.</p>
          )}
        </section>

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
