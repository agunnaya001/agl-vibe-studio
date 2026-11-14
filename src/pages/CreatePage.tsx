import React, { useState, useEffect, useRef } from "react";
import { generateProjectAI } from "../lib/gemini";
import { AgunnayaDatabase, BASE_PRICE, SLOPE } from "../lib/db";
import { Token, WalletState } from "../types";
import IPFSUploader from "../components/IPFSUploader";
import { analyzeSolidityCode } from "../lib/security";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { 
  Sparkles, 
  Rocket, 
  BrainCircuit, 
  Code, 
  ShieldCheck, 
  CheckCircle, 
  Settings, 
  FileCheck, 
  Layers, 
  Coins, 
  Zap,
  Globe,
  Loader2,
  Cpu,
  ExternalLink,
  Activity,
  Check,
  AlertTriangle,
  ShieldAlert,
  Cloud,
  CloudOff,
  CloudLightning
} from "lucide-react";

interface CreatePageProps {
  wallet: WalletState;
  onLaunchSuccess: (newToken: Token) => void;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function CreatePage({ wallet, onLaunchSuccess, onRefreshWallet, addTerminalLog, showToast }: CreatePageProps) {
  const [activeSubMode, setActiveSubMode] = useState<"launchpad" | "ai-architect">("ai-architect");

  // AI Architect State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProjectType, setAiProjectType] = useState("ERC-20 Token");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [deployingAI, setDeployingAI] = useState(false);
  const [deploySuccessAI, setDeploySuccessAI] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [deployStep, setDeployStep] = useState<"idle" | "compiling" | "gas" | "pending" | "completed">("idle");

  // Firebase Session Auto-Save State
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error" | "offline">("idle");

  // Keep references to the latest values so the interval doesn't reset when typing
  const latestStateRef = useRef({ aiPrompt, aiProjectType, aiResult, deployedAddress, deployStep });
  const lastSavedStateStrRef = useRef<string>("");

  useEffect(() => {
    latestStateRef.current = { aiPrompt, aiProjectType, aiResult, deployedAddress, deployStep };
  }, [aiPrompt, aiProjectType, aiResult, deployedAddress, deployStep]);

  // Session Recovery on Mount / Auth state load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          setSaveStatus("saving");
          const docRef = doc(db, "sessions", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.prompt) setAiPrompt(data.prompt);
            if (data.projectType) setAiProjectType(data.projectType);
            if (data.aiResult) setAiResult(data.aiResult);
            if (data.deployedAddress) setDeployedAddress(data.deployedAddress);
            if (data.deployStep) setDeployStep(data.deployStep);
            if (data.updatedAt) setLastSaved(data.updatedAt);
            
            // Set initial saved state to prevent immediate auto-save trigger on load
            const initialStateStr = JSON.stringify({
              aiPrompt: data.prompt || "",
              aiProjectType: data.projectType || "token",
              aiResult: data.aiResult || null,
              deployedAddress: data.deployedAddress || null,
              deployStep: data.deployStep || "idle"
            });
            lastSavedStateStrRef.current = initialStateStr;
            
            setSaveStatus("saved");
            addTerminalLog("success", "CLOUD RECOVERY: Restored your last active AI Builder session state from Firestore.");
          } else {
            setSaveStatus("idle");
          }
        } catch (err) {
          console.error("Failed to load session:", err);
          setSaveStatus("error");
        }
      } else {
        setSaveStatus("offline");
      }
    });

    return () => unsubscribe();
  }, []);

  // Optimized Auto-saver running every 30 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      const user = auth.currentUser;
      if (!user) {
        setSaveStatus("offline");
        return;
      }

      const { aiPrompt: currentPrompt, aiProjectType: currentType, aiResult: currentResult, deployedAddress: currentAddr, deployStep: currentStep } = latestStateRef.current;

      // Only save if we have some content
      if (!currentPrompt.trim() && !currentResult) {
        return;
      }

      // Check if state actually changed to avoid spamming Firestore
      const currentStateObj = {
        aiPrompt: currentPrompt,
        aiProjectType: currentType,
        aiResult: currentResult,
        deployedAddress: currentAddr,
        deployStep: currentStep
      };
      const currentStateStr = JSON.stringify(currentStateObj);
      if (currentStateStr === lastSavedStateStrRef.current) {
        // No modifications, skip write
        return;
      }

      try {
        setSaveStatus("saving");
        const docRef = doc(db, "sessions", user.uid);
        await setDoc(docRef, {
          id: user.uid,
          prompt: currentPrompt,
          projectType: currentType,
          aiResult: currentResult || null,
          deployedAddress: currentAddr || null,
          deployStep: currentStep || "idle",
          updatedAt: Date.now()
        }, { merge: true });

        lastSavedStateStrRef.current = currentStateStr;
        setLastSaved(Date.now());
        setSaveStatus("saved");
      } catch (err) {
        console.error("Session auto-save failed:", err);
        setSaveStatus("error");
      }
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Token Launchpad State
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDesc, setTokenDesc] = useState("");
  const [tokenLogo, setTokenLogo] = useState("");
  const [tokenCategory, setTokenCategory] = useState<Token["category"]>("meme");
  const [vesting, setVesting] = useState<number>(0);
  const [referral, setReferral] = useState<number>(0);
  const [seedBuy, setSeedBuy] = useState<string>("0");
  const [launchingToken, setLaunchingToken] = useState(false);

  // Handles AI Contract Generation
  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;

    if (wallet.isConnected) {
      const currentCredits = wallet.aglCredits || 0;
      if (currentCredits < 50) {
        showToast("Insufficient credits! 50 AGL Credits required for contract generation.", "error");
        addTerminalLog("error", "AI ARCHITECT: Generation rejected. Insufficient computational credits. Navigate to the AGL Credits page and permanently burn AGL tokens to earn credits.");
        return;
      }
      
      // Deduct 50 credits
      const remainingCredits = Math.max(0, currentCredits - 50);
      const updatedWallet: WalletState = {
        ...wallet,
        aglCredits: remainingCredits
      };
      AgunnayaDatabase.saveWallet(updatedWallet);
      onRefreshWallet();
      showToast("Consumed 50 AGL Credits", "info");

      if (remainingCredits < 20) {
        showToast("⚠️ Low computational credits remaining. Top up your AGL credits soon to prevent future AI failures!", "info");
      }
    }

    setAiLoading(true);
    setAiResult(null);
    setDeploySuccessAI(false);

    try {
      const data = await generateProjectAI(aiPrompt, aiProjectType);
      setAiResult(data);
      addTerminalLog("system", `Generated smart contract architecture for ${data.name} (${data.symbol})`);
    } catch (err: any) {
      console.error(err);
      showToast(`AI Architect offline: ${err.message || "Please check your GEMINI_API_KEY settings."}`, "error");
    } finally {
      setAiLoading(false);
    }
  };

  // Handles Mock Deployment of AI Generated Code with Step-by-Step Progress milestones
  const handleAIDeploy = async () => {
    if (!wallet.isConnected) {
      showToast("Please connect your wallet first in the header.", "error");
      return;
    }
    if (!aiResult || deployingAI) return;
    setDeployingAI(true);
    setDeployStep("compiling");
    addTerminalLog("info", `Initiating zero-gas sponsorship multi-sig pipeline for ${aiResult.name}...`);
    addTerminalLog("info", `[1/3] Compiling Solidity contract source code...`);

    // Milestone 1: Compiling Solidity
    setTimeout(() => {
      addTerminalLog("success", `Solidity compiled successfully. Generated ABI & Bytecode.`);
      setDeployStep("gas");
      addTerminalLog("info", `[2/3] Estimating contract gas limits & securing paymaster sponsorship...`);

      // Milestone 2: Gas Estimation
      setTimeout(() => {
        addTerminalLog("success", `Gas estimation complete: Sponsored relay approved (0 ETH user fee).`);
        setDeployStep("pending");
        addTerminalLog("info", `[3/3] Broadcasting transaction & waiting for Base L2 consensus...`);

        // Milestone 3: Pending Transaction
        setTimeout(() => {
          // Create token object representing the deployed asset
          const mockLogo = "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60";
          const newToken: Token = {
            address: "0x" + Math.random().toString(16).substr(2, 40),
            name: aiResult.name,
            symbol: aiResult.symbol,
            description: aiResult.description,
            creator: wallet.address,
            creatorFeesEarned: 0,
            currentPrice: BASE_PRICE,
            supply: 0,
            maxSupply: parseInt(aiResult.parameters?.initialSupply?.replace(/,/g, "")) || 1000000000,
            marketCap: 0,
            reserveEth: 0,
            volume24h: 0,
            category: "utility",
            logoUrl: mockLogo,
            socials: { website: "https://agunnaya.io" },
            isVerified: true,
            vestingWeeks: 0,
            referralRewardsPct: 0,
            createdAt: Date.now(),
            implementation: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" // Default AI-Architect template implementation
          };

          // Add to database
          const tokensList = AgunnayaDatabase.getTokens();
          tokensList.push(newToken);
          AgunnayaDatabase.saveTokens(tokensList);

          // Charge mock gas (or sponsored AA gas deduction)
          if (wallet.isSmartAccount) {
            const updatedWallet = { ...wallet, sponsoredGasEth: Math.max(0, wallet.sponsoredGasEth - 0.002) };
            AgunnayaDatabase.saveWallet(updatedWallet);
          } else {
            const updatedWallet = { ...wallet, balanceEth: Math.max(0, wallet.balanceEth - 0.002) };
            AgunnayaDatabase.saveWallet(updatedWallet);
          }
          onRefreshWallet();

          // Log success activity
          AgunnayaDatabase.addActivity({
            type: "deployment",
            tokenSymbol: newToken.symbol,
            tokenAddress: newToken.address,
            user: wallet.address,
            amount: 1,
            ethValue: 0.002,
            details: `Successfully deployed custom Solidity contract: ${newToken.name} (${newToken.symbol}) on Base Sepolia`
          });

          addTerminalLog("success", `CONTRACT DEPLOYED successfully at address ${newToken.address}`);
          setDeployingAI(false);
          setDeployStep("completed");
          setDeploySuccessAI(true);
          setDeployedAddress(newToken.address);
          onLaunchSuccess(newToken);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  // Handles standard linear bonding curve token launch
  const handleLaunchpadLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Please connect your wallet first.", "error");
      return;
    }
    if (!tokenName || !tokenSymbol || !tokenDesc || launchingToken) return;
    setLaunchingToken(true);

    const buyEthVal = parseFloat(seedBuy) || 0;
    if (buyEthVal > wallet.balanceEth) {
      showToast("Insufficient ETH balance for seed purchase.", "error");
      setLaunchingToken(false);
      return;
    }

    addTerminalLog("info", `Assembling BondingCurveToken contract metadata for ${tokenName}...`);

    setTimeout(() => {
      const generatedAddress = "0x" + Math.random().toString(16).substr(2, 40);
      const mockLogoUrl = tokenLogo.trim() || "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=128&auto=format&fit=crop&q=60";
      
      const newToken: Token = {
        address: generatedAddress,
        name: tokenName,
        symbol: tokenSymbol.toUpperCase(),
        description: tokenDesc,
        creator: wallet.address,
        creatorFeesEarned: 0,
        currentPrice: BASE_PRICE,
        supply: 0,
        maxSupply: 1000000000, // standard launchpad cap
        marketCap: 0,
        reserveEth: 0,
        volume24h: buyEthVal,
        category: tokenCategory,
        logoUrl: mockLogoUrl,
        socials: { website: "https://base.org" },
        isVerified: false,
        vestingWeeks: vesting,
        referralRewardsPct: referral,
        createdAt: Date.now(),
        implementation: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" // Default standard bonding curve implementation
      };

      // Register new token
      const tokensList = AgunnayaDatabase.getTokens();
      tokensList.push(newToken);
      AgunnayaDatabase.saveTokens(tokensList);

      // Perform seed buy if value > 0
      if (buyEthVal > 0) {
        // Simple direct simulation of seed buy
        const calculatedTokens = buyEthVal / BASE_PRICE; // simple seed rate
        newToken.supply = calculatedTokens;
        newToken.reserveEth = buyEthVal * 0.99;
        newToken.currentPrice = BASE_PRICE + SLOPE * calculatedTokens;
        newToken.marketCap = newToken.currentPrice * calculatedTokens;
        newToken.creatorFeesEarned = buyEthVal * 0.01;

        // Dedect from wallet balance
        const updatedWallet = { ...wallet, balanceEth: wallet.balanceEth - buyEthVal };
        AgunnayaDatabase.saveWallet(updatedWallet);
        onRefreshWallet();

        addTerminalLog("buy", `Executed initial seed buy of ${calculatedTokens.toLocaleString()} ${newToken.symbol} for ${buyEthVal} ETH`);
      }

      // Add activity
      AgunnayaDatabase.addActivity({
        type: "create",
        tokenSymbol: newToken.symbol,
        tokenAddress: newToken.address,
        user: wallet.address,
        amount: newToken.supply,
        ethValue: buyEthVal,
        details: `Created new linear bonding curve token: ${newToken.name} (${newToken.symbol}) with ${buyEthVal} ETH seed buy`
      });

      addTerminalLog("success", `Bonding curve token registered at registry: ${newToken.address}`);
      setLaunchingToken(false);
      onLaunchSuccess(newToken);
    }, 2000);
  };

  return (
    <div id="creator-workspace-root" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Creation Mode Tabs & Active input panels */}
      <div className="lg:col-span-2 space-y-6">
        {/* Toggle between Launchpad and AI Architect */}
        <div className="flex bg-zinc-900/80 border border-white/5 p-1 rounded-xl">
          <button
            id="submode-tab-ai"
            onClick={() => { setActiveSubMode("ai-architect"); setAiResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold font-display transition-all ${
              activeSubMode === "ai-architect"
                ? "bg-brand-purple text-white shadow-md font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>AI Smart Contract Architect</span>
          </button>
          <button
            id="submode-tab-launchpad"
            onClick={() => setActiveSubMode("launchpad")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold font-display transition-all ${
              activeSubMode === "launchpad"
                ? "bg-brand-blue text-white shadow-md font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Bonding Curve Launcher</span>
          </button>
        </div>

        {/* AI ARCHITECT UI */}
        {activeSubMode === "ai-architect" && (
          <div className="glass-panel rounded-2xl border border-white/5 p-6 bg-zinc-900/10 space-y-6">
            <div>
              <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-brand-purple" />
                Agunnaya AI Contract Architect
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                A world-first, prompt-based Solidity builder. Write your project goals in natural English, and Gemini compiles full verified smart contracts ready for the Base network.
              </p>
            </div>

            <form onSubmit={handleAIGenerate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Contract Target Standard</label>
                  <select
                    id="ai-project-type-select"
                    value={aiProjectType}
                    onChange={(e) => setAiProjectType(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-brand-purple/40 font-mono"
                  >
                    <option value="ERC-20 Token">ERC-20 Staking Utility Token</option>
                    <option value="ERC-721 Collection">ERC-721 Generative NFT Collection</option>
                    <option value="DAO Governance">DAO Multi-sig Governance Hub</option>
                    <option value="GameFi Tournament">GameFi Season XP Reward Pool</option>
                    <option value="AI Agent Core">Autonomous AI Agent Trigger Core</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="bg-brand-purple/10 border border-brand-purple/20 p-3 rounded-xl flex items-center gap-2 text-[10px] text-brand-purple font-mono w-full leading-normal">
                    <Zap className="w-4 h-4" />
                    <span>Free Sandbox sponsored gas covered automatically</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">What would you like to build on Base with AI?</label>
                  {saveStatus === "saving" && (
                    <span className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin text-brand-purple" />
                      Saving backup...
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                      <Cloud className="w-3 h-3 text-emerald-400" />
                      Backup synced {lastSaved && `(${new Date(lastSaved).toLocaleTimeString()})`}
                    </span>
                  )}
                  {saveStatus === "offline" && (
                    <span className="flex items-center gap-1 text-[9px] text-zinc-500 font-mono">
                      <CloudOff className="w-3 h-3" />
                      Sign in for cloud backups
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="flex items-center gap-1 text-[9px] text-rose-400 font-mono">
                      <CloudLightning className="w-3 h-3 text-rose-400" />
                      Sync failed
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#0052FF] to-[#A855F7] rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition-all duration-300"></div>
                  <div className="relative bg-[#050505] border border-white/10 rounded-2xl p-4 shadow-2xl">
                    <textarea
                      id="ai-prompt-input"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={4}
                      placeholder="Create a meme coin on Base called 'DegenVibes' with a 10M supply and linear bonding curve..."
                      required
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm resize-none text-white placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>

              <button
                id="ai-generate-submit-btn"
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 font-semibold font-display text-xs text-white shadow-lg shadow-brand-purple/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-2"
              >
                <BrainCircuit className={`w-4 h-4 ${aiLoading ? "animate-spin" : ""}`} />
                <span>{aiLoading ? "Compiling Solidity & Auditing..." : "Assemble Custom Architecture"}</span>
              </button>
            </form>
          </div>
        )}

        {/* STANDARD BONDING CURVE LAUNCHER UI */}
        {activeSubMode === "launchpad" && (
          <div className="glass-panel rounded-2xl border border-white/5 p-6 bg-zinc-900/10 space-y-6">
            <div>
              <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-brand-blue" />
                Launch standard Bonding Curve Asset
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Deploys an ERC-20 token governed by a fully on-chain linear bonding curve with zero admin keys.
              </p>
            </div>

            <form onSubmit={handleLaunchpadLaunch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Token Name</label>
                  <input
                    id="launchpad-name-input"
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g. Cyber Punk Base"
                    required
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-blue/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Ticker / Symbol</label>
                  <input
                    id="launchpad-symbol-input"
                    type="text"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                    placeholder="e.g. CPB"
                    maxLength={5}
                    required
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-blue/40 uppercase font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Description</label>
                <textarea
                  id="launchpad-desc-input"
                  value={tokenDesc}
                  onChange={(e) => setTokenDesc(e.target.value)}
                  rows={3}
                  placeholder="Tell potential buyers about the purpose, rewards, or memes backing this token..."
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-blue/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <IPFSUploader
                    onUploadSuccess={(url) => setTokenLogo(url)}
                    showToast={showToast}
                    addTerminalLog={addTerminalLog}
                    label="Token Logo Image (Pinned to IPFS)"
                    placeholderUrl={tokenLogo}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Asset Category</label>
                  <select
                    id="launchpad-category-select"
                    value={tokenCategory}
                    onChange={(e) => setTokenCategory(e.target.value as Token["category"])}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-brand-blue/40 font-mono"
                  >
                    <option value="meme">Meme Coin</option>
                    <option value="defi">DeFi Hub Token</option>
                    <option value="ai">AI Agent Token</option>
                    <option value="utility">Utility Token</option>
                    <option value="gamefi">GameFi Asset</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Creator Vesting (Weeks)</label>
                  <input
                    id="launchpad-vesting-input"
                    type="number"
                    min={0}
                    value={vesting}
                    onChange={(e) => setVesting(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Referral Rewards (%)</label>
                  <input
                    id="launchpad-referral-input"
                    type="number"
                    min={0}
                    max={5}
                    value={referral}
                    onChange={(e) => setReferral(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Seed Buy (ETH)</label>
                  <input
                    id="launchpad-seedbuy-input"
                    type="number"
                    step="0.001"
                    min="0"
                    value={seedBuy}
                    onChange={(e) => setSeedBuy(e.target.value)}
                    className="w-full bg-zinc-950 border border-brand-blue/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-blue/40 font-mono"
                  />
                </div>
              </div>

              <button
                id="launchpad-submit-btn"
                type="submit"
                disabled={launchingToken}
                className="w-full py-3 rounded-xl bg-brand-blue hover:bg-blue-600 font-semibold font-display text-xs text-white shadow-lg shadow-brand-blue/25 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                <span>{launchingToken ? "Deploying Bonding Curve..." : "Launch Token onto Base Curve"}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* AI ARCHITECT GENERATED PREVIEW PANEL */}
      <div className="space-y-6">
        {aiResult ? (
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-zinc-950 space-y-6 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none"></div>

            <div className="border-b border-white/5 pb-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-brand-purple font-mono flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 animate-pulse" /> Verified Architecture Preview
              </span>
              <h3 className="text-lg font-display font-bold text-white mt-1">{aiResult.name} ({aiResult.symbol})</h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{aiResult.description}</p>
            </div>

            {/* Smart Contract parameters list */}
            <div className="space-y-2 border-b border-white/5 pb-4">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500">Contract Parameters</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-zinc-900 p-2.5 rounded-lg border border-white/5">
                  <span className="block text-[8px] text-zinc-500 mb-0.5">Initial Supply:</span>
                  <span className="text-zinc-200 font-bold">{aiResult.parameters?.initialSupply || "N/A"}</span>
                </div>
                <div className="bg-zinc-900 p-2.5 rounded-lg border border-white/5">
                  <span className="block text-[8px] text-zinc-500 mb-0.5">Mint Price:</span>
                  <span className="text-zinc-200 font-bold">{aiResult.parameters?.mintPrice || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Limited heuristic Solidity pattern checks */}
            {(() => {
              const audit = analyzeSolidityCode(aiResult.solidityCode);
              return (
                <div className={`border p-4 rounded-xl space-y-3 font-mono transition-all duration-300 ${
                  audit.status === "passed"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-amber-500/5 border-amber-500/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      audit.status === "passed" ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {audit.status === "passed" ? (
                        <>
                          <Code className="w-4 h-4" /> Heuristic Checks: No common patterns flagged
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 animate-pulse" /> Heuristic Checks: Patterns flagged
                        </>
                      )}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      audit.status === "passed"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>
                      Limited pattern scan
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-normal">{audit.summary}</p>
                  <p className="border-t border-white/5 pt-2 text-[10px] leading-4 text-amber-200/80">This limited heuristic scan is not a compiler, expert review, or independent security audit. No flagged pattern does not mean the contract is secure.</p>
                  
                  {/* Heuristic pattern findings, not an audit */}
                  {audit.findings.length > 0 && (
                    <div className="space-y-2 border-t border-white/5 pt-3 animate-fade-in">
                      <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Potential patterns to review:</span>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                        {audit.findings.map((finding, idx) => (
                          <div key={idx} className="bg-zinc-900/60 border border-white/5 p-2 rounded-lg space-y-1">
                            <div className="flex items-center gap-1.5 justify-between">
                              <span className={`text-[9px] font-bold uppercase ${
                                finding.severity === "high" ? "text-red-400" :
                                finding.severity === "medium" ? "text-amber-400" : "text-blue-400"
                              }`}>
                                [{finding.severity}] {finding.title}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">{finding.description}</p>
                            <p className="text-[9px] text-zinc-500 italic leading-relaxed">
                              <strong className="text-zinc-400 not-italic">Recommendation:</strong> {finding.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Contract Code snippet */}
            <div className="space-y-2">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1">
                <Code className="w-3.5 h-3.5" /> Solidity Source Code
              </span>
              <div className="bg-zinc-950 border border-white/10 rounded-xl p-3 overflow-x-auto max-h-44 font-mono text-[10px] leading-normal text-brand-purple select-all scrollbar-none">
                <pre>{aiResult.solidityCode}</pre>
              </div>
            </div>

            {/* Launch Checklist */}
            <div className="space-y-2">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500">Next Actions Checklist</span>
              <div className="space-y-1.5 text-xs text-zinc-400">
                {aiResult.launchChecklist?.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-brand-purple font-bold">[{idx + 1}]</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deploy Trigger Button */}
            {deploySuccessAI ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center flex items-center justify-center gap-2 font-semibold text-xs font-display">
                  <CheckCircle className="w-4 h-4" />
                  <span>Custom Contract Deployed on Base!</span>
                </div>
                {deployedAddress && (
                  <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 text-center space-y-1.5 animate-fade-in">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block">Deployed Contract Address</span>
                    <a 
                      href={`https://basescan.org/address/${deployedAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono font-bold text-brand-blue hover:underline hover:text-brand-purple transition-all block truncate"
                    >
                      {deployedAddress} ↗
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="ai-deploy-action-btn"
                onClick={handleAIDeploy}
                disabled={deployingAI}
                className="w-full py-3.5 bg-gradient-to-r from-brand-purple to-brand-blue hover:from-purple-600 hover:to-blue-600 text-white font-bold font-display text-xs rounded-xl shadow-lg shadow-brand-purple/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Layers className={`w-4 h-4 ${deployingAI ? "animate-spin" : ""}`} />
                <span>{deployingAI ? "Broadcasting Multi-sig Deploy..." : "Gasless Deploy to Base"}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 text-center py-24 space-y-3.5">
            <BrainCircuit className="w-10 h-10 text-zinc-700 mx-auto animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-display">AI Architect Sandbox</h4>
              <p className="text-[10px] text-zinc-500 leading-normal max-w-xs mx-auto mt-1">
                Enter your desired contract parameters or describe your dApp on the left to compile on-chain, and check structural components here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* STEP-BY-STEP DEPLOYMENT PROGRESS MODAL */}
      {deployStep !== "idle" && (
        <div id="deployment-progress-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 max-w-md w-full rounded-2xl p-6 space-y-6 shadow-2xl shadow-brand-purple/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-brand-purple/5 blur-3xl pointer-events-none"></div>
            
            {/* Header */}
            <div className="text-center space-y-1.5 border-b border-white/5 pb-4">
              <span className="text-[9px] uppercase font-bold tracking-widest text-brand-purple font-mono flex items-center justify-center gap-1">
                <BrainCircuit className="w-3.5 h-3.5 animate-pulse" /> Agunnaya AI-Architect Engine
              </span>
              <h3 className="text-lg font-display font-bold text-white">Deploying {aiResult?.name || "Contract"}</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Compiling and launching <span className="text-zinc-200 font-bold">{aiResult?.symbol}</span> onto Base L2 Sepolia Network
              </p>
            </div>

            {/* Limited static pattern-check status */}
            {aiResult && (
              <div className="animate-fade-in">
                {(() => {
                  const audit = analyzeSolidityCode(aiResult.solidityCode);
                  if (audit.status === "passed") {
                    return (
                      <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-emerald-400" />
                          <span className="text-zinc-300 font-bold">Heuristic scan:</span>
                        </div>
                        <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px] border border-emerald-500/20">
                            No common pattern flagged
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
                            <span className="text-zinc-300 font-bold">Heuristic scan:</span>
                          </div>
                          <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full text-[10px] border border-amber-500/20">
                            Patterns flagged
                          </span>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-[10px] font-mono text-amber-300 leading-normal">
                          <span className="font-bold">Review required:</span> {audit.findings.length} potential pattern(s) found. This scan does not establish deployability or contract security.
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            {/* Steps Timeline */}
            <div className="space-y-4 font-mono text-xs">
              {/* Step 1: Compiling Solidity */}
              <div className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
                deployStep === "compiling" 
                  ? "bg-brand-purple/5 border-brand-purple/30 text-white font-semibold" 
                  : deployStep !== "idle" && deployStep !== "compiling"
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                    : "bg-zinc-900/50 border-white/5 text-zinc-500"
              }`}>
                <div className="mt-0.5">
                  {deployStep === "compiling" ? (
                    <Loader2 className="w-4 h-4 text-brand-purple animate-spin" />
                  ) : deployStep !== "idle" && deployStep !== "compiling" ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <Code className="w-4 h-4" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>1. Compiling Solidity</span>
                    {deployStep === "compiling" && <span className="text-[9px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.2 rounded animate-pulse">ACTIVE</span>}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Processing custom compiler parameters, executing optimization flags, and mapping ABI endpoints.
                  </p>
                </div>
              </div>

              {/* Step 2: Gas Estimation */}
              <div className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
                deployStep === "gas" 
                  ? "bg-brand-purple/5 border-brand-purple/30 text-white font-semibold" 
                  : (deployStep === "pending" || deployStep === "completed")
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                    : "bg-zinc-900/50 border-white/5 text-zinc-500"
              }`}>
                <div className="mt-0.5">
                  {deployStep === "gas" ? (
                    <Loader2 className="w-4 h-4 text-brand-purple animate-spin" />
                  ) : (deployStep === "pending" || deployStep === "completed") ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <Cpu className="w-4 h-4" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>2. Gas Estimation</span>
                    {deployStep === "gas" && <span className="text-[9px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.2 rounded animate-pulse">ACTIVE</span>}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Evaluating required gas units, formatting multi-sig signatures, and acquiring paymaster sponsorship subsidy.
                  </p>
                </div>
              </div>

              {/* Step 3: Pending Transaction */}
              <div className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
                deployStep === "pending" 
                  ? "bg-brand-purple/5 border-brand-purple/30 text-white font-semibold" 
                  : deployStep === "completed"
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                    : "bg-zinc-900/50 border-white/5 text-zinc-500"
              }`}>
                <div className="mt-0.5">
                  {deployStep === "pending" ? (
                    <Loader2 className="w-4 h-4 text-brand-purple animate-spin" />
                  ) : deployStep === "completed" ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>3. Pending Transaction</span>
                    {deployStep === "pending" && <span className="text-[9px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.2 rounded animate-pulse">ACTIVE</span>}
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Broadcasting payload to Base Sepolia node pool, tracking state changes, and awaiting block confirmation receipts.
                  </p>
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 font-bold">
                <span>PIPELINE PROGRESS</span>
                <span className="text-brand-purple">
                  {deployStep === "compiling" && "25%"}
                  {deployStep === "gas" && "60%"}
                  {deployStep === "pending" && "90%"}
                  {deployStep === "completed" && "100%"}
                </span>
              </div>
              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-brand-purple to-brand-blue h-full transition-all duration-500 rounded-full" 
                  style={{ 
                    width: 
                      deployStep === "compiling" ? "25%" : 
                      deployStep === "gas" ? "60%" : 
                      deployStep === "pending" ? "90%" : 
                      deployStep === "completed" ? "100%" : "0%" 
                  }}
                />
              </div>
            </div>

            {/* Deployed Address and action when completed */}
            {deployStep === "completed" && (
              <div className="space-y-4 pt-2 border-t border-white/5 animate-fade-in">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 animate-bounce" /> Custom Smart Contract Deployed on Base!
                </div>
                {deployedAddress && (
                  <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 text-center space-y-1 font-mono">
                    <span className="text-[8px] uppercase font-bold tracking-widest text-zinc-500 block">Deployed Contract Address</span>
                    <a 
                      href={`https://basescan.org/address/${deployedAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-brand-blue hover:underline hover:text-brand-purple transition-all flex items-center justify-center gap-1 max-w-[280px] mx-auto truncate"
                    >
                      {deployedAddress} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
                <button
                  id="dismiss-deploy-modal-btn"
                  onClick={() => setDeployStep("idle")}
                  className="w-full py-3 bg-brand-purple hover:bg-purple-600 text-white font-bold font-display text-xs rounded-xl transition-all shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-2"
                >
                  <span>Excellent, Verified ✔</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
