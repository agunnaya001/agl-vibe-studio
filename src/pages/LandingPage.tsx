import React, { useState } from "react";
import agunnayaLogo from "../assets/images/agunnaya_logo_1782747905258.jpg";
import agunnayaBanner from "../assets/images/agunnaya_banner_1782747920246.jpg";
import { Sparkles, ArrowRight, ShieldCheck, Zap, Coins, Bot, Globe, ChevronDown, CheckCircle, Mail } from "lucide-react";

interface LandingPageProps {
  onLaunchApp: () => void;
}

export default function LandingPage({ onLaunchApp }: LandingPageProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  const stats = [
    { label: "Transactions Processed", value: "1,245,982" },
    { label: "Contracts Generated", value: "24,852" },
    { label: "TVL on Base", value: "$45.2M ETH" },
    { label: "Active Builders", value: "8,410" },
  ];

  const features = [
    {
      title: "AI Smart Contract Architect",
      desc: "Describe what you want to build in plain English, and our Gemini agent generates verified, audited Solidity contracts ready for Base.",
      icon: Sparkles,
      color: "text-purple-400 bg-purple-500/10"
    },
    {
      title: "Linear Bonding Curves",
      desc: "Deploy ERC-20 tokens backed by fully collateralized linear reserves. Constant liquidity with no fractional reserves or rugs.",
      icon: Zap,
      color: "text-emerald-400 bg-emerald-500/10"
    },
    {
      title: "Autonomous AI Agents",
      desc: "Launch self-governing AI agents with custom profiles and utility tokens that earn transaction fees while providing utility.",
      icon: Bot,
      color: "text-blue-400 bg-blue-500/10"
    },
    {
      title: "Full Ecosystem Suite",
      desc: "Create DAOs, GameFi achievements, staking vaults, and NFT collections in seconds. Fully integrated with AGL discounts.",
      icon: Coins,
      color: "text-amber-400 bg-amber-500/10"
    }
  ];

  const faqs = [
    {
      q: "What is Agunnaya Labs Studio?",
      a: "Agunnaya Labs Studio is a state-of-the-art Web3 creation platform. It allows developers, creators, and communities to launch audited smart contracts, ERC-20 bonding curve tokens, DAOs, AI Agents, and GameFi infrastructure on Base using simple conversational prompts or structured form interfaces."
    },
    {
      q: "How does the linear bonding curve model work?",
      a: "Our bonding curves utilize a linear price trajectory where `price = BasePrice + Slope * supply`. All purchases lock ETH directly inside the token's reserve pool, and sell transactions burn supply to return ETH. This guarantees constant on-chain liquidity without requiring manual Uniswap pools."
    },
    {
      q: "What are the benefits of the Agunnaya Labs Token (AGL)?",
      a: "AGL is the native utility token of our platform. Staking AGL unlocks advanced premium contract templates, provides active fee discounts on token trading, grants access to elite AI Agent prompts, and allows participating in treasury DAO grants."
    },
    {
      q: "Are the generated smart contracts audited?",
      a: "Yes. All code templates are thoroughly audited for reentrancy vulnerabilities and follow ERC standards. Our integrated Gemini AI auditor automatically reviews any custom modifications for safety, checks-effects-interactions compliance, and gas efficiency prior to mock deployment."
    }
  ];

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#050505] text-white selection:bg-brand-purple/20 relative overflow-hidden">
      {/* Decorative background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>

      {/* Atmospheric Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0052FF] opacity-10 blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-[#A855F7] opacity-10 blur-[120px] pointer-events-none -z-10"></div>

      {/* Navigation Header */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <img
            src={agunnayaLogo}
            alt="AL"
            className="w-8 h-8 rounded-xl object-cover shadow-lg shadow-blue-500/20 border border-white/10"
            referrerPolicy="no-referrer"
          />
          <span className="font-display font-bold text-xl tracking-tight">
            Agunnaya <span className="bg-gradient-to-r from-[#0052FF] to-[#A855F7] bg-clip-text text-transparent">Labs</span>
          </span>
        </div>
        <button
          id="hero-launch-nav"
          onClick={onLaunchApp}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-bold hover:bg-white/90 active:scale-95 transition-all font-display text-xs"
        >
          <span>Launch Studio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero Section */}
      <header className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Next-Generation AI Web3 Creation Engine</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight max-w-3xl mx-auto leading-none bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Build. Launch. Scale.<br />
          <span className="bg-gradient-to-r from-[#0052FF] to-[#A855F7] bg-clip-text">On Base Mainnet.</span>
        </h1>

        <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Create, launch, manage, and scale fully custom on-chain applications, linear bonding curve tokens, DAOs, GameFi reward structures, and autonomous AI agents in minutes. No Solidity experience required.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="hero-launch-primary"
            onClick={onLaunchApp}
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#0052FF] hover:bg-[#0052FF]/95 font-bold transition-all shadow-[0_0_20px_rgba(0,82,255,0.4)] text-sm font-display flex items-center justify-center gap-2 group hover:scale-[1.02]"
          >
            <span>Enter Developer Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#features-section"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all font-semibold text-sm font-display"
          >
            Explore Platform Features
          </a>
        </div>

        {/* Premium 3D Workspace Banner Showcase */}
        <div className="relative mt-12 mx-auto max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.12)] bg-zinc-950/40 p-1.5 group">
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10 pointer-events-none"></div>
          <img
            src={agunnayaBanner}
            alt="Agunnaya Labs Studio 3D Developer Workspace"
            className="w-full h-auto rounded-xl object-cover transition-transform duration-700 group-hover:scale-[1.01]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Live Chain stats widget */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-16">
          {stats.map((s, idx) => (
            <div key={idx} className="glass-panel p-4 rounded-xl border border-white/5 text-center">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">{s.label}</span>
              <span className="block text-lg md:text-xl font-mono font-bold text-white tracking-tight">{s.value}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Bento Grid Features Showcase */}
      <section id="features-section" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-purple">Built for Base Builders</span>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">The Core Platform Capabilities</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">A unified framework supporting every vital component of the decentralized economy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div key={idx} className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-brand-purple/20 transition-all">
                <div className={`p-3 rounded-xl inline-block mb-4 ${f.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-white mb-2 text-sm">{f.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing / Access Plans */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-blue">Access Tier</span>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Flexible Developer Plans</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sandbox plan */}
          <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-zinc-900/20 relative">
            <h3 className="text-lg font-display font-semibold text-zinc-300">Developer Sandbox</h3>
            <p className="text-xs text-zinc-500 mt-1">Perfect for prototyping and mock deployments.</p>
            <div className="my-6">
              <span className="text-3xl font-mono font-bold text-white">Free</span>
              <span className="text-zinc-500 text-xs font-mono ml-1">/ lifetime</span>
            </div>
            <ul className="space-y-3.5 text-xs text-zinc-400 border-t border-white/5 pt-6 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Unlimited AI contract assemblies</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Fully simulated linear bonding curves</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Account abstraction simulation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-blue shrink-0" />
                <span>Gasless transaction sandbox execution</span>
              </li>
            </ul>
            <button
              id="plan-start-free"
              onClick={onLaunchApp}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 transition-all text-xs font-semibold font-display"
            >
              Start Free Prototyping
            </button>
          </div>

          {/* Pro enterprise plan */}
          <div className="glass-panel p-8 rounded-2xl border-2 border-brand-purple bg-brand-purple/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-brand-purple text-white text-[9px] font-mono font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Popular
            </div>
            <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
              Agunnaya Pro Builder
            </h3>
            <p className="text-xs text-zinc-400 mt-1">For live launches and custom multi-sig templates.</p>
            <div className="my-6">
              <span className="text-3xl font-mono font-bold text-white">0.05 ETH</span>
              <span className="text-zinc-500 text-xs font-mono ml-1">/ one-off deployment</span>
            </div>
            <ul className="space-y-3.5 text-xs text-zinc-300 border-t border-brand-purple/20 pt-6 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-purple shrink-0" />
                <span>Everything in Developer Sandbox</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-purple shrink-0" />
                <span>Deploy live onto Base Mainnet with 1 click</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-purple shrink-0" />
                <span>Vesting, custom Socials, and Creator links</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-purple shrink-0" />
                <span>AGL token reward program access</span>
              </li>
            </ul>
            <button
              id="plan-start-pro"
              onClick={onLaunchApp}
              className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 transition-all text-xs font-semibold font-display text-white shadow-lg shadow-brand-purple/20"
            >
              Configure Live Deployments
            </button>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-3xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500">Have Questions?</span>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="glass-panel rounded-xl border border-white/5 overflow-hidden transition-all duration-200">
                <button
                  id={`faq-btn-${idx}`}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-xs font-semibold text-white hover:bg-white/5 transition-all"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180 text-brand-purple" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-zinc-400 text-xs leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer & Newsletter signup */}
      <footer className="bg-zinc-950 border-t border-white/5 py-16 relative">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src={agunnayaLogo}
                alt="AL"
                className="w-8 h-8 rounded-lg object-cover border border-white/10"
                referrerPolicy="no-referrer"
              />
              <span className="font-display font-bold text-lg tracking-tight">
                Agunnaya <span className="text-brand-purple">Labs</span>
              </span>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Decentralized infrastructure enabling seamless deployment, scaling, and capitalization on Base. Pure math, permissionless access, absolute security.
            </p>
          </div>

          {/* Useful links */}
          <div className="grid grid-cols-2 gap-4 text-xs text-zinc-400">
            <div className="space-y-2">
              <span className="block font-bold text-white mb-1 uppercase tracking-wider text-[10px]">Ecosystem</span>
              <a href="#" className="block hover:text-white transition-all">Token Launchpad</a>
              <a href="#" className="block hover:text-white transition-all">AI Contract Builder</a>
              <a href="#" className="block hover:text-white transition-all">NFT Collection Mint</a>
              <a href="#" className="block hover:text-white transition-all">DAO Governance</a>
            </div>
            <div className="space-y-2">
              <span className="block font-bold text-white mb-1 uppercase tracking-wider text-[10px]">Resources</span>
              <a href="#" className="block hover:text-white transition-all">Base Documentation</a>
              <a href="#" className="block hover:text-white transition-all">Solidity Guidelines</a>
              <a href="#" className="block hover:text-white transition-all">Linear Curves Math</a>
              <a href="#" className="block hover:text-white transition-all">AGL Whitepaper</a>
            </div>
          </div>

          {/* Newsletter */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-4">
            <span className="block font-bold text-white uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-brand-purple" /> Join the Builder Newsletter
            </span>
            <p className="text-zinc-500 text-xs">
              Get weekly summaries on the latest deployed contracts and linear curve models.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                <CheckCircle className="w-4 h-4" />
                <span>Subscription saved! Welcome aboard.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-1">
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@domain.com"
                  required
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs flex-1 text-white focus:outline-none focus:border-brand-purple/40 placeholder:text-zinc-700"
                />
                <button
                  id="newsletter-submit"
                  type="submit"
                  className="px-4 py-2 bg-brand-purple hover:bg-purple-600 rounded-lg text-xs font-bold font-display"
                >
                  Join
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 border-t border-white/5 pt-8 text-center text-zinc-600 text-xs flex flex-col md:flex-row justify-between items-center gap-4">
          <span>Agunnaya Labs Studio is an independent development sandbox. All smart contracts are simulated on sandboxed Base L2 nodes.</span>
          <span>© 2026 Agunnaya Labs. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
