import React, { useState, useEffect, useRef } from "react";
import { 
  Presentation, 
  Download, 
  FileDown, 
  Printer, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Coins, 
  Flame, 
  Cpu, 
  Layers, 
  Globe, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  BookOpen, 
  FileText, 
  Eye, 
  Share2, 
  Copy, 
  Check, 
  Zap, 
  Rocket, 
  Landmark, 
  Gamepad2, 
  Database, 
  HardDrive, 
  Mail, 
  Clock, 
  Award, 
  LineChart, 
  BarChart3, 
  Sliders,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import agunnayaLogo from "../assets/images/agunnaya_studio_logo_1786991724715.jpg";
import agunnayaBanner from "../assets/images/agunnaya_studio_banner_1787004634511.jpg";
import { 
  AGL_TOKEN_ADDRESS, 
  AGL_CREDITS_ADDRESS, 
  AGL_STAKING_ADDRESS, 
  TOKEN_FACTORY_ADDRESS, 
  AGL_TREASURY_ADDRESS, 
  AGL_MULTISIG_SAFE_ADDRESS,
  ARENA_TOKEN_ADDRESS,
  ARENA_MARKETPLACE_ADDRESS,
  ARENA_CHAMPION_NFT_ADDRESS
} from "../lib/aglContracts";

interface PitchDeckPageProps {
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
  onNavigateTab?: (tab: string) => void;
}

export interface SlideData {
  id: number;
  tag: string;
  category: "Executive" | "Product" | "Tokenomics" | "Traction" | "Strategy" | "Ask";
  title: string;
  subtitle: string;
  speakerNotes: string;
  icon: any;
  accentColor: string;
  keyPoints: {
    title: string;
    description: string;
    badge?: string;
  }[];
  metrics?: {
    label: string;
    value: string;
    subtext?: string;
  }[];
  highlights?: string[];
  contractRefs?: { name: string; address: string; url: string }[];
}

export default function PitchDeckPage({ showToast, onNavigateTab }: PitchDeckPageProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const slideRef = useRef<HTMLDivElement>(null);
  const deckContainerRef = useRef<HTMLDivElement>(null);

  const slides: SlideData[] = [
    {
      id: 1,
      tag: "01 / VISION & EXECUTIVE SUMMARY",
      category: "Executive",
      title: "Agunnaya Labs Studio",
      subtitle: "The Autonomous AI-Powered Web3 Developer Operating System & Launchpad on Base (Ethereum L2)",
      speakerNotes: "Welcome investors and partners. Agunnaya Labs Studio solves the fundamental barrier in Web3: turning anyone's vision into secure, deployed on-chain smart contracts, bonding curve tokens, staking vaults, and gaming ecosystems using conversational AI on Base.",
      icon: Sparkles,
      accentColor: "from-purple-600 to-indigo-600",
      keyPoints: [
        {
          title: "Prompt-to-Solidity Architect",
          description: "Generates, verifies, and optimizes production-grade Solidity smart contracts on Base in seconds with built-in security audits.",
          badge: "Gemini 2.5 Multi-Modal"
        },
        {
          title: "Zero-Capital Bonding Curves",
          description: "Automated linear pricing curve token launches with continuous mathematical liquidity—no rugpulls, zero initial LP requirements.",
          badge: "Fair Launch Engine"
        },
        {
          title: "Complete On-Chain Ecosystem",
          description: "All-in-one suite combining DeFi Staking Vaults, Arena GameFi PvP, DAO Governance, Batch Multi-Senders, and Cloud Sync.",
          badge: "10+ Integrated Apps"
        }
      ],
      metrics: [
        { label: "Network", value: "Base Mainnet", subtext: "Chain ID 8453 (L2)" },
        { label: "Target Market", value: "$50B+ TAM", subtext: "Web3 Devs & Creators" },
        { label: "Utility Token", value: "$AGL", subtext: "Deflationary Compute" },
        { label: "Status", value: "Live & Deployed", subtext: "Multi-Contract Verified" }
      ],
      highlights: [
        "100% On-Chain Verifiable Architecture",
        "Autonomous AI Agent Swarms & Cron TaskSync Engine",
        "Multi-Sig Safe Treasury & Automated 0.25% Protocol Fee Sweeps"
      ]
    },
    {
      id: 2,
      tag: "02 / THE PROBLEM",
      category: "Executive",
      title: "Web3 Development is Broken & Fragmented",
      subtitle: "Builders face steep technical walls, high audit costs, and disconnected tooling across the stack",
      speakerNotes: "Today, launching a Web3 project requires 6+ separate tools: Remix or Foundry for coding, high audit fees ($10k-$50k), third-party launchpads with predatory fees, fragmented staking contracts, and zero enterprise backup or transactional notification systems.",
      icon: HelpCircle,
      accentColor: "from-rose-600 to-amber-600",
      keyPoints: [
        {
          title: "High Technical Barrier & Security Risks",
          description: "Writing secure Solidity requires years of expertise. Over $1.8B was lost to smart contract vulnerabilities and reentrancy bugs in 2024 alone.",
          badge: "Critical Friction"
        },
        {
          title: "Predatory Launchpad Fees & Liquidity Fragmentation",
          description: "Traditional DEX pool creation requires tens of thousands in upfront ETH liquidity, leaving community creators vulnerable to sniper bots and liquidity drains.",
          badge: "High Capital Cost"
        },
        {
          title: "Disconnected Tool Silos",
          description: "Founders juggle separate tools for token minting, DAO governance, staking rewards, token burning, multi-send airdrops, and cloud document backups.",
          badge: "Operational Nightmare"
        }
      ],
      metrics: [
        { label: "Average Audit Cost", value: "$15K - $50K", subtext: "Prohibitive for indie builders" },
        { label: "Time to Launch", value: "4 - 8 Weeks", subtext: "From concept to mainnet" },
        { label: "Contract Exploits", value: ">$1.8B Lost", subtext: "Due to manual coding flaws" }
      ],
      highlights: [
        "No unified environment from code generation to liquidity launch",
        "Lack of native AI assistance with smart contract context",
        "Zero automated cloud backup or enterprise email synchronization"
      ]
    },
    {
      id: 3,
      tag: "03 / THE SOLUTION",
      category: "Executive",
      title: "The All-in-One Autonomous Web3 Studio",
      subtitle: "A unified AI workbench that takes ideas from natural language prompt to live, liquid, and governed on-chain protocols",
      speakerNotes: "Agunnaya Labs Studio replaces the entire fragmented developer stack with a single cohesive interface. Write prompts, get audited contracts, launch linear bonding curves, configure staking vaults, and sync governance seamlessly on Base.",
      icon: Zap,
      accentColor: "from-emerald-600 to-teal-600",
      keyPoints: [
        {
          title: "Conversational AI Smart Contract Studio",
          description: "Natural language smart contract synthesis powered by Google Gemini SDK. Generates verified OpenZeppelin-compliant ERC-20, ERC-721, and staking code.",
          badge: "Instant Deployment"
        },
        {
          title: "Linear Bonding Curve Token Launchpad",
          description: "Zero-capital instant liquidity. Tokens are bought and sold directly against a mathematical smart contract curve with automated market-making.",
          badge: "100% Collateralized"
        },
        {
          title: "Native Enterprise & Web3 Cloud Sync",
          description: "Direct integration with Google Drive (automated on-chain backups) and Gmail (instant transaction and gas trigger alerts).",
          badge: "Enterprise Ready"
        }
      ],
      metrics: [
        { label: "Deployment Speed", value: "< 60 Seconds", subtext: "From prompt to Base Mainnet" },
        { label: "Audit Accuracy", value: "99.8%", subtext: "Automated vulnerability scan" },
        { label: "Gas Savings", value: "Up to 90%", subtext: "Base L2 optimizations" }
      ],
      highlights: [
        "Full suite of 10+ turnkey Web3 dApps under one single dashboard",
        "Zero upfront liquidity needed to launch tradeable tokens",
        "Paymaster Gas Sponsorship for frictionless user onboarding"
      ]
    },
    {
      id: 4,
      tag: "04 / CORE PRODUCT SUITE",
      category: "Product",
      title: "Six Pillars of the Agunnaya Ecosystem",
      subtitle: "A comprehensive infrastructure powering every stage of the Web3 project lifecycle",
      speakerNotes: "Our product covers every phase: Creation (AI Builder, Token Factory), Governance (DAO Builder, Google Forms), Monetization & Gaming (Arena GameFi PvP, NFT Studio), DeFi (Staking Vaults, Token Burner, Batch Transfer), and Automation (TaskSync, Drive Backup).",
      icon: Layers,
      accentColor: "from-blue-600 to-cyan-600",
      keyPoints: [
        {
          title: "1. AI Solidity Architect & Security Auditor",
          description: "Interactive AI assistant capable of drafting, compiling, simulating, and reviewing smart contract bytecode in real time."
        },
        {
          title: "2. Token Factory & Bonding Curve Pad",
          description: "Deploy ERC-20 tokens with customizable linear slope curves, fair launch bonding, and real-time GeckoTerminal trading charts."
        },
        {
          title: "3. Arena GameFi & Champion NFT Marketplace",
          description: "Turn-based PvP arena, character level-ups, equipment trading, and live tournament prize pools settled in $ARENA."
        },
        {
          title: "4. Automated Staking Vaults & Token Burner",
          description: "High-yield staking vaults with dynamic APR calculations, anti-whale vesting rules, and deflationary burn leaderboards."
        },
        {
          title: "5. Batch Multi-Sender & Airdrop Engine",
          description: "Send tokens or ETH to hundreds of recipients in a single transaction with CSV upload and fail-safe balance checking."
        },
        {
          title: "6. TaskSync & Cloud Automation",
          description: "Autonomous cron scheduling for recurring blockchain tasks, Google Drive project snapshots, and Gmail notification pipelines."
        }
      ],
      metrics: [
        { label: "Smart Contracts", value: "10+ Live", subtext: "Verified on BaseScan" },
        { label: "Supported Assets", value: "ERC-20 / 721", subtext: "Standards-compliant" },
        { label: "Bridge Support", value: "LI.FI Integrated", subtext: "Cross-Chain Routes" }
      ]
    },
    {
      id: 5,
      tag: "05 / MARKET OPPORTUNITY",
      category: "Strategy",
      title: "Riding the Superchain & AI Web3 Wave",
      subtitle: "Massive growth at the intersection of AI developer tooling and Base L2 ecosystem expansion",
      speakerNotes: "Base is now the fastest-growing Ethereum Layer-2, processing millions of transactions daily. At the same time, AI-assisted development has become standard for software engineers. Agunnaya Studio is the premier AI operating system built natively for Base.",
      icon: Globe,
      accentColor: "from-indigo-600 to-purple-600",
      keyPoints: [
        {
          title: "Base Layer-2 Hyper-Growth",
          description: "Base has surpassed 10M+ active addresses and $8B+ TVL, becoming the dominant hub for social, gaming, and creator crypto applications.",
          badge: "Fastest Growing L2"
        },
        {
          title: "The Rise of Creator Tokens & MemeFi",
          description: "Fair-launch bonding curve tokens generate hundreds of millions in monthly volume. AGL offers institutional-grade security for this booming market.",
          badge: "Mass Retail Appeal"
        },
        {
          title: "AI Developer Tooling Exploding",
          description: "AI-assisted coding represents a $45B+ global market. Web3 has lacked a dedicated, domain-specific AI model until now.",
          badge: "First-Mover Edge"
        }
      ],
      metrics: [
        { label: "Base Active Users", value: "10M+", subtext: "Growing 25% MoM" },
        { label: "Web3 Creator Economy", value: "$60B+", subtext: "Projected by 2028" },
        { label: "Bonding Curve Vol", value: "$300M+/mo", subtext: "Across L2 ecosystems" }
      ],
      highlights: [
        "Uniquely tailored to Base's low fees (sub-cent gas costs)",
        "Direct bridge integration connecting Ethereum, Arbitrum, Optimism, and Solana users",
        "Targeting 100,000+ indie developers, creators, and DeFi builders"
      ]
    },
    {
      id: 6,
      tag: "06 / TOKENOMICS & VALUE FLYWHEEL",
      category: "Tokenomics",
      title: "$AGL Tokenomics & Deflationary Model",
      subtitle: "Engineered for sustainable long-term value accrual, utility burning, and governance participation",
      speakerNotes: "The $AGL token sits at the center of the platform economy. Users burn AGL for AI compute credits, stake AGL for fee discounts and staking yield, and the protocol automatically collects 0.25% treasury fees on all ecosystem swaps.",
      icon: Coins,
      accentColor: "from-amber-500 to-orange-600",
      keyPoints: [
        {
          title: "1. AI Computational Credits (Burn Engine)",
          description: "Developers burn $AGL tokens in exchange for AI Studio credits to generate smart contracts, run security scans, and trigger AI agent tasks.",
          badge: "Continuous Burn"
        },
        {
          title: "2. Protocol Fee Auto-Sweeps (0.25%)",
          description: "A 0.25% protocol fee on all bonding curve swaps and factory deployments is automatically swept into the AGL Treasury and Multi-Sig Safe.",
          badge: "Real Yield"
        },
        {
          title: "3. Automated Staking Vault Yields",
          description: "Stakers lock $AGL to earn passive yield, tier discounts on factory deployments, and exclusive voting weights in DAO proposals.",
          badge: "High APY Rewards"
        },
        {
          title: "4. Gas Sponsorship & VIP Tier Privileges",
          description: "Holding $AGL tiers unlocks free sponsored transactions on Base via the integrated Paymaster contract.",
          badge: "Zero-Gas Perks"
        }
      ],
      metrics: [
        { label: "Token Contract", value: "0xEA12...4698", subtext: "Verified Base Mainnet" },
        { label: "Protocol Fee", value: "0.25%", subtext: "Auto-routed to Treasury" },
        { label: "Staking APY", value: "Up to 36%", subtext: "Tiered Lockup Vaults" },
        { label: "Burn Velocity", value: "Deflationary", subtext: "Compute Credit Burns" }
      ],
      highlights: [
        "Verified ERC-20 on BaseScan with non-custodial ownership",
        "Multi-Sig Safe governance controlling treasury disbursements",
        "Direct utility loop connecting platform growth to token deflation"
      ]
    },
    {
      id: 7,
      tag: "07 / LIVE ON-CHAIN TRACTION",
      category: "Traction",
      title: "Verified Base Mainnet Infrastructure",
      subtitle: "Not just a prototype—a fully deployed on-chain ecosystem with live contracts and working dApps",
      speakerNotes: "Unlike competitors with theoretical roadmaps, Agunnaya Labs Studio has already deployed and verified our core contracts on Base Mainnet. The token, credits engine, staking vaults, factory, multi-sig safe, and gaming contracts are live.",
      icon: ShieldCheck,
      accentColor: "from-emerald-600 to-cyan-600",
      keyPoints: [
        {
          title: "AGL Utility Token & Credits System",
          description: "Core utility token (0xEA12...4698) and AI credit ledger (0x1386...c183) live and operating on Base.",
          badge: "Base Mainnet Live"
        },
        {
          title: "Automated Staking Vault & Token Factory",
          description: "Staking Vault (0xd4B6...fD30) and Token Factory (0x6EF5...dDf6) enabling instant token genesis.",
          badge: "Audited & Verified"
        },
        {
          title: "Arena Ecosystem & Multi-Sig Safe",
          description: "Safe Multi-Sig (0x5154...1e2d), Arena Marketplace (0x6781...698E), and Champion NFT (0x68f0...486A) fully configured.",
          badge: "Ecosystem Ready"
        }
      ],
      metrics: [
        { label: "Live Contracts", value: "8+ Deployed", subtext: "Base Mainnet (8453)" },
        { label: "Gas Oracle", value: "Etherscan V2", subtext: "Live Real-Time Feed" },
        { label: "Cross-Chain", value: "LI.FI Routes", subtext: "15+ Blockchains" }
      ],
      contractRefs: [
        { name: "AGL Utility Token", address: AGL_TOKEN_ADDRESS, url: `https://basescan.org/address/${AGL_TOKEN_ADDRESS}` },
        { name: "AI Credits Contract", address: AGL_CREDITS_ADDRESS, url: `https://basescan.org/address/${AGL_CREDITS_ADDRESS}` },
        { name: "Staking Vault", address: AGL_STAKING_ADDRESS, url: `https://basescan.org/address/${AGL_STAKING_ADDRESS}` },
        { name: "Token Factory", address: TOKEN_FACTORY_ADDRESS, url: `https://basescan.org/address/${TOKEN_FACTORY_ADDRESS}` },
        { name: "Multi-Sig Safe", address: AGL_MULTISIG_SAFE_ADDRESS, url: `https://basescan.org/address/${AGL_MULTISIG_SAFE_ADDRESS}` },
        { name: "Arena Marketplace", address: ARENA_MARKETPLACE_ADDRESS, url: `https://basescan.org/address/${ARENA_MARKETPLACE_ADDRESS}` }
      ]
    },
    {
      id: 8,
      tag: "08 / COMPETITIVE ADVANTAGE",
      category: "Strategy",
      title: "Why Agunnaya Labs Studio Wins",
      subtitle: "Unmatched integration breadth, native AI intelligence, and zero-friction developer experience",
      speakerNotes: "Compare us to competitors: Pump.fun only does memecoins with no developer tools; Thirdweb lacks AI code synthesis and bonding curve AMMs; Remix has no launchpad. Agunnaya combines AI generation, bonding curves, gaming, and cloud sync into one cohesive OS.",
      icon: Award,
      accentColor: "from-purple-600 to-pink-600",
      keyPoints: [
        {
          title: "Vs. Thirdweb & OpenZeppelin Contracts Wizard",
          description: "Agunnaya provides full conversational multimodal AI generation, instant linear bonding curve liquidity, and built-in staking vaults—not just code snippets.",
          badge: "10x More Autonomous"
        },
        {
          title: "Vs. Pump.fun & Bonding Launchpads",
          description: "We offer audited multi-purpose tokens, DAO governance integration, GameFi utility, deflationary burning, and enterprise cloud backup.",
          badge: "Institutional Grade"
        },
        {
          title: "Vs. Traditional Web3 IDEs (Remix / Hardhat)",
          description: "No local toolchain setup, zero terminal complexity, one-click wallet deployment, and automated gas sponsorship for end users.",
          badge: "Zero Setup Friction"
        }
      ],
      metrics: [
        { label: "AI Integration", value: "Deep Native", subtext: "Multimodal Gemini 2.5" },
        { label: "Tool Breadth", value: "All-in-One", subtext: "10+ Integrated Apps" },
        { label: "Time-to-Market", value: "1 Minute", subtext: "Instant On-Chain Genesis" }
      ],
      highlights: [
        "Unique Google Workspace bridge (Drive Backup + Gmail transaction triggers)",
        "Integrated LI.FI bridge for multi-chain liquidity onboarding",
        "Arena GameFi module creating immediate utility for created tokens"
      ]
    },
    {
      id: 9,
      tag: "09 / BUSINESS MODEL & MONETIZATION",
      category: "Strategy",
      title: "Diversified, High-Margin Revenue Streams",
      subtitle: "Sustainable protocol fee cash flows coupled with SaaS developer credit subscriptions",
      speakerNotes: "Our revenue model does not rely on speculation. We earn transparent protocol fees on token launches, trading volume, compute burns, and enterprise cloud backup subscriptions.",
      icon: LineChart,
      accentColor: "from-green-600 to-emerald-600",
      keyPoints: [
        {
          title: "1. Token Factory & Launchpad Creation Fees",
          description: "Small creation fee (0.005 - 0.02 ETH) on each new token, DAO, or NFT collection deployed through the platform.",
          badge: "Direct Creation Revenue"
        },
        {
          title: "2. Bonding Curve & Swap Protocol Fees (0.25%)",
          description: "0.25% fee on all buy and sell volume across all bonding curve tokens, automatically routed to the AGL Treasury.",
          badge: "High-Volume Real Yield"
        },
        {
          title: "3. AI Studio Compute Credits Burn",
          description: "Users purchase and burn $AGL tokens or subscribe monthly for high-frequency AI smart contract generation and security scans.",
          badge: "Recurring Token Demand"
        },
        {
          title: "4. Arena GameFi & NFT Marketplace Royalties",
          description: "2.5% secondary marketplace fee on champion NFTs, equipment trades, and PvP battle arena entry commissions.",
          badge: "Gaming Ecosystem Flow"
        }
      ],
      metrics: [
        { label: "Swap Fee", value: "0.25%", subtext: "On all bonding curve volume" },
        { label: "Creation Fee", value: "0.005 ETH", subtext: "Per token genesis" },
        { label: "Marketplace Cut", value: "2.5%", subtext: "NFT & GameFi trades" },
        { label: "Gross Margin", value: ">92%", subtext: "Software & Protocol margins" }
      ]
    },
    {
      id: 10,
      tag: "10 / ROADMAP & EXPANSION",
      category: "Strategy",
      title: "Strategic Execution Roadmap",
      subtitle: "From Base Layer-2 dominance to multi-chain Superchain expansion and autonomous agent swarms",
      speakerNotes: "We have executed Phase 1 with our core mainnet deployment. Phase 2 introduces autonomous AI agent trading swarms; Phase 3 expands across Optimism Superchain and Arbitrum; Phase 4 launches the Agunnaya Venture DAO Incubator.",
      icon: Clock,
      accentColor: "from-cyan-600 to-blue-600",
      keyPoints: [
        {
          title: "Phase 1: Foundation & Base Deployment (Current)",
          description: "Live Base Mainnet smart contracts, AI Contract Builder, Bonding Curve Launchpad, Staking Vaults, Google Drive/Gmail integration, and Etherscan V2 Gas Oracle.",
          badge: "Completed / Live"
        },
        {
          title: "Phase 2: Autonomous AI Agent Swarms (Q3 - Q4 2026)",
          description: "Self-executing AI agents with dedicated treasury wallets that execute market-making, arbitrage, and community governance automatically.",
          badge: "In Active Progress"
        },
        {
          title: "Phase 3: Superchain & Multi-Chain Expansion (Q1 - Q2 2027)",
          description: "Cross-chain deployment across Optimism, Arbitrum, Unichain, and Polygon with unified cross-chain bonding curve liquidity.",
          badge: "Upcoming"
        },
        {
          title: "Phase 4: Agunnaya Venture DAO Incubator (Q3 - Q4 2027)",
          description: "On-chain venture grants funded by protocol treasury fees to co-invest in top performing projects launched through the studio.",
          badge: "Long-Term Vision"
        }
      ],
      metrics: [
        { label: "Current Phase", value: "Phase 1 (Live)", subtext: "Production Ready" },
        { label: "Target Chains", value: "Superchain", subtext: "Base, OP, Arb, Uni" },
        { label: "Agent Capacity", value: "10,000+", subtext: "Concurrent AI Swarms" }
      ]
    },
    {
      id: 11,
      tag: "11 / TEAM & LEADERSHIP",
      category: "Strategy",
      title: "Built by Web3 & AI Specialists",
      subtitle: "Experienced engineers, smart contract security architects, and DeFi growth leaders",
      speakerNotes: "Our team combines deep expertise in EVM bytecode, Solidity security, scalable distributed systems, and cutting-edge generative AI models to build the future of decentralized computing.",
      icon: Users,
      accentColor: "from-purple-600 to-indigo-600",
      keyPoints: [
        {
          title: "Smart Contract & Security Engineering",
          description: "Specialists in EVM opcode optimization, OpenZeppelin standards, reentrancy defense, and mathematical bonding curve algorithms.",
          badge: "Core Architecture"
        },
        {
          title: "Generative AI & LLM Systems",
          description: "Experts in Gemini multimodal fine-tuning, prompt engineering for code synthesis, and structured JSON generation pipelines.",
          badge: "AI Research"
        },
        {
          title: "Full-Stack Web3 & Cloud Integration",
          description: "Builders of high-performance React/TypeScript frontends, Ethers.js multi-provider RPC failovers, and Google Workspace integrations.",
          badge: "Product & Scale"
        },
        {
          title: "DeFi Growth & Community Strategy",
          description: "Proven track record in liquidity bootstrapping, viral referral engine mechanics, and Base ecosystem partnerships.",
          badge: "Ecosystem Growth"
        }
      ],
      metrics: [
        { label: "Core Focus", value: "Base L2 & AI", subtext: "EVM Optimization" },
        { label: "Security First", value: "Audited Code", subtext: "Zero Exploit Record" },
        { label: "Community", value: "Global", subtext: "Developers & Creators" }
      ]
    },
    {
      id: 12,
      tag: "12 / THE ASK & STRATEGIC MILESTONES",
      category: "Ask",
      title: "Join the Future of Autonomous Web3",
      subtitle: "Accelerating developer adoption, liquidity depth, and ecosystem expansion on Base",
      speakerNotes: "We are seeking strategic partners, builders, and ecosystem collaborators to scale Agunnaya Labs Studio into the premier developer launchpad on Base. Let's build the future of decentralized computing together.",
      icon: Rocket,
      accentColor: "from-emerald-500 to-indigo-600",
      keyPoints: [
        {
          title: "1. Ecosystem & Developer Growth Grants",
          description: "Incentivize 5,000+ indie developers and creators to launch tokens, DAOs, and game ecosystems on Agunnaya Studio.",
          badge: "Adoption Catalyst"
        },
        {
          title: "2. Strategic Liquidity & Vault Bootstrapping",
          description: "Expand staking vault rewards and provide deep liquidity pairings on Base DEXs for $AGL and $ARENA.",
          badge: "Liquidity Depth"
        },
        {
          title: "3. Institutional Security Audits & Formal Verification",
          description: "Fund continuous automated formal verification tooling and multi-firm audits for all new factory templates.",
          badge: "Enterprise Trust"
        },
        {
          title: "4. Global Hackathons & Base Community Outreach",
          description: "Sponsor university builder hubs, Base community hackathons, and AI-crypto incubation programs.",
          badge: "Community Expansion"
        }
      ],
      metrics: [
        { label: "Contact Email", value: "agl@neonrps.xyz", subtext: "Direct Partnership" },
        { label: "Network", value: "Base (8453)", subtext: "Ethereum L2" },
        { label: "Studio Portal", value: "Live Mainnet", subtext: "Agunnaya Labs" }
      ],
      highlights: [
        "Open to strategic ecosystem co-investments and venture grant partnerships",
        "Direct integration support for enterprise Web3 protocols",
        "Comprehensive developer API & Agunnaya Labs SDK (aglSdk.ts) ready for developers"
      ]
    }
  ];

  const currentSlide = slides[currentSlideIndex];

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === "Home") {
        setCurrentSlideIndex(0);
      } else if (e.key === "End") {
        setCurrentSlideIndex(slides.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex, isFullscreen, slides.length]);

  const handleNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      if (showToast) showToast("Pitch Deck link copied to clipboard!", "success");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // 1. Export as high-resolution PDF Presentation using html2canvas & jsPDF
  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    if (showToast) showToast("Generating multi-page presentation PDF. Please wait...", "info");

    try {
      // Create a temporary hidden container to render all slides cleanly for high-DPI capture
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "1200px";
      container.style.backgroundColor = "#09090b";
      container.style.color = "#ffffff";
      container.style.fontFamily = "system-ui, -apple-system, sans-serif";
      container.style.zIndex = "-1000";
      document.body.appendChild(container);

      // Create PDF instance (Landscape A4: 297mm x 210mm)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = 297;
      const pdfHeight = 210;

      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        
        // Build slide HTML string
        container.innerHTML = `
          <div style="width: 1200px; height: 675px; padding: 48px; background: #09090b; color: #fff; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
            <!-- Background glow -->
            <div style="position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: rgba(168, 85, 247, 0.15); border-radius: 50%; filter: blur(80px);"></div>
            <div style="position: absolute; bottom: -100px; left: -100px; width: 400px; height: 400px; background: rgba(0, 82, 255, 0.15); border-radius: 50%; filter: blur(80px);"></div>
            
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; position: relative; z-index: 10;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; font-family: monospace;">
                  ${s.tag}
                </div>
                <span style="font-size: 13px; color: #a1a1aa; font-weight: 600;">Agunnaya Labs Studio • Investor Pitch Deck</span>
              </div>
              <div style="font-size: 12px; color: #71717a; font-family: monospace;">
                Base Mainnet (8453) • Slide ${s.id} of ${slides.length}
              </div>
            </div>

            <!-- Title & Subtitle -->
            <div style="margin-top: 20px; position: relative; z-index: 10;">
              <h1 style="font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: #ffffff;">
                ${s.title}
              </h1>
              <p style="font-size: 16px; color: #a1a1aa; margin: 8px 0 0 0; max-width: 950px; line-height: 1.4;">
                ${s.subtitle}
              </p>
            </div>

            <!-- Key Points Grid -->
            <div style="display: grid; grid-template-columns: repeat(${s.keyPoints.length > 3 ? 2 : s.keyPoints.length}, 1fr); gap: 16px; margin-top: 24px; position: relative; z-index: 10;">
              ${s.keyPoints.map(kp => `
                <div style="background: rgba(24, 24, 27, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 18px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="font-size: 16px; font-weight: bold; color: #fff;">${kp.title}</div>
                    ${kp.badge ? `<span style="background: rgba(168,85,247,0.15); color: #c084fc; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(168,85,247,0.3);">${kp.badge}</span>` : ''}
                  </div>
                  <div style="font-size: 13px; color: #a1a1aa; line-height: 1.45;">${kp.description}</div>
                </div>
              `).join('')}
            </div>

            <!-- Metrics Bar (if available) -->
            ${s.metrics ? `
              <div style="display: grid; grid-template-columns: repeat(${s.metrics.length}, 1fr); gap: 12px; margin-top: 16px; background: rgba(15, 15, 20, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px 20px; position: relative; z-index: 10;">
                ${s.metrics.map(m => `
                  <div>
                    <div style="font-size: 10px; color: #71717a; text-transform: uppercase; font-family: monospace; font-weight: bold;">${m.label}</div>
                    <div style="font-size: 20px; font-weight: 800; color: #38bdf8; margin: 2px 0;">${m.value}</div>
                    ${m.subtext ? `<div style="font-size: 10px; color: #a1a1aa;">${m.subtext}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Footer -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; margin-top: 20px; font-size: 11px; color: #71717a; position: relative; z-index: 10;">
              <div>Agunnaya Labs Studio • Decentralized Autonomous Web3 Operating System</div>
              <div style="display: flex; gap: 16px;">
                <span>Contract: 0xEA12...4698</span>
                <span>agl@neonrps.xyz</span>
              </div>
            </div>
          </div>
        `;

        // Render to canvas
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#09090b"
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) {
          pdf.addPage([pdfWidth, pdfHeight], "landscape");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      // Remove temp container
      document.body.removeChild(container);

      // Save PDF
      pdf.save("Agunnaya_Labs_Studio_Pitch_Deck.pdf");
      if (showToast) showToast("Pitch Deck PDF downloaded successfully!", "success");
    } catch (err: any) {
      console.error("PDF Generation error:", err);
      if (showToast) showToast("Failed to generate PDF. You can also use the Browser Print option.", "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. Download Standalone Offline HTML Presentation
  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agunnaya Labs Studio - Investor Pitch Deck</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #050505; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; overflow-x: hidden; }
    .slide-active { display: flex !important; }
    @media print {
      body { background: #fff !important; color: #000 !important; }
      .no-print { display: none !important; }
      .slide-card { page-break-after: always; min-height: 100vh; border: none !important; box-shadow: none !important; }
    }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between p-6">
  <header class="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-zinc-800 no-print">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg">AL</div>
      <div class="font-bold text-lg text-white">Agunnaya Labs Studio <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">Pitch Deck</span></div>
    </div>
    <div class="flex items-center gap-4 text-xs font-mono text-zinc-400">
      <span>Use <kbd class="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">←</kbd> <kbd class="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">→</kbd> to Navigate</span>
      <button onclick="window.print()" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-sans font-semibold transition">Print / PDF</button>
    </div>
  </header>

  <main class="max-w-6xl w-full mx-auto flex-1 flex flex-col justify-center my-8">
    ${slides.map((s, idx) => `
      <div id="slide-${idx}" class="slide-card ${idx === 0 ? 'slide-active' : 'hidden'} flex-col justify-between p-8 md:p-12 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl relative min-h-[580px]">
        <div class="flex items-center justify-between pb-4 border-b border-zinc-800">
          <span class="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">${s.tag}</span>
          <span class="text-xs font-mono text-zinc-500">Slide ${s.id} of ${slides.length}</span>
        </div>
        
        <div class="my-6">
          <h1 class="text-3xl md:text-5xl font-black tracking-tight text-white mb-3">${s.title}</h1>
          <p class="text-base md:text-lg text-zinc-400 max-w-4xl">${s.subtitle}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-${s.keyPoints.length > 3 ? '2' : s.keyPoints.length} gap-4 my-6">
          ${s.keyPoints.map(kp => `
            <div class="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-white text-base">${kp.title}</h3>
                ${kp.badge ? `<span class="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded">${kp.badge}</span>` : ''}
              </div>
              <p class="text-xs md:text-sm text-zinc-400 leading-relaxed">${kp.description}</p>
            </div>
          `).join('')}
        </div>

        ${s.metrics ? `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/50">
            ${s.metrics.map(m => `
              <div>
                <div class="text-[10px] font-mono text-zinc-500 uppercase">${m.label}</div>
                <div class="text-xl font-black text-cyan-400">${m.value}</div>
                ${m.subtext ? `<div class="text-[11px] text-zinc-400">${m.subtext}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 font-mono">
          <div>Agunnaya Labs Studio • Built on Base (Chain ID 8453)</div>
          <div>Contact: agl@neonrps.xyz</div>
        </div>
      </div>
    `).join('')}
  </main>

  <footer class="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-t border-zinc-800 no-print">
    <div class="flex items-center gap-2">
      <button onclick="prevSlide()" class="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm border border-zinc-800 transition">← Previous</button>
      <button onclick="nextSlide()" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition">Next Slide →</button>
    </div>
    <div id="slide-indicator" class="text-xs font-mono text-zinc-400">Slide 1 of ${slides.length}</div>
  </footer>

  <script>
    let current = 0;
    const total = ${slides.length};
    function show(index) {
      document.querySelectorAll('.slide-card').forEach((el, i) => {
        if (i === index) {
          el.classList.add('slide-active');
          el.classList.remove('hidden');
        } else {
          el.classList.remove('slide-active');
          el.classList.add('hidden');
        }
      });
      document.getElementById('slide-indicator').innerText = 'Slide ' + (index + 1) + ' of ' + total;
      current = index;
    }
    function nextSlide() { if (current < total - 1) show(current + 1); }
    function prevSlide() { if (current > 0) show(current - 1); }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Agunnaya_Labs_Studio_Deck.html";
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast("Interactive standalone HTML deck downloaded!", "success");
  };

  // 3. Download Markdown Pitch Deck
  const handleDownloadMarkdown = () => {
    let md = `# Agunnaya Labs Studio — Investor Pitch Deck\n\n`;
    md += `> **The Autonomous AI-Powered Web3 Developer OS on Base (Ethereum L2)**\n`;
    md += `> Deployed on Base Mainnet (Chain ID: 8453) | Contact: agl@neonrps.xyz\n\n---\n\n`;

    slides.forEach((s) => {
      md += `## Slide ${s.id}: ${s.title}\n`;
      md += `**Tag:** \`${s.tag}\`\n\n`;
      md += `*${s.subtitle}*\n\n`;
      
      md += `### Key Takeaways:\n`;
      s.keyPoints.forEach(kp => {
        md += `- **${kp.title}**${kp.badge ? ` *[${kp.badge}]*` : ''}: ${kp.description}\n`;
      });
      md += `\n`;

      if (s.metrics) {
        md += `### Highlights & Metrics:\n`;
        s.metrics.forEach(m => {
          md += `- **${m.label}:** ${m.value} ${m.subtext ? `(${m.subtext})` : ''}\n`;
        });
        md += `\n`;
      }

      if (s.highlights) {
        md += `### Core Capabilities:\n`;
        s.highlights.forEach(h => md += `- ${h}\n`);
        md += `\n`;
      }

      md += `> **Speaker Notes:** ${s.speakerNotes}\n\n`;
      md += `---\n\n`;
    });

    md += `## Verified Base Mainnet Smart Contracts\n\n`;
    md += `- **AGL Utility Token:** \`${AGL_TOKEN_ADDRESS}\`\n`;
    md += `- **AI Credits System:** \`${AGL_CREDITS_ADDRESS}\`\n`;
    md += `- **Staking & Yield Vault:** \`${AGL_STAKING_ADDRESS}\`\n`;
    md += `- **Token Factory:** \`${TOKEN_FACTORY_ADDRESS}\`\n`;
    md += `- **Treasury Wallet:** \`${AGL_TREASURY_ADDRESS}\`\n`;
    md += `- **Multi-Sig Safe:** \`${AGL_MULTISIG_SAFE_ADDRESS}\`\n`;
    md += `- **Arena Marketplace:** \`${ARENA_MARKETPLACE_ADDRESS}\`\n`;
    md += `- **Arena Champion NFT:** \`${ARENA_CHAMPION_NFT_ADDRESS}\`\n`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Agunnaya_Labs_Studio_Pitch_Deck.md";
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast("Markdown Pitch Deck downloaded!", "success");
  };

  // 4. Download Raw JSON Deck Data
  const handleDownloadJSON = () => {
    const data = {
      project: "Agunnaya Labs Studio",
      network: "Base Mainnet (8453)",
      exportedAt: new Date().toISOString(),
      contracts: {
        aglToken: AGL_TOKEN_ADDRESS,
        aiCredits: AGL_CREDITS_ADDRESS,
        stakingVault: AGL_STAKING_ADDRESS,
        tokenFactory: TOKEN_FACTORY_ADDRESS,
        treasury: AGL_TREASURY_ADDRESS,
        multiSigSafe: AGL_MULTISIG_SAFE_ADDRESS,
        arenaMarketplace: ARENA_MARKETPLACE_ADDRESS,
        arenaChampionNft: ARENA_CHAMPION_NFT_ADDRESS
      },
      slides: slides
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Agunnaya_Labs_Studio_Deck.json";
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast("JSON Deck Schema downloaded!", "success");
  };

  const SlideIcon = currentSlide.icon;

  return (
    <div 
      id="pitch-deck-container" 
      ref={deckContainerRef}
      className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-[#050505] p-6 md:p-10 flex flex-col justify-between overflow-y-auto" : ""}`}
    >
      {/* Top Deck Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/80 border border-white/10 p-4 sm:p-5 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-purple to-indigo-600 text-white shadow-lg shadow-purple-500/20">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                Agunnaya Labs Pitch Deck
              </h1>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                12 SLIDES
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Investor presentation & venture deck • Deployed on Base Mainnet
            </p>
          </div>
        </div>

        {/* Action & Download Suite */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1-Click PDF Export */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold font-sans shadow-lg shadow-purple-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            title="Export complete deck as high-resolution PDF"
          >
            {isExportingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Exporting PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* HTML Standalone Deck */}
          <button
            type="button"
            onClick={handleDownloadHTML}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Download self-contained offline presentation HTML"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Offline HTML</span>
          </button>

          {/* Markdown Download */}
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Download Markdown documentation deck"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Markdown (.md)</span>
          </button>

          {/* Raw JSON Download */}
          <button
            type="button"
            onClick={handleDownloadJSON}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-all"
            title="Download raw slide JSON data"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Print / PDF Dialog */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-all"
            title="Print deck to PDF using browser printer"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Speaker Notes Toggle */}
          <button
            type="button"
            onClick={() => setShowSpeakerNotes(prev => !prev)}
            className={`p-2 rounded-xl border transition-all ${
              showSpeakerNotes 
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300" 
                : "bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-400 hover:text-white"
            }`}
            title="Toggle speaker presentation talking points"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Presenter Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Card Viewport */}
      <div 
        ref={slideRef}
        className="relative rounded-3xl bg-zinc-950 border border-white/15 p-6 sm:p-10 md:p-12 shadow-2xl overflow-hidden min-h-[580px] flex flex-col justify-between"
      >
        {/* Background Ambient Glow */}
        <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${currentSlide.accentColor} opacity-15 blur-[120px] pointer-events-none`} />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600 opacity-10 blur-[100px] pointer-events-none" />

        {/* Slide Header Telemetry */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-brand-purple/15 text-brand-purple border border-brand-purple/30 uppercase tracking-wider">
                {currentSlide.tag}
              </span>
              <span className="text-xs text-zinc-500 font-mono hidden sm:inline-block">
                Category: {currentSlide.category}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="text-purple-400 font-bold">SLIDE {currentSlide.id}</span>
              <span className="text-zinc-600">/</span>
              <span>{slides.length}</span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="mt-6 sm:mt-8 space-y-3">
            <div className="flex items-center gap-3.5">
              {currentSlide.id === 1 ? (
                <img 
                  src={agunnayaLogo} 
                  alt="Agunnaya Labs Logo" 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-purple-500/40 shadow-lg shadow-purple-500/25 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white shadow-inner shrink-0">
                  <SlideIcon className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400" />
                </div>
              )}
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-display text-white tracking-tight leading-tight">
                {currentSlide.title}
              </h2>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-zinc-300 font-sans max-w-4xl leading-relaxed">
              {currentSlide.subtitle}
            </p>
          </div>
        </div>

        {/* Key Points Grid */}
        <div className="my-8">
          <div className={`grid grid-cols-1 ${
            currentSlide.keyPoints.length >= 4 
              ? "md:grid-cols-2" 
              : currentSlide.keyPoints.length === 3 
                ? "md:grid-cols-3" 
                : "md:grid-cols-2"
          } gap-4`}>
            {currentSlide.keyPoints.map((kp, idx) => (
              <div 
                key={idx}
                className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-purple-500/30 transition-all space-y-2 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                    {kp.title}
                  </h3>
                  {kp.badge && (
                    <span className="text-[10px] font-mono font-bold bg-brand-purple/20 text-purple-300 px-2 py-0.5 rounded border border-brand-purple/30 whitespace-nowrap">
                      {kp.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                  {kp.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Banner or Verified Contracts Footer */}
        <div className="space-y-4">
          {currentSlide.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-md">
              {currentSlide.metrics.map((m, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    {m.label}
                  </div>
                  <div className="text-lg sm:text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    {m.value}
                  </div>
                  {m.subtext && (
                    <div className="text-[10px] text-zinc-400 font-sans">
                      {m.subtext}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Contract References (if on traction slide) */}
          {currentSlide.contractRefs && (
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10">
              <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Live BaseScan Explorer Direct Links:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
                {currentSlide.contractRefs.map((c, idx) => (
                  <a
                    key={idx}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-white/5 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-all group"
                  >
                    <span className="font-bold">{c.name}</span>
                    <div className="flex items-center gap-1 text-[10px] text-purple-400">
                      <span>{c.address.slice(0, 6)}...{c.address.slice(-4)}</span>
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Highlights checklist (if available) */}
          {currentSlide.highlights && (
            <div className="flex items-center gap-4 flex-wrap pt-2 text-xs text-zinc-400">
              {currentSlide.highlights.map((h, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Speaker Notes Drawer */}
      {showSpeakerNotes && (
        <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-white space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-300 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Speaker Talking Points (Slide {currentSlide.id})</span>
            </div>
            <button
              onClick={() => setShowSpeakerNotes(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-xs sm:text-sm text-purple-100 font-sans leading-relaxed">
            "{currentSlide.speakerNotes}"
          </p>
        </div>
      )}

      {/* Slide Navigation Bottom Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-950/90 border border-white/10">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={currentSlideIndex === 0}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs disabled:opacity-40 disabled:hover:bg-zinc-900 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-mono font-bold text-zinc-400 sm:hidden">
            {currentSlideIndex + 1} / {slides.length}
          </span>

          <button
            type="button"
            onClick={handleNextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-bold text-xs disabled:opacity-40 disabled:hover:bg-brand-purple shadow-lg shadow-brand-purple/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Next Slide</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Jump Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
          <div className="flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentSlideIndex 
                    ? "w-8 bg-brand-purple shadow-[0_0_10px_#a855f7]" 
                    : "w-2 bg-zinc-800 hover:bg-zinc-600"
                }`}
                title={`Jump to Slide ${s.id}: ${s.title}`}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-zinc-500 hidden sm:inline-block">
            {currentSlideIndex + 1} of {slides.length}
          </span>
        </div>

        {/* Quick Share / Explore Studio */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareLink}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Copy Pitch Deck URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Copied!" : "Share Deck"}</span>
          </button>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("explore")}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Slide Thumbnails Drawer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
            All Slides Overview ({slides.length})
          </span>
          <span className="text-[11px] text-zinc-500 font-sans">
            Click any slide to jump directly
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSlideIndex(idx)}
              className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between h-28 ${
                idx === currentSlideIndex
                  ? "bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/10 text-white"
                  : "bg-zinc-950/60 hover:bg-zinc-900 border-white/10 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 mb-1">
                  <span>#{s.id}</span>
                  <span className="text-purple-400 font-bold">{s.category}</span>
                </div>
                <div className="text-xs font-bold line-clamp-2 leading-tight text-white">
                  {s.title}
                </div>
              </div>
              <div className="text-[9px] text-zinc-500 truncate mt-1">
                {s.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
