import React, { useState, type FormEvent } from "react";
import useSWR from "swr";
import type { User } from "firebase/auth";
import { ArrowUpRight, Check, ChevronDown, CircleDollarSign, FileText, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";

type Inquiry = {
  id: string;
  reference: string;
  name: string;
  email: string;
  projectName: string;
  service: string;
  network: string;
  description: string;
  deliveryDate: string;
  budget: string;
  repository: string;
  status: string;
  createdAt: string | null;
  quote: { amountUsdCents: number; scope: string; deliveryWindow?: string; aglAmount?: string | null; expiresAt: string } | null;
};

type Order = {
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

type Overview = {
  recentInquiryCount: number;
  recentOrderCount: number;
  paidOrders: number;
  pendingOrders: number;
  usdcReceivedUnits: string;
  aglReceipts: Array<{ tokenAddress: string; decimals: number; units: string }>;
  inquiries: Inquiry[];
  orders: Order[];
};

export default function RevenueAdminPage({ user, onSignIn }: { user: User | null; onSignIn: () => void }) {
  const key = user ? (["/api/revenue/admin/overview", user.uid] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<Overview>(key, async ([url]) => adminRequest(user, url));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-10 text-zinc-100">
      <header className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-[radial-gradient(ellipse_at_top_right,rgba(34,197,94,0.15),transparent_48%),#0b0e0c] p-5 sm:p-8">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300"><ShieldCheck className="h-4 w-4" /> Founder access · verified account required</p><h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">Services &amp; Revenue Console</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Private inquiry management, approved quotes, invoices and verified Base receipts. Settlement totals are grouped by token; AGL is never converted to USD here.</p></div>
          <button type="button" onClick={() => void mutate()} disabled={isLoading || !user} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />Refresh console</button>
        </div>
      </header>

      {!user && <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><h2 className="font-display text-lg font-semibold text-white">Sign in to verify founder access</h2><p className="mt-2 text-sm text-zinc-400">Use the Google account configured in the server-side admin allowlist. Access is re-checked on every request.</p><button type="button" onClick={onSignIn} className="mt-4 min-h-11 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black">Continue with Google</button></div>}
      {isLoading && <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b0d0c] p-4 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" />Verifying access and loading records…</p>}
      {error && <div role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm font-semibold text-amber-100">{error.message.includes("403") ? "This account is not on the founder allowlist." : error.message.includes("401") ? "Sign in again to continue." : error.message}</p><p className="mt-1 text-xs leading-5 text-zinc-500">Inquiry details and invoices are never sent to this page until the server verifies your Google account against the private admin allowlist.</p></div>}

      {data && <>
        <section aria-label="Settlement overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={CircleDollarSign} label="USDC received · latest 500 orders" value={`${formatUnits(data.usdcReceivedUnits, 6)} USDC`} detail="Token units; no fiat valuation inferred" />
          <Metric icon={WalletCards} label="Verified AGL received" value={data.aglReceipts.length ? data.aglReceipts.map((receipt) => `${formatUnits(receipt.units, receipt.decimals)} AGL · ${receipt.tokenAddress.slice(0, 6)}…`).join(" · ") : "0 AGL"} detail="Token units only; no USD rate assumed" />
          <Metric icon={Check} label="Paid orders · latest 500" value={data.paidOrders.toLocaleString()} detail={`${data.recentOrderCount} orders loaded`} />
          <Metric icon={FileText} label="Awaiting payment" value={data.pendingOrders.toLocaleString()} detail={`${data.recentInquiryCount} inquiries loaded`} />
        </section>
        <p className="text-[11px] text-zinc-600">Overview covers the latest 500 orders and 100 inquiries. USDC and AGL totals are shown in native token units, not fiat conversions.</p>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0d0c] p-4 sm:p-6" aria-labelledby="inquiry-queue-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">Latest 100</p><h2 id="inquiry-queue-heading" className="mt-1 font-display text-xl font-semibold text-white">Project inquiry queue</h2></div><span className="text-xs text-zinc-500">Private customer details · server-authorized</span></div>
          {!data.inquiries.length && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">No inquiries have been submitted yet.</p>}
          <div className="space-y-3">{data.inquiries.map((inquiry) => <div key={inquiry.id}><InquiryCard inquiry={inquiry} user={user!} onSaved={() => void mutate()} /></div>)}</div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0d0c] p-4 sm:p-6" aria-labelledby="orders-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">Latest 100</p><h2 id="orders-heading" className="mt-1 font-display text-xl font-semibold text-white">Invoices &amp; on-chain receipts</h2></div><span className="text-xs text-zinc-500">Only confirmed token transfers count as paid</span></div>
          {!data.orders.length && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">Approved quotes will appear here after a customer accepts.</p>}
          <div className="space-y-3">{data.orders.map((order) => {
            const customer = data.inquiries.find((item) => item.id === order.inquiryId);
            return <div key={order.id}><OrderCard order={order} customer={customer} user={user!} onSaved={() => void mutate()} /></div>;
          })}</div>
        </section>
      </>}
    </div>
  );
}

function InquiryCard({ inquiry, user, onSaved }: { inquiry: Inquiry; user: User; onSaved: () => void }) {
  const [status, setStatus] = useState(inquiry.status);
  const [amount, setAmount] = useState(inquiry.quote ? (inquiry.quote.amountUsdCents / 100).toFixed(2) : "");
  const [scope, setScope] = useState(inquiry.quote?.scope || "");
  const [deliveryWindow, setDeliveryWindow] = useState(inquiry.quote?.deliveryWindow || "");
  const [aglAmount, setAglAmount] = useState(inquiry.quote?.aglAmount || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canQuote = ["new", "reviewing", "quoted"].includes(inquiry.status);

  async function saveQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await adminRequest(user, "/api/revenue/admin/quotes", {
        method: "POST",
        body: JSON.stringify({ inquiryId: inquiry.id, amountUsdCents: toCents(amount), scope, deliveryWindow, aglAmount }),
      });
      setStatus(response.status);
      setMessage("Quote saved. It is now visible only to the verified inquiry owner.");
      onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save this quote.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(nextStatus: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRequest(user, `/api/revenue/admin/inquiries/${encodeURIComponent(inquiry.id)}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      setStatus(nextStatus);
      onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update the inquiry.");
    } finally {
      setBusy(false);
    }
  }

  return <article className="rounded-xl border border-white/10 bg-black/20 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-mono text-[10px] text-emerald-300">{inquiry.reference} · {new Date(inquiry.createdAt || Date.now()).toLocaleDateString()}</p><h3 className="mt-1 text-sm font-semibold text-white">{inquiry.projectName}</h3><p className="mt-1 break-words text-xs text-zinc-400">{inquiry.name} · <a href={`mailto:${encodeURIComponent(inquiry.email)}`} className="text-emerald-200 underline decoration-white/20 underline-offset-2">{inquiry.email}</a></p><p className="mt-1 text-xs text-zinc-500">{inquiry.service} · {inquiry.network} · budget {inquiry.budget || "not specified"}</p></div><label className="flex min-h-11 items-center gap-2 text-xs text-zinc-400"><span>Status</span><select value={status} onChange={(event) => void updateStatus(event.target.value)} disabled={busy || !["new", "reviewing", "closed"].includes(status)} className="min-h-11 rounded-lg border border-white/10 bg-[#070908] px-3 text-base text-white"><option value="new">New</option><option value="reviewing">Reviewing</option><option value="closed">Closed</option>{status === "quoted" && <option value="quoted">Quoted</option>}{status === "converted" && <option value="converted">Converted</option>}</select></label></div>
    <details className="mt-4 rounded-lg border border-white/10 bg-[#080a09] p-3"><summary className="cursor-pointer list-none text-xs font-medium text-zinc-300"><span className="inline-flex min-h-8 items-center gap-2"><ChevronDown className="h-3.5 w-3.5" />Project brief and delivery context</span></summary><div className="mt-2 space-y-2 border-t border-white/10 pt-3 text-xs leading-5 text-zinc-400"><p className="whitespace-pre-wrap">{inquiry.description}</p><p>Requested delivery: {inquiry.deliveryDate || "Not specified"}</p>{inquiry.repository && <p className="break-all">Repository: {inquiry.repository}</p>}</div></details>
    {inquiry.quote && <p className="mt-3 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.03] p-3 text-xs text-emerald-100">Current quote: {formatUsd(inquiry.quote.amountUsdCents)} USD · expires {new Date(inquiry.quote.expiresAt).toLocaleDateString()}{inquiry.quote.aglAmount ? ` · manually quoted at ${inquiry.quote.aglAmount} AGL` : ""}</p>}
    {canQuote && <form onSubmit={saveQuote} className="mt-4 space-y-3 border-t border-white/10 pt-4"><div><h4 className="text-xs font-semibold text-white">{inquiry.quote ? "Update quote" : "Prepare a reviewed quote"}</h4><p className="mt-1 text-[11px] leading-5 text-zinc-500">The quote is not an invoice. Customer acceptance creates an invoice; AGL units are separately negotiated and are never derived from USD.</p></div><div className="grid gap-3 sm:grid-cols-2"><Field label="USD quote" value={amount} onChange={setAmount} type="number" min="0.01" step="0.01" placeholder="125.00" required /><Field label="Delivery window" value={deliveryWindow} onChange={setDeliveryWindow} placeholder="e.g. 2–3 weeks" /><Field label="Optional negotiated AGL amount" value={aglAmount} onChange={setAglAmount} type="text" inputMode="decimal" placeholder="Leave blank to omit AGL" /><div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-5 text-zinc-500">Entering an AGL amount requires the configured Base AGL contract to pass an on-chain code, symbol and decimals check.</div></div><label className="block space-y-1.5"><span className="block text-xs font-medium text-zinc-300">Approved scope <span className="text-emerald-300">*</span></span><textarea value={scope} onChange={(event) => setScope(event.target.value)} required minLength={20} maxLength={5000} rows={4} placeholder="Describe included work, deliverables, assumptions, exclusions and acceptance criteria." className="w-full rounded-xl border border-white/10 bg-[#050706] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/50" /></label><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-300 disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{inquiry.quote ? "Save updated quote" : "Issue quote"}</button></form>}
    {error && <p role="alert" className="mt-3 rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-xs text-red-200">{error}</p>}{message && <p role="status" className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3 text-xs text-emerald-200">{message}</p>}
  </article>;
}

function OrderCard({ order, customer, user, onSaved }: { order: Order; customer?: Inquiry; user: User; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canAdvance = order.paymentStatus === "paid" && order.status !== "delivered";
  const nextStatus = order.status === "paid" ? "in_progress" : "delivered";
  const nextLabel = nextStatus === "in_progress" ? "Start delivery" : "Mark delivered";

  async function advanceOrder() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRequest(user, `/api/revenue/admin/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      setMessage(`Order status updated to ${nextStatus.replace("_", " ")}.`);
      onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update order status.");
    } finally {
      setBusy(false);
    }
  }

  return <article className="grid gap-4 rounded-xl border border-white/10 bg-black/20 p-4 lg:grid-cols-[1fr_auto] lg:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[10px] text-emerald-300">{order.invoiceReference}</p><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] capitalize text-zinc-300">{order.status.replaceAll("_", " ")}</span><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-zinc-300">{order.paymentStatus.replaceAll("_", " ")}</span></div><h3 className="mt-2 text-sm font-semibold text-white">{order.projectName}</h3><p className="mt-1 text-xs text-zinc-400">{customer ? `${customer.name} · ${customer.email}` : "Customer inquiry is outside latest 100"}</p><p className="mt-2 font-mono text-base text-white">{formatUnits(order.amountTokenUnits, order.tokenDecimals)} {order.tokenSymbol}<span className="ml-2 text-xs text-zinc-500">USD quote ref {formatUsd(order.amountUsdCents)}</span></p><div className="mt-3 grid gap-2 text-[11px] leading-5 text-zinc-500 sm:grid-cols-2"><p className="break-all">Treasury: <code className="text-zinc-300">{order.treasuryAddress}</code></p><p className="break-all">Token: <code className="text-zinc-300">{order.tokenAddress}</code></p>{order.transactionHash && <p className="sm:col-span-2"><a href={`https://basescan.org/tx/${order.transactionHash}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-emerald-200 hover:text-emerald-100">Verified transaction · {order.confirmationCount} confirmations <ArrowUpRight className="h-3.5 w-3.5" /></a></p>}</div></div>{canAdvance && <button type="button" onClick={() => void advanceOrder()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300/25 px-4 py-2.5 text-sm text-emerald-200 hover:bg-emerald-300/5 disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{nextLabel}</button>}{error && <p role="alert" className="text-xs text-red-200 lg:col-span-2">{error}</p>}{message && <p role="status" className="text-xs text-emerald-200 lg:col-span-2">{message}</p>}</article>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof CircleDollarSign; label: string; value: string; detail: string }) {
  return <article className="min-w-0 rounded-2xl border border-white/10 bg-[#0b0d0c] p-4"><div className="flex items-center gap-2 text-emerald-300"><Icon className="h-4 w-4" /><h2 className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</h2></div><p className="mt-3 break-words font-mono text-xl font-semibold text-white">{value}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{detail}</p></article>;
}

function Field({ label, value, onChange, type = "text", min, step, inputMode, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; step?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; placeholder?: string; required?: boolean }) {
  return <label className="space-y-1.5"><span className="block text-xs font-medium text-zinc-300">{label}</span><input type={type} inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className="min-h-12 w-full rounded-xl border border-white/10 bg-[#050706] px-3 py-3 text-base text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/50" /></label>;
}

async function adminRequest(user: User | null, url: string, init: RequestInit = {}) {
  if (!user) throw new Error("Sign in with a verified Google account.");
  const token = await user.getIdToken();
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status === 403 ? "403 · " : response.status === 401 ? "401 · " : ""}${result.error || "Request could not be completed."}`);
  return result;
}

function toCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Enter a USD amount with no more than two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function formatUsd(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
}

function formatUnits(units: string, decimals: number) {
  const raw = BigInt(units);
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}
