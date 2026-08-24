import React, { useState } from "react";
import { 
  Gamepad2, 
  Sparkles, 
  Trophy, 
  Dice6, 
  Coins, 
  Flame, 
  RefreshCw, 
  Send, 
  Code2, 
  Download, 
  Play, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  Cpu,
  FolderTree,
  MessageSquare
} from "lucide-react";
import { 
  GeneratedWeb3GameProject, 
  NetworkKey, 
  SUPPORTED_NETWORKS 
} from "../../types/aiSuite";
import { AIService } from "../../lib/aiSuiteService";

const GAME_PRESETS = [
  {
    title: "AGL High-Stakes Coinflip Arena",
    prompt: "Build an on-chain PvP Coinflip game on Base with verifiably fair randomness, automated 1.98x payout vault, 1% AGL treasury burn fee, and win-streak multiplier badges."
  },
  {
    title: "Web3 Dice Roll Duel",
    prompt: "Create a decentralized Dice Duel game where players choose their win probability (Roll Over / Under) from 2% to 98% with dynamic odds calculation, house bankroll staking, and instant automated payout."
  },
  {
    title: "Base Dungeon Loot Crawler",
    prompt: "Build an on-chain turn-based dungeon crawler where players stake tokens to enter rooms, battle monsters with RNG combat, earn rare ERC-1155 loot weapons, and extract their jackpot tokens."
  }
];

interface GameBuilderProps {
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
  selectedNetwork?: NetworkKey;
  walletAddress?: string;
}

export default function GameBuilderWorkspace({
  showToast,
  selectedNetwork = "base-mainnet",
  walletAddress
}: GameBuilderProps) {
  const [prompt, setPrompt] = useState<string>(GAME_PRESETS[0].prompt);
  const [network, setNetwork] = useState<NetworkKey>(selectedNetwork);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isIterating, setIsIterating] = useState<boolean>(false);
  const [gameProject, setGameProject] = useState<GeneratedWeb3GameProject | null>(null);
  const [activeTab, setActiveTab] = useState<"arena" | "design" | "contracts" | "leaderboard">("arena");
  const [chatMessage, setChatMessage] = useState<string>("");

  // Playable interactive simulator state
  const [betAmount, setBetAmount] = useState<string>("0.01");
  const [coinChoice, setCoinChoice] = useState<"heads" | "tails">("heads");
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const [demoResult, setDemoResult] = useState<{ won: boolean; roll: string; payout: string } | null>(null);
  const [virtualBalance, setVirtualBalance] = useState<number>(100);
  const [winStreak, setWinStreak] = useState<number>(0);

  // Generate game
  const handleGenerateGame = async () => {
    if (!prompt.trim()) {
      showToast?.("Enter a game concept prompt", "error");
      return;
    }

    setIsGenerating(true);
    setGameProject(null);

    try {
      showToast?.("Gemini 3.7 synthesizing Web3 GameFi architecture & contracts...", "info");
      const generated = await AIService.generateWeb3Game({
        prompt: prompt.trim(),
        network,
      });

      setGameProject(generated);
      showToast?.(`Generated "${generated.title}" with playable arena!`, "success");
    } catch (err: any) {
      showToast?.(err.message || "Failed to generate game", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Conversational Game Iteration
  const handleIterateGame = async (customInstruction?: string) => {
    const instruction = customInstruction || chatMessage;
    if (!gameProject || !instruction.trim()) return;

    setIsIterating(true);
    try {
      showToast?.(`Applying game mechanics update: "${instruction}"...`, "info");
      const updated = await AIService.iterateWeb3Game({
        project: gameProject,
        userModification: instruction.trim(),
      });

      setGameProject(updated);
      setChatMessage("");
      showToast?.("Game mechanics updated successfully!", "success");
    } catch (err: any) {
      showToast?.(err.message || "Failed to update game", "error");
    } finally {
      setIsIterating(false);
    }
  };

  // Playable Demo Flip
  const handlePlayDemoFlip = () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      showToast?.("Please enter a valid bet amount", "error");
      return;
    }
    if (bet > virtualBalance) {
      showToast?.("Insufficient test balance. Resetting credits...", "info");
      setVirtualBalance(100);
      return;
    }

    setIsPlayingDemo(true);
    setDemoResult(null);

    setTimeout(() => {
      const outcome = Math.random() > 0.5 ? "heads" : "tails";
      const won = outcome === coinChoice;
      const payout = won ? (bet * 1.98).toFixed(4) : "0";

      if (won) {
        setVirtualBalance(prev => prev + (bet * 0.98));
        setWinStreak(prev => prev + 1);
        showToast?.(`🎉 YOU WON! Flip landed on ${outcome.toUpperCase()}!`, "success");
      } else {
        setVirtualBalance(prev => prev - bet);
        setWinStreak(0);
        showToast?.(`💔 Lost round. Flip landed on ${outcome.toUpperCase()}.`, "info");
      }

      setDemoResult({
        won,
        roll: outcome,
        payout,
      });
      setIsPlayingDemo(false);
    }, 1200);
  };

  return (
    <div id="ai-game-builder-workspace" className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/80 border border-brand-purple/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/20 to-brand-purple/20 border border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/10">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide font-display">AGL Game Builder</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Web3 GameFi Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              AI-assisted Web3 game creation: mechanics, verifiably fair Solidity contracts & interactive playable frontend
            </p>
          </div>
        </div>

        {/* Network Selector */}
        <div className="flex items-center gap-2">
          <select
            id="game-network-select"
            value={network}
            onChange={(e) => setNetwork(e.target.value as NetworkKey)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-200 font-mono focus:outline-none focus:border-brand-purple"
          >
            {Object.values(SUPPORTED_NETWORKS).map((n) => (
              <option key={n.key} value={n.key}>
                {n.name} ({n.chainId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompt Input & Presets */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                Describe Your Web3 Game
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Verifiable RNG</span>
            </div>

            <textarea
              id="game-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="e.g. Build an on-chain Coinflip PvP game on Base with Chainlink VRF and 1.98x payouts..."
              className="w-full p-3 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple resize-none"
            />

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-400 block">Game Templates:</span>
              <div className="grid grid-cols-1 gap-1.5">
                {GAME_PRESETS.map((p) => (
                  <button
                    key={p.title}
                    onClick={() => {
                      setPrompt(p.prompt);
                      showToast?.(`Selected ${p.title}`, "info");
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-brand-purple/30 text-left text-xs transition-all"
                  >
                    <span className="font-semibold text-zinc-200 block">{p.title}</span>
                    <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{p.prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              id="btn-generate-game"
              onClick={handleGenerateGame}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-brand-purple hover:from-rose-400 hover:to-brand-purple/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Designing GameFi Economy & VRF...</span>
                </>
              ) : (
                <>
                  <Gamepad2 className="w-4 h-4" />
                  <span>Generate Web3 Game</span>
                </>
              )}
            </button>
          </div>

          {/* Conversational Modifier */}
          {gameProject && (
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-brand-purple/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MessageSquare className="w-4 h-4 text-brand-purple" />
                <span>Iterate Game Rules & Economy</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  "Add 3-win streak 2.5x multiplier",
                  "Add AGL token jackpot prize pool",
                  "Add tournament battle mode",
                  "Add NFT player badge"
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleIterateGame(chip)}
                    disabled={isIterating}
                    className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-[10px] text-zinc-300 transition-all disabled:opacity-50"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleIterateGame()}
                  placeholder="e.g. Add 5% jackpot side-bet..."
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
                />
                <button
                  onClick={() => handleIterateGame()}
                  disabled={isIterating || !chatMessage.trim()}
                  className="px-3 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isIterating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Game Arena & Files */}
        <div className="lg:col-span-8 space-y-4">
          {!gameProject && !isGenerating && (
            <div className="h-full min-h-[500px] p-8 rounded-2xl bg-zinc-950/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Gamepad2 className="w-12 h-12" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-white">Web3 Game Builder Studio</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enter a prompt or select a template to generate complete Web3 game contracts, verifiable VRF logic, and an interactive in-browser playable arena.
                </p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="h-full min-h-[500px] p-8 rounded-2xl bg-zinc-950/60 border border-rose-500/30 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
              <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-400 animate-spin">
                <RefreshCw className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Assembling Web3 Game Engine</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Generating VRF verifiable randomness contracts, payout vault escrow, and player leaderboard schemas...
                </p>
              </div>
            </div>
          )}

          {gameProject && !isGenerating && (
            <div className="p-6 rounded-2xl bg-zinc-950/90 border border-white/10 space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{gameProject.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-mono">
                      {gameProject.gameDesign.genre}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{gameProject.gameDesign.tagline}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-emerald-400">
                    Test Bankroll: {virtualBalance.toFixed(2)} AGL
                  </div>
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex gap-2 border-b border-white/5 pb-2">
                <button
                  onClick={() => setActiveTab("arena")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "arena" ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Interactive Game Arena
                </button>
                <button
                  onClick={() => setActiveTab("design")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "design" ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  GameFi Economy & Rules
                </button>
                <button
                  onClick={() => setActiveTab("contracts")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "contracts" ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Solidity Contracts ({gameProject.files.length})
                </button>
              </div>

              {/* TAB 1: PLAYABLE ARENA */}
              {activeTab === "arena" && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-rose-500/20 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Playable Live Simulation</span>
                    </div>

                    {winStreak > 0 && (
                      <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1">
                        🔥 {winStreak} Win Streak!
                      </div>
                    )}
                  </div>

                  {/* Coin/Dice Visual Arena */}
                  <div className="py-8 flex flex-col items-center justify-center space-y-4">
                    <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all ${
                      isPlayingDemo ? "border-amber-400 animate-spin bg-amber-500/20" :
                      demoResult?.won ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-500/20 scale-105" :
                      demoResult ? "border-rose-500 bg-rose-500/20 text-rose-400" :
                      "border-brand-purple bg-brand-purple/10 text-white"
                    }`}>
                      {isPlayingDemo ? (
                        <RefreshCw className="w-10 h-10 text-amber-400" />
                      ) : (
                        <div className="text-center font-display font-black text-2xl">
                          {demoResult ? demoResult.roll.toUpperCase() : "AGL"}
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-xs text-zinc-400">Verifiable VRF Target: Base L2</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {gameProject.gameDesign.rewardEconomy.winPayoutFormula}
                      </div>
                    </div>
                  </div>

                  {/* Bet Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Choose Side:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setCoinChoice("heads")}
                          className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                            coinChoice === "heads" ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20" : "bg-zinc-900 text-zinc-400 border-white/5"
                          }`}
                        >
                          HEADS (50%)
                        </button>
                        <button
                          onClick={() => setCoinChoice("tails")}
                          className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                            coinChoice === "tails" ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20" : "bg-zinc-900 text-zinc-400 border-white/5"
                          }`}
                        >
                          TAILS (50%)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Wager Amount (AGL):</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white font-mono focus:outline-none"
                        />
                        <button
                          onClick={handlePlayDemoFlip}
                          disabled={isPlayingDemo}
                          className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-brand-purple hover:from-rose-500 hover:to-brand-purple/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isPlayingDemo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Flip Coin
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GAME DESIGN */}
              {activeTab === "design" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                    <span className="font-bold text-rose-400">Game Mechanics:</span>
                    <p className="text-zinc-300 leading-relaxed">{gameProject.gameDesign.mechanics}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                    <span className="font-bold text-amber-400">Economy & Tokenomics:</span>
                    <div className="space-y-1 text-zinc-300">
                      <div>Token: <span className="font-mono text-white">{gameProject.gameDesign.rewardEconomy.tokenSymbol}</span></div>
                      <div>Payout Formula: <span className="font-mono text-white">{gameProject.gameDesign.rewardEconomy.winPayoutFormula}</span></div>
                      <div>House Edge: <span className="font-mono text-white">{(gameProject.gameDesign.rewardEconomy.houseEdgeBps / 100).toFixed(2)}%</span></div>
                      <div>Anti-Cheat VRF: <span className="font-mono text-white">{gameProject.gameDesign.rewardEconomy.antiCheatVRF}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SOLIDITY CONTRACTS */}
              {activeTab === "contracts" && (
                <div className="space-y-3">
                  {gameProject.files.map((file) => (
                    <div key={file.path} className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">{file.filename}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-zinc-400 font-mono">{file.language}</span>
                      </div>
                      <pre className="p-3 rounded-lg bg-zinc-950 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto max-h-60">
                        {file.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
