import { useState } from "react";
import useSWR from "swr";
import type { User } from "firebase/auth";
import { ArrowUpRight, CheckCircle2, Clipboard, FileText, LoaderCircle, LockKeyhole, RefreshCw } from "lucide-react";

type CustomerInquiry = {
  id: string;
  reference: string;
  projectName: string;
  service: string;
  status: string;
  createdAt: string | null;
  quote: null | {
    amountUsdCents: number;
    scope: string;
    deliveryWindow?: string;
    aglAmount?: string | null;
    expiresAt: string;
  };
};

type CustomerOrder = {
  id: string;
  invoiceReference: string;
  inquiryId: string;
  projectName: string;
  amountUsdCents: number;
  amountTokenUnits: string;
  tokenDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  treasuryAddress: string;
  chainId: number;
  paymentMethod: "USDC" | "AGL";
  paymentStatus: string;
  status: string;
  transactionHash: string | null;
  confirmationCount: number | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
};

type WorkspaceData = { inquiries: CustomerInquiry[]; orders: CustomerOrder[] };

export default function CustomerWorkspace({ user }: { user: User | null }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [transactionHashes, setTransactionHashes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});
  const key = user ? (["/api/revenue/workspace", user.uid] as const) : null;

  const { data, error, isLoading, mutate } = useSWR<WorkspaceData>(key, async ([url]) => {
    if (!user) throw new Error("Sign in to view your project workspace.");
    const token = await user.getIdToken();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Could not load your project workspace.");
    return result;
  });

  async function createOrder(inquiry: CustomerInquiry, paymentMethod: "USDC" | "AGL") {
    if (!user) return;
    setBusyId(inquiry.id);
    setActionError((current) => ({ ...current, [inquiry.id]: "" }));
    setActionStatus((current) => ({ ...current, [inquiry.id]: "" }));
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/revenue/inquiries/${encodeURIComponent(inquiry.id)}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentMethod }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not create the invoice.");
      setActionStatus((current) => ({ ...current, [inquiry.id]: `Invoice ${result.order.invoiceReference} created. Payment is not marked complete until its Base transaction is verified.` }));
      await mutate();
    } catch (requestError) {
      setActionError((current) => ({ ...current, [inquiry.id]: requestError instanceof Error ? requestError.message : "Could not create the invoice." }));
    } finally {
      setBusyId(null);
    }
  }

  async function verifyPayment(order: CustomerOrder) {
    if (!user) return;
    setBusyId(order.id);
    setActionError((current) => ({ ...current, [order.id]: "" }));
    setActionStatus((current) => ({ ...current, [order.id]: "" }));
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/revenue/orders/${encodeURIComponent(order.id)}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transactionHash: transactionHashes[order.id] || "" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Payment could not be verified.");
      setActionStatus((current) => ({ ...current, [order.id]: `Payment verified on Base with ${result.confirmationCount} confirmations.` }));
      await mutate();
    } catch (requestError) {
      setActionError((current) => ({ ...current, [order.id]: requestError instanceof Error ? requestError.message : "Payment could not be verified." }));
    } finally {
      setBusyId(null);
    }
  }

  async function copyValue(id: string, label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setActionStatus((current) => ({ ...current, [id]: `${label} copied.` }));
    } catch {
      setActionError((current) => ({ ...current, [id]: "Clipboard access is unavailable. Select and copy the address manually." }));
    }
  }

  if (!user) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0d0c] p-4 sm:p-6" aria-labelledby="project-workspace-title">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">Private project workspace</p><h2 id="project-workspace-title" className="mt-2 font-display text-xl font-semibold text-white">Your inquiries and invoices</h2><p className="mt-1 text-xs text-zinc-500">Only records linked to your verified Google account are returned.</p></div>
        <button type="button" onClick={() => void mutate()} disabled={isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      {isLoading && <p className="flex items-center gap-2 py-3 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your workspace…</p>}
      {error && <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">{error.message}</p>}
      {!isLoading && !error && data && data.inquiries.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-5 text-center"><FileText className="mx-auto h-5 w-5 text-zinc-500" /><p className="mt-2 text-sm text-zinc-300">No project inquiries yet.</p><p className="mt-1 text-xs text-zinc-500">Submit the form below to get started.</p></div>}

      {data?.inquiries.map((inquiry) => {
        const existingOrder = data.orders.find((order) => order.inquiryId === inquiry.id);
        const quoteExpired = inquiry.quote ? Date.parse(inquiry.quote.expiresAt) <= Date.now() : false;
        return <article key={inquiry.id} className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-emerald-300">{inquiry.reference}</p><h3 className="mt-1 text-sm font-semibold text-white">{inquiry.projectName}</h3><p className="mt-1 text-xs text-zinc-500">{inquiry.service} · <time>{inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString() : "Recently submitted"}</time></p></div><span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] capitalize text-zinc-300">{inquiry.status}</span></div>

          {inquiry.quote && <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.04] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-sm font-semibold text-white">Reviewed project quote</h4><p className="font-mono text-lg font-semibold text-emerald-200">{formatUsd(inquiry.quote.amountUsdCents)} <span className="text-xs font-normal text-zinc-500">USD reference</span></p></div>
            <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-zinc-300">{inquiry.quote.scope}</p>
            {inquiry.quote.deliveryWindow && <p className="mt-2 text-xs text-zinc-400">Delivery window: {inquiry.quote.deliveryWindow}</p>}
            <p className="mt-2 text-[11px] text-zinc-500">Quote expires {new Date(inquiry.quote.expiresAt).toLocaleDateString()}. The AGL amount, when offered, is negotiated directly and is not calculated from an assumed AGL/USD rate.</p>
            {!existingOrder && <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => void createOrder(inquiry, "USDC")} disabled={busyId === inquiry.id || quoteExpired} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-2.5 text-sm font-semibold text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">{busyId === inquiry.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Approve quote · invoice in USDC</button>
              {inquiry.quote.aglAmount && <button type="button" onClick={() => void createOrder(inquiry, "AGL")} disabled={busyId === inquiry.id || quoteExpired} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-300/30 px-3 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-50">Approve quote · invoice in AGL</button>}
            </div>}
            {quoteExpired && !existingOrder && <p className="mt-2 text-xs text-amber-200">This quote has expired. Ask the project team for an updated quote.</p>}
          </div>}

          {actionError[inquiry.id] && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-xs text-red-200">{actionError[inquiry.id]}</p>}
          {actionStatus[inquiry.id] && <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3 text-xs text-emerald-200">{actionStatus[inquiry.id]}</p>}
          {existingOrder && <InvoiceCard order={existingOrder} busy={busyId === existingOrder.id} transactionHash={transactionHashes[existingOrder.id] || ""} onHashChange={(value) => setTransactionHashes((current) => ({ ...current, [existingOrder.id]: value }))} onVerify={() => void verifyPayment(existingOrder)} onCopy={(label, value) => void copyValue(existingOrder.id, label, value)} error={actionError[existingOrder.id]} status={actionStatus[existingOrder.id]} />}
        </article>;
      })}
    </section>
  );
}

function InvoiceCard({ order, busy, transactionHash, onHashChange, onVerify, onCopy, error, status }: { order: CustomerOrder; busy: boolean; transactionHash: string; onHashChange: (value: string) => void; onVerify: () => void; onCopy: (label: string, value: string) => void; error?: string; status?: string }) {
  const paid = order.paymentStatus === "paid";
  return <div className="space-y-4 rounded-xl border border-white/10 bg-[#070908] p-4" aria-labelledby={`invoice-${order.id}`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-[10px] text-emerald-300">{order.invoiceReference}</p><h4 id={`invoice-${order.id}`} className="mt-1 flex items-center gap-2 text-sm font-semibold text-white"><FileText className="h-4 w-4 text-zinc-400" />Invoice · {order.paymentMethod} on Base</h4></div><span className={`rounded-full border px-3 py-1.5 text-[11px] ${paid ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-200" : "border-amber-300/20 bg-amber-300/5 text-amber-100"}`}>{paid ? "Payment verified" : "Awaiting payment"}</span></div>
    <p className="font-mono text-xl font-semibold text-white">{formatUnits(order.amountTokenUnits, order.tokenDecimals)} <span className="text-sm text-zinc-400">{order.tokenSymbol}</span></p>
    <p className="text-[11px] leading-5 text-zinc-500">USD quote reference: {formatUsd(order.amountUsdCents)} · no token exchange rate is implied. Due {order.dueAt ? new Date(order.dueAt).toLocaleDateString() : "within 7 days"}.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <AddressRow label="Treasury recipient" value={order.treasuryAddress} onCopy={() => onCopy("Treasury address", order.treasuryAddress)} />
      <AddressRow label={`${order.tokenSymbol} contract`} value={order.tokenAddress} onCopy={() => onCopy("Token contract", order.tokenAddress)} />
    </div>
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-400"><LockKeyhole className="h-4 w-4 shrink-0 text-emerald-300" />Send only this exact token amount on Base Mainnet. A payment is recorded only after the server checks the transaction receipt, token Transfer event, recipient, exact amount and confirmation policy.</div>
    {!paid && <form onSubmit={(event) => { event.preventDefault(); onVerify(); }} className="flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor={`hash-${order.id}`}>Base transaction hash</label><input id={`hash-${order.id}`} value={transactionHash} onChange={(event) => onHashChange(event.target.value)} placeholder="0x… transaction hash" autoCapitalize="none" autoCorrect="off" spellCheck={false} required pattern="0x[a-fA-F0-9]{64}" className="min-h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 py-3 font-mono text-base text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/50" /><button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-300 disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}Verify payment</button></form>}
    {order.transactionHash && <a href={`https://basescan.org/tx/${order.transactionHash}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-xs text-emerald-200 hover:text-emerald-100">View verified transaction <ArrowUpRight className="h-3.5 w-3.5" /></a>}
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-xs text-red-200">{error}</p>}
    {status && <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3 text-xs text-emerald-200">{status}</p>}
    {paid && <p className="flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />Verified on Base · {order.confirmationCount} confirmations</p>}
  </div>;
}

function AddressRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return <div className="min-w-0 rounded-lg border border-white/10 p-3"><p className="text-[10px] text-zinc-500">{label}</p><div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-5 text-zinc-200">{value}</code><button type="button" onClick={onCopy} aria-label={`Copy ${label}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"><Clipboard className="h-4 w-4" /></button></div></div>;
}

function formatUsd(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
}

function formatUnits(amount: string, decimals: number) {
  const units = BigInt(amount);
  const scale = 10n ** BigInt(decimals);
  const whole = units / scale;
  const fraction = (units % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}
