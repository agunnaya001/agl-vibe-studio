import { AlertCircle, Gauge, HelpCircle } from "lucide-react";
import { WalletState } from "../types";

interface GasDashboardPageProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const unavailableMetrics = [
  { label: "Base gas price", detail: "Live oracle data is unavailable." },
  { label: "Network congestion", detail: "No verified network sample is available." },
  { label: "Sponsored gas usage", detail: "No paymaster integration is configured." },
];

export default function GasDashboardPage(_props: GasDashboardPageProps) {
  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-white/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-display font-bold text-white">
            <Gauge className="h-5 w-5 text-brand-purple" /> Paymaster &amp; Gas Dashboard
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Network and sponsorship metrics are shown only when verified data is available.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300" role="status">
          <AlertCircle className="h-4 w-4" /> Data unavailable
        </span>
      </header>

      <section aria-label="Gas and sponsorship metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {unavailableMetrics.map((metric) => (
          <article key={metric.label} className="space-y-3 rounded-2xl border border-white/5 bg-[#0e0e11] p-5">
            <h3 className="text-xs font-mono text-zinc-400">{metric.label}</h3>
            <p className="text-2xl font-bold text-zinc-300">Unavailable</p>
            <p className="border-t border-white/5 pt-3 text-xs leading-relaxed text-zinc-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5" aria-labelledby="gas-status-title">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div className="space-y-2">
            <h3 id="gas-status-title" className="font-semibold text-amber-100">Sponsored gas claims are disabled</h3>
            <p className="text-sm leading-relaxed text-zinc-300">
              The app has no verified paymaster claim endpoint. No gas allowance, transaction, or sponsorship balance can be claimed or inferred from the connected wallet.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#0e0e11] p-5" aria-labelledby="gas-help-title">
        <h3 id="gas-help-title" className="flex items-center gap-2 text-sm font-semibold text-white">
          <HelpCircle className="h-4 w-4 text-brand-purple" /> About gas estimates
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Transaction fees depend on the current network fee data and the transaction&apos;s measured gas limit. This dashboard does not currently have a verified feed or paymaster connection, so it does not display estimates, historical charts, or transaction records.
        </p>
      </section>
    </main>
  );
}
