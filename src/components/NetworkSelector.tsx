import { useEffect, useState } from "react";
import { Check, ChevronDown, AlertTriangle } from "lucide-react";
import { BASE_NETWORKS, BaseNetwork, getNetwork } from "../lib/contracts";

interface NetworkSelectorProps {
  onNetworkChange?: (network: BaseNetwork) => void;
}

export default function NetworkSelector({ onNetworkChange }: NetworkSelectorProps) {
  const [network, setNetwork] = useState<BaseNetwork>(getNetwork());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.baseNetwork = network;
  }, [network]);

  const choose = (next: BaseNetwork) => {
    setNetwork(next);
    setOpen(false);
    onNetworkChange?.(next);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
      >
        <span className={`h-2 w-2 rounded-full ${network === "base" ? "bg-blue-400" : "bg-amber-400"}`} />
        {BASE_NETWORKS[network].name}
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-2xl">
          {(Object.keys(BASE_NETWORKS) as BaseNetwork[]).map((key) => (
            <button
              type="button"
              role="option"
              aria-selected={network === key}
              key={key}
              onClick={() => choose(key)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-xs text-zinc-200 hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${key === "base" ? "bg-blue-400" : "bg-amber-400"}`} />
                {BASE_NETWORKS[key].name}
              </span>
              {network === key && <Check className="h-4 w-4 text-emerald-400" />}
            </button>
          ))}
          {network === "base" && (
            <p className="flex gap-1.5 border-t border-white/10 px-3 py-2 text-[10px] leading-relaxed text-amber-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> Mainnet uses real funds.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
