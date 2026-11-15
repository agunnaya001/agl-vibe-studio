import { useState } from "react";
import useSWR from "swr";
import type { User } from "firebase/auth";
import { Bell, CircleCheck, LoaderCircle, Mail, ShieldCheck } from "lucide-react";

type Preferences = { dao: boolean; staking: boolean; credits: boolean; general: boolean; marketing: boolean; security: true };
const items: Array<{ key: keyof Omit<Preferences, "security">; label: string; description: string }> = [
  { key: "dao", label: "DAO governance", description: "Proposal announcements, voting reminders, results and execution confirmations." },
  { key: "staking", label: "Staking activity", description: "Confirmed staking, unstaking, reward claims and position changes." },
  { key: "credits", label: "AGL Credits", description: "Receipts for verified AGL Credits purchases." },
  { key: "general", label: "Account and transactions", description: "Welcome, account verification and transaction status messages." },
  { key: "marketing", label: "Optional updates", description: "Product news and promotional messages. Off by default." },
];

export default function EmailPreferencesPage({ user, onSignIn }: { user: User | null; onSignIn: () => void }) {
  const key = user ? (["/api/email/preferences", user.uid] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<{ preferences: Preferences }>(key, async ([url]) => request(user, url));
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  async function updatePreference(category: keyof Omit<Preferences, "security">) {
    if (!user || !data || saving) return;
    const preferences = { ...data.preferences, [category]: !data.preferences[category] };
    setSaving(category);
    setMessage("");
    setSaveError("");
    try {
      const result = await request(user, "/api/email/preferences", { method: "PUT", body: JSON.stringify({ preferences }) });
      await mutate({ preferences: result.preferences }, { revalidate: false });
      setMessage("Your email preferences have been saved.");
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : "Preferences could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  return <div className="mx-auto w-full max-w-3xl space-y-6 pb-12 text-zinc-100">
    <header className="rounded-3xl border border-lime-300/15 bg-[radial-gradient(ellipse_at_top_right,rgba(163,230,53,0.12),transparent_50%),#0b0d0c] p-5 sm:p-8">
      <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-lime-300"><Mail className="h-4 w-4" /> Your account</p>
      <h1 className="mt-3 font-display text-2xl font-semibold text-white">Email preferences</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">Choose which AGL Studio updates you receive. Preference changes are saved to your account and checked before eligible messages are sent.</p>
    </header>

    {!user && <section className="rounded-2xl border border-white/10 bg-[#0b0d0c] p-5"><p className="text-sm text-zinc-300">Sign in with your verified Google account to manage your email preferences.</p><button type="button" onClick={onSignIn} className="mt-4 min-h-11 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-zinc-950">Continue with Google</button></section>}
    {user && isLoading && <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b0d0c] p-4 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your preferences…</p>}
    {user && error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">{error.message}</p>}
    {user && data && <section aria-label="Email notification categories" className="space-y-3">
      {items.map((item) => {
        const enabled = data.preferences[item.key];
        const active = saving === item.key;
        return <article key={item.key} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b0d0c] p-4 sm:items-center sm:p-5">
          <div className="min-w-0"><h2 className="text-sm font-semibold text-white">{item.label}</h2><p className="mt-1 text-xs leading-5 text-zinc-400">{item.description}</p></div>
          <button type="button" role="switch" aria-checked={enabled} aria-label={`${item.label} email`} onClick={() => void updatePreference(item.key)} disabled={Boolean(saving)} className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full border p-1 transition-colors disabled:cursor-wait disabled:opacity-60 ${enabled ? "border-lime-300/30 bg-lime-300/20" : "border-white/15 bg-white/5"}`}>
            <span className={`h-7 w-7 rounded-full transition-transform ${enabled ? "translate-x-5 bg-lime-300" : "translate-x-0 bg-zinc-500"}`} />
            <span className="sr-only">{active ? "Saving" : enabled ? "On" : "Off"}</span>
          </button>
        </article>;
      })}
      <article className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0b0d0c] p-4 sm:p-5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" /><div><h2 className="text-sm font-semibold text-white">Essential security notices</h2><p className="mt-1 text-xs leading-5 text-zinc-400">Account security notices, verification and password reset instructions stay enabled so you can protect and access your account.</p></div><span className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-xs text-sky-200"><CircleCheck className="h-4 w-4" />Always on</span></article>
      {message && <p role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/5 p-3 text-sm text-lime-100">{message}</p>}
      {saveError && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm text-red-200">{saveError}</p>}
      <button type="button" onClick={() => void mutate()} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-medium text-zinc-300 hover:bg-white/5">Refresh preferences</button>
    </section>}
    <p className="text-[11px] leading-5 text-zinc-600"><Bell className="mr-1 inline h-3.5 w-3.5" />You can unsubscribe from optional marketing emails at any time. AGL Studio will never ask you for your password, private key or recovery phrase by email.</p>
  </div>;
}

async function request(user: User | null, url: string, init: RequestInit = {}) {
  if (!user) throw new Error("Sign in to manage your email preferences.");
  const token = await user.getIdToken();
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Email preferences could not be loaded.");
  return result;
}
