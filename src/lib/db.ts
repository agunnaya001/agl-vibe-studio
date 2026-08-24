import { Token, NFTCollection, DAO, GameFiProject, AIAgent, WalletState, Activity, StakingPool, ReferralRecord, ReferralPayout, PriceAlert, SubAccount, AgentServiceConnection, Task, MCPServer, AGLLiquidityPair, AGLPoll, DailyMission, UserProfile } from "../types";
import { doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "./firebase";

export function getDefaultDailyMissions(): DailyMission[] {
  return [
    {
      id: "daily_checkin",
      title: "Daily Web3 Check-In",
      description: "Log in to Agunnaya Studio and visit the Dashboard today.",
      category: "checkin",
      creditReward: 50,
      targetCount: 1,
      currentProgress: 1,
      completed: true,
      claimed: false,
      iconName: "CalendarCheck"
    },
    {
      id: "trade_token",
      title: "Execute a Bonding Curve Trade",
      description: "Buy or sell any token on the Bonding Curve Launchpad.",
      category: "trade",
      creditReward: 100,
      targetCount: 1,
      currentProgress: 0,
      completed: false,
      claimed: false,
      iconName: "TrendingUp"
    },
    {
      id: "deploy_contract",
      title: "Deploy Smart Contract",
      description: "Generate or deploy a smart contract via the AI Builder.",
      category: "deploy",
      creditReward: 200,
      targetCount: 1,
      currentProgress: 0,
      completed: false,
      claimed: false,
      iconName: "Code2"
    },
    {
      id: "stake_vault",
      title: "Stake in AGL Vault",
      description: "Stake AGL utility tokens in any of our Staking Vaults.",
      category: "stake",
      creditReward: 150,
      targetCount: 1,
      currentProgress: 0,
      completed: false,
      claimed: false,
      iconName: "ShieldCheck"
    },
    {
      id: "form_submission",
      title: "Create or Submit Form / Poll",
      description: "Create or submit a Web3 Google Form or DAO Governance Poll.",
      category: "form",
      creditReward: 100,
      targetCount: 1,
      currentProgress: 0,
      completed: false,
      claimed: false,
      iconName: "FileSpreadsheet"
    }
  ];
}

// EXACT BONDING CURVE MATH
export const BASE_PRICE = 0.000001; // 1e-6 ETH per token
export const SLOPE = 0.000000000001; // 1e-12 ETH per token of supply

// Reserve at supply s: R(s) = BASE_PRICE * s + (SLOPE * s^2) / 2
export function getReserveAtSupply(supply: number): number {
  return BASE_PRICE * supply + (SLOPE * supply * supply) / 2;
}

// Spot price at supply s: P(s) = BASE_PRICE + SLOPE * s
export function getSpotPrice(supply: number): number {
  return BASE_PRICE + SLOPE * supply;
}

// Buy formula: returns tokens minted (x) for given ethSent (after 1% fee)
export function getTokensForEth(currentSupply: number, ethSent: number): number {
  const ethForReserve = ethSent * 0.99; // 1% creator fee
  const B = BASE_PRICE + SLOPE * currentSupply;
  const discriminant = B * B + 2 * SLOPE * ethForReserve;
  if (discriminant < 0) return 0;
  return (Math.sqrt(discriminant) - B) / SLOPE;
}

// Cost of buying x tokens: gross = R(s + x) - R(s)
export function getEthCostForTokens(currentSupply: number, tokensToBuy: number): { gross: number; fee: number; total: number } {
  const reserveAfter = getReserveAtSupply(currentSupply + tokensToBuy);
  const reserveBefore = getReserveAtSupply(currentSupply);
  const gross = Math.max(0, reserveAfter - reserveBefore);
  const fee = gross * 0.01;
  const total = gross + fee;
  return { gross, fee, total };
}

// Sell return: returns ETH returned (net after 1% fee) for selling x tokens
export function getEthReturnForTokens(currentSupply: number, tokensToSell: number): { gross: number; fee: number; net: number } {
  const tokensToBurn = Math.min(currentSupply, tokensToSell);
  const reserveBefore = getReserveAtSupply(currentSupply);
  const reserveAfter = getReserveAtSupply(currentSupply - tokensToBurn);
  const gross = Math.max(0, reserveBefore - reserveAfter);
  const fee = gross * 0.01;
  const net = gross - fee;
  return { gross, fee, net };
}

// INITIAL SEED DATA
const SEED_TOKENS: Token[] = [
  {
    address: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698",
    name: "Agunnaya Utility Token",
    symbol: "AGL",
    description: "The official utility token of Agunnaya Labs Studio. Used to unlock premium templates, pay for autonomous AI Agent triggers at a discount, secure governance rights, and stake for premium yield.",
    creator: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
    creatorFeesEarned: 12.45,
    currentPrice: BASE_PRICE + SLOPE * 8500000,
    supply: 8500000,
    maxSupply: 1000000000,
    marketCap: (BASE_PRICE + SLOPE * 8500000) * 8500000,
    reserveEth: getReserveAtSupply(8500000),
    volume24h: 3.42,
    category: "utility",
    logoUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    socials: { website: "https://agunnaya.io", twitter: "https://twitter.com/agunnayalabs" },
    isVerified: true,
    vestingWeeks: 4,
    referralRewardsPct: 2,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    address: "0x3b855F88CB93aA642EaEB13F59987C552Fc614b5",
    name: "Arena Token",
    symbol: "ARENA",
    description: "Official gameplay and tournament token on Base Mainnet. Powers the Arena battle system, PvP tournament wagers, champion upgrades, and marketplace settlements.",
    creator: "0x67817157Dd6E5945ac2fAf1a822e7f1dE26C698E",
    creatorFeesEarned: 8.95,
    currentPrice: BASE_PRICE + SLOPE * 16200000,
    supply: 16200000,
    maxSupply: 1000000000,
    marketCap: (BASE_PRICE + SLOPE * 16200000) * 16200000,
    reserveEth: getReserveAtSupply(16200000),
    volume24h: 18.64,
    category: "gamefi",
    logoUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    socials: { website: "https://basescan.org/address/0x3b855F88CB93aA642EaEB13F59987C552Fc614b5" },
    isVerified: true,
    vestingWeeks: 2,
    referralRewardsPct: 3,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000
  },
  {
    address: "0x345678901234567890123456789012345678EF01",
    name: "Base AI Core",
    symbol: "BAIC",
    description: "An AI agent token supporting decentralized machine learning consensus on Base. Automatically buys compute bandwidth on-chain.",
    creator: "0x7123456789012345678901234567890123456789",
    creatorFeesEarned: 1.87,
    currentPrice: BASE_PRICE + SLOPE * 4200000,
    supply: 4200000,
    maxSupply: 500000000,
    marketCap: (BASE_PRICE + SLOPE * 4200000) * 4200000,
    reserveEth: getReserveAtSupply(4200000),
    volume24h: 12.8,
    category: "ai",
    logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    socials: { website: "https://base.org" },
    isVerified: true,
    vestingWeeks: 0,
    referralRewardsPct: 1,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
  },
  {
    address: "0x89ABCDEF0123456789012345678901234567BCDE",
    name: "Meme Pad Chad",
    symbol: "CHAD",
    description: "The ultimate hyper-deflationary meme asset on Base. Real physical gainz simulated mathematically via linear curves.",
    creator: "0x8234567890123456789012345678901234567890",
    creatorFeesEarned: 5.42,
    currentPrice: BASE_PRICE + SLOPE * 12500000,
    supply: 12500000,
    maxSupply: 1000000000,
    marketCap: (BASE_PRICE + SLOPE * 12500000) * 12500000,
    reserveEth: getReserveAtSupply(12500000),
    volume24h: 24.15,
    category: "meme",
    logoUrl: "https://images.unsplash.com/photo-1618005198143-e52834644027?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    socials: { website: "https://chadpad.xyz", twitter: "https://twitter.com/chadpad" },
    isVerified: false,
    vestingWeeks: 2,
    referralRewardsPct: 3,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000
  }
];

const SEED_NFTS: NFTCollection[] = [
  {
    contractAddress: "0x68f08b005b09B0F7D07E1c0B5CDe18E43CE2486A",
    name: "Arena Champions",
    symbol: "ACHAMP",
    description: "Official gaming NFT collection on Base Mainnet. Battle-ready champions with on-chain attributes, combat attack, defense, agile stats, and PvP tournament access.",
    creator: "0x67817157Dd6E5945ac2fAf1a822e7f1dE26C698E",
    mintPrice: 0.025,
    currentSupply: 620,
    maxSupply: 5000,
    royaltyFee: 4,
    isRevealed: true,
    isVerified: true,
    imageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&auto=format&fit=crop&q=80",
    socials: { website: "https://basescan.org/address/0x68f08b005b09B0F7D07E1c0B5CDe18E43CE2486A" },
    items: [
      {
        id: 1,
        name: "Cyber Warlord #104",
        description: "Heavy vanguard champion with hyper-dense titanium armor and plasma blade.",
        imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80",
        traits: [
          { trait_type: "Class", value: "Warrior" },
          { trait_type: "Power", value: "94" },
          { trait_type: "Defense", value: "88" },
          { trait_type: "Special", value: "Plasma Cleave" }
        ]
      },
      {
        id: 2,
        name: "Neon Valkyrie #212",
        description: "High-agility striker specialized in speed blitz combos and critical strikes.",
        imageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&auto=format&fit=crop&q=80",
        traits: [
          { trait_type: "Class", value: "Assassin" },
          { trait_type: "Power", value: "91" },
          { trait_type: "Speed", value: "98" },
          { trait_type: "Special", value: "Sonic Strike" }
        ]
      },
      {
        id: 3,
        name: "Chrono Archmage #089",
        description: "Mystic champion harnessing time distortion fields to weaken opponent defenses.",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
        traits: [
          { trait_type: "Class", value: "Mage" },
          { trait_type: "Power", value: "96" },
          { trait_type: "Mana", value: "100" },
          { trait_type: "Special", value: "Time Singularity" }
        ]
      }
    ],
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000
  },
  {
    contractAddress: "0x789012345678901234567890123456789012CDEF",
    name: "Agunnaya Genesis Keys",
    symbol: "AGK",
    description: "A premium collection of 1000 fully on-chain 3D access keys on Base. Unlocks unlimited free deployments, early access to new AI Agents, and active fee share on Agunnaya Labs Studio.",
    creator: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
    mintPrice: 0.05,
    currentSupply: 420,
    maxSupply: 1000,
    royaltyFee: 5,
    isRevealed: true,
    isVerified: true,
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    socials: { website: "https://agunnaya.io", twitter: "https://twitter.com/agunnayalabs" },
    items: [
      {
        id: 1,
        name: "Agunnaya Genesis #1",
        description: "The Genesis Key of Wisdom. Forged with pure digital amethyst and Base steel.",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
        traits: [
          { trait_type: "Aura", value: "Supernova" },
          { trait_type: "Access Tier", value: "Agunnaya Elite" },
          { trait_type: "Metadata", value: "Pure Gold" }
        ]
      },
      {
        id: 2,
        name: "Agunnaya Genesis #2",
        description: "The Chronos Core key. Simulates multi-agent execution pipelines.",
        imageUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80",
        traits: [
          { trait_type: "Aura", value: "Cobalt" },
          { trait_type: "Access Tier", value: "Developer Pro" },
          { trait_type: "Metadata", value: "Silver Gloss" }
        ]
      }
    ],
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000
  }
];

const SEED_DAOS: DAO[] = [
  {
    contractAddress: "0xDAD100000000000000000000000000000000EADE",
    name: "Base Builders Guild DAO",
    symbol: "BBG",
    description: "A community DAO designed to fund open-source development tools, public goods, and meme generators exclusively on Base. Supported by Agunnaya Labs multi-sig.",
    creator: "0x9123456789012345678901234567890123456789",
    governanceTokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", // AGL token as gov token
    treasuryBalanceEth: 25.5,
    memberCount: 142,
    proposals: [
      {
        id: "prop-1",
        title: "Sponsor Base Memefest Hackathon 2026",
        description: "Deploy 5 ETH from the guild treasury to provide cash prizes for the best bonding curve meme coin created using Agunnaya Studio.",
        creator: "0x6123456789012345678901234567890123456789",
        status: "Active",
        votesFor: 852000,
        votesAgainst: 12000,
        endTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
        executed: false,
        category: "treasury",
        requestedEth: 5.0,
        recipientAddress: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
        quorumThreshold: 500000,
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        comments: [
          {
            id: "c-1",
            author: "0x8123...4567",
            text: "Fully support this! Memefest will bring huge volume to our bonding curve pools.",
            timestamp: Date.now() - 3600000
          }
        ]
      },
      {
        id: "prop-2",
        title: "Integrate Gas sponsorship and Account Abstraction",
        description: "Deploy 2 ETH to sponsor gas fees for new users launching their first contract via Agunnaya AI Builder.",
        creator: "0x5123456789012345678901234567890123456789",
        status: "Passed",
        votesFor: 1200000,
        votesAgainst: 5000,
        endTime: Date.now() - 1 * 24 * 60 * 60 * 1000,
        executed: false, // Ready to execute!
        category: "upgrade",
        requestedEth: 2.0,
        recipientAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698",
        quorumThreshold: 500000,
        createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
        comments: [
          {
            id: "c-2",
            author: "0x3123...9876",
            text: "Quorum reached! Ready for executive multi-sig execution.",
            timestamp: Date.now() - 86400000
          }
        ]
      },
      {
        id: "prop-3",
        title: "Lower Proposal Voting Quorum Threshold to 250k AGL",
        description: "Adjust governance voting parameters to enable smaller token holders to pass community initiatives faster.",
        creator: "0x4123456789012345678901234567890123456789",
        status: "Active",
        votesFor: 320000,
        votesAgainst: 150000,
        endTime: Date.now() + 3 * 24 * 60 * 60 * 1000,
        executed: false,
        category: "parameter",
        quorumThreshold: 400000,
        createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000
      }
    ],
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000
  },
  {
    contractAddress: "0x8888000000000000000000000000000000008888",
    name: "Sovereign AI Agents Collective",
    symbol: "SAAC",
    description: "Decentralized autonomous organization governing autonomous AI agents, prompt vaults, and automated trading bots on Base L2.",
    creator: "0x1111222233334444555566667777888899990000",
    governanceTokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698",
    treasuryBalanceEth: 12.8,
    memberCount: 89,
    proposals: [
      {
        id: "prop-4",
        title: "Fund Autonomous AI Agent Compute Server Pool",
        description: "Grant 3 ETH from SAAC treasury to fund high-throughput server compute for autonomous market making agents.",
        creator: "0x2222333344445555666677778888999900001111",
        status: "Active",
        votesFor: 640000,
        votesAgainst: 80000,
        endTime: Date.now() + 4 * 24 * 60 * 60 * 1000,
        executed: false,
        category: "treasury",
        requestedEth: 3.0,
        recipientAddress: "0x2222333344445555666677778888999900001111",
        quorumThreshold: 300000,
        createdAt: Date.now() - 12 * 3600 * 1000
      }
    ],
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000
  }
];

const SEED_GAMEFI: GameFiProject[] = [
  {
    contractAddress: "0x9876543210987654321098765432109876545432",
    name: "Base Cyber Arena",
    symbol: "BCA",
    description: "An arcade-inspired, retro Battle Pass game where players complete daily on-chain developer challenges to earn XP, achievements, and unlock exclusive rewards.",
    creator: "0x4123456789012345678901234567890123456789",
    prizePoolEth: 4.25,
    activeSeasons: 2,
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    missions: [
      { id: "m-1", title: "Launch your first custom token", description: "Successfully deploy any token type on Base using the AI Builder or Bonding Curve Launchpad.", xpReward: 150, aglReward: 10, completed: false },
      { id: "m-2", title: "Execute a Bonding Curve trade", description: "Complete a Buy or Sell order of at least 0.01 ETH on any active bonding curve token.", xpReward: 100, aglReward: 5, completed: false },
      { id: "m-3", title: "Vote on a DAO Proposal", description: "Connect your wallet and sign a voting transaction on an active community proposal.", xpReward: 80, aglReward: 2, completed: false }
    ],
    achievements: [
      { id: "ach-1", title: "Meme Prophet", description: "Buy a bonding curve token before its supply reaches 1,000,000.", badgeIcon: "Sparkles", unlocked: false },
      { id: "ach-2", title: "AI Alchemist", description: "Successfully generate and audit a custom Solidity contract using Agunnaya Labs AI Builder.", badgeIcon: "Brain", unlocked: false },
      { id: "ach-3", title: "Master Governor", description: "Create a DAO and submit your first treasury grant proposal.", badgeIcon: "ShieldAlert", unlocked: false }
    ],
    leaderboard: [
      { rank: 1, user: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E", xp: 1240, score: 9800 },
      { rank: 2, user: "0x6123456789012345678901234567890123456789", xp: 950, score: 7200 },
      { rank: 3, user: "0x8234567890123456789012345678901234567890", xp: 820, score: 6100 }
    ],
    battlePass: [
      { level: 1, xpRequired: 100, rewardName: "Beginner Dev Badge", rewardType: "badge", unlocked: true },
      { level: 2, xpRequired: 250, rewardName: "10 AGL Utility Tokens", rewardType: "token", unlocked: false },
      { level: 3, xpRequired: 500, rewardName: "Custom Cyber Shell Avatar (NFT)", rewardType: "nft", unlocked: false }
    ]
  }
];

const SEED_AGENTS: AIAgent[] = [
  {
    id: "sentinel",
    name: "Agunnaya Labs Sentinel",
    symbol: "SENT",
    description: "Your autonomous blockchain security sentinel. Watches Base transactions, checks code for vulnerabilities, and advises on Gas-optimal multi-sig paths.",
    contractAddress: "0x3123456789012345678901234567890123456789",
    creator: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
    tokenPrice: 0.005,
    usageFeeEth: 0.001,
    lifetimeRevenueEth: 0.142,
    queryCount: 142,
    systemPrompt: "You are Agunnaya Labs Sentinel, a precise security auditor AI core running on Base. Speak like a friendly but strict security terminal.",
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=60",
    aglRewardDiscounts: true,
    chatHistory: [
      { role: "assistant", content: "Sentinel security subroutines loaded. Enter query or drag-and-drop a smart contract file to audit." },
      { role: "user", content: "Audit this ERC20 vault contract for reentrancy and unauthorized transferFrom exploits." },
      { role: "assistant", content: "🛡️ AUDIT REPORT FOR ERC20 VAULT:\n1. Reentrancy Vulnerability: PASSED. ReentrancyGuard modifier present on withdraw() method.\n2. Allowance Validation: WARNING. Ensure safetransferFrom() is used to prevent unhandled boolean returns from non-standard ERC20 tokens.\n3. Access Controls: PASSED. onlyOwner correctly guards administrative functions on Base Mainnet." },
      { role: "user", content: "What is the recommended gas limit for executing a 5-signature batch transaction on Base?" },
      { role: "assistant", content: "⚡ GAS RECOMMENDATION:\nBase L2 gas limit for 5-sig Safe multi-sig batch execution is approximately 145,000 gas units. Estimated cost at current L2 gas prices is ~0.000021 ETH ($0.06 USD)." }
    ],
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000
  },
  {
    id: "oracle",
    name: "Base Oracle Agent",
    symbol: "BORA",
    description: "An autonomous data broker. Fetches off-chain API data, formats it into verifiable Merkle trees, and signs on-chain state updates.",
    contractAddress: "0x2123456789012345678901234567890123456789",
    creator: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
    tokenPrice: 0.008,
    usageFeeEth: 0.002,
    lifetimeRevenueEth: 0.088,
    queryCount: 92,
    systemPrompt: "You are BORA (Base Oracle Agent). You speak in elegant cybernetic data-streams, analyzing markets, prices, and off-chain telemetry with high fidelity.",
    avatarUrl: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=128&auto=format&fit=crop&q=60",
    aglRewardDiscounts: false,
    chatHistory: [
      { role: "assistant", content: "Oracle node online. Ready to pipe off-chain parameters onto Base." },
      { role: "user", content: "Fetch real-time spot price and Merkle root proof for AGL/ETH pool on Base DEX." },
      { role: "assistant", content: "🌐 BORA ORACLE DATA FEED:\n• AGL/ETH Spot Price: 0.0000112 ETH ($0.0336 USD)\n• 24h Reserve Depth: 12.85 ETH\n• Merkle Root Hash: 0x9f8b7a6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a\n• Attestation Signature: Verified by 8 validator nodes." }
    ],
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000
  }
];

const SEED_STAKING: StakingPool[] = [
  { id: "s-agl-flex", tokenName: "AGL Flexible Earn Vault", tokenSymbol: "AGL", tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", apr: 18.5, tvlEth: 28.5, stakedBalance: 0, earnedRewards: 12.5, lockPeriodDays: 0 },
  { id: "s-agl-30d", tokenName: "AGL 30-Day Boosted Vault (1.5x Multiplier)", tokenSymbol: "AGL", tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", apr: 45.0, tvlEth: 64.2, stakedBalance: 0, earnedRewards: 48.0, lockPeriodDays: 30 },
  { id: "s-agl-90d", tokenName: "AGL 90-Day Diamond Vault (2.5x Multiplier)", tokenSymbol: "AGL", tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", apr: 85.0, tvlEth: 112.0, stakedBalance: 0, earnedRewards: 115.2, lockPeriodDays: 90 },
  { id: "s-lp-agl-eth", tokenName: "AGL / ETH LP Staking Vault", tokenSymbol: "AGL-ETH-LP", tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", apr: 120.5, tvlEth: 85.4, stakedBalance: 0, earnedRewards: 320.0, lockPeriodDays: 14 },
  { id: "s-lp-agl-usdc", tokenName: "AGL / USDC LP Staking Vault", tokenSymbol: "AGL-USDC-LP", tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", apr: 95.2, tvlEth: 42.1, stakedBalance: 0, earnedRewards: 185.0, lockPeriodDays: 14 },
  { id: "s-2", tokenName: "Meme Pad Chad Pool", tokenSymbol: "CHAD", tokenAddress: "0x89ABCDEF0123456789012345678901234567BCDE", apr: 82.0, tvlEth: 4.15, stakedBalance: 0, earnedRewards: 0, lockPeriodDays: 0 },
  { id: "s-3", tokenName: "Base AI Core Pool", tokenSymbol: "BAIC", tokenAddress: "0x345678901234567890123456789012345678EF01", apr: 48.0, tvlEth: 6.42, stakedBalance: 0, earnedRewards: 0, lockPeriodDays: 14 }
];

const SEED_ACTIVITIES: Activity[] = [
  { id: "a-1", type: "create", tokenSymbol: "AGL", tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", user: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E", amount: 1000000000, ethValue: 0, timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, details: "Platform genesis launch of Agunnaya Labs Utility Token" },
  { id: "a-2", type: "buy", tokenSymbol: "CHAD", tokenAddress: "0x89ABCDEF0123456789012345678901234567BCDE", user: "0x98219483A12b059e93847aB19d72e73110555523", amount: 12000, ethValue: 0.015, timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, details: "Bought 12,000 CHAD tokens on the bonding curve" },
  { id: "a-3", type: "mint", tokenSymbol: "AGK", tokenAddress: "0x789012345678901234567890123456789012CDEF", user: "0x98219483A12b059e93847aB19d72e73110555523", amount: 1, ethValue: 0.05, timestamp: Date.now() - 20 * 24 * 60 * 60 * 1000, details: "Minted Agunnaya Genesis Key #1 access NFT" },
  { id: "a-4", type: "vote", tokenSymbol: "BBG", tokenAddress: "0xDAD100000000000000000000000000000000EADE", user: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E", amount: 50000, ethValue: 0, timestamp: Date.now() - 12 * 24 * 60 * 60 * 1000, details: "Voted FOR Proposal #2 'AA integration' with 50,000 voting weight" },
  { id: "a-burn-1", type: "burn", tokenSymbol: "AGL", tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", user: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E", amount: 50000, ethValue: 2.5, timestamp: Date.now() - 2 * 3600000, details: "Burned 50,000 AGL tokens to Null Address 0x000000000000000000000000000000000000dEaD" },
  { id: "a-burn-2", type: "burn", tokenSymbol: "USDC", tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", user: "0x7890123456789012345678901234567890123456", amount: 2500, ethValue: 0.77, timestamp: Date.now() - 5 * 3600000, details: "Burned 2,500 USDC for Agunnaya Studio Compute Credits" },
  { id: "a-burn-3", type: "burn", tokenSymbol: "AERO", tokenAddress: "0x9940181a94A35A4569E4529A3CDfB74e38FD98631", user: "0x98219483A12b059e93847aB19d72e73110555523", amount: 15000, ethValue: 5.8, timestamp: Date.now() - 18 * 3600000, details: "Deflated 15,000 AERO tokens via null destination" },
  { id: "a-burn-4", type: "burn", tokenSymbol: "AGL", tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", user: "0x334455667788990011223344556677889900aabb", amount: 12000, ethValue: 0.6, timestamp: Date.now() - 36 * 3600000, details: "Burned 12,000 AGL tokens on Base L2" },
  { id: "a-burn-5", type: "burn", tokenSymbol: "cbETH", tokenAddress: "0x2Ae3F1Ec7F1F5012A27a5d3f112702170bA3b400", user: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E", amount: 1.5, ethValue: 1.62, timestamp: Date.now() - 48 * 3600000, details: "Burned 1.5 cbETH for protocol yield boost" }
];

const DEFAULT_WALLET: WalletState = {
  isConnected: false,
  address: "",
  balanceEth: 0.0, // starts at 0.0 until on-chain connect
  walletType: null,
  isSmartAccount: false,
  sponsoredGasEth: 0.0,
  aglTokenBalance: 0, // starts at 0 until on-chain connect
  aglCredits: 0
};

// PERSISTENCE WRAPPER
export class AgunnayaDatabase {
  static async saveToFirestore(collectionName: string, docId: string, data: any) {
    if (!auth.currentUser || (typeof navigator !== "undefined" && !navigator.onLine)) {
      // Passive local-only mode when not signed in with Google or device is offline
      return;
    }
    try {
      await setDoc(doc(db, collectionName, docId), data);
    } catch (err) {
      console.warn(`Firestore save to ${collectionName}/${docId} failed:`, err);
      // Fail-fast context helper if authorized
      try {
        handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
      } catch (e) {
        console.error("Firestore rule validation error details: ", e);
      }
    }
  }

  static async syncAllFromFirestore() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log("[Firestore Sync] Device is offline. Operating in local state mode.");
      return false;
    }
    try {
      const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 3500): Promise<T> => {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Firestore sync timeout")), timeoutMs)
        );
        return Promise.race([promise, timeout]);
      };

      const syncTasks: Promise<void>[] = [
        // 1. Sync Tokens
        (async () => {
          try {
            const tokenSnap = await withTimeout(getDocs(collection(db, "tokens")));
            if (!tokenSnap.empty) {
              const firestoreTokens: Token[] = [];
              tokenSnap.forEach(doc => firestoreTokens.push(doc.data() as Token));
              const localTokens = this.getTokens();
              const merged = [...localTokens];
              firestoreTokens.forEach(ft => {
                const idx = merged.findIndex(t => t.address.toLowerCase() === ft.address.toLowerCase());
                if (idx !== -1) {
                  merged[idx] = ft;
                } else {
                  merged.push(ft);
                }
              });
              localStorage.setItem("agl_tokens", JSON.stringify(merged));
            }
          } catch {
            // Local state preserved
          }
        })(),

        // 2. Sync NFTs
        (async () => {
          try {
            const nftsSnap = await withTimeout(getDocs(collection(db, "nfts")));
            if (!nftsSnap.empty) {
              const firestoreNFTs: NFTCollection[] = [];
              nftsSnap.forEach(doc => firestoreNFTs.push(doc.data() as NFTCollection));
              const localNFTs = this.getNFTs();
              const merged = [...localNFTs];
              firestoreNFTs.forEach(fn => {
                const idx = merged.findIndex(n => n.contractAddress.toLowerCase() === fn.contractAddress.toLowerCase());
                if (idx !== -1) {
                  merged[idx] = fn;
                } else {
                  merged.push(fn);
                }
              });
              localStorage.setItem("agl_nfts", JSON.stringify(merged));
            }
          } catch {
            // Local state preserved
          }
        })(),

        // 3. Sync DAOs
        (async () => {
          try {
            const daosSnap = await withTimeout(getDocs(collection(db, "daos")));
            if (!daosSnap.empty) {
              const firestoreDAOs: DAO[] = [];
              daosSnap.forEach(doc => firestoreDAOs.push(doc.data() as DAO));
              const localDAOs = this.getDAOs();
              const merged = [...localDAOs];
              firestoreDAOs.forEach(fd => {
                const idx = merged.findIndex(d => d.contractAddress.toLowerCase() === fd.contractAddress.toLowerCase());
                if (idx !== -1) {
                  merged[idx] = fd;
                } else {
                  merged.push(fd);
                }
              });
              localStorage.setItem("agl_daos", JSON.stringify(merged));
            }
          } catch {
            // Local state preserved
          }
        })(),

        // 4. Sync GameFi
        (async () => {
          try {
            const gamefiSnap = await withTimeout(getDocs(collection(db, "gamefi")));
            if (!gamefiSnap.empty) {
              const firestoreGamefi: GameFiProject[] = [];
              gamefiSnap.forEach(doc => firestoreGamefi.push(doc.data() as GameFiProject));
              const localGamefi = this.getGameFi();
              const merged = [...localGamefi];
              firestoreGamefi.forEach(fg => {
                const idx = merged.findIndex(g => g.contractAddress.toLowerCase() === fg.contractAddress.toLowerCase());
                if (idx !== -1) {
                  merged[idx] = fg;
                } else {
                  merged.push(fg);
                }
              });
              localStorage.setItem("agl_gamefi", JSON.stringify(merged));
            }
          } catch {
            // Local state preserved
          }
        })(),

        // 5. Sync Agents
        (async () => {
          try {
            const agentsSnap = await withTimeout(getDocs(collection(db, "agents")));
            if (!agentsSnap.empty) {
              const firestoreAgents: AIAgent[] = [];
              agentsSnap.forEach(doc => firestoreAgents.push(doc.data() as AIAgent));
              const localAgents = this.getAgents();
              const merged = [...localAgents];
              firestoreAgents.forEach(fa => {
                const idx = merged.findIndex(a => a.id.toLowerCase() === fa.id.toLowerCase());
                if (idx !== -1) {
                  merged[idx] = fa;
                } else {
                  merged.push(fa);
                }
              });
              localStorage.setItem("agl_agents", JSON.stringify(merged));
            }
          } catch {
            // Local state preserved
          }
        })(),

        // 6. Sync Staking
        (async () => {
          try {
            const stakingSnap = await withTimeout(getDocs(collection(db, "staking")));
            if (!stakingSnap.empty) {
              const firestoreStaking: StakingPool[] = [];
              stakingSnap.forEach(doc => firestoreStaking.push(doc.data() as StakingPool));
              const localStaking = this.getStaking();
              const merged = [...localStaking];
              firestoreStaking.forEach(fs => {
                const idx = merged.findIndex(s => s.id.toLowerCase() === fs.id.toLowerCase());
                if (idx !== -1) {
                  merged[idx] = fs;
                } else {
                  merged.push(fs);
                }
              });
              localStorage.setItem("agl_staking", JSON.stringify(merged));
            }
          } catch {
            // Local state preserved
          }
        })(),

        // 7. Sync Activities
        (async () => {
          try {
            const actSnap = await withTimeout(getDocs(collection(db, "activities")));
            if (!actSnap.empty) {
              const firestoreAct: Activity[] = [];
              actSnap.forEach(doc => firestoreAct.push(doc.data() as Activity));
              const localAct = this.getActivities();
              const merged = [...localAct];
              firestoreAct.forEach(fa => {
                const idx = merged.findIndex(a => a.id.toLowerCase() === fa.id.toLowerCase());
                if (idx !== -1) {
                  merged[idx] = fa;
                } else {
                  merged.push(fa);
                }
              });
              localStorage.setItem("agl_activities", JSON.stringify(merged));
            }
          } catch {
            // Local state preserved
          }
        })(),

        // 8. Sync Referrals
        (async () => {
          try {
            const refSnap = await withTimeout(getDocs(collection(db, "referrals")));
            if (!refSnap.empty) {
              const firestoreRef: ReferralRecord[] = [];
              refSnap.forEach(doc => firestoreRef.push(doc.data() as ReferralRecord));
              const localRef = this.getReferralRecords();
              const merged = [...localRef];
              firestoreRef.forEach(fr => {
                const idx = merged.findIndex(r => r.ownerAddress.toLowerCase() === fr.ownerAddress.toLowerCase());
                if (idx !== -1) {
                  merged[idx] = fr;
                } else {
                  merged.push(fr);
                }
              });
              localStorage.setItem("agl_referral_records", JSON.stringify(merged));
            }
          } catch {
            // Local state preserved
          }
        })(),

        // 9. Sync Price Alerts
        (async () => {
          try {
            if (auth.currentUser) {
              const alertsSnap = await withTimeout(getDocs(collection(db, "price_alerts")));
              if (!alertsSnap.empty) {
                const firestoreAlerts: PriceAlert[] = [];
                alertsSnap.forEach(doc => firestoreAlerts.push(doc.data() as PriceAlert));
                const localAlerts = this.getPriceAlerts();
                const mergedAlerts = [...localAlerts];
                firestoreAlerts.forEach(fa => {
                  const idx = mergedAlerts.findIndex(a => a.id.toLowerCase() === fa.id.toLowerCase());
                  if (idx !== -1) {
                    mergedAlerts[idx] = fa;
                  } else {
                    mergedAlerts.push(fa);
                  }
                });
                const userAlerts = mergedAlerts.filter(a => a.userId === auth.currentUser?.uid);
                localStorage.setItem("agl_price_alerts", JSON.stringify(userAlerts));
              }
            }
          } catch {
            // Local state preserved
          }
        })()
      ];

      await Promise.allSettled(syncTasks);
      return true;
    } catch (err: any) {
      console.warn("[Firestore Sync] Offline or connection timeout, operating in local storage mode:", err?.message || err);
      return false;
    }
  }

  static safeParse<T>(key: string, fallback: T): T {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    try {
      return JSON.parse(data) as T;
    } catch (err) {
      console.warn(`Local storage key "${key}" was corrupted. Resetting to fallback seed.`, err);
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
  }

  static getTokens(): Token[] {
    const tokens = this.safeParse<Token[]>("agl_tokens", SEED_TOKENS);
    // Ensure all critical seed tokens (like AGL and ARENA) exist
    let updated = false;
    SEED_TOKENS.forEach(st => {
      if (!tokens.some(t => t.address.toLowerCase() === st.address.toLowerCase())) {
        tokens.push(st);
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem("agl_tokens", JSON.stringify(tokens));
    }
    return tokens;
  }

  static saveTokens(tokens: Token[]) {
    localStorage.setItem("agl_tokens", JSON.stringify(tokens));
    tokens.forEach(t => {
      this.saveToFirestore("tokens", t.address, t);
    });
  }

  static getNFTs(): NFTCollection[] {
    const nfts = this.safeParse<NFTCollection[]>("agl_nfts", SEED_NFTS);
    let updated = false;
    SEED_NFTS.forEach(sn => {
      if (!nfts.some(n => n.contractAddress.toLowerCase() === sn.contractAddress.toLowerCase())) {
        nfts.push(sn);
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem("agl_nfts", JSON.stringify(nfts));
    }
    return nfts;
  }

  static saveNFTs(nfts: NFTCollection[]) {
    localStorage.setItem("agl_nfts", JSON.stringify(nfts));
    nfts.forEach(n => {
      this.saveToFirestore("nfts", n.contractAddress, n);
    });
  }

  static getDAOs(): DAO[] {
    return this.safeParse<DAO[]>("agl_daos", SEED_DAOS);
  }

  static saveDAOs(daos: DAO[]) {
    localStorage.setItem("agl_daos", JSON.stringify(daos));
    daos.forEach(d => {
      this.saveToFirestore("daos", d.contractAddress, d);
    });
  }

  static getGameFi(): GameFiProject[] {
    return this.safeParse<GameFiProject[]>("agl_gamefi", SEED_GAMEFI);
  }

  static saveGameFi(gamefi: GameFiProject[]) {
    localStorage.setItem("agl_gamefi", JSON.stringify(gamefi));
    gamefi.forEach(g => {
      this.saveToFirestore("gamefi", g.contractAddress, g);
    });
  }

  static getAgents(): AIAgent[] {
    return this.safeParse<AIAgent[]>("agl_agents", SEED_AGENTS);
  }

  static saveAgents(agents: AIAgent[]) {
    localStorage.setItem("agl_agents", JSON.stringify(agents));
    agents.forEach(a => {
      this.saveToFirestore("agents", a.id, a);
    });
  }

  static saveAgent(agent: AIAgent) {
    const agents = this.getAgents();
    const idx = agents.findIndex(a => a.id.toLowerCase() === agent.id.toLowerCase());
    if (idx !== -1) {
      agents[idx] = agent;
    } else {
      agents.push(agent);
    }
    this.saveAgents(agents);
  }

  static getServiceConnections(): AgentServiceConnection[] {
    return this.safeParse<AgentServiceConnection[]>("agl_service_connections", []);
  }

  static saveServiceConnections(connections: AgentServiceConnection[]) {
    localStorage.setItem("agl_service_connections", JSON.stringify(connections));
    connections.forEach(c => {
      this.saveToFirestore("service_connections", c.id, c);
    });
  }

  static saveServiceConnection(connection: AgentServiceConnection) {
    const connections = this.getServiceConnections();
    const idx = connections.findIndex(c => c.id === connection.id);
    if (idx !== -1) {
      connections[idx] = connection;
    } else {
      connections.push(connection);
    }
    this.saveServiceConnections(connections);
  }

  static getStaking(): StakingPool[] {
    return this.safeParse<StakingPool[]>("agl_staking", SEED_STAKING);
  }

  static getStakingPools(): StakingPool[] {
    return this.getStaking();
  }

  static saveStaking(pools: StakingPool[]) {
    localStorage.setItem("agl_staking", JSON.stringify(pools));
    pools.forEach(p => {
      this.saveToFirestore("staking", p.id, p);
    });
  }

  static saveStakingPools(pools: StakingPool[]) {
    this.saveStaking(pools);
  }

  static getWallet(): WalletState {
    const wallet = this.safeParse<WalletState>("agl_wallet", DEFAULT_WALLET);
    // Ensure subAccounts is populated
    const subAccounts = this.getSubAccounts();
    return {
      ...wallet,
      subAccounts
    };
  }

  static saveWallet(wallet: WalletState) {
    localStorage.setItem("agl_wallet", JSON.stringify(wallet));
    
    // Also sync active wallet balances into active subAccount if present
    if (wallet.isConnected && wallet.address) {
      const subs = this.getSubAccounts();
      const activeIdx = subs.findIndex(s => s.address.toLowerCase() === wallet.address.toLowerCase() || s.isActive);
      if (activeIdx !== -1) {
        subs[activeIdx].address = wallet.address;
        subs[activeIdx].balanceEth = wallet.balanceEth;
        subs[activeIdx].aglTokenBalance = wallet.aglTokenBalance;
        subs[activeIdx].aglCredits = wallet.aglCredits;
        subs[activeIdx].walletType = wallet.walletType || "metamask";
        subs[activeIdx].isSmartAccount = wallet.isSmartAccount;
        subs[activeIdx].isActive = true;
        this.saveSubAccounts(subs);
      }
    }
  }

  static getSubAccounts(): SubAccount[] {
    const seed: SubAccount[] = [
      {
        id: "sub_primary",
        label: "Primary Mainnet Wallet",
        address: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
        walletType: "metamask",
        balanceEth: 0.15,
        aglTokenBalance: 500,
        aglCredits: 200,
        isSmartAccount: false,
        isActive: true,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000
      },
      {
        id: "sub_trading",
        label: "Trading Sub-Account #1",
        address: "0x8921B4d80a89bd8c75248fae7c176bd1854698",
        walletType: "coinbase",
        balanceEth: 0.35,
        aglTokenBalance: 1250,
        aglCredits: 85,
        isSmartAccount: false,
        isActive: false,
        createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000
      },
      {
        id: "sub_agent",
        label: "AI Operator Key (AA Vault)",
        address: "0xAA9034f59a88219034f31c0234a9d901f1028e3b",
        walletType: "smart",
        balanceEth: 0.08,
        aglTokenBalance: 2500,
        aglCredits: 350,
        isSmartAccount: true,
        isActive: false,
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
      }
    ];

    return this.safeParse<SubAccount[]>("agl_sub_accounts", seed);
  }

  static saveSubAccounts(subAccounts: SubAccount[]) {
    localStorage.setItem("agl_sub_accounts", JSON.stringify(subAccounts));
  }

  static switchSubAccount(subAccountId: string): { wallet: WalletState; subAccounts: SubAccount[] } {
    const subs = this.getSubAccounts();
    let selectedSub: SubAccount | null = null;

    const updatedSubs = subs.map(sub => {
      if (sub.id === subAccountId) {
        selectedSub = { ...sub, isActive: true };
        return selectedSub;
      }
      return { ...sub, isActive: false };
    });

    this.saveSubAccounts(updatedSubs);

    if (selectedSub) {
      const s = selectedSub as SubAccount;
      const updatedWallet: WalletState = {
        isConnected: true,
        address: s.address,
        balanceEth: s.balanceEth,
        aglTokenBalance: s.aglTokenBalance,
        aglCredits: s.aglCredits,
        walletType: s.walletType,
        isSmartAccount: s.isSmartAccount,
        sponsoredGasEth: s.isSmartAccount ? 0.05 : 0,
        subAccounts: updatedSubs
      };
      localStorage.setItem("agl_wallet", JSON.stringify(updatedWallet));
      return { wallet: updatedWallet, subAccounts: updatedSubs };
    }

    const currentWallet = this.getWallet();
    return { wallet: currentWallet, subAccounts: updatedSubs };
  }

  static addSubAccount(newSubData: Omit<SubAccount, "id" | "createdAt" | "isActive">): { wallet: WalletState; subAccounts: SubAccount[] } {
    const subs = this.getSubAccounts();
    const newSub: SubAccount = {
      ...newSubData,
      id: "sub_" + Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
      isActive: false
    };

    subs.push(newSub);
    this.saveSubAccounts(subs);

    const currentWallet = this.getWallet();
    currentWallet.subAccounts = subs;
    return { wallet: currentWallet, subAccounts: subs };
  }

  static updateSubAccount(id: string, updates: Partial<SubAccount>): SubAccount[] {
    const subs = this.getSubAccounts();
    const updated = subs.map(sub => {
      if (sub.id === id) {
        return { ...sub, ...updates };
      }
      return sub;
    });
    this.saveSubAccounts(updated);

    // If active sub-account was updated, sync wallet
    const activeSub = updated.find(s => s.id === id && s.isActive);
    if (activeSub) {
      const w = this.getWallet();
      const updatedWallet: WalletState = {
        ...w,
        label: activeSub.label,
        balanceEth: activeSub.balanceEth,
        aglTokenBalance: activeSub.aglTokenBalance,
        aglCredits: activeSub.aglCredits,
        subAccounts: updated
      } as any;
      this.saveWallet(updatedWallet);
    }

    return updated;
  }

  static removeSubAccount(id: string): { wallet: WalletState; subAccounts: SubAccount[] } {
    let subs = this.getSubAccounts();
    const target = subs.find(s => s.id === id);
    if (!target) return { wallet: this.getWallet(), subAccounts: subs };

    subs = subs.filter(s => s.id !== id);

    // If we deleted the active sub-account, pick the first remaining one
    if (target.isActive && subs.length > 0) {
      subs[0].isActive = true;
      this.saveSubAccounts(subs);
      return this.switchSubAccount(subs[0].id);
    }

    this.saveSubAccounts(subs);
    const wallet = this.getWallet();
    wallet.subAccounts = subs;
    return { wallet, subAccounts: subs };
  }

  static transferBetweenSubAccounts(
    fromId: string, 
    toId: string, 
    asset: "ETH" | "AGL", 
    amount: number
  ): { success: boolean; message: string } {
    const subs = this.getSubAccounts();
    const sender = subs.find(s => s.id === fromId);
    const receiver = subs.find(s => s.id === toId);

    if (!sender || !receiver) {
      return { success: false, message: "Invalid sender or receiver sub-account." };
    }

    if (amount <= 0) {
      return { success: false, message: "Transfer amount must be greater than zero." };
    }

    if (asset === "ETH") {
      if (sender.balanceEth < amount) {
        return { success: false, message: `Insufficient ETH balance in ${sender.label}. Available: ${sender.balanceEth.toFixed(4)} ETH` };
      }
      sender.balanceEth -= amount;
      receiver.balanceEth += amount;
    } else {
      if (sender.aglTokenBalance < amount) {
        return { success: false, message: `Insufficient AGL balance in ${sender.label}. Available: ${sender.aglTokenBalance.toLocaleString()} AGL` };
      }
      sender.aglTokenBalance -= amount;
      receiver.aglTokenBalance += amount;
    }

    this.saveSubAccounts(subs);

    // Sync active wallet if sender or receiver is active
    const activeSub = subs.find(s => s.isActive);
    if (activeSub) {
      const w = this.getWallet();
      w.balanceEth = activeSub.balanceEth;
      w.aglTokenBalance = activeSub.aglTokenBalance;
      w.aglCredits = activeSub.aglCredits;
      w.subAccounts = subs;
      localStorage.setItem("agl_wallet", JSON.stringify(w));
    }

    return { 
      success: true, 
      message: `Transferred ${amount.toLocaleString()} ${asset} from ${sender.label} to ${receiver.label}!` 
    };
  }

  static getTokenBalances(address: string): { [tokenAddress: string]: number } {
    if (!address) return {};
    const key = `agl_balances_${address.toLowerCase()}`;
    return this.safeParse<{ [tokenAddress: string]: number }>(key, {});
  }

  static saveTokenBalances(address: string, balances: { [tokenAddress: string]: number }) {
    if (!address) return;
    localStorage.setItem(`agl_balances_${address.toLowerCase()}`, JSON.stringify(balances));
  }

  static getActivities(): Activity[] {
    const items = this.safeParse<Activity[]>("agl_activities", SEED_ACTIVITIES);
    return [...items].sort((a: Activity, b: Activity) => b.timestamp - a.timestamp);
  }

  static saveActivities(activities: Activity[]) {
    localStorage.setItem("agl_activities", JSON.stringify(activities));
    activities.forEach(a => {
      this.saveToFirestore("activities", a.id, a);
    });
  }

  static addActivity(activity: Omit<Activity, "id" | "timestamp">) {
    const list = this.getActivities();
    const newAct: Activity = {
      ...activity,
      id: "act_" + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    list.unshift(newAct);
    this.saveActivities(list);
  }

  // REFERRAL ENGINE SUPPORT
  static getActiveReferrer(): string | null {
    return localStorage.getItem("agl_visitor_referrer");
  }

  static setActiveReferrer(referrer: string) {
    localStorage.setItem("agl_visitor_referrer", referrer);
  }

  static getReferralRecords(): ReferralRecord[] {
    return this.safeParse<ReferralRecord[]>("agl_referral_records", []);
  }

  static saveReferralRecords(records: ReferralRecord[]) {
    localStorage.setItem("agl_referral_records", JSON.stringify(records));
    records.forEach(r => {
      this.saveToFirestore("referrals", r.ownerAddress, r);
    });
  }

  static getReferralRecord(address: string): ReferralRecord {
    if (!address) {
      return {
        code: "",
        ownerAddress: "",
        totalReferredCount: 0,
        totalFeesGeneratedEth: 0,
        unclaimedRewardsAgl: 0,
        claimedRewardsAgl: 0
      };
    }
    const records = this.getReferralRecords();
    let record = records.find(r => r.ownerAddress.toLowerCase() === address.toLowerCase());
    if (!record) {
      // Create a default code: e.g. first 6 chars of address or "ref_" + random
      const randomCode = "agl_" + address.slice(2, 8).toLowerCase();
      record = {
        code: randomCode,
        ownerAddress: address,
        totalReferredCount: 0,
        totalFeesGeneratedEth: 0,
        unclaimedRewardsAgl: 0,
        claimedRewardsAgl: 0
      };
      records.push(record);
      this.saveReferralRecords(records);
    }
    return record;
  }

  static updateReferralRecord(record: ReferralRecord) {
    const records = this.getReferralRecords();
    const index = records.findIndex(r => r.ownerAddress.toLowerCase() === record.ownerAddress.toLowerCase());
    if (index !== -1) {
      records[index] = record;
    } else {
      records.push(record);
    }
    this.saveReferralRecords(records);
  }

  static resolveReferralCode(code: string): string | null {
    if (!code) return null;
    const cleanCode = code.trim().toLowerCase();
    
    // Check if it is directly an address
    if (cleanCode.startsWith("0x") && cleanCode.length === 42) {
      return cleanCode;
    }

    const records = this.getReferralRecords();
    const found = records.find(r => r.code.toLowerCase() === cleanCode);
    if (found) {
      return found.ownerAddress;
    }
    return null;
  }

  static registerReferral(referredAddress: string, codeOrAddress: string): string | null {
    const referrerAddress = this.resolveReferralCode(codeOrAddress);
    if (!referrerAddress) return null;
    if (referrerAddress.toLowerCase() === referredAddress.toLowerCase()) return null; // cannot refer oneself

    // Check if user is already referred
    const registeredKey = `agl_referred_by_${referredAddress.toLowerCase()}`;
    if (localStorage.getItem(registeredKey)) {
      return localStorage.getItem(registeredKey); // already referred
    }

    localStorage.setItem(registeredKey, referrerAddress);
    
    // Update referrer's referred count
    const record = this.getReferralRecord(referrerAddress);
    record.totalReferredCount += 1;
    this.updateReferralRecord(record);

    return referrerAddress;
  }

  static getReferrerOf(address: string): string | null {
    if (!address) return null;
    return localStorage.getItem(`agl_referred_by_${address.toLowerCase()}`);
  }

  static getPayouts(): ReferralPayout[] {
    return this.safeParse<ReferralPayout[]>("agl_referral_payouts", []);
  }

  static savePayouts(payouts: ReferralPayout[]) {
    localStorage.setItem("agl_referral_payouts", JSON.stringify(payouts));
  }

  static getReferralPayouts(referrerAddress: string): ReferralPayout[] {
    const payouts = this.getPayouts();
    return payouts.filter(p => p.id.startsWith(referrerAddress.toLowerCase() + "_"));
  }

  static addReferralPayout(referredUser: string, txType: string, feeEth: number) {
    const referrer = this.getReferrerOf(referredUser);
    if (!referrer) return;

    // Get current AGL price to calculate exact token reward
    const tokens = this.getTokens();
    const aglToken = tokens.find(t => t.symbol === "AGL");
    const aglPrice = aglToken ? aglToken.currentPrice : 0.000001; // fallback price

    // 20% of the platform fee goes to the referrer
    const rewardEth = feeEth * 0.20;
    // convert reward to AGL tokens
    const rewardAgl = Math.floor((rewardEth / aglPrice) * 100) / 100; // 2 decimal precision

    if (rewardAgl <= 0) return;

    // Save payout history
    const payouts = this.getPayouts();
    const newPayout: ReferralPayout = {
      id: `${referrer.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}`,
      referredUser,
      txType,
      feeEth,
      rewardAgl,
      timestamp: Date.now()
    };
    payouts.unshift(newPayout);
    this.savePayouts(payouts);

    // Update referrer record
    const record = this.getReferralRecord(referrer);
    record.totalFeesGeneratedEth += feeEth;
    record.unclaimedRewardsAgl += rewardAgl;
    this.updateReferralRecord(record);

    // Add general activity for the referrer
    this.addActivity({
      type: "referral",
      tokenSymbol: "AGL",
      tokenAddress: aglToken ? aglToken.address : "",
      user: referrer,
      amount: rewardAgl,
      ethValue: rewardEth,
      details: `Earned +${rewardAgl.toLocaleString()} AGL referral fee share from 0x${referredUser.slice(2, 6)}...'s ${txType}`
    });
  }

  static claimReferralRewards(address: string): { success: boolean; claimedAmount: number } {
    const record = this.getReferralRecord(address);
    const amount = record.unclaimedRewardsAgl;
    if (amount <= 0) {
      return { success: false, claimedAmount: 0 };
    }

    // Update record
    record.claimedRewardsAgl += amount;
    record.unclaimedRewardsAgl = 0;
    this.updateReferralRecord(record);

    // Add AGL to wallet balance
    const wallet = this.getWallet();
    wallet.aglTokenBalance += amount;
    this.saveWallet(wallet);

    return { success: true, claimedAmount: amount };
  }

  static getPriceAlerts(): PriceAlert[] {
    const data = localStorage.getItem("agl_price_alerts");
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static savePriceAlerts(alerts: PriceAlert[]) {
    localStorage.setItem("agl_price_alerts", JSON.stringify(alerts));
    alerts.forEach(a => {
      this.saveToFirestore("price_alerts", a.id, a);
    });
  }

  static addPriceAlert(alert: Omit<PriceAlert, "id" | "createdAt" | "status" | "triggeredAt">): PriceAlert {
    const alerts = this.getPriceAlerts();
    const newAlert: PriceAlert = {
      ...alert,
      id: "alert_" + Math.random().toString(36).substring(2, 11),
      status: "active",
      createdAt: Date.now(),
      triggeredAt: null
    };
    alerts.unshift(newAlert);
    this.savePriceAlerts(alerts);
    return newAlert;
  }

  static async deletePriceAlert(id: string) {
    const alerts = this.getPriceAlerts();
    const updated = alerts.filter(a => a.id !== id);
    localStorage.setItem("agl_price_alerts", JSON.stringify(updated));
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, "price_alerts", id));
      } catch (err) {
        console.warn("Firestore delete price_alerts failed:", err);
        try {
          handleFirestoreError(err, OperationType.DELETE, `price_alerts/${id}`);
        } catch (e) {
          console.error("Firestore delete rules validation failed: ", e);
        }
      }
    }
  }

  static getTasks(): Task[] {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const data = localStorage.getItem("agl_tasks");
      if (!data) {
        const defaults: Task[] = [
          {
            id: "task_1",
            title: "Audit Smart Contract",
            description: "Review the new bonding curve implementation for vulnerabilities.",
            status: "pending",
            priority: "high",
            dueDate: Date.now() + 86400000 * 2,
            createdAt: Date.now()
          },
          {
            id: "task_2",
            title: "Launch Token",
            description: "Finalize parameters and deploy to Base Mainnet.",
            status: "pending",
            priority: "medium",
            dueDate: Date.now() + 86400000 * 5,
            createdAt: Date.now()
          },
          {
            id: "task_3",
            title: "Update DAO Proposals",
            description: "Draft the new treasury allocation proposal.",
            status: "in-progress",
            priority: "low",
            dueDate: Date.now() + 86400000 * 7,
            createdAt: Date.now()
          }
        ];
        try {
          localStorage.setItem("agl_tasks", JSON.stringify(defaults));
        } catch {}
        return defaults;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveTasks(tasks: Task[]) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("agl_tasks", JSON.stringify(tasks));
      } catch {}
    }
    tasks.forEach(t => {
      this.saveToFirestore("tasks", t.id, t);
    });
  }

  static addTask(task: Omit<Task, "id" | "createdAt">): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      ...task,
      id: "task_" + Math.random().toString(36).substring(2, 11),
      createdAt: Date.now()
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  // --- MODEL CONTEXT PROTOCOL (MCP) SERVERS ---
  static getMCPServers(): MCPServer[] {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const data = localStorage.getItem("agl_mcp_servers");
      if (!data) {
        const defaults: MCPServer[] = [
          {
            id: "mcp_brave_search",
            name: "Brave Search MCP Server",
            type: "stdio",
            endpoint: "npx -y @modelcontextprotocol/server-brave-search",
            status: "connected",
            latencyMs: 42,
            description: "Provides real-time web, crypto news, and domain indexing search tools to AI Agents.",
            category: "search",
            capabilities: ["web_search", "local_search", "news_filter"],
            tools: [
              { name: "mcp_brave_web_search", description: "Performs real-time web search with domain ranking.", inputSchema: { query: "string" } },
              { name: "mcp_brave_local_search", description: "Finds geo-location services and node locations.", inputSchema: { location: "string" } }
            ],
            connectedAt: Date.now() - 86400000 * 5,
            version: "v1.2.0"
          },
          {
            id: "mcp_base_l2_rpc",
            name: "Base L2 RPC & Contract MCP",
            type: "http",
            endpoint: "https://mcp.base.org/v1/rpc",
            status: "connected",
            latencyMs: 18,
            description: "Direct Base L2 RPC connector for balance checks, contract verification, gas estimates & raw tx broadcasts.",
            category: "crypto",
            capabilities: ["rpc_query", "tx_broadcast", "gas_oracle"],
            tools: [
              { name: "mcp_base_get_balance", description: "Query native ETH & ERC20 token balances on Base.", inputSchema: { address: "string" } },
              { name: "mcp_base_estimate_gas", description: "Simulate EIP-1559 gas costs in Gwei.", inputSchema: { to: "string", data: "string" } },
              { name: "mcp_base_broadcast_tx", description: "Broadcast signed raw transaction to Base RPC.", inputSchema: { rawTx: "string" } }
            ],
            connectedAt: Date.now() - 86400000 * 10,
            version: "v2.0.4"
          },
          {
            id: "mcp_sqlite_firestore",
            name: "Database & Storage MCP Connector",
            type: "sse",
            endpoint: "https://db-mcp.agunnaya.io/sse",
            status: "connected",
            latencyMs: 25,
            description: "Provides zero-trust SQL & Document store queries for agent persistent memory.",
            category: "database",
            capabilities: ["sql_query", "document_crud", "vector_embeddings"],
            tools: [
              { name: "mcp_db_query_table", description: "Execute read-only SQL queries on application database.", inputSchema: { query: "string" } },
              { name: "mcp_db_insert_record", description: "Insert structured JSON records into collection.", inputSchema: { collection: "string", document: "object" } }
            ],
            connectedAt: Date.now() - 86400000 * 3,
            version: "v1.5.1"
          },
          {
            id: "mcp_agunnaya_dex",
            name: "Agunnaya Bonding Curve & LP MCP",
            type: "http",
            endpoint: "https://api.agunnaya.io/mcp/dex",
            status: "connected",
            latencyMs: 12,
            description: "Official MCP tool server for AGL liquidity depth, automated arbitrage & swap quotes.",
            category: "crypto",
            capabilities: ["bonding_curve_quote", "lp_reserve_check", "auto_swap"],
            tools: [
              { name: "mcp_agl_get_reserves", description: "Get live reserves for AGL liquidity pools.", inputSchema: { pairSymbol: "string" } },
              { name: "mcp_agl_calculate_swap", description: "Simulate exact swap outputs & slippage.", inputSchema: { fromToken: "string", toToken: "string", amount: "number" } }
            ],
            connectedAt: Date.now() - 86400000 * 1,
            version: "v3.1.0"
          }
        ];
        try {
          localStorage.setItem("agl_mcp_servers", JSON.stringify(defaults));
        } catch {}
        return defaults;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveMCPServers(servers: MCPServer[]) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("agl_mcp_servers", JSON.stringify(servers));
      } catch {}
    }
    servers.forEach(s => {
      this.saveToFirestore("mcp_servers", s.id, s);
    });
  }

  static addMCPServer(server: Omit<MCPServer, "id" | "connectedAt">): MCPServer {
    const servers = this.getMCPServers();
    const newServer: MCPServer = {
      ...server,
      id: "mcp_" + Math.random().toString(36).substring(2, 11),
      connectedAt: Date.now()
    };
    servers.unshift(newServer);
    this.saveMCPServers(servers);
    return newServer;
  }

  // --- REAL AGL LIQUIDITY PAIRS ---
  static getLiquidityPairs(): AGLLiquidityPair[] {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const data = localStorage.getItem("agl_liquidity_pairs");
      if (!data) {
        const defaults: AGLLiquidityPair[] = [
          {
            id: "pair_agl_eth",
            pairSymbol: "AGL / ETH",
            tokenA: { symbol: "AGL", name: "Agunnaya Token", address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698", logoUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80" },
            tokenB: { symbol: "ETH", name: "Ethereum", address: "0x0000000000000000000000000000000000000000", logoUrl: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
            reserveA: 2500000,
            reserveB: 125,
            totalSupplyLP: 17677,
            volume24hUsd: 812500,
            apr: 120.5,
            fee03PctCollectedEth: 2.4375,
            isVerified: true,
            createdAt: Date.now() - 86400000 * 30
          },
          {
            id: "pair_agl_usdc",
            pairSymbol: "AGL / USDC",
            tokenA: { symbol: "AGL", name: "Agunnaya Token", address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698", logoUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80" },
            tokenB: { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", logoUrl: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" },
            reserveA: 10000000,
            reserveB: 1625000,
            totalSupplyLP: 127475,
            volume24hUsd: 2450000,
            apr: 142.8,
            fee03PctCollectedEth: 7.35,
            isVerified: true,
            createdAt: Date.now() - 86400000 * 20
          },
          {
            id: "pair_agl_cbeth",
            pairSymbol: "AGL / cbETH",
            tokenA: { symbol: "AGL", name: "Agunnaya Token", address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698", logoUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80" },
            tokenB: { symbol: "cbETH", name: "Coinbase Staked ETH", address: "0x2Ae3F1Ec7F1F5012A27a5d3f112702170bA3b400", logoUrl: "https://assets.coingecko.com/coins/images/27008/large/cbeth.png" },
            reserveA: 950000,
            reserveB: 44,
            totalSupplyLP: 6465,
            volume24hUsd: 308750,
            apr: 110.8,
            fee03PctCollectedEth: 0.926,
            isVerified: true,
            createdAt: Date.now() - 86400000 * 14
          },
          {
            id: "pair_agl_aero",
            pairSymbol: "AGL / AERO",
            tokenA: { symbol: "AGL", name: "Agunnaya Token", address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698", logoUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80" },
            tokenB: { symbol: "AERO", name: "Aerodrome Token", address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", logoUrl: "https://assets.coingecko.com/coins/images/31745/large/aerodrome.png" },
            reserveA: 1200000,
            reserveB: 156000,
            totalSupplyLP: 13693,
            volume24hUsd: 390000,
            apr: 145.0,
            fee03PctCollectedEth: 1.17,
            isVerified: true,
            createdAt: Date.now() - 86400000 * 10
          }
        ];
        try {
          localStorage.setItem("agl_liquidity_pairs", JSON.stringify(defaults));
        } catch {}
        return defaults;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveLiquidityPairs(pairs: AGLLiquidityPair[]) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("agl_liquidity_pairs", JSON.stringify(pairs));
      } catch {}
    }
    pairs.forEach(p => {
      this.saveToFirestore("liquidity_pairs", p.id, p);
    });
  }

  static addLiquidityToPair(pairId: string, amountA: number, amountB: number): { lpMinted: number; newPair: AGLLiquidityPair } {
    const pairs = this.getLiquidityPairs();
    const idx = pairs.findIndex(p => p.id === pairId);
    if (idx === -1) throw new Error("Liquidity pair not found");

    const pair = pairs[idx];
    // Constant product LP mint ratio = sqrt(amountA * amountB) or proportional
    const lpMinted = Math.sqrt(amountA * amountB);

    pair.reserveA += amountA;
    pair.reserveB += amountB;
    pair.totalSupplyLP += lpMinted;
    pair.volume24hUsd += (amountA * 0.1625) + (amountB * 3250);

    pairs[idx] = pair;
    this.saveLiquidityPairs(pairs);

    // Update wallet balance: deposit AGL, receive LP tokens
    const wallet = this.getWallet();
    wallet.aglTokenBalance = Math.max(0, wallet.aglTokenBalance - amountA);
    if (pair.tokenB.symbol === "ETH") {
      wallet.balanceEth = Math.max(0, wallet.balanceEth - amountB);
    }
    wallet.aglLiquidityStaked = (wallet.aglLiquidityStaked || 0) + lpMinted;
    this.saveWallet(wallet);

    // Log Activity
    this.addActivity({
      type: "stake",
      tokenSymbol: pair.pairSymbol,
      tokenAddress: pair.tokenA.address,
      user: wallet.address,
      amount: lpMinted,
      ethValue: amountB,
      details: `Added Liquidity: ${amountA.toLocaleString()} ${pair.tokenA.symbol} + ${amountB} ${pair.tokenB.symbol} (Minted ${lpMinted.toFixed(2)} LP tokens)`
    });

    return { lpMinted, newPair: pair };
  }

  static removeLiquidityFromPair(pairId: string, lpAmount: number): { amountA: number; amountB: number; newPair: AGLLiquidityPair } {
    const pairs = this.getLiquidityPairs();
    const idx = pairs.findIndex(p => p.id === pairId);
    if (idx === -1) throw new Error("Liquidity pair not found");

    const pair = pairs[idx];
    const share = Math.min(1, lpAmount / pair.totalSupplyLP);
    const amountA = pair.reserveA * share;
    const amountB = pair.reserveB * share;

    pair.reserveA -= amountA;
    pair.reserveB -= amountB;
    pair.totalSupplyLP -= lpAmount;

    pairs[idx] = pair;
    this.saveLiquidityPairs(pairs);

    // Update wallet
    const wallet = this.getWallet();
    wallet.aglTokenBalance += amountA;
    if (pair.tokenB.symbol === "ETH") {
      wallet.balanceEth += amountB;
    }
    wallet.aglLiquidityStaked = Math.max(0, (wallet.aglLiquidityStaked || 0) - lpAmount);
    this.saveWallet(wallet);

    // Log Activity
    this.addActivity({
      type: "stake",
      tokenSymbol: pair.pairSymbol,
      tokenAddress: pair.tokenA.address,
      user: wallet.address,
      amount: lpAmount,
      ethValue: amountB,
      details: `Removed Liquidity: Reclaimed ${amountA.toFixed(2)} ${pair.tokenA.symbol} + ${amountB.toFixed(4)} ${pair.tokenB.symbol}`
    });

    return { amountA, amountB, newPair: pair };
  }

  static injectInstitutionalAglUsdcLiquidity(amountAgl: number = 1500000, amountUsdc: number = 250000): { lpMinted: number; newPair: AGLLiquidityPair } {
    const pairs = this.getLiquidityPairs();
    let idx = pairs.findIndex(p => p.id === "pair_agl_usdc");

    if (idx === -1) {
      // Create if missing
      const usdcPair: AGLLiquidityPair = {
        id: "pair_agl_usdc",
        pairSymbol: "AGL / USDC",
        tokenA: { symbol: "AGL", name: "Agunnaya Token", address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698", logoUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80" },
        tokenB: { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", logoUrl: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" },
        reserveA: 10000000,
        reserveB: 1625000,
        totalSupplyLP: 127475,
        volume24hUsd: 2450000,
        apr: 142.8,
        fee03PctCollectedEth: 7.35,
        isVerified: true,
        createdAt: Date.now() - 86400000 * 20
      };
      pairs.unshift(usdcPair);
      idx = 0;
    }

    const pair = pairs[idx];
    const lpMinted = Math.sqrt(amountAgl * amountUsdc);

    pair.reserveA += amountAgl;
    pair.reserveB += amountUsdc;
    pair.totalSupplyLP += lpMinted;
    pair.volume24hUsd += amountUsdc * 1.5;
    pair.apr = Math.min(185.0, pair.apr + 2.5);

    pairs[idx] = pair;
    this.saveLiquidityPairs(pairs);

    // Update wallet LP staked balance
    const wallet = this.getWallet();
    wallet.aglLiquidityStaked = (wallet.aglLiquidityStaked || 0) + lpMinted;
    this.saveWallet(wallet);

    // Add Activity
    this.addActivity({
      type: "stake",
      tokenSymbol: "AGL / USDC",
      tokenAddress: pair.tokenA.address,
      user: wallet.address || "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
      amount: lpMinted,
      ethValue: amountUsdc / 3250,
      details: `Institutional Liquidity Injected: +${amountAgl.toLocaleString()} AGL + $${amountUsdc.toLocaleString()} USDC to Base L2 DEX Pools (Minted ${lpMinted.toFixed(0)} LP Tokens)`
    });

    return { lpMinted, newPair: pair };
  }

  // --- AGL POLLS & PAIR GOVERNANCE ---
  static getAGLPolls(): AGLPoll[] {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const data = localStorage.getItem("agl_polls");
      if (!data) {
        const defaults: AGLPoll[] = [
          {
            id: "poll_pair_boost",
            title: "AGL Liquidity Pair Boost: Which coin pairs with AGL for 2x Staking APY?",
            description: "Vote on the next high-volume coin to receive official $AGL liquidity pairing and double yield multipliers on Base L2.",
            category: "pair",
            pairSymbol: "AGL / USDC",
            options: [
              { id: "opt_usdc", label: "AGL / USDC (Stable Liquidity Depth)", votes: 1425000, voters: ["0x4795...", "0x89ab..."] },
              { id: "opt_aero", label: "AGL / AERO (Aerodrome Yield Synergy)", votes: 980000, voters: ["0x3456..."] },
              { id: "opt_sol", label: "AGL / SOL (Cross-chain Bridge Pair)", votes: 620000, voters: [] },
              { id: "opt_uni", label: "AGL / UNI (Uniswap V3 Concentrated Pool)", votes: 310000, voters: [] }
            ],
            totalVotes: 3335000,
            status: "active",
            endTime: Date.now() + 86400000 * 6,
            creator: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
            createdAt: Date.now() - 86400000 * 2
          },
          {
            id: "poll_fee_split",
            title: "AGL Protocol Fee Distribution: 0.3% DEX Swap Fee Allocation",
            description: "Determine how collected DEX swap fees across all AGL liquidity pools should be split between LP Providers, AGL Buyback/Burn, and Treasury.",
            category: "fee",
            options: [
              { id: "opt_100_lp", label: "100% to Liquidity Providers (Max LP Yield)", votes: 2100000, voters: ["0x7256..."] },
              { id: "opt_80_20", label: "80% LPs / 20% Automated AGL Token Burn", votes: 3450000, voters: ["0x3456...", "0x89ab..."] },
              { id: "opt_70_30", label: "70% LPs / 30% AI Developer Grants Treasury", votes: 890000, voters: [] }
            ],
            totalVotes: 6440000,
            status: "active",
            endTime: Date.now() + 86400000 * 4,
            creator: "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
            createdAt: Date.now() - 86400000 * 4
          },
          {
            id: "poll_agent_grant",
            title: "Approve 50,000 $AGL Grant for Autonomous Arbitrage Agent #04",
            description: "Proposal to fund Agent #04 with 50,000 $AGL from treasury to execute cross-DEX liquidity rebalancing automatically.",
            category: "grant",
            options: [
              { id: "opt_approve", label: "Approve 50k $AGL Grant", votes: 4200000, voters: ["0x4795...", "0x3456..."] },
              { id: "opt_reject", label: "Reject Grant Request", votes: 150000, voters: [] }
            ],
            totalVotes: 4350000,
            status: "active",
            endTime: Date.now() + 86400000 * 8,
            creator: "0x3456...ef01",
            createdAt: Date.now() - 86400000 * 1
          }
        ];
        try {
          localStorage.setItem("agl_polls", JSON.stringify(defaults));
        } catch {}
        return defaults;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveAGLPolls(polls: AGLPoll[]) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("agl_polls", JSON.stringify(polls));
      } catch {}
    }
    polls.forEach(p => {
      this.saveToFirestore("polls", p.id, p);
    });
  }

  static voteOnAGLPoll(pollId: string, optionId: string, voteWeight: number): { updatedPoll: AGLPoll } {
    const polls = this.getAGLPolls();
    const idx = polls.findIndex(p => p.id === pollId);
    if (idx === -1) throw new Error("AGL Poll not found");

    const poll = polls[idx];
    const wallet = this.getWallet();

    const optIdx = poll.options.findIndex(o => o.id === optionId);
    if (optIdx === -1) throw new Error("Poll option not found");

    poll.options[optIdx].votes += voteWeight;
    if (!poll.options[optIdx].voters.includes(wallet.address)) {
      poll.options[optIdx].voters.push(wallet.address);
    }
    poll.totalVotes += voteWeight;

    polls[idx] = poll;
    this.saveAGLPolls(polls);

    // Log Activity
    this.addActivity({
      type: "vote",
      tokenSymbol: "AGL",
      tokenAddress: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698",
      user: wallet.address,
      amount: voteWeight,
      ethValue: (voteWeight * 0.1625) / 3250,
      details: `Voted ${voteWeight.toLocaleString()} $AGL in Poll: "${poll.title}" -> ${poll.options[optIdx].label}`
    });

    return { updatedPoll: poll };
  }

  static addAGLPoll(poll: Omit<AGLPoll, "id" | "totalVotes" | "createdAt" | "creator">): AGLPoll {
    const polls = this.getAGLPolls();
    const wallet = this.getWallet();

    const newPoll: AGLPoll = {
      ...poll,
      id: "poll_" + Math.random().toString(36).substring(2, 11),
      totalVotes: 0,
      creator: wallet.address,
      createdAt: Date.now()
    };

    polls.unshift(newPoll);
    this.saveAGLPolls(polls);

    // Log Activity
    this.addActivity({
      type: "create",
      tokenSymbol: "AGL",
      tokenAddress: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698",
      user: wallet.address,
      amount: 0,
      ethValue: 0,
      details: `Created new AGL Governance Poll: "${poll.title}"`
    });

    return newPoll;
  }

  // --- REAL STAKING & COMPOUNDING ENGINE ---
  static stakeTokens(poolId: string, amount: number): { success: boolean; newStakedBalance: number } {
    const wallet = this.getWallet();
    if (wallet.aglTokenBalance < amount) {
      throw new Error("Insufficient AGL token balance to stake");
    }

    const pools = this.getStakingPools();
    const idx = pools.findIndex(p => p.id === poolId);
    const pool = idx !== -1 ? pools[idx] : pools[0];

    // Deduct AGL from wallet
    wallet.aglTokenBalance -= amount;
    wallet.aglLiquidityStaked = (wallet.aglLiquidityStaked || 0) + amount;
    this.saveWallet(wallet);

    // Update pool
    pool.stakedBalance += amount;
    pool.tvlEth += (amount * 0.1625) / 3250;
    pools[idx] = pool;
    this.saveStakingPools(pools);

    // Log Activity
    this.addActivity({
      type: "stake",
      tokenSymbol: pool.tokenSymbol,
      tokenAddress: pool.tokenAddress,
      user: wallet.address,
      amount: amount,
      ethValue: (amount * 0.1625) / 3250,
      details: `Staked ${amount.toLocaleString()} ${pool.tokenSymbol} into ${pool.tokenName} (${pool.apr}% APY)`
    });

    return { success: true, newStakedBalance: pool.stakedBalance };
  }

  static claimStakingRewards(poolId: string): { success: boolean; claimedRewards: number } {
    const pools = this.getStakingPools();
    const idx = pools.findIndex(p => p.id === poolId);
    if (idx === -1) throw new Error("Staking pool not found");

    const pool = pools[idx];
    const rewards = pool.earnedRewards;
    if (rewards <= 0) return { success: false, claimedRewards: 0 };

    pool.earnedRewards = 0;
    pools[idx] = pool;
    this.saveStakingPools(pools);

    // Add rewards to user wallet
    const wallet = this.getWallet();
    wallet.aglTokenBalance += rewards;
    this.saveWallet(wallet);

    // Log Activity
    this.addActivity({
      type: "stake",
      tokenSymbol: "AGL",
      tokenAddress: pool.tokenAddress,
      user: wallet.address,
      amount: rewards,
      ethValue: (rewards * 0.1625) / 3250,
      details: `Claimed +${rewards.toFixed(2)} AGL Staking Yield Rewards`
    });

    return { success: true, claimedRewards: rewards };
  }

  static unstakeTokens(poolId: string, amount: number): { success: boolean; remainingStaked: number } {
    const pools = this.getStakingPools();
    const idx = pools.findIndex(p => p.id === poolId);
    if (idx === -1) throw new Error("Staking pool not found");

    const pool = pools[idx];
    if (pool.stakedBalance < amount) throw new Error("Cannot unstake more than currently staked balance");

    pool.stakedBalance -= amount;
    pools[idx] = pool;
    this.saveStakingPools(pools);

    // Refund wallet
    const wallet = this.getWallet();
    wallet.aglTokenBalance += amount;
    wallet.aglLiquidityStaked = Math.max(0, (wallet.aglLiquidityStaked || 0) - amount);
    this.saveWallet(wallet);

    // Log Activity
    this.addActivity({
      type: "stake",
      tokenSymbol: pool.tokenSymbol,
      tokenAddress: pool.tokenAddress,
      user: wallet.address,
      amount: amount,
      ethValue: (amount * 0.1625) / 3250,
      details: `Unstaked ${amount.toLocaleString()} ${pool.tokenSymbol} back to wallet`
    });

    return { success: true, remainingStaked: pool.stakedBalance };
  }

  // USER PROFILE & DAILY MISSIONS ENGINE
  static getTodayString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  static getUserProfile(addressOrUid: string): UserProfile {
    if (!addressOrUid) {
      return {
        userId: "guest",
        totalCreditsEarned: 0,
        streakDays: 1,
        lastCheckinDate: this.getTodayString(),
        dailyMissions: getDefaultDailyMissions(),
        updatedAt: Date.now()
      };
    }

    const key = `agl_user_profile_${addressOrUid.toLowerCase()}`;
    const today = this.getTodayString();

    const fallback: UserProfile = {
      userId: addressOrUid,
      address: addressOrUid.startsWith("0x") ? addressOrUid : undefined,
      totalCreditsEarned: 50,
      streakDays: 1,
      lastCheckinDate: today,
      dailyMissions: getDefaultDailyMissions(),
      updatedAt: Date.now()
    };

    let profile = this.safeParse<UserProfile>(key, fallback);

    // Ensure all default missions exist in profile even if updated
    const defaultMissions = getDefaultDailyMissions();
    const existingMissionIds = new Set(profile.dailyMissions.map(m => m.id));
    let missionsChanged = false;

    defaultMissions.forEach(dm => {
      if (!existingMissionIds.has(dm.id)) {
        profile.dailyMissions.push(dm);
        missionsChanged = true;
      }
    });

    // Reset daily missions if it's a new calendar day
    if (profile.lastCheckinDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      const newStreak = profile.lastCheckinDate === yesterdayStr ? profile.streakDays + 1 : 1;

      profile = {
        ...profile,
        lastCheckinDate: today,
        streakDays: newStreak,
        dailyMissions: getDefaultDailyMissions(),
        updatedAt: Date.now()
      };

      this.saveUserProfile(profile);
    } else if (missionsChanged) {
      this.saveUserProfile(profile);
    }

    return profile;
  }

  static saveUserProfile(profile: UserProfile) {
    if (!profile.userId) return;
    const key = `agl_user_profile_${profile.userId.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(profile));
    this.saveToFirestore("users", profile.userId, profile);
  }

  static claimMissionReward(addressOrUid: string, missionId: string): { success: boolean; creditReward: number; updatedProfile: UserProfile } {
    const profile = this.getUserProfile(addressOrUid);
    const mission = profile.dailyMissions.find(m => m.id === missionId);

    if (!mission) {
      throw new Error("Mission not found.");
    }
    if (!mission.completed) {
      throw new Error("Mission is not completed yet.");
    }
    if (mission.claimed) {
      throw new Error("Mission reward already claimed.");
    }

    mission.claimed = true;
    profile.totalCreditsEarned += mission.creditReward;
    profile.updatedAt = Date.now();

    this.saveUserProfile(profile);

    // Award AGL credits to wallet
    const wallet = this.getWallet();
    wallet.aglCredits += mission.creditReward;
    this.saveWallet(wallet);

    // Log Activity
    this.addActivity({
      type: "achievement",
      tokenSymbol: "AGL",
      tokenAddress: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698",
      user: addressOrUid,
      amount: mission.creditReward,
      ethValue: 0,
      details: `Claimed +${mission.creditReward} AGL Bonus Credits for completing mission: ${mission.title}`
    });

    return { success: true, creditReward: mission.creditReward, updatedProfile: profile };
  }

  static triggerMissionAction(addressOrUid: string, category: "trade" | "deploy" | "stake" | "social" | "checkin" | "form") {
    if (!addressOrUid) return;
    const profile = this.getUserProfile(addressOrUid);
    let updated = false;

    profile.dailyMissions = profile.dailyMissions.map(m => {
      if (m.category === category && !m.completed) {
        const newProgress = Math.min(m.targetCount, m.currentProgress + 1);
        const isNowCompleted = newProgress >= m.targetCount;
        updated = true;
        return {
          ...m,
          currentProgress: newProgress,
          completed: isNowCompleted
        };
      }
      return m;
    });

    if (updated) {
      profile.updatedAt = Date.now();
      this.saveUserProfile(profile);
    }
  }

  static resetDatabase() {

    localStorage.removeItem("agl_tasks");
    localStorage.removeItem("agl_tokens");
    localStorage.removeItem("agl_nfts");
    localStorage.removeItem("agl_daos");
    localStorage.removeItem("agl_gamefi");
    localStorage.removeItem("agl_agents");
    localStorage.removeItem("agl_staking");
    localStorage.removeItem("agl_wallet");
    localStorage.removeItem("agl_activities");
    localStorage.removeItem("agl_referral_records");
    localStorage.removeItem("agl_referral_payouts");
    localStorage.removeItem("agl_visitor_referrer");
    localStorage.removeItem("agl_price_alerts");
  }
}
