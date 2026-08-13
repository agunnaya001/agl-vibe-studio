import React, { useState, useEffect } from "react";
import { GameFiProject, WalletState, NFTCollection, NFTItem } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { 
  BASE_MAINNET_ECOSYSTEM_CONTRACTS, 
  ARENA_TOKEN_ADDRESS,
  ARENA_CHAMPION_NFT_ADDRESS,
  ARENA_MARKETPLACE_ADDRESS,
  ARENA_BATTLE_ADDRESS,
  ARENA_PVP_ADDRESS,
  AGL_TOKEN_ADDRESS 
} from "../lib/aglContracts";
import { 
  Trophy, 
  Swords, 
  Shield, 
  ShoppingBag, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Zap, 
  Award, 
  Flame, 
  TrendingUp, 
  ChevronRight, 
  UserCheck, 
  Plus, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Layers, 
  Coins, 
  Crown,
  Heart,
  Skull,
  Crosshair,
  Info
} from "lucide-react";
import ImageWithFallback from "../components/ImageWithFallback";

interface GameFiPageProps {
  wallet: WalletState;
  games: GameFiProject[];
  onRefreshGames: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

interface ChampionFighter {
  id: string;
  name: string;
  classType: "Warrior" | "Assassin" | "Mage" | "Paladin";
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  specialSkill: string;
  specialDescription: string;
  imageUrl: string;
  wins: number;
  losses: number;
  contractAddress: string;
}

interface MarketplaceItem {
  id: string;
  name: string;
  category: "Champion" | "Weapon" | "Armor" | "Pass";
  priceEth: number;
  priceArena: number;
  seller: string;
  imageUrl: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  stats: string;
}

interface TournamentData {
  id: string;
  title: string;
  category: string;
  prizePoolEth: number;
  prizePoolArena: number;
  entryFeeArena: number;
  maxParticipants: number;
  currentParticipants: number;
  status: "Open" | "Live" | "Completed";
  startTime: string;
  contractAddress: string;
}

const DEFAULT_CHAMPIONS: ChampionFighter[] = [
  {
    id: "champ-1",
    name: "Cyber Warlord #104",
    classType: "Warrior",
    level: 12,
    hp: 450,
    maxHp: 450,
    attack: 94,
    defense: 88,
    speed: 72,
    specialSkill: "Plasma Cleave",
    specialDescription: "Deals 180% heavy piercing damage and reduces opponent armor.",
    imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80",
    wins: 48,
    losses: 12,
    contractAddress: ARENA_CHAMPION_NFT_ADDRESS
  },
  {
    id: "champ-2",
    name: "Neon Valkyrie #212",
    classType: "Assassin",
    level: 10,
    hp: 360,
    maxHp: 360,
    attack: 110,
    defense: 55,
    speed: 98,
    specialSkill: "Sonic Blitz",
    specialDescription: "Strikes 3 consecutive times with +40% critical chance.",
    imageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&auto=format&fit=crop&q=80",
    wins: 52,
    losses: 19,
    contractAddress: ARENA_CHAMPION_NFT_ADDRESS
  },
  {
    id: "champ-3",
    name: "Chrono Archmage #089",
    classType: "Mage",
    level: 14,
    hp: 380,
    maxHp: 380,
    attack: 125,
    defense: 60,
    speed: 84,
    specialSkill: "Time Singularity",
    specialDescription: "Freezes the opponent for 1 turn and siphons 30% attack power.",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    wins: 64,
    losses: 14,
    contractAddress: ARENA_CHAMPION_NFT_ADDRESS
  },
  {
    id: "champ-4",
    name: "Aegis Paladin #305",
    classType: "Paladin",
    level: 11,
    hp: 520,
    maxHp: 520,
    attack: 78,
    defense: 120,
    speed: 60,
    specialSkill: "Divine Barrier",
    specialDescription: "Reflects 50% incoming damage and restores 80 HP.",
    imageUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80",
    wins: 39,
    losses: 15,
    contractAddress: ARENA_CHAMPION_NFT_ADDRESS
  }
];

const DEFAULT_MARKET_ITEMS: MarketplaceItem[] = [
  {
    id: "mkt-1",
    name: "Cyber Warlord #104",
    category: "Champion",
    priceEth: 0.045,
    priceArena: 850,
    seller: "0x6781...698E",
    imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80",
    rarity: "Epic",
    stats: "Lvl 12 Warrior • 94 ATK • 88 DEF"
  },
  {
    id: "mkt-2",
    name: "Hyper-Ion Plasma Greatsword",
    category: "Weapon",
    priceEth: 0.018,
    priceArena: 350,
    seller: "0x3456...7890",
    imageUrl: "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=500&auto=format&fit=crop&q=80",
    rarity: "Legendary",
    stats: "+35 Combat Attack • +15% Critical Strike"
  },
  {
    id: "mkt-3",
    name: "Titanium Force Aegis",
    category: "Armor",
    priceEth: 0.012,
    priceArena: 240,
    seller: "0x9876...5432",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
    rarity: "Rare",
    stats: "+45 Armor Defense • -10% Piercing Damage"
  },
  {
    id: "mkt-4",
    name: "Arena Season 4 VIP Battle Pass",
    category: "Pass",
    priceEth: 0.015,
    priceArena: 300,
    seller: "0x6781...698E",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80",
    rarity: "Legendary",
    stats: "2x XP Multiplier • Free Tournament Entries"
  }
];

const DEFAULT_TOURNAMENTS: TournamentData[] = [
  {
    id: "tourney-1",
    title: "Base Grand Championship 2026",
    category: "High Roller Invitational",
    prizePoolEth: 4.5,
    prizePoolArena: 100000,
    entryFeeArena: 500,
    maxParticipants: 32,
    currentParticipants: 24,
    status: "Open",
    startTime: "In 2h 45m",
    contractAddress: ARENA_PVP_ADDRESS
  },
  {
    id: "tourney-2",
    title: "Neon Gladiator Speed Blitz",
    category: "Rapid Knockout",
    prizePoolEth: 1.8,
    prizePoolArena: 45000,
    entryFeeArena: 200,
    maxParticipants: 16,
    currentParticipants: 14,
    status: "Open",
    startTime: "In 35m",
    contractAddress: ARENA_PVP_ADDRESS
  },
  {
    id: "tourney-3",
    title: "Agunnaya Community Clash",
    category: "Open Qualifier",
    prizePoolEth: 0.8,
    prizePoolArena: 25000,
    entryFeeArena: 50,
    maxParticipants: 64,
    currentParticipants: 58,
    status: "Live",
    startTime: "Underway",
    contractAddress: ARENA_PVP_ADDRESS
  }
];

export default function GameFiPage({ wallet, games, onRefreshGames, addTerminalLog, showToast }: GameFiPageProps) {
  const [activeTab, setActiveTab] = useState<"pvp" | "battle" | "champions" | "marketplace" | "contracts" | "quests">("pvp");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Battle Simulator States
  const [selectedChampion, setSelectedChampion] = useState<ChampionFighter>(DEFAULT_CHAMPIONS[0]);
  const [playerHp, setPlayerHp] = useState<number>(DEFAULT_CHAMPIONS[0].hp);
  const [opponentHp, setOpponentHp] = useState<number>(420);
  const [maxOpponentHp] = useState<number>(420);
  const [isBattleActive, setIsBattleActive] = useState<boolean>(false);
  const [isFightingTurn, setIsFightingTurn] = useState<boolean>(false);
  const [battleLogs, setBattleLogs] = useState<Array<{ id: string; text: string; type: "player" | "opponent" | "system" | "crit" }>>([]);
  const [battleWinner, setBattleWinner] = useState<"player" | "opponent" | null>(null);
  const [specialCooldown, setSpecialCooldown] = useState<number>(0);

  // Tournament Registration State
  const [registeringTourneyId, setRegisteringTourneyId] = useState<string | null>(null);
  const [registeredTourneys, setRegisteredTourneys] = useState<string[]>([]);

  // Marketplace Buy State
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>(DEFAULT_MARKET_ITEMS);

  // Champion Minting State
  const [isMintingChampion, setIsMintingChampion] = useState<boolean>(false);

  // Copy handler
  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    showToast("Address copied to clipboard!", "info");
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Start a new PvP Battle
  const handleStartBattle = () => {
    if (!wallet.isConnected) {
      showToast("Connect your Web3 wallet to enter the Battle Arena.", "error");
      return;
    }

    setPlayerHp(selectedChampion.hp);
    setOpponentHp(maxOpponentHp);
    setIsBattleActive(true);
    setBattleWinner(null);
    setSpecialCooldown(0);
    setBattleLogs([
      { id: "log-0", text: `⚔️ Match Found! ${selectedChampion.name} vs. Cyber Berserker #882 in ArenaBattle (${ARENA_BATTLE_ADDRESS.slice(0, 8)}...).`, type: "system" }
    ]);

    addTerminalLog("info", `[ArenaBattle] Initialized combat matchup for ${selectedChampion.name}. Contract: ${ARENA_BATTLE_ADDRESS}`);
  };

  // Execute Player Turn Action
  const handlePlayerAction = (actionType: "strike" | "special" | "defend") => {
    if (!isBattleActive || isFightingTurn || battleWinner) return;

    setIsFightingTurn(true);

    let damage = 0;
    let actionLog = "";
    let logType: "player" | "crit" = "player";

    if (actionType === "strike") {
      const isCrit = Math.random() < 0.25;
      const baseDmg = Math.round(selectedChampion.attack * (0.8 + Math.random() * 0.4));
      damage = isCrit ? Math.round(baseDmg * 1.6) : baseDmg;
      actionLog = isCrit 
        ? `🔥 CRITICAL HIT! ${selectedChampion.name} struck for ${damage} devastating damage!`
        : `⚔️ ${selectedChampion.name} executed a combat strike dealing ${damage} damage.`;
      if (isCrit) logType = "crit";
    } else if (actionType === "special") {
      damage = Math.round(selectedChampion.attack * 1.8);
      actionLog = `⚡ SPECIAL MOVE: ${selectedChampion.name} unleashed ${selectedChampion.specialSkill} for ${damage} heavy elemental damage!`;
      setSpecialCooldown(2); // 2 turn cooldown
    } else if (actionType === "defend") {
      const healAmount = Math.round(selectedChampion.defense * 0.6);
      setPlayerHp(prev => Math.min(selectedChampion.maxHp, prev + healAmount));
      actionLog = `🛡️ ${selectedChampion.name} assumed a defensive posture, bracing for impact and recovering +${healAmount} HP!`;
    }

    const nextOpponentHp = Math.max(0, opponentHp - damage);
    setOpponentHp(nextOpponentHp);

    setBattleLogs(prev => [
      { id: `log-${Date.now()}-p`, text: actionLog, type: logType },
      ...prev
    ]);

    // Check if opponent defeated
    if (nextOpponentHp <= 0) {
      setBattleWinner("player");
      setIsBattleActive(false);
      setIsFightingTurn(false);

      const rewardArena = 120;
      const rewardXp = 250;

      // Update wallet balance with ARENA rewards
      const currentWallet = AgunnayaDatabase.getWallet();
      currentWallet.aglCredits = (currentWallet.aglCredits || 0) + rewardArena;
      AgunnayaDatabase.saveWallet(currentWallet);

      setBattleLogs(prev => [
        { id: `log-${Date.now()}-w`, text: `👑 VICTORY! Opponent vanquished. Claimed +${rewardArena} ARENA and +${rewardXp} Battle XP on Base!`, type: "system" },
        ...prev
      ]);

      AgunnayaDatabase.addActivity({
        type: "buy",
        tokenSymbol: "ARENA",
        tokenAddress: ARENA_TOKEN_ADDRESS,
        user: wallet.address,
        amount: rewardArena,
        ethValue: 0,
        details: `Won PvP combat duel in ArenaBattle contract (${ARENA_BATTLE_ADDRESS.slice(0, 6)}...). Awarded ${rewardArena} ARENA tokens!`
      });

      addTerminalLog("success", `[ArenaBattle VICTORY] Match resolved on Base. +${rewardArena} ARENA awarded to ${wallet.address}`);
      showToast(`Victory! Earned +${rewardArena} ARENA & +${rewardXp} XP!`, "success");
      return;
    }

    // Opponent counter-attack simulation after 800ms
    setTimeout(() => {
      if (specialCooldown > 0) {
        setSpecialCooldown(prev => Math.max(0, prev - 1));
      }

      const oppAttack = Math.round(65 * (0.85 + Math.random() * 0.35));
      const mitigatedDmg = Math.max(15, oppAttack - Math.round(selectedChampion.defense * 0.25));
      const nextPlayerHp = Math.max(0, playerHp - mitigatedDmg);
      setPlayerHp(nextPlayerHp);

      setBattleLogs(prev => [
        { id: `log-${Date.now()}-o`, text: `💥 Cyber Berserker counter-attacked with Heavy Cleave, dealing ${mitigatedDmg} damage!`, type: "opponent" },
        ...prev
      ]);

      if (nextPlayerHp <= 0) {
        setBattleWinner("opponent");
        setIsBattleActive(false);
        setBattleLogs(prev => [
          { id: `log-${Date.now()}-d`, text: `💀 DEFEAT! Your champion sustained critical damage. Revive and retry!`, type: "system" },
          ...prev
        ]);
        addTerminalLog("error", `[ArenaBattle DEFEAT] Match ended. Champion defeated in combat.`);
        showToast("Match ended in defeat. Revive and retry!", "error");
      }

      setIsFightingTurn(false);
    }, 900);
  };

  // Tournament Registration
  const handleRegisterTournament = (tourney: TournamentData) => {
    if (!wallet.isConnected) {
      showToast("Connect your wallet to register for tournaments.", "error");
      return;
    }

    if (registeredTourneys.includes(tourney.id)) {
      showToast("Already registered for this tournament bracket!", "info");
      return;
    }

    setRegisteringTourneyId(tourney.id);
    addTerminalLog("info", `[ArenaPVP] Initiating tournament stake registration for "${tourney.title}" on Base Mainnet (${ARENA_PVP_ADDRESS})...`);

    setTimeout(() => {
      setRegisteredTourneys(prev => [...prev, tourney.id]);
      setRegisteringTourneyId(null);

      AgunnayaDatabase.addActivity({
        type: "stake",
        tokenSymbol: "ARENA",
        tokenAddress: ARENA_PVP_ADDRESS,
        user: wallet.address,
        amount: tourney.entryFeeArena,
        ethValue: 0,
        details: `Registered bracket entry for "${tourney.title}" with ${tourney.entryFeeArena} ARENA staked in prize escrow.`
      });

      addTerminalLog("success", `[ArenaPVP STAKE CONFIRMED] Staked ${tourney.entryFeeArena} ARENA into ArenaPVP contract (${ARENA_PVP_ADDRESS}). Bracket entry active!`);
      showToast(`Registered for ${tourney.title}! Stake locked in ArenaPVP escrow.`, "success");
    }, 1500);
  };

  // Marketplace Buy Item
  const handleBuyMarketItem = (item: MarketplaceItem) => {
    if (!wallet.isConnected) {
      showToast("Connect your wallet to purchase marketplace items.", "error");
      return;
    }

    setBuyingItemId(item.id);
    addTerminalLog("info", `[ArenaMarketplace] Executing buy order for "${item.name}" via ArenaMarketplace (${ARENA_MARKETPLACE_ADDRESS})...`);

    setTimeout(() => {
      setMarketItems(prev => prev.filter(i => i.id !== item.id));
      setBuyingItemId(null);

      AgunnayaDatabase.addActivity({
        type: "buy",
        tokenSymbol: item.category === "Champion" ? "ACHAMP" : "ITEM",
        tokenAddress: ARENA_MARKETPLACE_ADDRESS,
        user: wallet.address,
        amount: 1,
        ethValue: item.priceEth,
        details: `Purchased ${item.rarity} ${item.name} on ArenaMarketplace for ${item.priceEth} ETH (${item.priceArena} ARENA).`
      });

      addTerminalLog("success", `[ArenaMarketplace SETTLED] Purchase of ${item.name} completed successfully on Base.`);
      showToast(`Acquired ${item.name}! Added to your inventory.`, "success");
    }, 1500);
  };

  // Mint / Recruit Champion NFT
  const handleMintChampion = () => {
    if (!wallet.isConnected) {
      showToast("Connect your wallet to recruit a Champion NFT.", "error");
      return;
    }

    setIsMintingChampion(true);
    addTerminalLog("info", `[ArenaChampion] Minting new ERC-721 Gaming Champion NFT via ${ARENA_CHAMPION_NFT_ADDRESS}...`);

    setTimeout(() => {
      setIsMintingChampion(false);
      AgunnayaDatabase.addActivity({
        type: "mint",
        tokenSymbol: "ACHAMP",
        tokenAddress: ARENA_CHAMPION_NFT_ADDRESS,
        user: wallet.address,
        amount: 1,
        ethValue: 0.025,
        details: `Minted new Battle Champion NFT on Base Mainnet with randomized combat attributes.`
      });

      addTerminalLog("success", `[ArenaChampion MINTED] Champion NFT successfully minted and registered on Base!`);
      showToast("New Champion NFT minted! Added to your battle roster.", "success");
    }, 1800);
  };

  return (
    <div id="arena-gaming-hub-root" className="space-y-6 animate-fade-in pb-12">
      
      {/* TOP HERO HEADER */}
      <div id="arena-hero-banner" className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-blue-950/40 border border-blue-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Base Mainnet Live • Chain ID 8453
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                6 Verified Contracts
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
              <Swords className="w-7 h-7 text-blue-400" />
              Arena Gaming & PvP Hub
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl font-sans leading-relaxed">
              Decentralized Web3 gaming powerhouse on Base. Collect <span className="text-blue-400 font-bold">ArenaChampion NFTs</span>, stake <span className="text-purple-400 font-bold">ARENA & AGL</span> in high-stakes PvP tournaments, trade gear in the <span className="text-emerald-400 font-bold">ArenaMarketplace</span>, and duel in real-time combat.
            </p>
          </div>

          {/* Quick Ecosystem Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-black/50 p-3.5 rounded-2xl border border-white/10 text-center font-mono">
            <div className="p-2 rounded-xl bg-white/5">
              <span className="block text-[9px] uppercase tracking-wider text-zinc-400">Total Prize Pool</span>
              <span className="text-xs sm:text-sm font-bold text-amber-400">7.1 ETH</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="block text-[9px] uppercase tracking-wider text-zinc-400">ARENA Staked</span>
              <span className="text-xs sm:text-sm font-bold text-purple-400">170,000</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="block text-[9px] uppercase tracking-wider text-zinc-400">Champions</span>
              <span className="text-xs sm:text-sm font-bold text-blue-400">620 NFTs</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="block text-[9px] uppercase tracking-wider text-zinc-400">Battles Fought</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400">1,480+</span>
            </div>
          </div>
        </div>
      </div>

      {/* VERIFIED BASE MAINNET CONTRACTS BAR */}
      <div id="verified-contracts-bar" className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            Verified Base Mainnet Smart Contracts
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            Click address to copy • BaseScan deep links available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {BASE_MAINNET_ECOSYSTEM_CONTRACTS.map((contract) => (
            <div 
              key={contract.address} 
              className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{contract.name}</span>
                  {contract.symbol && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 text-[9px] font-mono font-bold">
                      {contract.symbol}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => handleCopy(contract.address)}
                  className="text-[10px] font-mono text-zinc-400 hover:text-blue-300 flex items-center gap-1 transition-colors mt-0.5"
                  title="Click to copy contract address"
                >
                  <span className="truncate">{contract.address.slice(0, 8)}...{contract.address.slice(-6)}</span>
                  {copiedAddress === contract.address ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                  )}
                </button>
              </div>

              <a
                href={contract.basescanUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-blue-600/20 text-zinc-400 hover:text-blue-300 border border-white/5 transition-all shrink-0"
                title="View on BaseScan"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div id="arena-navigation-tabs" className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        <button
          id="tab-pvp-tournaments"
          onClick={() => setActiveTab("pvp")}
          className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "pvp"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          PvP Tournaments & Brackets
        </button>

        <button
          id="tab-battle-arena"
          onClick={() => setActiveTab("battle")}
          className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "battle"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
          }`}
        >
          <Swords className="w-4 h-4 text-red-400" />
          Live Combat Arena
        </button>

        <button
          id="tab-champions-roster"
          onClick={() => setActiveTab("champions")}
          className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "champions"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
          }`}
        >
          <Crown className="w-4 h-4 text-purple-400" />
          Champion NFTs
        </button>

        <button
          id="tab-marketplace"
          onClick={() => setActiveTab("marketplace")}
          className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "marketplace"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          Arena Marketplace
        </button>

        <button
          id="tab-quests-pass"
          onClick={() => setActiveTab("quests")}
          className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "quests"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
          }`}
        >
          <Award className="w-4 h-4 text-yellow-400" />
          Battle Pass & Quests
        </button>
      </div>

      {/* TAB 1: PVP TOURNAMENTS & BRACKETS */}
      {activeTab === "pvp" && (
        <div id="pvp-tournaments-view" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Active Tournaments List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Active Tournament Brackets (ArenaPVP)
                </h3>
                <span className="text-[10px] font-mono text-zinc-400">
                  Escrow Contract: {ARENA_PVP_ADDRESS.slice(0, 8)}...
                </span>
              </div>

              <div className="space-y-3.5">
                {DEFAULT_TOURNAMENTS.map((tourney) => {
                  const isRegistered = registeredTourneys.includes(tourney.id);
                  const isRegistering = registeringTourneyId === tourney.id;

                  return (
                    <div 
                      key={tourney.id} 
                      className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-blue-500/30 transition-all space-y-4 shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-display text-white">{tourney.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                              tourney.status === "Live" 
                                ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse" 
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}>
                              {tourney.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{tourney.category} • Starts {tourney.startTime}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id={`register-tourney-${tourney.id}`}
                            onClick={() => handleRegisterTournament(tourney)}
                            disabled={isRegistered || isRegistering}
                            className={`px-4 py-2 rounded-xl text-xs font-bold font-display transition-all flex items-center gap-1.5 ${
                              isRegistered
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                            }`}
                          >
                            {isRegistered ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Registered
                              </>
                            ) : isRegistering ? (
                              "Staking ARENA..."
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                Join Bracket ({tourney.entryFeeArena} ARENA)
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Tournament Stats & Progress */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-xs">
                        <div>
                          <span className="block text-[9px] text-zinc-500">ETH Prize Pool</span>
                          <span className="text-amber-400 font-bold">{tourney.prizePoolEth} ETH</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-500">ARENA Prize Pool</span>
                          <span className="text-purple-400 font-bold">{tourney.prizePoolArena.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-500">Entry Stake</span>
                          <span className="text-white font-bold">{tourney.entryFeeArena} ARENA</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-500">Filled Slots</span>
                          <span className="text-blue-400 font-bold">{tourney.currentParticipants} / {tourney.maxParticipants}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span>Bracket Capacity</span>
                          <span>{Math.round((tourney.currentParticipants / tourney.maxParticipants) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                            style={{ width: `${(tourney.currentParticipants / tourney.maxParticipants) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tournament Bracket Simulator / Info */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  Live Championship Bracket
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  {/* Round 1 */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <span className="text-[9px] uppercase font-bold text-blue-400">Semi-Finals Duel #1</span>
                    <div className="flex justify-between items-center text-white">
                      <span>⚔️ Cyber Warlord #104</span>
                      <span className="text-emerald-400 font-bold">2 WINS</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-500">
                      <span>⚔️ Shadow Viper #044</span>
                      <span>1 WIN</span>
                    </div>
                  </div>

                  {/* Round 2 */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <span className="text-[9px] uppercase font-bold text-purple-400">Semi-Finals Duel #2</span>
                    <div className="flex justify-between items-center text-white">
                      <span>⚔️ Neon Valkyrie #212</span>
                      <span className="text-emerald-400 font-bold">2 WINS</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-500">
                      <span>⚔️ Iron Golem #902</span>
                      <span>0 WINS</span>
                    </div>
                  </div>

                  {/* Finals */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 to-blue-950/40 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-amber-400">Grand Finals</span>
                      <span className="text-[9px] font-mono text-amber-300 font-bold">4.5 ETH POOL</span>
                    </div>
                    <div className="flex justify-between items-center text-white font-bold">
                      <span>Cyber Warlord vs. Neon Valkyrie</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-sans">
                      Scheduled for live combat resolution on Base Mainnet upon bracket finalization.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: LIVE COMBAT ARENA */}
      {activeTab === "battle" && (
        <div id="combat-arena-view" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Fighter Stage & Controls */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Battle Arena Viewport */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border border-white/10 shadow-2xl relative overflow-hidden space-y-6">
                
                {/* Arena Stage Background Ambient */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />

                {/* Matchup Header */}
                <div className="flex justify-between items-center relative z-10 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-white font-bold">ARENA COMBAT DUEL</span>
                  </div>
                  <span className="text-zinc-400">Contract: {ARENA_BATTLE_ADDRESS.slice(0, 8)}...</span>
                </div>

                {/* Fighters Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                  
                  {/* Player Champion */}
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-blue-500/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback
                        src={selectedChampion.imageUrl}
                        alt={selectedChampion.name}
                        className="w-14 h-14 rounded-xl object-cover border border-blue-500/40"
                      />
                      <div>
                        <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">Your Champion (Lvl {selectedChampion.level})</span>
                        <h4 className="text-sm font-bold font-display text-white">{selectedChampion.name}</h4>
                        <span className="text-[10px] text-zinc-400">{selectedChampion.classType}</span>
                      </div>
                    </div>

                    {/* Player HP Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Heart className="w-3 h-3 text-red-400" /> HP
                        </span>
                        <span className="text-emerald-400 font-bold">{playerHp} / {selectedChampion.maxHp}</span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(0, (playerHp / selectedChampion.maxHp) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Pill */}
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] bg-black/40 p-2 rounded-xl">
                      <div>
                        <span className="text-zinc-500">ATK</span>
                        <span className="block font-bold text-red-400">{selectedChampion.attack}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">DEF</span>
                        <span className="block font-bold text-blue-400">{selectedChampion.defense}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">SPD</span>
                        <span className="block font-bold text-amber-400">{selectedChampion.speed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Opponent Fighter */}
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-red-500/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback
                        src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80"
                        alt="Cyber Berserker"
                        className="w-14 h-14 rounded-xl object-cover border border-red-500/40"
                      />
                      <div>
                        <span className="text-[10px] font-mono uppercase text-red-400 font-bold">Opponent (Lvl 11)</span>
                        <h4 className="text-sm font-bold font-display text-white">Cyber Berserker #882</h4>
                        <span className="text-[10px] text-zinc-400">Berserker</span>
                      </div>
                    </div>

                    {/* Opponent HP Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Skull className="w-3 h-3 text-red-400" /> HP
                        </span>
                        <span className="text-red-400 font-bold">{opponentHp} / {maxOpponentHp}</span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(0, (opponentHp / maxOpponentHp) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Pill */}
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] bg-black/40 p-2 rounded-xl">
                      <div>
                        <span className="text-zinc-500">ATK</span>
                        <span className="block font-bold text-red-400">85</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">DEF</span>
                        <span className="block font-bold text-blue-400">70</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">SPD</span>
                        <span className="block font-bold text-amber-400">80</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Combat Controls */}
                <div className="pt-2 border-t border-white/10 relative z-10">
                  {!isBattleActive ? (
                    <button
                      id="start-combat-duel-btn"
                      onClick={handleStartBattle}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold font-display text-sm shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Find Match & Enter Battle Arena (Free / Ranked)
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          id="action-strike-btn"
                          onClick={() => handlePlayerAction("strike")}
                          disabled={isFightingTurn}
                          className="py-3 px-2 rounded-xl bg-zinc-800 hover:bg-blue-600 text-white font-bold font-display text-xs transition-all flex flex-col items-center gap-1 border border-white/10 disabled:opacity-50"
                        >
                          <Swords className="w-4 h-4 text-red-400" />
                          <span>Combat Strike</span>
                        </button>

                        <button
                          id="action-special-btn"
                          onClick={() => handlePlayerAction("special")}
                          disabled={isFightingTurn || specialCooldown > 0}
                          className="py-3 px-2 rounded-xl bg-gradient-to-br from-purple-900/60 to-blue-900/60 hover:from-purple-700 hover:to-blue-700 text-white font-bold font-display text-xs transition-all flex flex-col items-center gap-1 border border-purple-500/30 disabled:opacity-50"
                        >
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <span>{specialCooldown > 0 ? `Skill (${specialCooldown})` : selectedChampion.specialSkill}</span>
                        </button>

                        <button
                          id="action-defend-btn"
                          onClick={() => handlePlayerAction("defend")}
                          disabled={isFightingTurn}
                          className="py-3 px-2 rounded-xl bg-zinc-800 hover:bg-emerald-600 text-white font-bold font-display text-xs transition-all flex flex-col items-center gap-1 border border-white/10 disabled:opacity-50"
                        >
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span>Brace / Defend</span>
                        </button>
                      </div>

                      {battleWinner && (
                        <button
                          onClick={handleStartBattle}
                          className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold font-display text-xs transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Play Next Match
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Combat Logs & Champion Selector */}
            <div className="space-y-4">
              
              {/* Champion Selector */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Select Active Combat Champion
                </span>

                <div className="space-y-2">
                  {DEFAULT_CHAMPIONS.map((champ) => (
                    <button
                      key={champ.id}
                      onClick={() => {
                        setSelectedChampion(champ);
                        setPlayerHp(champ.hp);
                        if (!isBattleActive) setBattleWinner(null);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedChampion.id === champ.id
                          ? "bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-500/10"
                          : "bg-black/30 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ImageWithFallback
                          src={champ.imageUrl}
                          alt={champ.name}
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">{champ.name}</span>
                          <span className="text-[10px] text-zinc-400">Lvl {champ.level} {champ.classType}</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-zinc-400 font-bold">
                        {champ.wins}W / {champ.losses}L
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Combat Logs Panel */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-red-400" /> Combat Telemetry Log
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">Live</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 font-mono text-[10px]">
                  {battleLogs.length === 0 ? (
                    <p className="text-zinc-500 text-center py-6">No battle in progress. Click "Find Match" to start.</p>
                  ) : (
                    battleLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-2 rounded-lg border ${
                          log.type === "player"
                            ? "bg-blue-950/30 border-blue-500/20 text-blue-300"
                            : log.type === "crit"
                            ? "bg-amber-950/40 border-amber-500/30 text-amber-300 font-bold"
                            : log.type === "opponent"
                            ? "bg-red-950/30 border-red-500/20 text-red-300"
                            : "bg-purple-950/30 border-purple-500/20 text-purple-300 font-bold"
                        }`}
                      >
                        {log.text}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 3: CHAMPION NFTS ROSTER */}
      {activeTab === "champions" && (
        <div id="champions-nft-roster-view" className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                ArenaChampion NFT Collection (ERC-721)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Contract: <span className="font-mono text-blue-400">{ARENA_CHAMPION_NFT_ADDRESS}</span> • Verified Base Mainnet Collection
              </p>
            </div>

            <button
              id="mint-new-champion-btn"
              onClick={handleMintChampion}
              disabled={isMintingChampion}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-display text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isMintingChampion ? "Minting Champion NFT..." : "Recruit / Mint Champion (0.025 ETH)"}</span>
            </button>
          </div>

          {/* Champions Roster Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DEFAULT_CHAMPIONS.map((champ) => (
              <div 
                key={champ.id} 
                className="rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-purple-500/40 transition-all overflow-hidden shadow-xl group space-y-4 p-4"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-black">
                  <ImageWithFallback
                    src={champ.imageUrl}
                    alt={champ.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-mono font-bold text-purple-300 border border-white/10">
                    Lvl {champ.level} {champ.classType}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-mono font-bold text-emerald-400 border border-white/10">
                    {champ.wins}W - {champ.losses}L
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold font-display text-white text-sm">{champ.name}</h4>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 font-sans">
                    {champ.specialDescription}
                  </p>
                </div>

                {/* Attributes */}
                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-center font-mono text-[10px]">
                  <div>
                    <span className="text-zinc-500 block">ATK</span>
                    <span className="font-bold text-red-400">{champ.attack}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">DEF</span>
                    <span className="font-bold text-blue-400">{champ.defense}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">SPD</span>
                    <span className="font-bold text-amber-400">{champ.speed}</span>
                  </div>
                </div>

                {/* Upgrade Button */}
                <button
                  onClick={() => {
                    showToast(`Upgraded ${champ.name} stats with 50 ARENA!`, "success");
                    addTerminalLog("success", `[ArenaChampion] Upgraded stats for ${champ.name} using ARENA.`);
                  }}
                  className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white font-display font-bold text-xs transition-all border border-white/5 flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Upgrade (50 ARENA)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ARENA MARKETPLACE */}
      {activeTab === "marketplace" && (
        <div id="arena-marketplace-view" className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                ArenaMarketplace Platform (Base Mainnet)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Contract: <span className="font-mono text-emerald-400">{ARENA_MARKETPLACE_ADDRESS}</span> • Direct On-Chain Settlements
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-[11px] font-mono text-zinc-300">
                Floor: <span className="text-amber-400 font-bold">0.012 ETH</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-[11px] font-mono text-zinc-300">
                24h Vol: <span className="text-emerald-400 font-bold">14.8 ETH</span>
              </span>
            </div>
          </div>

          {/* Marketplace Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {marketItems.map((item) => {
              const isBuying = buyingItemId === item.id;

              return (
                <div 
                  key={item.id} 
                  className="rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-emerald-500/40 transition-all overflow-hidden shadow-xl space-y-3.5 p-4 group"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-black">
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${
                      item.rarity === "Legendary" 
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                        : item.rarity === "Epic"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    }`}>
                      {item.rarity.toUpperCase()}
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-mono text-zinc-300 border border-white/10">
                      {item.category}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold font-display text-white text-xs truncate">{item.name}</h4>
                    <p className="text-[10px] text-zinc-400 font-mono">{item.stats}</p>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-white/5 font-mono">
                    <div>
                      <span className="text-xs font-bold text-amber-400">{item.priceEth} ETH</span>
                      <span className="block text-[9px] text-purple-400 font-bold">≈ {item.priceArena} ARENA</span>
                    </div>
                    <span className="text-[9px] text-zinc-500">Seller: {item.seller}</span>
                  </div>

                  <button
                    id={`buy-market-item-${item.id}`}
                    onClick={() => handleBuyMarketItem(item)}
                    disabled={isBuying}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-display text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{isBuying ? "Purchasing..." : "Instant Buy"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: BATTLE PASS & QUESTS */}
      {activeTab === "quests" && (
        <div id="quests-battlepass-view" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Battle Pass Progression */}
            <div className="lg:col-span-2 space-y-5">
              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 relative overflow-hidden space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Season 4 Developer & Gaming Pass</span>
                    <h3 className="text-base font-bold text-white mt-0.5">Level 5 Grand Gladiator</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    3,200 / 4,000 XP
                  </span>
                </div>

                <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full rounded-full" style={{ width: "80%" }} />
                </div>

                <p className="text-xs text-zinc-400 font-sans">
                  Earn XP by trading on the bonding curve, staking AGL or ARENA tokens, winning PvP duels, or deploying smart contracts.
                </p>
              </div>

              {/* Quests List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-yellow-400" /> Daily Gaming & On-Chain Quests
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">Win 1 PvP Combat Duel</span>
                      <span className="text-[10px] text-zinc-400">Duel in the ArenaBattle contract and achieve victory</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
                      +200 XP • 50 ARENA
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">Join Any Tournament Bracket</span>
                      <span className="text-[10px] text-zinc-400">Stake into ArenaPVP escrow to register a tournament slot</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">
                      +300 XP • 100 AGL
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">Execute a Token Swap</span>
                      <span className="text-[10px] text-zinc-400">Swap ETH for ARENA or AGL using the DEX aggregator</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                      +150 XP • 25 ARENA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Battle Pass Rewards Tiers */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                  Season 4 Rewards Ladder
                </span>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-400 font-bold block">Tier 1: Novice Gladiator</span>
                      <span className="text-[10px] text-zinc-400">100 AGL Utility Tokens</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-blue-400 font-bold block">Tier 2: Combat Veteran</span>
                      <span className="text-[10px] text-zinc-400">Rare Titanium Shield NFT</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-purple-400 font-bold block">Tier 3: Arena Champion</span>
                      <span className="text-[10px] text-zinc-400">500 ARENA + Cyber Shell</span>
                    </div>
                    <span className="text-[9px] text-purple-300 font-bold">UNLOCKED</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between opacity-60">
                    <div>
                      <span className="text-zinc-300 font-bold block">Tier 4: Legendary Warlord</span>
                      <span className="text-[10px] text-zinc-500">Mythic Champion NFT</span>
                    </div>
                    <span className="text-[9px] text-zinc-500">4,000 XP</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
