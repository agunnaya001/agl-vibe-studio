import React, { useState } from "react";
import { 
  Share2, 
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  Radio, 
  Megaphone,
  Globe,
  Award,
  MessageCircle,
  Twitter,
  Zap,
  CheckCircle2
} from "lucide-react";

interface ViralSocialPromotionComponentProps {
  userRefCode?: string;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function ViralSocialPromotionComponent({
  userRefCode = "",
  addTerminalLog,
  showToast
}: ViralSocialPromotionComponentProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<"x" | "telegram" | "discord" | "reddit" | "farcaster">("x");

  const PROJECT_X_HANDLE = "@agunnayalabs";
  const CREATOR_X_HANDLE = "@agunnaya001";
  const PROJECT_X_URL = "https://x.com/agunnayalabs";
  const CREATOR_X_URL = "https://x.com/agunnaya001";
  
  const baseUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "https://ai.studio";
  const refLink = userRefCode ? `${baseUrl}?ref=${userRefCode}` : baseUrl;

  // Viral Post Templates
  const VIRAL_X_POSTS = [
    {
      id: "post-1",
      title: "🚀 $AGL Token & AI Studio Launch (Primary Viral Campaign)",
      category: "Main Token & Platform",
      text: `🚀 Massive update in Web3 & AI!

Discover @agunnayalabs Studio — the ultimate AI-powered DeFi & Smart Contract launcher on @Base L2! ⚡

🔥 Deploy tokens, execute AI audits & earn 20% referral fee rewards in $AGL!

Built by @agunnaya001 👑

Join the revolution & start building now 👇
${refLink}

#AGL #BaseL2 #AgunnayaLabs #Crypto #AI #DeFi`,
    },
    {
      id: "post-2",
      title: "🤖 AI Smart Contract Builder + Google Workspace Integration",
      category: "AI & Tech Utility",
      text: `Zero-code smart contract creation + full Google Workspace integration (Forms, Drive, Gmail) is officially LIVE on @agunnayalabs! 🤖📄

Powered by $AGL on @Base L2.

Kudos to @agunnaya001 for pushing Web3 AI boundaries! 🌐

Build & claim rewards today:
${refLink}

#Base #SmartContracts #AgunnayaLabs #BuildOnBase`,
    },
    {
      id: "post-3",
      title: "💰 20% Fee Sharing Affiliate & Bonding Curve Launchpad",
      category: "DeFi & Passive Income",
      text: `Earn 20% passive income in $AGL tokens every time your community trades or launches tokens on @agunnayalabs! 💸

📈 Linear Bonding Curve
🛡️ AI Security Audits
⚡ Instant Base L2 Payouts

Created by @agunnaya001

Get your referral link & claim fees:
${refLink}

#AgunnayaLabs #AGL #Airdrop #DeFiRewards`,
    },
    {
      id: "post-4",
      title: "📊 Web3 Google Forms & Community Governance Polling",
      category: "DAO & Community",
      text: `Streamline your DAO governance and Web3 community feedback with native Google Forms & Polls inside @agunnayalabs! 📊

Hold $AGL to participate in protocol voting.

Follow @agunnayalabs & creator @agunnaya001 for upcoming airdrops!

Try it out here:
${refLink}

#DAO #Web3 #AgunnayaLabs #BaseL2`,
    }
  ];

  // Telegram Channel Announcement Markdown
  const TELEGRAM_CAMPAIGN = `🔥 **AGUNNAYA LABS ($AGL) VIRAL PROMOTION & AIRDROP** 🔥

🚀 **The Next-Gen AI Smart Contract & Bonding Curve Studio on Base L2!**

✨ **Key Features:**
• **AI Contract Builder**: Write, compile & audit smart contracts using Gemini AI.
• **Google Workspace Suite**: Manage Google Forms, Drive files & Gmail automations directly in Web3!
• **Bonding Curve Pad**: Launch tokens with linear liquidity curves in seconds.
• **20% Referral Fee Share**: Earn real-time $AGL rewards for every referral.

🌐 **Project X (Twitter):** @agunnayalabs (${PROJECT_X_URL})
👑 **Creator X (Twitter):** @agunnaya001 (${CREATOR_X_URL})
💎 **Token:** $AGL (Base Network)

👉 **Launch App & Claim Rewards:**
${refLink}`;

  // Discord Announcement Markdown
  const DISCORD_CAMPAIGN = `*** 🚀 AGUNNAYA LABS STUDIO ($AGL) IS NOW LIVE ON BASE L2 🚀 ***

@everyone We are thrilled to announce **Agunnaya Labs Studio** — an all-in-one AI Studio, Token Factory, and Web3 Workspace!

** What makes Agunnaya Labs special?**
1. **AI Studio**: Generate and verify Solidity contracts with automated security scores.
2. **Google Forms & Workspace Integration**: Create community voting forms & store audit logs on Google Drive.
3. **Bonding Curve DEX**: Trade $AGL and ecosystem tokens with zero slippage liquidity curves.
4. **Referral Rewards**: Receive 20% of all platform trading fees directly to your wallet!

🔗 **Official X Handle:** @agunnayalabs (${PROJECT_X_URL})
👨‍💻 **Founder / Creator X:** @agunnaya001 (${CREATOR_X_URL})

⚡ **Start Building & Earn $AGL:**
${refLink}`;

  // Reddit Post
  const REDDIT_CAMPAIGN = `Title: [LAUNCH] Agunnaya Labs ($AGL) - Full-Stack AI Smart Contract Studio & Google Workspace Integration on Base L2

Hey everyone! 👋

We just released **Agunnaya Labs Studio**, a new platform built on Base L2 that bridges AI-driven smart contract creation with decentralized finance and Google Workspace tools.

### Key Capabilities:
- **AI Contract Builder & Audit**: Generate production-ready ERC-20, NFT, or staking contracts with AI security analysis.
- **Google Forms & Drive Integration**: Create DAO voting polls and community feedback forms via Google Forms REST API directly inside the app.
- **Bonding Curve Launchpad**: Deploy and trade utility tokens with automated linear pricing curves.
- **Affiliate Engine**: 20% of all bonding curve transaction fees are automatically distributed to referrers in $AGL.

Follow project updates on X:
- Project X: @agunnayalabs (https://x.com/agunnayalabs)
- Creator X: @agunnaya001 (https://x.com/agunnaya001)

Try the platform here: ${refLink}

Would love to hear feedback from the community!`;

  // Farcaster / Lens Post
  const FARCASTER_CAMPAIGN = `🚀 Just launched @agunnayalabs on @Base!

AI Contract Builder + Google Workspace Integration + Bonding Curve DEX + 20% Referral Rewards in $AGL!

Created by @agunnaya001 👑

Check it out & claim rewards: ${refLink}

/base /crypto /ai`;

  const handleCopyText = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied ${label} to clipboard!`, "success");
    addTerminalLog("info", `PROMOTION: Copied campaign copy [${id}] to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTweetIntent = (postText: string) => {
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(postText)}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
    addTerminalLog("success", `PROMOTION_TWEET: Opened official Twitter tweet intent dialog for @agunnayalabs campaign.`);
  };

  return (
    <div id="viral-social-promotion-hub" className="space-y-6 bg-zinc-950 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold">
            <Megaphone className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>VIRAL MARKETING & AD CAMPAIGN SUITE</span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded-full border border-purple-500/30">
              OFFICIAL HANDLES INCLUDED
            </span>
          </div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center gap-3">
            <Share2 className="w-7 h-7 text-purple-400" />
            <span>Promote App & $AGL Token</span>
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Launch viral ad campaigns across X (Twitter), Telegram, Discord, and Web3 social networks. Every campaign includes official project handle <strong className="text-purple-300">@agunnayalabs</strong>, creator handle <strong className="text-purple-300">@agunnaya001</strong>, and your personal referral link to earn 20% fee rewards.
          </p>
        </div>

        {/* Official Handles Badge Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 bg-black/60 p-3.5 rounded-2xl border border-purple-500/40">
          <a
            href={PROJECT_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 hover:border-purple-500/50 transition-all text-xs font-mono text-white group"
          >
            <Twitter className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="text-[10px] text-zinc-400 block leading-tight">Project X</span>
              <span className="font-bold text-purple-300">{PROJECT_X_HANDLE}</span>
            </div>
            <ExternalLink className="w-3 h-3 text-zinc-500 ml-1" />
          </a>

          <a
            href={CREATOR_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 hover:border-purple-500/50 transition-all text-xs font-mono text-white group"
          >
            <Award className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="text-[10px] text-zinc-400 block leading-tight">Creator X</span>
              <span className="font-bold text-amber-300">{CREATOR_X_HANDLE}</span>
            </div>
            <ExternalLink className="w-3 h-3 text-zinc-500 ml-1" />
          </a>
        </div>
      </div>

      {/* Campaign Category Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 font-mono text-xs">
        <button
          onClick={() => setActivePlatform("x")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activePlatform === "x"
              ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20"
              : "bg-black/40 text-zinc-400 hover:text-white"
          }`}
        >
          <Twitter className="w-4 h-4 text-blue-400" />
          <span>X / Twitter Viral Posts (1-Click Tweet)</span>
        </button>

        <button
          onClick={() => setActivePlatform("telegram")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activePlatform === "telegram"
              ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20"
              : "bg-black/40 text-zinc-400 hover:text-white"
          }`}
        >
          <Send className="w-4 h-4 text-blue-300" />
          <span>Telegram Group Broadcast</span>
        </button>

        <button
          onClick={() => setActivePlatform("discord")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activePlatform === "discord"
              ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20"
              : "bg-black/40 text-zinc-400 hover:text-white"
          }`}
        >
          <MessageCircle className="w-4 h-4 text-indigo-400" />
          <span>Discord Server Announcement</span>
        </button>

        <button
          onClick={() => setActivePlatform("reddit")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activePlatform === "reddit"
              ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20"
              : "bg-black/40 text-zinc-400 hover:text-white"
          }`}
        >
          <Globe className="w-4 h-4 text-orange-400" />
          <span>Reddit Subreddit Post</span>
        </button>

        <button
          onClick={() => setActivePlatform("farcaster")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activePlatform === "farcaster"
              ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20"
              : "bg-black/40 text-zinc-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4 text-purple-300" />
          <span>Farcaster / Lens Web3 Native</span>
        </button>
      </div>

      {/* Tab 1: X (Twitter) 1-Click Posts */}
      {activePlatform === "x" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>Click <strong>"Post to X (Twitter)"</strong> to open X tweet intent with text pre-filled:</span>
            <span className="text-purple-400 font-bold">Includes @agunnayalabs & @agunnaya001</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VIRAL_X_POSTS.map((post) => (
              <div key={post.id} className="p-5 rounded-2xl bg-black/60 border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                      {post.category}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">X / Twitter</span>
                  </div>
                  <h4 className="text-xs font-bold text-white font-display">{post.title}</h4>
                  <pre className="p-3 bg-zinc-950 rounded-xl border border-white/5 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed select-all">
                    {post.text}
                  </pre>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleTweetIntent(post.text)}
                    className="flex-1 py-2 px-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    <span>Post to X (Twitter)</span>
                  </button>

                  <button
                    onClick={() => handleCopyText(post.text, post.id, "Tweet Copy")}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-white/10 transition-all cursor-pointer"
                    title="Copy Tweet Text"
                  >
                    {copiedId === post.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Telegram */}
      {activePlatform === "telegram" && (
        <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              <span>Telegram Channel Announcement Copy</span>
            </h3>
            <button
              onClick={() => handleCopyText(TELEGRAM_CAMPAIGN, "telegram-copy", "Telegram Post")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              {copiedId === "telegram-copy" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === "telegram-copy" ? "Copied!" : "Copy Telegram Markdown"}</span>
            </button>
          </div>

          <pre className="p-4 bg-zinc-950 rounded-xl border border-white/5 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto select-all">
            {TELEGRAM_CAMPAIGN}
          </pre>
        </div>
      )}

      {/* Tab 3: Discord */}
      {activePlatform === "discord" && (
        <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-indigo-400" />
              <span>Discord Server Announcement Copy</span>
            </h3>
            <button
              onClick={() => handleCopyText(DISCORD_CAMPAIGN, "discord-copy", "Discord Announcement")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              {copiedId === "discord-copy" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === "discord-copy" ? "Copied!" : "Copy Discord Markdown"}</span>
            </button>
          </div>

          <pre className="p-4 bg-zinc-950 rounded-xl border border-white/5 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto select-all">
            {DISCORD_CAMPAIGN}
          </pre>
        </div>
      )}

      {/* Tab 4: Reddit */}
      {activePlatform === "reddit" && (
        <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-400" />
              <span>Reddit Subreddit Post Copy</span>
            </h3>
            <button
              onClick={() => handleCopyText(REDDIT_CAMPAIGN, "reddit-copy", "Reddit Post")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              {copiedId === "reddit-copy" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === "reddit-copy" ? "Copied!" : "Copy Reddit Post"}</span>
            </button>
          </div>

          <pre className="p-4 bg-zinc-950 rounded-xl border border-white/5 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto select-all">
            {REDDIT_CAMPAIGN}
          </pre>
        </div>
      )}

      {/* Tab 5: Farcaster / Lens */}
      {activePlatform === "farcaster" && (
        <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-300" />
              <span>Farcaster & Lens Web3 Native Cast</span>
            </h3>
            <button
              onClick={() => handleCopyText(FARCASTER_CAMPAIGN, "farcaster-copy", "Farcaster Post")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              {copiedId === "farcaster-copy" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === "farcaster-copy" ? "Copied!" : "Copy Web3 Cast"}</span>
            </button>
          </div>

          <pre className="p-4 bg-zinc-950 rounded-xl border border-white/5 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto select-all">
            {FARCASTER_CAMPAIGN}
          </pre>
        </div>
      )}

      {/* Ad Campaign Targeting & Hashtag Strategy */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/20 via-zinc-900 to-zinc-900 border border-purple-500/20 space-y-3">
        <h4 className="text-xs font-bold text-white font-display flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span>Recommended Viral Ad Campaign Strategy</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-zinc-300">
          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-purple-400 block uppercase">Target Audience</span>
            <p className="text-[11px] text-zinc-400">Web3 Developers, Base L2 Traders, DeFi Yield Hunters, Solidity Engineers</p>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-purple-400 block uppercase">Official Handles to Tag</span>
            <p className="text-[11px] text-zinc-300 font-bold">@agunnayalabs & @agunnaya001</p>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-purple-400 block uppercase">Hashtag Stack</span>
            <p className="text-[11px] text-zinc-300">#AGL #BaseL2 #AgunnayaLabs #DeFi #Crypto #AI</p>
          </div>
        </div>
      </div>

    </div>
  );
}
