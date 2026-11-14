import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, CircleHelp, Code2, Layers3, LockKeyhole, Mail, ShieldCheck, WalletCards } from "lucide-react";
import type { User } from "firebase/auth";
import CustomerWorkspace from "../components/CustomerWorkspace";

type ServiceId = "contracts" | "wallet" | "dapp";

type ServicesPageProps = {
  firebaseUser: User | null;
  onSignIn: () => void;
  initialService?: string | null;
};

const services: Array<{
  id: ServiceId;
  title: string;
  price: number;
  summary: string;
  icon: typeof Code2;
  deliverables: string[];
}> = [
  {
    id: "contracts",
    title: "Base Smart Contract Development",
    price: 125,
    summary: "From a scoped specification to a Base-ready Solidity implementation and deployment handoff.",
    icon: Code2,
    deliverables: ["Requirements review", "Solidity implementation", "Base network configuration", "Deployment preparation", "Contract interaction documentation"],
  },
  {
    id: "wallet",
    title: "Web3 Wallet Integration",
    price: 100,
    summary: "Connect users to your dApp with clear wallet discovery, network handling and transaction feedback.",
    icon: WalletCards,
    deliverables: ["EIP-1193 provider support", "EIP-6963 multi-wallet discovery", "Wagmi integration where compatible", "WalletConnect where configured", "Base network and transaction errors"],
  },
  {
    id: "dapp",
    title: "Base dApp Integration",
    price: 150,
    summary: "Bring an existing contract into your product with readable, responsive on-chain interactions.",
    icon: Layers3,
    deliverables: ["Frontend integration", "ABI integration", "Read and write interactions", "Transaction status interface", "Mobile-responsive implementation"],
  },
];

const serviceLabels: Record<ServiceId, string> = {
  contracts: "Base Smart Contract Development",
  wallet: "Web3 Wallet Integration",
  dapp: "Base dApp Integration",
};

const questions = [
  { q: "Are the listed prices fixed quotes?", a: "No. These are indicative starting prices. We review your requirements and confirm scope, delivery details and a final quotation before any invoice or payment is requested." },
  { q: "Do you provide independent security audits?", a: "No independent audit is included or advertised. We can discuss code review and implementation practices separately, but they are not a substitute for an independent security audit." },
  { q: "Which network do you support?", a: "The initial service focus is Base Mainnet. Network requirements and any test-network work are confirmed during scope review." },
  { q: "How do payments work?", a: "Payment is only requested after an approved quote. USDC and AGL payment instructions remain unavailable until the Base token, treasury and confirmation policy are configured and verified." },
];

export default function ServicesPage({ firebaseUser, onSignIn, initialService }: ServicesPageProps) {
  const [selectedService, setSelectedService] = useState<ServiceId>(() =>
    services.some((service) => service.id === initialService) ? (initialService as ServiceId) : "contracts",
  );
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const service = useMemo(() => services.find((item) => item.id === selectedService)!, [selectedService]);

  function selectService(serviceId: ServiceId) {
    setSelectedService(serviceId);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "services");
    url.searchParams.set("service", serviceId);
    window.history.replaceState({}, "", url);
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setConfirmation(null);

    if (!firebaseUser) {
      setFormError("Sign in with Google before submitting an inquiry so project details are linked to your account.");
      return;
    }
    if (!firebaseUser.emailVerified || !firebaseUser.email) {
      setFormError("Use a verified Google account with an email address to submit an inquiry.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: firebaseUser.email,
      telegram: String(formData.get("telegram") || "").trim(),
      projectName: String(formData.get("projectName") || "").trim(),
      service: selectedService,
      network: String(formData.get("network") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      deliveryDate: String(formData.get("deliveryDate") || "").trim(),
      budget: String(formData.get("budget") || "").trim(),
      repository: String(formData.get("repository") || "").trim(),
      referralSource: new URLSearchParams(window.location.search).get("source")?.slice(0, 80) || "direct",
      consent: formData.get("consent") === "on",
      website: String(formData.get("website") || ""),
    };

    setIsSubmitting(true);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/revenue/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not save your inquiry. Please try again.");
      setConfirmation(result.reference || "Inquiry received");
      form.reset();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We could not submit your inquiry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 pb-10 text-zinc-100">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-[radial-gradient(ellipse_at_top_right,rgba(34,197,94,0.16),transparent_48%),linear-gradient(145deg,#101510,#080a09_70%)] px-5 py-10 sm:px-8 sm:py-14">
        <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-3xl space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Agunnaya Labs Developer Services
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">Build, Integrate and Launch on Base.</h1>
          <p className="max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">Practical engineering support for Base smart contracts, wallet experiences and dApp integrations. Start with a clear scope, receive a reviewed quotation, then decide whether to proceed.</p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <a href="#services-catalogue" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300">Explore services <ArrowRight className="h-4 w-4" /></a>
            <a href="#project-inquiry" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-emerald-300/50 hover:bg-white/5">Tell us about your project</a>
          </div>
          <p className="font-mono text-[11px] tracking-wide text-zinc-500">SCALABLE. PLAYABLE. ONCHAIN.</p>
        </div>
      </section>

      <section id="services-catalogue" className="scroll-mt-24 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">Engineering engagements</p><h2 className="mt-2 font-display text-2xl font-semibold text-white">Services built around your scope</h2></div>
          <p className="max-w-md text-xs leading-5 text-zinc-500">Starting prices are directional. Final scope and price are approved with you before an invoice is issued.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {services.map((item) => {
            const Icon = item.icon;
            return <article key={item.id} className={`flex flex-col rounded-2xl border bg-[#0d100e] p-5 transition ${selectedService === item.id ? "border-emerald-400/50 shadow-[0_0_32px_rgba(34,197,94,0.07)]" : "border-white/10 hover:border-white/20"}`}>
              <div className="mb-4 flex items-center justify-between"><span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2.5 text-emerald-300"><Icon className="h-5 w-5" /></span><span className="font-mono text-xs text-zinc-500">BASE · MAINNET</span></div>
              <h3 className="font-display text-lg font-semibold leading-snug text-white">{item.title}</h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-zinc-400">{item.summary}</p>
              <p className="mt-5 border-t border-white/10 pt-4 text-sm text-zinc-400">Starting at <strong className="ml-1 font-mono text-xl text-white">${item.price}</strong><span className="text-xs"> USD</span></p>
              <ul className="mt-4 flex-1 space-y-2.5">
                {item.deliverables.map((deliverable) => <li key={deliverable} className="flex gap-2 text-xs leading-5 text-zinc-300"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{deliverable}</li>)}
              </ul>
              <button type="button" onClick={() => { selectService(item.id); document.getElementById("project-inquiry")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/10">Request this service <ArrowRight className="h-4 w-4" /></button>
            </article>;
          })}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-white/10 bg-[#0b0d0c] p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">A straightforward process</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-white">From first brief to handoff</h2>
          <ol className="mt-6 space-y-5">
            {["Share your goals and constraints", "Review scope and approve a written quote", "Use verified payment instructions after approval", "Track delivery, review and documentation"].map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 font-mono text-xs text-emerald-300">0{index + 1}</span><span className="pt-1 text-sm leading-5 text-zinc-300">{step}</span></li>)}
          </ol>
        </div>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 sm:p-6">
          <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><div><h2 className="font-display text-base font-semibold text-white">Payment configuration pending</h2><p className="mt-2 text-xs leading-5 text-zinc-400">No payment destination or token-denominated AGL price is shown here. A quote must be approved first; payment options become available only after the Base token, treasury and confirmation policy are configured and independently checked.</p></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["USDC on Base", "AGL on Base"].map((method) => <div key={method} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"><p className="text-sm font-medium text-zinc-200">{method}</p><p className="mt-1 text-[11px] text-amber-200/80">Pending configuration · no transfer instructions</p></div>)}
          </div>
        </div>
      </section>

      <CustomerWorkspace user={firebaseUser} />

      <section id="project-inquiry" className="scroll-mt-24 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-5">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">Project intake</p><h2 className="mt-2 font-display text-2xl font-semibold text-white">Let&apos;s scope the work</h2><p className="mt-3 text-sm leading-6 text-zinc-400">A verified Google account is used to keep your inquiry private and link future project updates to you. Your details are not displayed publicly.</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#0b0d0c] p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Before we start</h3>
            <ul className="mt-4 space-y-3 text-xs leading-5 text-zinc-400"><li>Submitting an inquiry does not create an invoice or charge you.</li><li>We will confirm requirements and final pricing before requesting payment.</li><li>Repository links are optional; do not include keys, credentials or private secrets.</li></ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0b0d0c] p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Mail className="h-4 w-4 text-emerald-300" /> Contact and support</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-400">Use the project inquiry form for service questions and support requests. A unique reference is shown after the inquiry is securely recorded.</p>
          </div>
        </div>

        <form onSubmit={submitInquiry} className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0d0c] p-5 sm:p-6" aria-describedby="inquiry-privacy">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-display text-lg font-semibold text-white">Project inquiry</h3><p className="mt-1 text-xs text-zinc-500">All fields marked required are needed to review your request.</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-200">{serviceLabels[selectedService]}</span></div>
          {!firebaseUser ? <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm font-medium text-white">Sign in to keep your inquiry private</p><p className="mt-1 text-xs leading-5 text-zinc-400">The inquiry is associated with your verified Google account and can only be retrieved by you and an authorized administrator.</p><button type="button" onClick={onSignIn} className="mt-3 min-h-11 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black">Continue with Google</button></div> : <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-zinc-400">Submitting as <span className="font-medium text-zinc-200">{firebaseUser.email}</span></p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name or business name" name="name" required autoComplete="name" />
            <Field label="Project name" name="projectName" required autoComplete="organization" />
            <label className="space-y-1.5"><span className="block text-xs font-medium text-zinc-300">Service requested</span><select value={selectedService} onChange={(event) => selectService(event.target.value as ServiceId)} className="min-h-12 w-full rounded-xl border border-white/10 bg-[#050706] px-3 py-3 text-base text-white outline-none focus:border-emerald-400/50"><option value="contracts">Base Smart Contract Development</option><option value="wallet">Web3 Wallet Integration</option><option value="dapp">Base dApp Integration</option></select></label>
            <Field label="Telegram handle (optional)" name="telegram" placeholder="@handle" />
            <Field label="Base network requirements" name="network" required placeholder="Base Mainnet, testnet needs, constraints" />
            <label className="space-y-1.5"><span className="block text-xs font-medium text-zinc-300">Expected delivery date</span><input name="deliveryDate" type="date" className="min-h-12 w-full rounded-xl border border-white/10 bg-[#050706] px-3 py-3 text-base text-white outline-none focus:border-emerald-400/50" /></label>
            <label className="space-y-1.5"><span className="block text-xs font-medium text-zinc-300">Budget range</span><select name="budget" defaultValue="" className="min-h-12 w-full rounded-xl border border-white/10 bg-[#050706] px-3 py-3 text-base text-white outline-none focus:border-emerald-400/50"><option value="" disabled>Select a range</option><option value="under-250">Under $250</option><option value="250-500">$250–$500</option><option value="500-1000">$500–$1,000</option><option value="1000-plus">$1,000+</option><option value="to-discuss">Let&apos;s discuss</option></select></label>
            <Field label="Existing GitHub repository (optional)" name="repository" type="url" placeholder="https://github.com/…" />
          </div>
          <label className="block space-y-1.5"><span className="block text-xs font-medium text-zinc-300">Project description</span><textarea name="description" required minLength={30} maxLength={5000} rows={5} placeholder="What are you building, what already exists, and what should this engagement deliver?" className="w-full resize-y rounded-xl border border-white/10 bg-[#050706] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/50" /></label>
          <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label id="inquiry-privacy" className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 text-xs leading-5 text-zinc-400"><input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-emerald-400" /><span>I agree that Agunnaya Labs may use these details to review and respond to my inquiry. Do not submit passwords, private keys, or other secrets.</span></label>
          {formError && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm text-red-200">{formError}</p>}
          {confirmation && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-200">Inquiry recorded. Reference: <span className="font-mono font-semibold">{confirmation}</span></p>}
          <button type="submit" disabled={isSubmitting || !firebaseUser} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">{isSubmitting ? "Submitting securely…" : "Submit project inquiry"}<ArrowRight className="h-4 w-4" /></button>
          <p className="text-center text-[11px] leading-5 text-zinc-600">By submitting, you request a project review only. No payment is collected at this stage.</p>
        </form>
      </section>

      <section className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">Questions</p><h2 className="mt-2 font-display text-2xl font-semibold text-white">Good to know</h2><div className="mt-5 space-y-2">{questions.map((item, index) => <div key={item.q} className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0d0c]"><button type="button" aria-expanded={openQuestion === index} onClick={() => setOpenQuestion(openQuestion === index ? null : index)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-200"><span>{item.q}</span><CircleHelp className="h-4 w-4 shrink-0 text-emerald-300" /></button>{openQuestion === index && <p className="px-4 pb-4 text-xs leading-5 text-zinc-400">{item.a}</p>}</div>)}</div></div>
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] p-5 sm:p-6"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">Next step</p><h2 className="mt-2 font-display text-xl font-semibold text-white">A clear scope comes first.</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Tell us about the product, constraints and outcome you need. We&apos;ll review the request before confirming availability, scope and price.</p></div><a href="#project-inquiry" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-emerald-100">Start a project inquiry <ArrowRight className="h-4 w-4" /></a></div>
      </section>
      <footer className="flex flex-col gap-2 border-t border-white/10 pt-5 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>Agunnaya Labs · Developer Services · Base</span><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No independent security audit is represented by this service listing</span></footer>
    </div>
  );
}

function Field({ label, name, required = false, type = "text", placeholder, autoComplete }: { label: string; name: string; required?: boolean; type?: string; placeholder?: string; autoComplete?: string }) {
  return <label className="space-y-1.5"><span className="block text-xs font-medium text-zinc-300">{label}{required && <span className="text-emerald-300"> *</span>}</span><input name={name} type={type} required={required} maxLength={name === "repository" ? 300 : 160} autoComplete={autoComplete} placeholder={placeholder} className="min-h-12 w-full rounded-xl border border-white/10 bg-[#050706] px-3 py-3 text-base text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/50" /></label>;
}
