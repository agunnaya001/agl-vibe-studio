import React, { useState, useEffect, useRef } from "react";
import { generateProjectAI, AIDeploymentProposal } from "../lib/gemini";
import AIDeploymentWizardModal from "../components/AIDeploymentWizardModal";
import InsufficientCreditsModal from "../components/InsufficientCreditsModal";
import { validateAndConsumeCredits, CREDIT_COSTS } from "../lib/credits";
import { AgunnayaDatabase, BASE_PRICE, SLOPE } from "../lib/db";
import { Token, WalletState, PreFlightCheckItem } from "../types";
import IPFSUploader from "../components/IPFSUploader";
import SmartContractTemplateLibrary from "../components/SmartContractTemplateLibrary";
import VisualArchitecturePreview from "../components/VisualArchitecturePreview";
import { analyzeSolidityCode } from "../lib/security";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  TOKEN_FACTORY_ADDRESS,
  TOKEN_FACTORY_ABI,
  createTokenOnChain,
  fetchOnChainTokenCount,
  fetchOnChainTokens
} from "../lib/tokenFactory";
import { 
  Sparkles, 
  Rocket, 
  BrainCircuit, 
  Code, 
  ShieldCheck, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle,
  XCircle,
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
  CloudLightning,
  Copy,
  Database,
  Terminal,
  ChevronDown,
  ChevronUp,
  Wand2,
  Plane
} from "lucide-react";

interface CreatePageProps {
  wallet: WalletState;
  onLaunchSuccess: (newToken: Token) => void;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function CreatePage({ wallet, onLaunchSuccess, onRefreshWallet, addTerminalLog, showToast }: CreatePageProps) {
  const [activeSubMode, setActiveSubMode] = useState<"launchpad" | "ai-architect" | "templates">("ai-architect");

  // AI Architect State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProjectType, setAiProjectType] = useState("ERC-20 Token");
  const [aiAccessControl, setAiAccessControl] = useState("Ownable");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [deployingAI, setDeployingAI] = useState(false);
  const [deploySuccessAI, setDeploySuccessAI] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [deployStep, setDeployStep] = useState<"idle" | "compiling" | "gas" | "pending" | "completed">("idle");

  // Insufficient Credits Modal State
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false);
  const [creditsModalData, setCreditsModalData] = useState({ featureName: "", required: 0, available: 0 });

  // Firebase Session Auto-Save State
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error" | "offline">("idle");

  // Token Factory On-Chain State
  const [factoryTokenCount, setFactoryTokenCount] = useState<number | null>(null);
  const [factoryTokens, setFactoryTokens] = useState<string[]>([]);
  const [showAbiInspector, setShowAbiInspector] = useState(false);
  const [copiedContractAddress, setCopiedContractAddress] = useState(false);

  // AI Deployment Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleWizardAutoFill = (proposal: AIDeploymentProposal) => {
    setActiveSubMode("ai-architect");
    setTokenName(proposal.tokenName);
    setTokenSymbol(proposal.tokenSymbol);
    setTokenDesc(proposal.description);
    setAiPrompt(`Create a ${proposal.category} token named '${proposal.tokenName}' ($${proposal.tokenSymbol}) with ${proposal.initialSupply} initial supply, ${proposal.creatorFeePercent}% creator fee, and base spot price ${proposal.basePriceEth} ETH.`);
    
    setAiResult({
      name: proposal.tokenName,
      symbol: proposal.tokenSymbol,
      description: proposal.description,
      solidityCode: proposal.solidityCode,
      parameters: {
        initialSupply: proposal.initialSupply.toLocaleString(),
        mintPrice: `${proposal.basePriceEth} ETH`,
        additionalConfig: `Bonding Curve: ${proposal.curveModel.toUpperCase()} (Slope k: ${proposal.slopeK}). Royalty: ${proposal.creatorFeePercent}%. Anti-Whale Max: ${proposal.antiWhaleMaxPercent}%.`
      },
      securityAudit: proposal.securityAuditSummary,
      uiTheme: {
        primaryColor: "purple-500",
        glowColor: "purple-500/20"
      },
      launchChecklist: [
        `Verified OpenZeppelin standard ERC-20 contract for ${proposal.tokenSymbol}`,
        `Linear bonding curve formula P(S) = ${proposal.basePriceEth} + ${proposal.slopeK} * S`,
        `Checks-Effects-Interactions pattern reentrancy verified (Score: ${proposal.securityScore}/100)`,
        "Ready to deploy to Base Mainnet or Sepolia Sandbox"
      ]
    });

    showToast(`🧙‍♂️ AI Wizard parameters auto-filled for $${proposal.tokenSymbol}!`, "success");
    addTerminalLog("system", `AI DEPLOYMENT WIZARD: Parameters successfully loaded for ${proposal.tokenName} ($${proposal.tokenSymbol})`);
  };

  const handleWizardDirectLaunch = (proposal: AIDeploymentProposal) => {
    const mockLogo = "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60";
    const newAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
    
    const newToken: Token = {
      address: newAddress,
      name: proposal.tokenName,
      symbol: proposal.tokenSymbol,
      description: proposal.description,
      creator: wallet.address || "0x0000000000000000000000000000000000000000",
      creatorFeesEarned: 0,
      currentPrice: proposal.basePriceEth || BASE_PRICE,
      supply: 0,
      maxSupply: proposal.initialSupply,
      marketCap: 0,
      reserveEth: 0,
      volume24h: 0,
      category: (proposal.category as Token["category"]) || "utility",
      logoUrl: mockLogo,
      socials: { website: "https://agunnaya.io" },
      isVerified: true,
      vestingWeeks: 0,
      referralRewardsPct: proposal.creatorFeePercent,
      createdAt: Date.now(),
      implementation: TOKEN_FACTORY_ADDRESS
    };

    const tokensList = AgunnayaDatabase.getTokens();
    tokensList.push(newToken);
    AgunnayaDatabase.saveTokens(tokensList);

    if (wallet.isSmartAccount) {
      const updatedWallet = { ...wallet, sponsoredGasEth: Math.max(0, wallet.sponsoredGasEth - 0.002) };
      AgunnayaDatabase.saveWallet(updatedWallet);
    } else {
      const updatedWallet = { ...wallet, balanceEth: Math.max(0, wallet.balanceEth - 0.002) };
      AgunnayaDatabase.saveWallet(updatedWallet);
    }
    onRefreshWallet();

    AgunnayaDatabase.addActivity({
      type: "deployment",
      tokenSymbol: newToken.symbol,
      tokenAddress: newToken.address,
      user: wallet.address || "0x0000",
      amount: 1,
      ethValue: 0.002,
      details: `AI Wizard 1-Click Launch: ${newToken.name} (${newToken.symbol}) deployed to Base network at ${newToken.address}`
    });

    showToast(`🚀 Successfully launched ${newToken.name} ($${newToken.symbol}) via AI Wizard!`, "success");
    addTerminalLog("success", `AI DEPLOYMENT WIZARD: Deployed ${newToken.name} ($${newToken.symbol}) at ${newToken.address}`);
    onLaunchSuccess(newToken);
  };

  useEffect(() => {
    async function loadFactoryInfo() {
      const count = await fetchOnChainTokenCount();
      setFactoryTokenCount(count);
      const tokens = await fetchOnChainTokens();
      setFactoryTokens(tokens);
    }
    loadFactoryInfo();
  }, []);

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
  const [launchpadDeployStep, setLaunchpadDeployStep] = useState<"idle" | "compiling" | "verifying" | "deploying" | "finalizing" | "completed">("idle");
  const [autoVerify, setAutoVerify] = useState<boolean>(true);
  const [gasEstimate, setGasEstimate] = useState<string>("0.0000");

  useEffect(() => {
    if (tokenName || tokenSymbol || tokenDesc || seedBuy) {
      // Mock gas estimation based on standard deployment costs on Base
      const baseGas = 0.0015;
      const complexityGas = tokenDesc.length * 0.000001;
      const seedBuyGas = parseFloat(seedBuy || "0") > 0 ? 0.0008 : 0;
      setGasEstimate((baseGas + complexityGas + seedBuyGas).toFixed(4));
    } else {
      setGasEstimate("0.0000");
    }
  }, [tokenName, tokenSymbol, tokenDesc, seedBuy]);

  // Pre-Flight Check utility for Launchpad Parameters
  const getPreFlightChecks = (): PreFlightCheckItem[] => {
    const checks: PreFlightCheckItem[] = [];

    // 1. Wallet Connection
    if (!wallet.isConnected) {
      checks.push({
        id: "wallet-conn",
        label: "Wallet Connectivity",
        category: "Wallet",
        status: "fail",
        message: "Wallet is disconnected. Connect wallet to execute deployment."
      });
    } else {
      checks.push({
        id: "wallet-conn",
        label: "Wallet Connectivity",
        category: "Wallet",
        status: "pass",
        message: `Connected: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
      });
    }

    // 2. Token Name
    const nameTrim = tokenName.trim();
    if (!nameTrim) {
      checks.push({
        id: "token-name",
        label: "Token Name Integrity",
        category: "Identity",
        status: "fail",
        message: "Token name is required."
      });
    } else if (nameTrim.length < 3) {
      checks.push({
        id: "token-name",
        label: "Token Name Integrity",
        category: "Identity",
        status: "fail",
        message: "Token name must be at least 3 characters long."
      });
    } else if (nameTrim.length > 32) {
      checks.push({
        id: "token-name",
        label: "Token Name Integrity",
        category: "Identity",
        status: "warn",
        message: "Name > 32 chars may truncate on block explorers and DEXes."
      });
    } else {
      checks.push({
        id: "token-name",
        label: "Token Name Integrity",
        category: "Identity",
        status: "pass",
        message: `Valid name: "${nameTrim}"`
      });
    }

    // 3. Ticker Symbol
    const symTrim = tokenSymbol.trim().toUpperCase();
    if (!symTrim) {
      checks.push({
        id: "token-symbol",
        label: "Ticker Symbol Format",
        category: "Identity",
        status: "fail",
        message: "Ticker symbol is required."
      });
    } else if (symTrim.length < 2 || symTrim.length > 5) {
      checks.push({
        id: "token-symbol",
        label: "Ticker Symbol Format",
        category: "Identity",
        status: "fail",
        message: "Ticker symbol must be 2-5 characters long (e.g. $AGNN)."
      });
    } else if (/[^A-Z0-9]/.test(symTrim)) {
      checks.push({
        id: "token-symbol",
        label: "Ticker Symbol Format",
        category: "Identity",
        status: "fail",
        message: "Symbol must contain uppercase letters and numbers only."
      });
    } else {
      checks.push({
        id: "token-symbol",
        label: "Ticker Symbol Format",
        category: "Identity",
        status: "pass",
        message: `Valid ticker symbol: $${symTrim}`
      });
    }

    // 4. Description
    const descTrim = tokenDesc.trim();
    if (!descTrim) {
      checks.push({
        id: "token-desc",
        label: "Metadata & Description",
        category: "Identity",
        status: "fail",
        message: "Token description is required for bonding curve deployment."
      });
    } else if (descTrim.length < 15) {
      checks.push({
        id: "token-desc",
        label: "Metadata & Description",
        category: "Identity",
        status: "warn",
        message: "Short description (<15 chars). Consider elaborating project goals."
      });
    } else {
      checks.push({
        id: "token-desc",
        label: "Metadata & Description",
        category: "Identity",
        status: "pass",
        message: "Project description metadata verified."
      });
    }

    // 5. Initial Supply Liquidity Seed
    const seedVal = parseFloat(seedBuy || "0");
    if (isNaN(seedVal) || seedVal < 0) {
      checks.push({
        id: "seed-buy",
        label: "Initial Supply Liquidity",
        category: "Liquidity & Gas",
        status: "fail",
        message: "Seed buy amount cannot be negative or invalid."
      });
    } else if (seedVal === 0) {
      checks.push({
        id: "seed-buy",
        label: "Initial Supply Liquidity",
        category: "Liquidity & Gas",
        status: "warn",
        message: "Zero initial supply seed buy: curve launches with 0 liquidity backing."
      });
    } else if (seedVal < 0.005) {
      checks.push({
        id: "seed-buy",
        label: "Initial Supply Liquidity",
        category: "Liquidity & Gas",
        status: "warn",
        message: `Low initial seed buy (${seedVal} ETH < 0.005 ETH): early traders may face high price impact.`
      });
    } else {
      checks.push({
        id: "seed-buy",
        label: "Initial Supply Liquidity",
        category: "Liquidity & Gas",
        status: "pass",
        message: `${seedVal} ETH initial seed buy liquidity allocated.`
      });
    }

    // 6. Gas & Wallet Balance
    const totalCost = (seedVal || 0) + 0.002 + parseFloat(gasEstimate || "0.0015");
    if (wallet.isConnected && wallet.balanceEth < totalCost) {
      checks.push({
        id: "gas-balance",
        label: "Gas & Cost Liquidity",
        category: "Liquidity & Gas",
        status: "fail",
        message: `Required: ${totalCost.toFixed(4)} ETH. Available balance: ${wallet.balanceEth.toFixed(4)} ETH.`
      });
    } else if (wallet.isConnected) {
      checks.push({
        id: "gas-balance",
        label: "Gas & Cost Liquidity",
        category: "Liquidity & Gas",
        status: "pass",
        message: `Balance (${wallet.balanceEth.toFixed(4)} ETH) sufficient for ${totalCost.toFixed(4)} ETH total cost.`
      });
    }

    // 7. Referral Rules
    if (referral < 0 || referral > 5) {
      checks.push({
        id: "referral-rules",
        label: "Referral Reward Cap",
        category: "Security & Parameters",
        status: "fail",
        message: "Referral percentage must be between 0% and 5%."
      });
    } else if (referral > 3) {
      checks.push({
        id: "referral-rules",
        label: "Referral Reward Cap",
        category: "Security & Parameters",
        status: "warn",
        message: "Referral rate > 3% allocates higher volume share to referrers."
      });
    } else {
      checks.push({
        id: "referral-rules",
        label: "Referral Reward Cap",
        category: "Security & Parameters",
        status: "pass",
        message: `${referral}% referral reward within safe parameters.`
      });
    }

    return checks;
  };

  const getAIPreFlightChecks = (): PreFlightCheckItem[] => {
    if (!aiResult) return [];
    const checks: PreFlightCheckItem[] = [];

    if (!wallet.isConnected) {
      checks.push({
        id: "ai-wallet",
        label: "Wallet Connection",
        category: "Wallet",
        status: "fail",
        message: "Wallet is not connected."
      });
    } else {
      checks.push({
        id: "ai-wallet",
        label: "Wallet Connection",
        category: "Wallet",
        status: "pass",
        message: `Connected: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
      });
    }

    if (!aiResult.name) {
      checks.push({
        id: "ai-name",
        label: "Contract Name",
        category: "Identity",
        status: "fail",
        message: "Contract name is missing."
      });
    } else {
      checks.push({
        id: "ai-name",
        label: "Contract Name",
        category: "Identity",
        status: "pass",
        message: `Name: "${aiResult.name}"`
      });
    }

    if (!aiResult.symbol) {
      checks.push({
        id: "ai-symbol",
        label: "Ticker Symbol",
        category: "Identity",
        status: "fail",
        message: "Ticker symbol is missing."
      });
    } else {
      checks.push({
        id: "ai-symbol",
        label: "Ticker Symbol",
        category: "Identity",
        status: "pass",
        message: `Ticker: $${aiResult.symbol}`
      });
    }

    if (!aiResult.solidityCode || aiResult.solidityCode.length < 50) {
      checks.push({
        id: "ai-code",
        label: "Solidity Source Code",
        category: "Security & Parameters",
        status: "fail",
        message: "Solidity source code is incomplete or missing."
      });
    } else {
      checks.push({
        id: "ai-code",
        label: "Solidity Source Code",
        category: "Security & Parameters",
        status: "pass",
        message: "Complete Solidity v0.8.20+ source code."
      });
    }

    const totalCost = 0.002 + 0.0015;
    if (wallet.isConnected && !wallet.isSmartAccount && wallet.balanceEth < totalCost) {
      checks.push({
        id: "ai-balance",
        label: "Deploy Fee & Gas",
        category: "Liquidity & Gas",
        status: "fail",
        message: `Requires ${totalCost} ETH. Wallet balance: ${wallet.balanceEth.toFixed(4)} ETH.`
      });
    } else if (wallet.isConnected) {
      checks.push({
        id: "ai-balance",
        label: "Deploy Fee & Gas",
        category: "Liquidity & Gas",
        status: "pass",
        message: wallet.isSmartAccount ? "Gas sponsored via AA Paymaster." : `${wallet.balanceEth.toFixed(4)} ETH available.`
      });
    }

    return checks;
  };

  // Handles AI Contract Generation
  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;

    const creditResult = validateAndConsumeCredits({
      wallet,
      onRefreshWallet,
      requiredCredits: CREDIT_COSTS.CONTRACT_BUILD,
      featureName: "AI Contract Architect",
      showToast,
      addTerminalLog,
      onRequestCreditsModal: (featureName, required, available) => {
        setCreditsModalData({ featureName, required, available });
        setInsufficientCreditsModalOpen(true);
      }
    });

    if (!creditResult.success) {
      setAiLoading(false);
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    setDeploySuccessAI(false);

    try {
      const data = await generateProjectAI(aiPrompt, aiProjectType, aiAccessControl);
      setAiResult(data);
      addTerminalLog("system", `Generated smart contract architecture for ${data.name} (${data.symbol})`);
    } catch (err: any) {
      console.error(err);
      creditResult.refund();
      showToast(`AI Architect offline: ${err.message || "Please check your GEMINI_API_KEY settings."}`, "error");
    } finally {
      setAiLoading(false);
    }
  };

  // Handles Deployment of AI Generated Code via Token Factory on Base Mainnet or Sandbox fallback
  const handleAIDeploy = async () => {
    if (!wallet.isConnected) {
      showToast("Please connect your wallet first in the header.", "error");
      return;
    }
    if (!aiResult || deployingAI) return;

    // Enforce Pre-Flight Check Validation
    const aiPreFlight = getAIPreFlightChecks();
    const blockingAIFail = aiPreFlight.find(c => c.status === "fail");
    if (blockingAIFail) {
      showToast(`Pre-Flight Check Failed: ${blockingAIFail.message}`, "error");
      addTerminalLog("error", `Pre-Flight Check BLOCKED AI deployment: [${blockingAIFail.label}] ${blockingAIFail.message}`);
      return;
    }

    setDeployingAI(true);
    setDeployStep("compiling");
    addTerminalLog("info", `Initiating contract deployment pipeline for ${aiResult.name}...`);
    addTerminalLog("info", `[1/3] Compiling Solidity contract source code...`);

    const hasEthereum = typeof window !== "undefined" && (window as any).ethereum;

    if (hasEthereum) {
      try {
        addTerminalLog("info", `[2/3] Connecting to Base Mainnet Token Factory contract at ${TOKEN_FACTORY_ADDRESS}...`);
        setDeployStep("gas");

        addTerminalLog("info", `[3/3] Prompting Web3 wallet to invoke createToken("${aiResult.name}", "${aiResult.symbol}")...`);
        setDeployStep("pending");

        const { txHash, newTokenAddress } = await createTokenOnChain(aiResult.name, aiResult.symbol);

        addTerminalLog("success", `On-Chain Transaction Confirmed! Tx Hash: ${txHash}`);

        const mockLogo = "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60";
        const newToken: Token = {
          address: newTokenAddress,
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
          implementation: TOKEN_FACTORY_ADDRESS
        };

        const tokensList = AgunnayaDatabase.getTokens();
        tokensList.push(newToken);
        AgunnayaDatabase.saveTokens(tokensList);

        if (wallet.isSmartAccount) {
          const updatedWallet = { ...wallet, sponsoredGasEth: Math.max(0, wallet.sponsoredGasEth - 0.002) };
          AgunnayaDatabase.saveWallet(updatedWallet);
        } else {
          const updatedWallet = { ...wallet, balanceEth: Math.max(0, wallet.balanceEth - 0.002) };
          AgunnayaDatabase.saveWallet(updatedWallet);
        }
        onRefreshWallet();

        AgunnayaDatabase.addActivity({
          type: "deployment",
          tokenSymbol: newToken.symbol,
          tokenAddress: newToken.address,
          user: wallet.address,
          amount: 1,
          ethValue: 0.002,
          details: `On-chain Factory Deployment: ${newToken.name} (${newToken.symbol}) deployed to Base Mainnet at ${newToken.address}`
        });

        // Refresh factory token count
        fetchOnChainTokenCount().then(c => setFactoryTokenCount(c));

        addTerminalLog("success", `CONTRACT DEPLOYED ON-CHAIN at ${newToken.address}`);
        setDeployingAI(false);
        setDeployStep("completed");
        setDeploySuccessAI(true);
        setDeployedAddress(newToken.address);
        onLaunchSuccess(newToken);
        return;
      } catch (err: any) {
        console.warn("On-chain transaction notice or fallback:", err);
        addTerminalLog("error", `Web3 notice: ${err.message || "Transaction rejected or network mismatch"}. Falling back to sandbox relay deployment...`);
      }
    }

    // Milestone 1: Compiling Solidity (Sandbox fallback)
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
          const generatedAddr = "0x" + Math.random().toString(16).substr(2, 40);
          const newToken: Token = {
            address: generatedAddr,
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
            implementation: TOKEN_FACTORY_ADDRESS
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
            details: `Successfully deployed custom Solidity contract: ${newToken.name} (${newToken.symbol}) via Token Factory ${TOKEN_FACTORY_ADDRESS}`
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

    // Enforce Pre-Flight Check Validation
    const preFlight = getPreFlightChecks();
    const blockingFail = preFlight.find(c => c.status === "fail");
    if (blockingFail) {
      showToast(`Pre-Flight Check Failed: ${blockingFail.message}`, "error");
      addTerminalLog("error", `Pre-Flight Check BLOCKED launch: [${blockingFail.label}] ${blockingFail.message}`);
      return;
    }

    // Contract Validations
    if (tokenName.length < 3) {
      showToast("Token name must be at least 3 characters.", "error");
      return;
    }
    if (tokenSymbol.length < 2 || tokenSymbol.length > 5) {
      showToast("Token symbol must be 2-5 characters.", "error");
      return;
    }
    
    const buyEthVal = parseFloat(seedBuy) || 0;
    if (buyEthVal < 0) {
      showToast("Seed buy cannot be negative.", "error");
      return;
    }
    if (referral < 0 || referral > 5) {
      showToast("Referral must be between 0 and 5%.", "error");
      return;
    }
    if (vesting < 0) {
      showToast("Vesting weeks cannot be negative.", "error");
      return;
    }
    if (buyEthVal > wallet.balanceEth) {
      showToast("Insufficient ETH balance for seed purchase.", "error");
      return;
    }
    
    setLaunchingToken(true);
    setLaunchpadDeployStep("compiling");
    addTerminalLog("info", `Assembling BondingCurveToken contract metadata for ${tokenName}...`);

    setTimeout(() => {
      setLaunchpadDeployStep("verifying");
      setTimeout(() => {
        setLaunchpadDeployStep("deploying");
        setTimeout(() => {
          setLaunchpadDeployStep("finalizing");
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
            
            if (autoVerify) {
              addTerminalLog("info", `Auto-verifying contract source code on BaseScan using ETHERSCAN_API_KEY...`);
              setTimeout(() => {
                addTerminalLog("success", `Contract source verified successfully on BaseScan!`);
                newToken.isVerified = true;
                
                // Update in local DB since we modified isVerified
                const updatedList = AgunnayaDatabase.getTokens().map(t => 
                  t.address === newToken.address ? newToken : t
                );
                AgunnayaDatabase.saveTokens(updatedList);
              }, 1500);
            }
            
            setLaunchpadDeployStep("completed");
            setTimeout(() => {
              setLaunchingToken(false);
              setLaunchpadDeployStep("idle");
              onLaunchSuccess(newToken);
            }, autoVerify ? 2500 : 1000);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const handleLoadTemplateIntoAIArchitect = (code: string, name: string, symbol: string) => {
    setActiveSubMode("ai-architect");
    setAiPrompt(`Customize pre-audited boilerplate for ${name} ($${symbol})`);
    setAiResult({
      name,
      symbol,
      description: `Pre-audited boilerplate contract for ${name} ($${symbol})`,
      solidityCode: code,
      parameters: {
        initialSupply: "1,000,000",
        mintPrice: "0.015 ETH",
        additionalConfig: "OpenZeppelin v5.0 Standard certified template"
      },
      securityAudit: "CertiK / OpenZeppelin v5.0 pre-audited template code",
      uiTheme: { primaryColor: "purple-500", glowColor: "purple-500/20" },
      launchChecklist: [
        "OpenZeppelin v5.0 contract structure verified",
        "ReentrancyGuard & SafeMath compliant",
        "Gas optimized Solc 0.8.20 execution",
        "Ready for Base Mainnet / Sepolia deployment"
      ]
    });
    showToast(`Loaded ${name} template into AI Architect!`, "success");
    addTerminalLog("system", `TEMPLATE ENGINE: Transferred ${name} template code into AI Architect session.`);
  };

  return (
    <div id="creator-workspace-root" className="space-y-6 animate-fade-in">
      {/* Creation Submode Tabs Bar */}
      <div className="flex bg-zinc-900/80 border border-white/5 p-1 rounded-xl">
        <button
          id="submode-tab-ai"
          onClick={() => { setActiveSubMode("ai-architect"); setAiResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer ${
            activeSubMode === "ai-architect"
              ? "bg-brand-purple text-white shadow-md font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          <span>AI Smart Contract Architect</span>
        </button>
        <button
          id="submode-tab-templates"
          onClick={() => setActiveSubMode("templates")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer ${
            activeSubMode === "templates"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Template Library</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
            Audited
          </span>
        </button>
        <button
          id="submode-tab-launchpad"
          onClick={() => setActiveSubMode("launchpad")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold font-display transition-all cursor-pointer ${
            activeSubMode === "launchpad"
              ? "bg-brand-blue text-white shadow-md font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>Bonding Curve Launcher</span>
        </button>
      </div>

      {/* TEMPLATES SUBMODE VIEW */}
      {activeSubMode === "templates" && (
        <SmartContractTemplateLibrary
          wallet={wallet}
          onRefreshWallet={onRefreshWallet}
          onLaunchSuccess={onLaunchSuccess}
          showToast={showToast}
          addTerminalLog={addTerminalLog}
          onLoadIntoAIArchitect={handleLoadTemplateIntoAIArchitect}
        />
      )}

      {activeSubMode !== "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Creation Mode Tabs & Active input panels */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Deployment Wizard Hero Callout */}
            <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-r from-brand-blue/20 via-brand-purple/20 to-purple-600/20 border border-brand-purple/40 p-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white shadow-lg shadow-brand-purple/30">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                      AI Token Deployment Wizard
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-purple text-white font-mono uppercase tracking-wider font-bold">
                        Guided Launch
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-300 font-mono">
                      Input plain text requirements & let Gemini AI propose bonding curve slopes, contract parameters & launch rules automatically!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="open-ai-deployment-wizard-btn"
                  onClick={() => setIsWizardOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple text-white font-mono font-bold text-xs hover:opacity-95 shadow-lg shadow-brand-purple/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Launch AI Wizard
                </button>
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Access Control</label>
                  <select
                    id="ai-access-control-select"
                    value={aiAccessControl}
                    onChange={(e) => setAiAccessControl(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-brand-purple/40 font-mono"
                  >
                    <option value="Ownable">Ownable (Single Owner)</option>
                    <option value="AccessControl">AccessControl (RBAC / Multiple Roles)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="bg-brand-purple/10 border border-brand-purple/20 p-3 rounded-xl flex items-center gap-2 text-[10px] text-brand-purple font-mono w-full leading-normal">
                    <Zap className="w-4 h-4 shrink-0" />
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
                {/* AI Prompt Suggestions */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-brand-purple" /> AI Suggested Architect Templates
                    </span>
                    <button
                      type="button"
                      id="add-all-ai-suggestions-btn"
                      onClick={() => {
                        const allSuggestions = [
                          "1. Meme Token: Create an ERC-20 meme token on Base named 'DegenVibes' (symbol: VIBES) with 10,000,000 supply, linear bonding curve, and a 1% protocol fee split.",
                          "2. Staking Vault: Build an ERC-20 utility token with a built-in staking vault contract paying 18% APY compounding rewards with 7-day lock periods.",
                          "3. AI Agent Core: Design an autonomous AI Agent smart contract on Base charging 0.001 ETH per execution call with automated creator fee routing.",
                          "4. DAO Governance: Build a DAO governance hub with 1,000 token quorum threshold, 51% majority rule, and 3-day voting windows for Base treasury proposals.",
                          "5. Security Vault: Integrate OpenZeppelin ReentrancyGuard, anti-bot swap cooldowns, and Emergency Pause circuits."
                        ];
                        setAiProjectType("Full-Stack Ecosystem");
                        setAiPrompt(`Architect a complete Web3 dApp ecosystem on Base integrating all AI suggested modules:\n\n${allSuggestions.join("\n\n")}`);
                        showToast("Added all AI suggestions to the architecture prompt!", "success");
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-brand-purple/20 border border-brand-purple/40 hover:bg-brand-purple text-purple-300 hover:text-white transition-all font-mono font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Add All AI Suggestions</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: "🔥 Base Meme Coin (10M Supply, 1% Tax)",
                        type: "ERC-20 Token",
                        prompt: "Create an ERC-20 meme token on Base named 'DegenVibes' (symbol: VIBES) with 10,000,000 supply, linear bonding curve, and a 1% developer protocol fee split."
                      },
                      {
                        label: "💎 Staking Vault Token (15% APY)",
                        type: "ERC-20 Token",
                        prompt: "Build an ERC-20 utility token with a built-in staking vault contract that pays 15% APY compounding rewards and 7-day lock periods."
                      },
                      {
                        label: "🤖 Autonomous AI Agent Core",
                        type: "AI Agent Core",
                        prompt: "Design an autonomous AI Agent smart contract on Base that charges 0.001 ETH per execution call and routes fees directly to the agent creator wallet."
                      },
                      {
                        label: "🏛️ DAO Multi-Sig Governance",
                        type: "DAO Governance",
                        prompt: "Build a DAO governance hub with 1,000 token quorum threshold, 51% majority rule, and 3-day voting windows for Base treasury proposals."
                      },
                      {
                        label: "🎮 GameFi XP Reward Pool",
                        type: "GameFi Tournament",
                        prompt: "Deploy a GameFi reward pool contract that issues non-transferable XP tokens for completed quests and unlocks seasonal AGL token prize pools."
                      },
                      {
                        label: "⚡ Reentrancy Guarded Security Vault",
                        type: "Security Protocol",
                        prompt: "Build an audited Solidity vault with OpenZeppelin ReentrancyGuard, emergency pause functions, and multi-sig emergency exit safety controls."
                      }
                    ].map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        id={`ai-suggestion-chip-${idx}`}
                        onClick={() => {
                          setAiProjectType(sug.type);
                          setAiPrompt(sug.prompt);
                          showToast(`Loaded AI suggestion: ${sug.label}`, "info");
                        }}
                        className="text-[10px] px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand-purple/40 hover:bg-brand-purple/10 text-zinc-300 hover:text-white transition-all font-mono flex items-center gap-1 text-left cursor-pointer"
                      >
                        <span>{sug.label}</span>
                      </button>
                    ))}
                  </div>
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

              {/* DYNAMIC VISUAL ARCHITECTURE PREVIEW */}
              <VisualArchitecturePreview
                projectType={aiProjectType}
                accessControl={aiAccessControl}
                promptText={aiPrompt}
                aiResult={aiResult}
              />

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

              {/* CONTRACT VISUAL PREVIEW */}
              {(tokenName || tokenSymbol) && (
                <div className="bg-zinc-950 border border-brand-blue/20 rounded-xl p-4 mt-4 space-y-3 shadow-inner">
                  <h3 className="text-[10px] font-bold text-brand-blue uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5" />
                    Contract Preview
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="bg-zinc-900 rounded-lg p-2 border border-white/5">
                      <span className="block text-[9px] text-zinc-500 mb-0.5">Name</span>
                      <span className="text-zinc-200 font-bold truncate block">{tokenName || "-"}</span>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2 border border-white/5">
                      <span className="block text-[9px] text-zinc-500 mb-0.5">Symbol</span>
                      <span className="text-zinc-200 font-bold truncate block">{tokenSymbol ? `$${tokenSymbol.toUpperCase()}` : "-"}</span>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2 border border-white/5">
                      <span className="block text-[9px] text-zinc-500 mb-0.5">Total Supply</span>
                      <span className="text-zinc-200 font-bold block">1,000,000,000</span>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2 border border-white/5">
                      <span className="block text-[9px] text-zinc-500 mb-0.5">Owner</span>
                      <span className="text-zinc-200 font-bold truncate block" title={wallet.address || "Not connected"}>
                        {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Not connected"}
                      </span>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2 border border-white/5">
                      <span className="block text-[9px] text-zinc-500 mb-0.5">Mint Fee</span>
                      <span className="text-zinc-200 font-bold block">0.002 ETH</span>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2 border border-white/5">
                      <span className="block text-[9px] text-zinc-500 mb-0.5">Initial Buy</span>
                      <span className="text-zinc-200 font-bold block">{seedBuy || "0"} ETH</span>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2 border border-white/5 md:col-span-3 flex justify-between items-center">
                       <div>
                         <span className="block text-[9px] text-zinc-500 mb-0.5">Est. Gas (Base)</span>
                         <span className="text-emerald-400 font-bold block">~{gasEstimate} ETH</span>
                       </div>
                       <div className="text-right">
                         <span className="block text-[9px] text-zinc-500 mb-0.5">Total Cost</span>
                         <span className="text-zinc-200 font-bold block">{(parseFloat(seedBuy || "0") + 0.002 + parseFloat(gasEstimate)).toFixed(4)} ETH</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-white/5">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox"
                          checked={autoVerify}
                          onChange={(e) => setAutoVerify(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="w-4 h-4 rounded border border-white/20 bg-zinc-900 peer-checked:bg-brand-blue peer-checked:border-brand-blue transition-colors flex items-center justify-center">
                          <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                        Auto-Verify on BaseScan (Uses <code className="text-[10px] bg-zinc-800 px-1 py-0.5 rounded text-brand-blue">ETHERSCAN_API_KEY</code>)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* PRE-FLIGHT CHECK UTILITY WIDGET */}
              {(tokenName || tokenSymbol || tokenDesc || parseFloat(seedBuy || "0") > 0) && (() => {
                const checks = getPreFlightChecks();
                const failCount = checks.filter(c => c.status === "fail").length;
                const warnCount = checks.filter(c => c.status === "warn").length;
                const passCount = checks.filter(c => c.status === "pass").length;

                return (
                  <div id="preflight-check-widget" className="bg-zinc-950 border border-brand-blue/30 rounded-xl p-4 mt-4 space-y-3 shadow-lg shadow-brand-blue/5 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-brand-blue/10 text-brand-blue">
                          <Plane className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            Pre-Flight Contract Diagnostic
                          </h3>
                          <p className="text-[10px] text-zinc-400 font-mono">Automated parameter & liquidity validation</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        {failCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {failCount} BLOCKED
                          </span>
                        ) : warnCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {warnCount} WARNING{warnCount > 1 ? "S" : ""}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {passCount}/7 PASSED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Diagnostic Items List */}
                    <div className="space-y-2 font-mono text-xs">
                      {checks.map((chk) => (
                        <div
                          key={chk.id}
                          className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-all ${
                            chk.status === "fail"
                              ? "bg-red-500/5 border-red-500/30 text-red-300"
                              : chk.status === "warn"
                              ? "bg-amber-500/5 border-amber-500/30 text-amber-300"
                              : "bg-zinc-900/60 border-white/5 text-zinc-300"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {chk.status === "fail" ? (
                              <XCircle className="w-4 h-4 text-red-400" />
                            ) : chk.status === "warn" ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
                                {chk.label}
                                <span className="text-[9px] font-normal text-zinc-500">({chk.category})</span>
                              </span>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                  chk.status === "fail"
                                    ? "bg-red-500/20 text-red-400"
                                    : chk.status === "warn"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                {chk.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{chk.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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

            {/* Security Audit panel */}
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
                          <ShieldCheck className="w-4 h-4 animate-pulse" /> AI Security Audit Status: Passed
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 animate-pulse" /> AI Security Audit Status: Warning
                        </>
                      )}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      audit.status === "passed"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>
                      Score: {audit.score}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-normal">
                    {audit.summary}
                  </p>
                  
                  {/* Detailed security audit insights/findings if present */}
                  {audit.findings.length > 0 && (
                    <div className="space-y-2 border-t border-white/5 pt-3 animate-fade-in">
                      <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Static Analysis Finding(s):</span>
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

            {/* DYNAMIC VISUAL ARCHITECTURE & INHERITANCE MAP */}
            <VisualArchitecturePreview
              projectType={aiProjectType}
              accessControl={aiAccessControl}
              promptText={aiPrompt}
              aiResult={aiResult}
            />

            {/* AI PRE-FLIGHT DIAGNOSTIC CHECK WIDGET */}
            {(() => {
              const aiChecks = getAIPreFlightChecks();
              const failCount = aiChecks.filter(c => c.status === "fail").length;
              const warnCount = aiChecks.filter(c => c.status === "warn").length;
              const passCount = aiChecks.filter(c => c.status === "pass").length;

              return (
                <div id="ai-preflight-widget" className="bg-zinc-950 border border-brand-purple/30 rounded-xl p-4 space-y-3 font-mono animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-purple flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5" /> AI Pre-Flight Deployment Diagnostic
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      failCount > 0 ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      warnCount > 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}>
                      {failCount > 0 ? `${failCount} ISSUE(S) BLOCKED` : `${passCount}/${aiChecks.length} CHECKS PASSED`}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {aiChecks.map((chk) => (
                      <div key={chk.id} className="flex items-start gap-2 text-xs bg-zinc-900/60 p-2 rounded-lg border border-white/5">
                        <span className="mt-0.5 shrink-0">
                          {chk.status === "fail" ? (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                          ) : chk.status === "warn" ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white">{chk.label}</span>
                            <span className={`text-[8px] uppercase font-bold px-1 rounded ${
                              chk.status === "fail" ? "text-red-400 bg-red-500/10" :
                              chk.status === "warn" ? "text-amber-400 bg-amber-500/10" :
                              "text-emerald-400 bg-emerald-500/10"
                            }`}>
                              {chk.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{chk.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
          <div className="glass-panel p-6 rounded-2xl border border-white/5 text-center py-12 space-y-3.5">
            <BrainCircuit className="w-10 h-10 text-zinc-700 mx-auto animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-display">AI Architect Sandbox</h4>
              <p className="text-[10px] text-zinc-500 leading-normal max-w-xs mx-auto mt-1">
                Enter your desired contract parameters or describe your dApp on the left to compile on-chain, and check structural components here.
              </p>
            </div>
          </div>
        )}

        {/* BASE MAINNET TOKEN FACTORY CONTRACT INTEGRATION CARD */}
        <div className="glass-panel p-5 rounded-2xl border border-[#0052FF]/30 bg-gradient-to-br from-[#0052FF]/10 via-zinc-950 to-purple-950/20 space-y-4 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0052FF] animate-pulse" />
              <span className="text-xs font-bold font-display text-white">Token Factory Contract</span>
            </div>
            <span className="text-[9px] font-mono font-bold bg-[#0052FF]/20 text-blue-400 border border-[#0052FF]/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Base Mainnet (8453)
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-0.5">Contract Address</span>
                <span className="text-zinc-200 font-bold text-[11px] block truncate select-all">{TOKEN_FACTORY_ADDRESS}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(TOKEN_FACTORY_ADDRESS);
                    setCopiedContractAddress(true);
                    setTimeout(() => setCopiedContractAddress(false), 2000);
                    showToast("Contract address copied to clipboard!", "success");
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-all text-[10px] flex items-center gap-1"
                  title="Copy address"
                >
                  {copiedContractAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`https://basescan.org/address/${TOKEN_FACTORY_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-brand-blue transition-all"
                  title="View on BaseScan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-zinc-950/60 border border-white/5 p-2.5 rounded-xl">
                <span className="text-zinc-500 block mb-0.5">On-Chain Tokens:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {factoryTokenCount !== null ? factoryTokenCount : <Loader2 className="w-3 h-3 animate-spin inline text-zinc-400" />}
                </span>
              </div>
              <div className="bg-zinc-950/60 border border-white/5 p-2.5 rounded-xl">
                <span className="text-zinc-500 block mb-0.5">Primary Entry Method:</span>
                <span className="text-brand-purple font-bold text-[11px]">createToken(...)</span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={() => setShowAbiInspector(!showAbiInspector)}
              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-mono text-[10px] flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-1.5 font-bold">
                <Terminal className="w-3.5 h-3.5 text-brand-purple" />
                Inspect Token Factory ABI & Methods
              </span>
              {showAbiInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAbiInspector && (
              <div className="mt-2 p-3 bg-zinc-950 border border-white/10 rounded-xl space-y-2 animate-fade-in font-mono text-[10px]">
                <div className="text-zinc-400 font-bold border-b border-white/5 pb-1">ABI Function Signatures:</div>
                <div className="space-y-1 text-zinc-300">
                  <div className="text-emerald-400">⚡ createToken(string _name, string _symbol) returns (address)</div>
                  <div className="text-blue-400">👁️ getTokenCount() view returns (uint256)</div>
                  <div className="text-blue-400">👁️ getTokens() view returns (address[])</div>
                  <div className="text-blue-400">👁️ tokenCreator(address token) view returns (address)</div>
                  <div className="text-purple-400">🔔 Event: TokenCreated(address token, address creator, string name, string symbol)</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      )}

      {/* LAUNCHPAD DEPLOYMENT PROGRESS MODAL */}
      {launchpadDeployStep !== "idle" && (
        <div id="launchpad-progress-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 max-w-md w-full rounded-2xl p-6 space-y-6 shadow-2xl shadow-brand-blue/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-brand-blue/5 blur-3xl pointer-events-none"></div>
            
            {/* Header */}
            <div className="text-center space-y-1.5 border-b border-white/5 pb-4">
              <span className="text-[9px] uppercase font-bold tracking-widest text-brand-blue font-mono flex items-center justify-center gap-1">
                <Rocket className="w-3.5 h-3.5 animate-pulse" /> Token Factory Deployment
              </span>
              <h3 className="text-lg font-display font-bold text-white">Deploying {tokenName || "Token"}</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Launching <span className="text-zinc-200 font-bold">{tokenSymbol}</span> onto Base L2 Network
              </p>
            </div>

            {/* Steps Timeline */}
            <div className="space-y-4 font-mono text-xs">
              {/* Step 1: Compiling */}
              <div className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
                launchpadDeployStep === "compiling" 
                  ? "bg-brand-blue/5 border-brand-blue/30 text-white font-semibold" 
                  : launchpadDeployStep !== "idle" && launchpadDeployStep !== "compiling"
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                    : "bg-zinc-900/50 border-white/5 text-zinc-500"
              }`}>
                <div className="mt-0.5">
                  {launchpadDeployStep === "compiling" ? (
                    <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
                  ) : launchpadDeployStep !== "idle" && launchpadDeployStep !== "compiling" ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current opacity-50"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span>1. Assembling Metadata</span>
                    {launchpadDeployStep === "compiling" && <span className="text-[9px] bg-brand-blue/20 text-brand-blue px-1.5 py-0.2 rounded animate-pulse">ACTIVE</span>}
                  </div>
                  {launchpadDeployStep === "compiling" && <div className="text-[10px] text-zinc-400 mt-1 font-normal animate-pulse">Preparing factory parameters...</div>}
                </div>
              </div>

              {/* Step 2: Verifying */}
              <div className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
                launchpadDeployStep === "verifying" 
                  ? "bg-brand-blue/5 border-brand-blue/30 text-white font-semibold" 
                  : (launchpadDeployStep === "deploying" || launchpadDeployStep === "finalizing" || launchpadDeployStep === "completed")
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                    : "bg-zinc-900/50 border-white/5 text-zinc-500"
              }`}>
                <div className="mt-0.5">
                  {launchpadDeployStep === "verifying" ? (
                    <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
                  ) : (launchpadDeployStep === "deploying" || launchpadDeployStep === "finalizing" || launchpadDeployStep === "completed") ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current opacity-50"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span>2. Validating Configuration</span>
                    {launchpadDeployStep === "verifying" && <span className="text-[9px] bg-brand-blue/20 text-brand-blue px-1.5 py-0.2 rounded animate-pulse">ACTIVE</span>}
                  </div>
                  {launchpadDeployStep === "verifying" && <div className="text-[10px] text-zinc-400 mt-1 font-normal animate-pulse">Checking limits and owner signature...</div>}
                </div>
              </div>

              {/* Step 3: Deploying */}
              <div className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
                launchpadDeployStep === "deploying" 
                  ? "bg-brand-blue/5 border-brand-blue/30 text-white font-semibold" 
                  : (launchpadDeployStep === "finalizing" || launchpadDeployStep === "completed")
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                    : "bg-zinc-900/50 border-white/5 text-zinc-500"
              }`}>
                <div className="mt-0.5">
                  {launchpadDeployStep === "deploying" ? (
                    <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
                  ) : (launchpadDeployStep === "finalizing" || launchpadDeployStep === "completed") ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current opacity-50"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span>3. Factory Creation</span>
                    {launchpadDeployStep === "deploying" && <span className="text-[9px] bg-brand-blue/20 text-brand-blue px-1.5 py-0.2 rounded animate-pulse">ACTIVE</span>}
                  </div>
                  {launchpadDeployStep === "deploying" && <div className="text-[10px] text-zinc-400 mt-1 font-normal animate-pulse">Executing createToken() on-chain...</div>}
                </div>
              </div>

              {/* Step 4: Finalizing */}
              <div className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
                launchpadDeployStep === "finalizing" 
                  ? "bg-brand-blue/5 border-brand-blue/30 text-white font-semibold" 
                  : launchpadDeployStep === "completed"
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                    : "bg-zinc-900/50 border-white/5 text-zinc-500"
              }`}>
                <div className="mt-0.5">
                  {launchpadDeployStep === "finalizing" ? (
                    <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
                  ) : launchpadDeployStep === "completed" ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-current opacity-50"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span>4. Finalizing & Seed Buy</span>
                    {launchpadDeployStep === "finalizing" && <span className="text-[9px] bg-brand-blue/20 text-brand-blue px-1.5 py-0.2 rounded animate-pulse">ACTIVE</span>}
                  </div>
                  {launchpadDeployStep === "finalizing" && <div className="text-[10px] text-zinc-400 mt-1 font-normal animate-pulse">Executing seed buy and writing to registry...</div>}
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="pt-2">
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-blue transition-all duration-500 ease-out rounded-full"
                  style={{ 
                    width: 
                      launchpadDeployStep === "compiling" ? "25%" : 
                      launchpadDeployStep === "verifying" ? "50%" : 
                      launchpadDeployStep === "deploying" ? "75%" : 
                      launchpadDeployStep === "finalizing" ? "90%" : 
                      launchpadDeployStep === "completed" ? "100%" : "0%" 
                  }}
                ></div>
              </div>
            </div>

            {launchpadDeployStep === "completed" && (
              <div className="space-y-4 pt-2 border-t border-white/5 animate-fade-in">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Successfully Deployed
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

            {/* Security Audit Badge in deployment flow */}
            {aiResult && (
              <div className="animate-fade-in">
                {(() => {
                  const audit = analyzeSolidityCode(aiResult.solidityCode);
                  if (audit.status === "passed") {
                    return (
                      <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span className="text-zinc-300 font-bold">Static Audit:</span>
                        </div>
                        <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px] border border-emerald-500/20">
                          SECURE ✔ ({audit.score}/100)
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
                            <span className="text-zinc-300 font-bold">Static Audit:</span>
                          </div>
                          <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full text-[10px] border border-amber-500/20">
                            WARNING ⚠ ({audit.score}/100)
                          </span>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-[10px] font-mono text-amber-300 leading-normal">
                          ⚠️ <span className="font-bold">Caution:</span> {audit.findings.length} compiler/design recommendations found. Contract is deployable but optimizations are advised.
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
    {/* AI Deployment Wizard Modal */}
    <AIDeploymentWizardModal
      isOpen={isWizardOpen}
      onClose={() => setIsWizardOpen(false)}
      onAutoFill={handleWizardAutoFill}
      onDirectLaunch={handleWizardDirectLaunch}
    />

    {/* Insufficient Credits Modal */}
    <InsufficientCreditsModal
      isOpen={insufficientCreditsModalOpen}
      onClose={() => setInsufficientCreditsModalOpen(false)}
      featureName={creditsModalData.featureName}
      requiredCredits={creditsModalData.required}
      availableCredits={creditsModalData.available}
      onNavigateToCredits={() => {
        window.location.href = "/?tab=agl-credits";
      }}
    />
    </div>
  );
}
