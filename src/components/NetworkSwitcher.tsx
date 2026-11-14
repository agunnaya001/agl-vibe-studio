import { useState, type ChangeEvent } from "react";
import { AlertTriangle, ChevronDown, LoaderCircle } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { getChainConfig, SUPPORTED_CHAINS } from "../lib/chains";

interface NetworkSwitcherProps {
  className?: string;
}

export default function NetworkSwitcher({ className = "" }: NetworkSwitcherProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const activeChain = getChainConfig(chainId);

  const handleNetworkChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextChainId = Number(event.target.value);
    if (!isConnected || !SUPPORTED_CHAINS.some((chain) => chain.id === nextChainId)) return;

    setSwitchError(null);
    setIsSwitching(true);
    try {
      await switchChainAsync({ chainId: nextChainId });
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message.slice(0, 180) : "The wallet could not switch networks.");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className={`min-w-0 ${className}`}>
      <label className="sr-only" htmlFor="active-network-select">Active EVM network</label>
      <div className="relative flex h-11 min-w-[148px] items-center rounded-lg border border-white/10 bg-black/60">
        <span aria-hidden="true" className="ml-3 shrink-0 rounded bg-blue-500/15 px-1.5 py-1 text-[9px] font-bold text-blue-300">
          {activeChain?.logoLabel ?? "EVM"}
        </span>
        <select
          id="active-network-select"
          value={activeChain?.id ?? ""}
          disabled={!isConnected || isSwitching}
          onChange={handleNetworkChange}
          className="h-full min-w-0 flex-1 appearance-none bg-transparent py-2 pl-2 pr-8 text-xs font-semibold text-white outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-describedby={switchError ? "network-switch-error" : undefined}
        >
          {!activeChain && <option value="">Unsupported network ({chainId})</option>}
          {SUPPORTED_CHAINS.map((chain) => (
            <option key={chain.id} value={chain.id} className="bg-zinc-950 text-white">
              {chain.badgeLabel}
              {chain.isPrimary ? " · Primary" : ""}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 text-zinc-400">
          {isSwitching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>
      {switchError ? (
        <p id="network-switch-error" role="alert" className="mt-1 max-w-52 text-[10px] text-rose-300">
          {switchError}
        </p>
      ) : activeChain && !activeChain.features.aglContracts ? (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-300">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          AGL contract capabilities are unverified on this network.
        </p>
      ) : !isConnected ? (
        <p className="mt-1 text-[10px] text-zinc-500">Connect a wallet to switch networks.</p>
      ) : null}
    </div>
  );
}
