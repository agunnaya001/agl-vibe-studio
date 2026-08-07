import { Token, NFTCollection, DAO, GameFiProject, AIAgent, WalletState, Activity, StakingPool, ReferralRecord, ReferralPayout, PriceAlert, SubAccount, AgentServiceConnection, Task } from "../types";
import { doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "./firebase";

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
    address: "0xea1221b4d80a89bd8c75248fae7c176bd1854698",
    name: "Agunnaya Utility Token",
    symbol: "AGL",
    description: "The official utility token of Agunnaya Labs Studio. Used to unlock premium templates, pay for autonomous AI Agent triggers at a discount, secure governance rights, and stake for premium yield.",
    creator: "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B",
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
    address: "0x3456...ef01",
    name: "Base AI Core",
    symbol: "BAIC",
    description: "An AI agent token supporting decentralized machine learning consensus on Base. Automatically buys compute bandwidth on-chain.",
    creator: "0xCreatorOfBAIC",
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
    address: "0x89ab...bcde",
    name: "Meme Pad Chad",
    symbol: "CHAD",
    description: "The ultimate hyper-deflationary meme asset on Base. Real physical gainz simulated mathematically via linear curves.",
    creator: "0xMemeMaster",
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
    contractAddress: "0x7890...cdef",
    name: "Agunnaya Genesis Keys",
    symbol: "AGK",
    description: "A premium collection of 1000 fully on-chain 3D access keys on Base. Unlocks unlimited free deployments, early access to new AI Agents, and active fee share on Agunnaya Labs Studio.",
    creator: "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B",
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
    contractAddress: "0xdad1...eade",
    name: "Base Builders Guild DAO",
    symbol: "BBG",
    description: "A community DAO designed to fund open-source development tools, public goods, and meme generators exclusively on Base. Supported by Agunnaya Labs multi-sig.",
    creator: "0xBBGCreator",
    governanceTokenAddress: "0xea1221b4d80a89bd8c75248fae7c176bd1854698", // AGL token as gov token
    treasuryBalanceEth: 25.5,
    memberCount: 142,
    proposals: [
      {
        id: "prop-1",
        title: "Sponsor Base Memefest Hackathon 2026",
        description: "Deploy 5 ETH from the guild treasury to provide cash prizes for the best bonding curve meme coin created using Agunnaya Studio.",
        creator: "0xGuildElder",
        status: "Active",
        votesFor: 852000,
        votesAgainst: 12000,
        endTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
        executed: false
      },
      {
        id: "prop-2",
        title: "Integrate Gas sponsorship and Account Abstraction",
        description: "Deploy 2 ETH to sponsor gas fees for new users launching their first contract via Agunnaya AI Builder.",
        creator: "0xSmartDev",
        status: "Passed",
        votesFor: 1200000,
        votesAgainst: 5000,
        endTime: Date.now() - 1 * 24 * 60 * 60 * 1000,
        executed: true
      }
    ],
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000
  }
];

const SEED_GAMEFI: GameFiProject[] = [
  {
    contractAddress: "0x9876...5432",
    name: "Base Cyber Arena",
    symbol: "BCA",
    description: "An arcade-inspired, retro Battle Pass game where players complete daily on-chain developer challenges to earn XP, achievements, and unlock exclusive rewards.",
    creator: "0xArcadeMaster",
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
      { rank: 1, user: "0x4795...4D5B", xp: 1240, score: 9800 },
      { rank: 2, user: "0xGuildElder", xp: 950, score: 7200 },
      { rank: 3, user: "0xMemeMaster", xp: 820, score: 6100 }
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
    contractAddress: "0xAgentSentinelAddress",
    creator: "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B",
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
    contractAddress: "0xAgentOracleAddress",
    creator: "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B",
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
  { id: "s-1", tokenName: "Agunnaya Labs Token", tokenSymbol: "AGL", tokenAddress: "0xea1221b4d80a89bd8c75248fae7c176bd1854698", apr: 38.5, tvlEth: 12.8, stakedBalance: 0, earnedRewards: 0, lockPeriodDays: 7 },
  { id: "s-2", tokenName: "Meme Pad Chad", tokenSymbol: "CHAD", tokenAddress: "0x89ab...bcde", apr: 82.0, tvlEth: 4.15, stakedBalance: 0, earnedRewards: 0, lockPeriodDays: 0 },
  { id: "s-3", tokenName: "Base AI Core", tokenSymbol: "BAIC", tokenAddress: "0x3456...ef01", apr: 48.0, tvlEth: 6.42, stakedBalance: 0, earnedRewards: 0, lockPeriodDays: 14 }
];

const SEED_ACTIVITIES: Activity[] = [
  { id: "a-1", type: "create", tokenSymbol: "AGL", tokenAddress: "0xea1221b4d80a89bd8c75248fae7c176bd1854698", user: "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B", amount: 1000000000, ethValue: 0, timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, details: "Platform genesis launch of Agunnaya Labs Utility Token" },
  { id: "a-2", type: "buy", tokenSymbol: "CHAD", tokenAddress: "0x89ab...bcde", user: "0x9821...5523", amount: 12000, ethValue: 0.015, timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, details: "Bought 12,000 CHAD tokens on the bonding curve" },
  { id: "a-3", type: "mint", tokenSymbol: "AGK", tokenAddress: "0x7890...cdef", user: "0x9821...5523", amount: 1, ethValue: 0.05, timestamp: Date.now() - 20 * 24 * 60 * 60 * 1000, details: "Minted Agunnaya Genesis Key #1 access NFT" },
  { id: "a-4", type: "vote", tokenSymbol: "BBG", tokenAddress: "0xdad1...eade", user: "0x4795...4D5B", amount: 50000, ethValue: 0, timestamp: Date.now() - 12 * 24 * 60 * 60 * 1000, details: "Voted FOR Proposal #2 'AA integration' with 50,000 voting weight" }
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
    if (!auth.currentUser) {
      // Passive local-only mode when not signed in with Google
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
    try {
      // 1. Sync Tokens
      const tokenSnap = await getDocs(collection(db, "tokens"));
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

      // 2. Sync NFTs
      const nftsSnap = await getDocs(collection(db, "nfts"));
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

      // 3. Sync DAOs
      const daosSnap = await getDocs(collection(db, "daos"));
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

      // 4. Sync GameFi
      const gamefiSnap = await getDocs(collection(db, "gamefi"));
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

      // 5. Sync Agents
      const agentsSnap = await getDocs(collection(db, "agents"));
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

      // 6. Sync Staking
      const stakingSnap = await getDocs(collection(db, "staking"));
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

      // 7. Sync Activities
      const actSnap = await getDocs(collection(db, "activities"));
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

      // 8. Sync Referrals
      const refSnap = await getDocs(collection(db, "referrals"));
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

      // 9. Sync Price Alerts
      if (auth.currentUser) {
        const alertsSnap = await getDocs(collection(db, "price_alerts"));
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

      return true;
    } catch (err) {
      console.error("Firestore initial sync failed:", err);
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
    return this.safeParse<Token[]>("agl_tokens", SEED_TOKENS);
  }

  static saveTokens(tokens: Token[]) {
    localStorage.setItem("agl_tokens", JSON.stringify(tokens));
    tokens.forEach(t => {
      this.saveToFirestore("tokens", t.address, t);
    });
  }

  static getNFTs(): NFTCollection[] {
    return this.safeParse<NFTCollection[]>("agl_nfts", SEED_NFTS);
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

  static saveStaking(pools: StakingPool[]) {
    localStorage.setItem("agl_staking", JSON.stringify(pools));
    pools.forEach(p => {
      this.saveToFirestore("staking", p.id, p);
    });
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
        address: "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B",
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
