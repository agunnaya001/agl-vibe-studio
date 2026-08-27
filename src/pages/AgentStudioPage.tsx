import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AIAgent, WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import ImageWithFallback from "../components/ImageWithFallback";
import { 
  chatWithAgentAdvancedAI, 
  optimizeSystemPromptAI, 
  transcribeAudioAI, 
  generateImageAI, 
  generateVideoStartAI, 
  pollVideoStatusAI 
} from "../lib/gemini";
import { validateAndConsumeCredits, CREDIT_COSTS } from "../lib/credits";
import InsufficientCreditsModal from "../components/InsufficientCreditsModal";
import { AgentInteractionHistory } from "../components/AgentInteractionHistory";
import { AgentServiceRegistry } from "../components/AgentServiceRegistry";
import AgentWorkflowStudio from "../components/agent/AgentWorkflowStudio";
import AgentActivityPanel from "../components/AgentActivityPanel";
import AgentFleetStudio from "../components/agent/AgentFleetStudio";
import { 
  Bot, Send, BrainCircuit, X, MessageSquare, Plus, Zap, Award, Coins, 
  Sparkles, Cpu, Layers, ShieldCheck, Mic, MicOff, Image as ImageIcon, 
  MapPin, Eye, Film, Download, RefreshCw, Sliders, Play, Trash2, Loader2, Info,
  Flame, TrendingUp, Check, Copy, ArrowRight, Lock, Code, Terminal, Globe,
  Activity
} from "lucide-react";

interface AgentStudioPageProps {
  wallet: WalletState;
  agents: AIAgent[];
  onRefreshAgents: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
  groundingMetadata?: any;
}

export default function AgentStudioPage({ wallet, agents, onRefreshAgents, addTerminalLog, showToast }: AgentStudioPageProps) {
  // Tabs: "orchestrator" (Agentic Web3 Studio), "fleets" (Background Fleets & Labs), "activity" (Task Manager & Activity), "agents" (Agent Forge & chats), "history", "creative", "services"
  const [activeTab, setActiveTab] = useState<"orchestrator" | "fleets" | "activity" | "agents" | "history" | "creative" | "services">("orchestrator");

  // Forge Sub-Tab: "configure" or "preview"
  const [forgeMode, setForgeMode] = useState<"configure" | "preview">("configure");

  // Agent Creator State
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tone, setTone] = useState<"professional" | "witty" | "concise" | "friendly" | "analytical">("professional");
  const [responseLength, setResponseLength] = useState<"short" | "medium" | "long">("medium");
  const [behaviors, setBehaviors] = useState<string[]>([]);
  const [subFee, setSubFee] = useState("0.001");
  const [loading, setLoading] = useState(false);
  const [deployPaymentMethod, setDeployPaymentMethod] = useState<"agl_credits" | "eth">("agl_credits");

  // Interactive Prompt Preview Sandbox State
  const [previewInput, setPreviewInput] = useState("");
  const [previewMessages, setPreviewMessages] = useState<ChatMessage[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMetrics, setPreviewMetrics] = useState<{ tokensProcessed: number; latencyMs: number } | null>(null);

  // AGL Credits Top-Up & Liquidity Generator Modal
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);
  const [topUpAglAmount, setTopUpAglAmount] = useState("10"); // 10 AGL = 1,000 Credits
  const [isBuyingCredits, setIsBuyingCredits] = useState(false);

  // Insufficient Credits Modal State
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false);
  const [creditsModalData, setCreditsModalData] = useState({ featureName: "", required: 0, available: 0 });

  // Active chat state
  const [activeChatAgent, setActiveChatAgent] = useState<AIAgent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [optimizingPrompt, setOptimizingPrompt] = useState(false);

  // Advanced Chat Settings State
  const [selectedModel, setSelectedModel] = useState("gemini-3.6-flash");
  const [highThinking, setHighThinking] = useState(false);
  const [enableMapsGrounding, setEnableMapsGrounding] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string } | null>(null);
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Creative Studio State (Image)
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageAspectRatio, setImageAspectRatio] = useState("1:1");
  const [imageSize, setImageSize] = useState("1K");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");

  // Creative Studio State (Video)
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoResolution, setVideoResolution] = useState("720p");
  const [videoStartImage, setVideoStartImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");

  // Reassuring messages for long-running video tasks
  const videoLoadingMessages = [
    "Assembling temporal dimensions...",
    "Casting holographic projection...",
    "Synthesizing motion vectors...",
    "Compiling fluid simulation...",
    "Resolving cinematic lighting arrays..."
  ];

  // Optimize System directive prompt
  const handleOptimizePrompt = async () => {
    if (!systemPrompt.trim() || optimizingPrompt) return;

    const creditResult = validateAndConsumeCredits({
      wallet,
      onRefreshWallet: onRefreshAgents,
      requiredCredits: CREDIT_COSTS.AI_ADVISOR_CHAT,
      featureName: "AI Prompt Optimization",
      showToast,
      addTerminalLog,
      onRequestCreditsModal: (featureName, required, available) => {
        setCreditsModalData({ featureName, required, available });
        setInsufficientCreditsModalOpen(true);
      }
    });

    if (!creditResult.success) {
      setOptimizingPrompt(false);
      return;
    }

    setOptimizingPrompt(true);
    addTerminalLog("system", "AI Agent Optimizer: Initializing cognitive tuning pipeline via Gemini...");
    try {
      const optimized = await optimizeSystemPromptAI(systemPrompt);
      setSystemPrompt(optimized);
      showToast("System directive optimized!", "success");
      addTerminalLog("success", "AI Agent Optimizer: Compiled detailed autonomous directive schema successfully.");
    } catch (err: any) {
      console.error(err);
      creditResult.refund();
      showToast("Optimization failed: " + (err.message || "Network issue"), "error");
      addTerminalLog("error", "AI Agent Optimizer: Fine-tuning pipeline rejected. Verify API configurations.");
    } finally {
      setOptimizingPrompt(false);
    }
  };

  // Run Prompt Preview Sandbox query
  const handleRunPreviewPrompt = async (e?: React.FormEvent, customPromptText?: string) => {
    if (e) e.preventDefault();
    const queryText = customPromptText || previewInput.trim();
    if (!queryText || previewLoading) return;

    const creditResult = validateAndConsumeCredits({
      wallet,
      onRefreshWallet: onRefreshAgents,
      requiredCredits: CREDIT_COSTS.AI_ADVISOR_CHAT,
      featureName: "Agent Sandbox Preview",
      showToast,
      addTerminalLog,
      onRequestCreditsModal: (featureName, required, available) => {
        setCreditsModalData({ featureName, required, available });
        setInsufficientCreditsModalOpen(true);
      }
    });

    if (!creditResult.success) {
      setPreviewLoading(false);
      return;
    }

    const currentSystemPrompt = systemPrompt.trim() || "You are an autonomous AI Agent assistant deployed on Base Mainnet. Respond professionally.";
    const agentName = name.trim() || "Draft AI Agent";
    const agentSymbol = symbol.trim().toUpperCase() || "DRAFT";

    const userMsg: ChatMessage = { role: "user", content: queryText };
    setPreviewMessages(prev => [...prev, userMsg]);
    if (!customPromptText) setPreviewInput("");
    setPreviewLoading(true);

    const startTime = Date.now();
    try {
      const mockAgent: AIAgent = {
        id: "preview_agent",
        name: agentName,
        symbol: agentSymbol,
        description: description || "Draft Agent Sandbox Preview",
        contractAddress: "0xPreviewAgentAddress",
        creator: wallet.address || "0xDemoUser",
        tokenPrice: 0.005,
        usageFeeEth: parseFloat(subFee) || 0.001,
        lifetimeRevenueEth: 0,
        queryCount: 0,
        systemPrompt: currentSystemPrompt,
        tone,
        responseLength,
        personalityBehaviors: behaviors,
        avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=60",
        aglRewardDiscounts: true,
        chatHistory: [],
        createdAt: Date.now()
      };

      const apiMessages = previewMessages.map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: queryText });

      const result = await chatWithAgentAdvancedAI(
        apiMessages,
        mockAgent,
        {
          model: selectedModel,
          thinkingLevel: highThinking ? "HIGH" : "LOW",
          enableMapsGrounding,
          location,
          tone,
          responseLength,
          personalityBehaviors: behaviors
        }
      );

      const endTime = Date.now();
      const latency = endTime - startTime;
      const estTokens = Math.round((currentSystemPrompt.length + queryText.length + result.content.length) / 3.8);

      setPreviewMetrics({
        tokensProcessed: estTokens,
        latencyMs: latency
      });

      setPreviewMessages(prev => [...prev, {
        role: "assistant",
        content: result.content,
        groundingMetadata: result.groundingMetadata
      }]);

      addTerminalLog("info", `AGENT PREVIEW: Evaluated directives for [${agentName}] (${estTokens} tokens, ${latency}ms latency).`);
    } catch (err: any) {
      if (creditResult && creditResult.success) creditResult.refund();
      setPreviewMessages(prev => [...prev, {
        role: "assistant",
        content: `Preview Sandbox Error: ${err.message || "Failed to execute prompt directives."}`
      }]);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Export Agent Spec JSON
  const handleExportAgentSpec = () => {
    const spec = {
      name: name || "Draft AI Agent",
      symbol: (symbol || "DRAFT").toUpperCase(),
      description: description || "Autonomous Agent Profile",
      usageFeeEth: parseFloat(subFee) || 0.001,
      systemPrompt: systemPrompt || "Default instructions",
      selectedModel,
      backedByAglLiquidity: deployPaymentMethod === "agl_credits",
      createdAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(spec, null, 2);
    navigator.clipboard.writeText(jsonStr);
    showToast("Agent Spec JSON copied to clipboard!", "success");
    addTerminalLog("info", "STUDIO: Exported Agent Specification JSON configuration.");
  };

  // Top Up AGL Credits & Inject Liquidity into $AGL Token Pool
  const handleBuyCreditsAndInjectLiquidity = () => {
    const aglVal = parseFloat(topUpAglAmount);
    if (isNaN(aglVal) || aglVal <= 0) {
      showToast("Enter a valid AGL amount.", "error");
      return;
    }

    setIsBuyingCredits(true);
    addTerminalLog("info", `AGLCredits PROTOCOL: Initiating burn of ${aglVal} AGL to issue credits & generate token liquidity...`);

    setTimeout(() => {
      const creditsIssued = Math.round(aglVal * 100); // 1 AGL = 100 Credits
      const ethLiquidityInjected = parseFloat((aglVal * 0.00005).toFixed(5));

      // Update Wallet
      const currentCredits = wallet.aglCredits || 0;
      const currentAgl = wallet.aglTokenBalance || 0;
      const updatedWallet: WalletState = {
        ...wallet,
        aglCredits: currentCredits + creditsIssued,
        aglTokenBalance: Math.max(0, currentAgl - aglVal)
      };
      AgunnayaDatabase.saveWallet(updatedWallet);

      // Boost $AGL Token Reserve Pool in AgunnayaDatabase
      const allTokens = AgunnayaDatabase.getTokens();
      const aglTokenIndex = allTokens.findIndex(t => t.symbol === "AGL" || t.address.toLowerCase() === "0xea1221b4d80a89bd8c75248fae7c176bd1854698");
      if (aglTokenIndex !== -1) {
        allTokens[aglTokenIndex].reserveEth = (allTokens[aglTokenIndex].reserveEth || 0) + ethLiquidityInjected;
        allTokens[aglTokenIndex].volume24h = (allTokens[aglTokenIndex].volume24h || 0) + (ethLiquidityInjected * 2);
        AgunnayaDatabase.saveTokens(allTokens);
      }

      AgunnayaDatabase.addActivity({
        type: "buy",
        tokenSymbol: "AGL",
        tokenAddress: "0xea1221b4d80a89bd8c75248fae7c176bd1854698",
        user: wallet.address || "0xUser",
        amount: aglVal,
        ethValue: ethLiquidityInjected,
        details: `Burned ${aglVal} AGL via AGLCredits contract: Issued ${creditsIssued.toLocaleString()} Credits & injected +${ethLiquidityInjected} ETH into AGL Pool`
      });

      addTerminalLog("success", `AGLCredits PROTOCOL: Successfully issued ${creditsIssued.toLocaleString()} Credits and added +${ethLiquidityInjected} ETH to AGL Token Liquidity Pool!`);
      showToast(`Purchased ${creditsIssued.toLocaleString()} Credits! Injected +${ethLiquidityInjected} ETH Liquidity into $AGL Pool.`, "success");
      
      setIsBuyingCredits(false);
      setIsLiquidityModalOpen(false);
    }, 1200);
  };

  // Deploy AI Agent with AGL Credits Liquidity Boost or ETH
  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    if (!name || !symbol || !description || !systemPrompt) return;

    const currentCredits = wallet.aglCredits || 0;
    const isAglDeploy = deployPaymentMethod === "agl_credits";

    if (isAglDeploy) {
      if (currentCredits < 500) {
        if ((wallet.aglTokenBalance || 0) >= 5) {
          showToast("Converting 5 AGL into 500 AGL Credits for deployment...", "info");
        } else {
          showToast("Insufficient AGL Credits (500 required). Please top up or select ETH.", "error");
          setIsLiquidityModalOpen(true);
          return;
        }
      }
    } else {
      if (wallet.balanceEth < 0.005) {
        showToast("Insufficient ETH balance for deployment fee (0.005 ETH required).", "error");
        return;
      }
    }

    setLoading(true);
    addTerminalLog("info", `Launching autonomous AI Agent and registering standard token model ${symbol}...`);

    setTimeout(() => {
      const generatedId = "agent_" + Math.random().toString(36).substr(2, 5);
      const generatedAddress = "0x" + Math.random().toString(16).substr(2, 40);
      const mockAvatar = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=60";

      const newAgent: AIAgent = {
        id: generatedId,
        name,
        symbol: symbol.toUpperCase(),
        description,
        creator: wallet.address,
        contractAddress: generatedAddress,
        queryCount: 0,
        tokenPrice: 0.01,
        usageFeeEth: parseFloat(subFee) || 0.001,
        lifetimeRevenueEth: 0,
        avatarUrl: mockAvatar,
        systemPrompt: systemPrompt,
        tone,
        responseLength,
        personalityBehaviors: behaviors,
        aglRewardDiscounts: true,
        backedByAglLiquidity: isAglDeploy,
        aglLiquidityBoosted: isAglDeploy ? 500 : 0,
        chatHistory: [
          { role: "assistant", content: `Sentinel security subroutines loaded for ${name}. Ready to assist.` }
        ],
        createdAt: Date.now()
      };

      const current = AgunnayaDatabase.getAgents();
      current.push(newAgent);
      AgunnayaDatabase.saveAgents(current);

      // Deduct Credits / ETH & Inject Liquidity into AGL Pool
      let updatedWallet: WalletState;
      if (isAglDeploy) {
        const remainingCredits = Math.max(0, currentCredits - 500);
        let newAglBal = wallet.aglTokenBalance || 0;
        if (currentCredits < 500) {
          newAglBal = Math.max(0, newAglBal - 5);
        }
        updatedWallet = {
          ...wallet,
          aglCredits: remainingCredits,
          aglTokenBalance: newAglBal
        };

        // Boost $AGL Liquidity Pool in AgunnayaDatabase
        const allTokens = AgunnayaDatabase.getTokens();
        const aglTokenIndex = allTokens.findIndex(t => t.symbol === "AGL" || t.address.toLowerCase() === "0xea1221b4d80a89bd8c75248fae7c176bd1854698");
        if (aglTokenIndex !== -1) {
          allTokens[aglTokenIndex].reserveEth = (allTokens[aglTokenIndex].reserveEth || 0) + 0.025;
          allTokens[aglTokenIndex].volume24h = (allTokens[aglTokenIndex].volume24h || 0) + 0.05;
          AgunnayaDatabase.saveTokens(allTokens);
        }

        addTerminalLog("success", "AGLCredits PROTOCOL: 500 Credits burned! +0.025 ETH liquidity injected into $AGL Token Pool on Base Mainnet.");
        showToast("AI Agent deployed! 500 AGL Credits burned & +0.025 ETH Liquidity injected into $AGL!", "success");
      } else {
        updatedWallet = { ...wallet, balanceEth: Math.max(0, wallet.balanceEth - 0.005) };
        showToast("AI Agent deployed with 0.005 ETH fee!", "success");
      }

      AgunnayaDatabase.saveWallet(updatedWallet);
      onRefreshAgents();

      AgunnayaDatabase.addActivity({
        type: "create",
        tokenSymbol: newAgent.symbol,
        tokenAddress: newAgent.contractAddress,
        user: wallet.address,
        amount: 0,
        ethValue: isAglDeploy ? 0.025 : 0.005,
        details: `Launched AI agent worker: ${newAgent.name} (${newAgent.symbol}) ${isAglDeploy ? "[Backed by AGL Liquidity]" : ""}`
      });

      addTerminalLog("success", `AI Agent fully registered. Metadata synced with token model: ${newAgent.contractAddress}`);
      setLoading(false);
      setName("");
      setSymbol("");
      setDescription("");
      setSystemPrompt("");
      setTone("professional");
      setResponseLength("medium");
      setBehaviors([]);
      setForgeMode("configure");
    }, 2000);
  };

  // Start chat with a specific agent
  const handleStartChat = (agent: AIAgent) => {
    setActiveChatAgent(agent);
    setChatMessages([
      { role: "assistant", content: `I am ${agent.name} (${agent.symbol}). My active directives: "${agent.description}". How may I assist you today?` }
    ]);
    setAttachedImage(null);
  };

  // Live preview agent directives in sandbox mode
  const handlePreviewAgentDirectives = (agent: AIAgent) => {
    setName(agent.name);
    setSymbol(agent.symbol);
    setDescription(agent.description);
    setSystemPrompt(agent.systemPrompt || agent.description);
    setTone(agent.tone || "professional");
    setResponseLength(agent.responseLength || "medium");
    setBehaviors(agent.personalityBehaviors || []);
    setSubFee(String(agent.usageFeeEth || 0.001));
    setForgeMode("preview");
    setActiveTab("agents");
    showToast(`Loaded live prompt preview sandbox for ${agent.name}`, "info");
    addTerminalLog("info", `AGENT PREVIEW: Loaded agent [${agent.name}] directives into interactive preview sandbox.`);
  };

  // Send message in advanced chat
  const handleSendChatMessage = async (e?: React.FormEvent, overridePrompt?: string, overrideAgent?: AIAgent) => {
    if (e) e.preventDefault();
    
    const agent = overrideAgent || activeChatAgent;
    if (!agent) return;

    const userText = overridePrompt !== undefined ? overridePrompt.trim() : chatInput.trim();
    if (!userText && !attachedImage || chatLoading) return;

    const creditResult = validateAndConsumeCredits({
      wallet,
      onRefreshWallet: onRefreshAgents,
      requiredCredits: CREDIT_COSTS.AGENT_HARNESS_CHAT,
      featureName: `Agent Query (${agent.name})`,
      showToast,
      addTerminalLog,
      onRequestCreditsModal: (featureName, required, available) => {
        setCreditsModalData({ featureName, required, available });
        setInsufficientCreditsModalOpen(true);
      }
    });

    if (!creditResult.success) {
      if (wallet.isConnected && wallet.balanceEth >= agent.usageFeeEth) {
        // Fallback to ETH payment if available
        const updatedWallet: WalletState = { 
          ...wallet, 
          balanceEth: Math.max(0, wallet.balanceEth - agent.usageFeeEth) 
        };
        AgunnayaDatabase.saveWallet(updatedWallet);
        onRefreshAgents();
        showToast(`Paid subscription fee: ${agent.usageFeeEth} ETH`, "info");
        addTerminalLog("system", `AGENT HARNESS: Debited ${agent.usageFeeEth} ETH fee for ${agent.name}.`);
      } else {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: `⚠️ AGENT KERNEL BLOCKED: Insufficient computational credits! 10 AGL Credits or ${agent.usageFeeEth} ETH required to query ${agent.name}.\n\nPlease top up credits on the AGL Credits page.`
        }]);
        return;
      }
    }

    const currentAttachedImage = attachedImage;
    
    if (overridePrompt === undefined) {
      setChatInput("");
      setAttachedImage(null);
    }
    
    const userMsg: ChatMessage = { 
      role: "user", 
      content: userText || "Analyze attached image", 
      image: currentAttachedImage ? `data:${currentAttachedImage.mimeType};base64,${currentAttachedImage.data}` : undefined 
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const apiMessages = overrideAgent ? (overrideAgent.chatHistory || []).map(m => ({ role: m.role, content: m.content })) : chatMessages.map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: userText });

      const result = await chatWithAgentAdvancedAI(
        apiMessages,
        agent,
        {
          model: selectedModel,
          thinkingLevel: highThinking ? "HIGH" : "LOW",
          image: currentAttachedImage,
          enableMapsGrounding,
          location,
          tone: agent.tone,
          responseLength: agent.responseLength,
          personalityBehaviors: agent.personalityBehaviors
        }
      );

      const response = result.content;
      const words = response.split(" ");
      let currentText = "";
      let wordIdx = 0;
      
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: "", 
        groundingMetadata: result.groundingMetadata 
      }]);

      const interval = setInterval(() => {
        if (wordIdx < words.length) {
          currentText += (wordIdx === 0 ? "" : " ") + words[wordIdx];
          setChatMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { 
              ...updated[updated.length - 1], 
              content: currentText 
            };
            return updated;
          });
          wordIdx++;
        } else {
          clearInterval(interval);
          setChatLoading(false);

          // Save completed chat session back to agent record
          if (activeChatAgent) {
            setChatMessages(finalMsgs => {
              const updatedAgent: AIAgent = {
                ...activeChatAgent,
                queryCount: (activeChatAgent.queryCount || 0) + 1,
                chatHistory: finalMsgs.map(m => ({
                  role: m.role,
                  content: m.content,
                  image: m.image,
                  groundingMetadata: m.groundingMetadata
                }))
              };
              AgunnayaDatabase.saveAgent(updatedAgent);
              onRefreshAgents();
              return finalMsgs;
            });
          }
        }
      }, 15);

    } catch (err: any) {
      if (creditResult && creditResult.success) creditResult.refund();
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: `Error connecting to AI kernel: ${err.message || "Endpoint timeout."}. Credits refunded if applicable.`
      }]);
      setChatLoading(false);
    }
  };

  // Clear interaction history for a specific agent
  const handleClearAgentHistory = (agentId: string) => {
    const target = agents.find(a => a.id === agentId);
    if (target) {
      const updatedAgent: AIAgent = {
        ...target,
        chatHistory: [
          { role: "assistant", content: `${target.name} subroutines re-initialized. Interaction log cleared.` }
        ]
      };
      AgunnayaDatabase.saveAgent(updatedAgent);
      onRefreshAgents();
      if (activeChatAgent?.id === agentId) {
        setActiveChatAgent(updatedAgent);
        setChatMessages(updatedAgent.chatHistory);
      }
    }
  };

  // Re-run or load previous prompt into active agent chat
  const handleLoadPromptToChat = (agent: AIAgent, promptText: string, model?: string) => {
    setActiveTab("agents");
    setActiveChatAgent(agent);
    if (model) setSelectedModel(model);
    setChatMessages(agent.chatHistory || []);
    setChatInput(promptText);
  };

  const handleReRunPrompt = async (agent: AIAgent, promptText: string, model?: string) => {
    setActiveTab("agents");
    setActiveChatAgent(agent);
    if (model) setSelectedModel(model);
    setChatMessages(agent.chatHistory || []);
    
    // Call send message immediately with the agent and prompt
    handleSendChatMessage(undefined, promptText, agent);
  };

  // Audio transcription voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Bytes = base64data.split(',')[1];
          try {
            showToast("Transcribing voice recording...", "info");
            const text = await transcribeAudioAI(base64Bytes, "audio/wav");
            setChatInput(prev => prev ? prev + " " + text : text);
            showToast("Voice transcribed successfully!", "success");
          } catch (err: any) {
            showToast("Transcription failed: " + err.message, "error");
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      showToast("Recording audio... speak into your mic", "info");
    } catch (err: any) {
      showToast("Could not access microphone: " + err.message, "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Attach image to chat prompt
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      setAttachedImage({
        data: base64Data,
        mimeType: file.type
      });
      showToast("Image attached! Submit to analyze.", "success");
    };
    reader.readAsDataURL(file);
  };

  // Google Maps Location Grounding
  const handleToggleMaps = () => {
    if (!enableMapsGrounding) {
      if (navigator.geolocation) {
        showToast("Requesting GPS coordinate grounding...", "info");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            setEnableMapsGrounding(true);
            showToast("Google Maps Grounding activated!", "success");
          },
          (err) => {
            showToast("GPS location denied. General grounding active.", "info");
            setEnableMapsGrounding(true);
          }
        );
      } else {
        setEnableMapsGrounding(true);
      }
    } else {
      setEnableMapsGrounding(false);
      setLocation(null);
    }
  };

  // Creative Studio: Generate high-quality image
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;

    const creditResult = validateAndConsumeCredits({
      wallet,
      onRefreshWallet: onRefreshAgents,
      requiredCredits: CREDIT_COSTS.IMAGE_GENERATION,
      featureName: "AI Image Generation",
      showToast,
      addTerminalLog,
      onRequestCreditsModal: (featureName, required, available) => {
        setCreditsModalData({ featureName, required, available });
        setInsufficientCreditsModalOpen(true);
      }
    });

    if (!creditResult.success) {
      setIsGeneratingImage(false);
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImageUrl("");
    showToast("Dispatching text-to-image pipeline...", "info");
    try {
      const url = await generateImageAI(imagePrompt, imageAspectRatio, imageSize);
      setGeneratedImageUrl(url);
      showToast("High-quality asset generated!", "success");
    } catch (err: any) {
      creditResult.refund();
      showToast("Image generation failed: " + err.message, "error");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Creative Studio: Attach image for video start frame
  const handleVideoImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      setVideoStartImage({
        data: base64Data,
        mimeType: file.type
      });
      showToast("Starting frame image attached!", "success");
    };
    reader.readAsDataURL(file);
  };

  // Creative Studio: Generate Veo Video
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() || isVideoGenerating) return;

    const creditResult = validateAndConsumeCredits({
      wallet,
      onRefreshWallet: onRefreshAgents,
      requiredCredits: CREDIT_COSTS.VIDEO_GENERATION,
      featureName: "Veo 3 Video Synthesis",
      showToast,
      addTerminalLog,
      onRequestCreditsModal: (featureName, required, available) => {
        setCreditsModalData({ featureName, required, available });
        setInsufficientCreditsModalOpen(true);
      }
    });

    if (!creditResult.success) {
      setIsVideoGenerating(false);
      return;
    }

    setIsVideoGenerating(true);
    setGeneratedVideoUrl("");
    setVideoProgress("Initializing Veo 3 rendering framework...");
    showToast("Launching video synthesis thread...", "info");

    let msgIndex = 0;
    const progressInterval = setInterval(() => {
      setVideoProgress(videoLoadingMessages[msgIndex % videoLoadingMessages.length]);
      msgIndex++;
    }, 4500);

    try {
      const opName = await generateVideoStartAI(
        videoPrompt, 
        videoAspectRatio, 
        videoResolution, 
        videoStartImage?.data
      );
      
      setVideoProgress("Syncing with operation worker node...");

      // Poll loop
      let done = false;
      while (!done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        done = await pollVideoStatusAI(opName);
      }

      setVideoProgress("Downloading high-fidelity MP4 payload...");
      
      const res = await fetch("/api/ai/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName: opName })
      });

      if (!res.ok) throw new Error("Could not pull final video payload.");

      const blob = await res.blob();
      const videoUrl = URL.createObjectURL(blob);
      setGeneratedVideoUrl(videoUrl);
      showToast("Veo Video rendered successfully!", "success");
    } catch (err: any) {
      creditResult.refund();
      showToast("Video synthesis failed: " + err.message, "error");
    } finally {
      clearInterval(progressInterval);
      setIsVideoGenerating(false);
      setVideoProgress("");
    }
  };

  return (
    <div id="agent-workspace-container" className="space-y-6">
      
      {/* Workspace Sub Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/40 p-4 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <BrainCircuit className="text-brand-purple w-6 h-6 animate-pulse" />
            AGI Agent Workspace & Studio
          </h1>
          <p className="text-xs text-zinc-500 font-sans">
            Power autonomous blockchain consciousness, transcribe speech, grounding maps, and render creative high-quality media.
          </p>
        </div>

        {/* Tab Selection buttons */}
        <div className="flex flex-wrap gap-2 bg-zinc-900/60 p-1 rounded-xl border border-white/5">
          <button
            id="tab-orchestrator"
            onClick={() => setActiveTab("orchestrator")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-display transition-all flex items-center gap-1.5 ${
              activeTab === "orchestrator"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Agentic Web3 Studio</span>
          </button>
          <button
            id="tab-fleets"
            onClick={() => setActiveTab("fleets")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-display transition-all flex items-center gap-1.5 ${
              activeTab === "fleets"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Background Fleets & Labs</span>
          </button>
          <button
            id="tab-activity"
            onClick={() => setActiveTab("activity")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-display transition-all flex items-center gap-1.5 ${
              activeTab === "activity"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-300" />
            <span>Agent Activity & Tasks</span>
          </button>
          <button
            id="tab-agents"
            onClick={() => setActiveTab("agents")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${
              activeTab === "agents"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Agent Forge & Chats
          </button>
          <button
            id="tab-history"
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-display transition-all flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-purple-300" />
            <span>Interaction History</span>
          </button>
          <button
            id="tab-creative"
            onClick={() => setActiveTab("creative")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${
              activeTab === "creative"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Creative Media Studio
          </button>
          <button
            id="tab-services"
            onClick={() => setActiveTab("services")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-display transition-all flex items-center gap-1.5 ${
              activeTab === "services"
                ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-300" />
            <span>Service Registry</span>
          </button>
        </div>
      </div>

      {/* AGL Credits & Liquidity Generator Header Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-brand-purple/30 bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-zinc-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-purple/20 border border-brand-purple/40 rounded-xl text-brand-purple shrink-0">
            <Flame className="w-6 h-6 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-display text-white">AGLCredits Liquidity Engine</h3>
              <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase">
                Base Protocol Active
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Deploy agents using AGL Credits to automatically inject liquidity into the $AGL Token bonding pool.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-white/10 flex items-center gap-3 font-mono">
            <div>
              <span className="text-[9px] text-zinc-500 uppercase block font-bold">Credits Balance</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {(wallet.aglCredits || 0).toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[9px] text-zinc-500 uppercase block font-bold">AGL Tokens</span>
              <span className="text-xs font-bold text-purple-300">
                {(wallet.aglTokenBalance || 0).toLocaleString()} AGL
              </span>
            </div>
          </div>

          <button
            id="btn-open-liquidity-modal"
            onClick={() => setIsLiquidityModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-mono text-xs font-bold shadow-lg shadow-brand-purple/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-300" />
            <span>Top Up & Inject Liquidity</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "orchestrator" ? (
          <motion.div
            key="orchestrator-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <AgentWorkflowStudio
              walletAddress={wallet.address || "0x725615639B760DAa64b3e794AA49B5A9a8A7632E"}
              showToast={showToast}
              addTerminalLog={addTerminalLog}
            />
          </motion.div>
        ) : activeTab === "fleets" ? (
          <motion.div
            key="fleets-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <AgentFleetStudio showToast={showToast} />
          </motion.div>
        ) : activeTab === "activity" ? (
          <motion.div
            key="activity-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <AgentActivityPanel
              onSelectTask={(taskId) => {
                setActiveTab("orchestrator");
              }}
              showToast={showToast}
            />
          </motion.div>
        ) : activeTab === "agents" ? (
          <motion.div 
            key="agents-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Create form panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
                
                {/* Forge Top Navigation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-brand-purple" />
                      AI Agent Forge
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Configure autonomous directives or test prompt behavior in real-time before deploying to Base.
                    </p>
                  </div>

                  {/* Forge Mode Toggle Switcher */}
                  <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                      type="button"
                      id="subtab-forge-configure"
                      onClick={() => setForgeMode("configure")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                        forgeMode === "configure"
                          ? "bg-brand-purple text-white shadow-md"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>1. Configure</span>
                    </button>
                    <button
                      type="button"
                      id="subtab-forge-preview"
                      onClick={() => setForgeMode("preview")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                        forgeMode === "preview"
                          ? "bg-brand-purple text-white shadow-md"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>2. Live Preview</span>
                      {systemPrompt.trim() && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>
                  </div>
                </div>

                {forgeMode === "configure" ? (
                  <form onSubmit={handleCreateAgent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Agent Name</label>
                      <input
                        id="agent-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Agunnaya Smart Auditor"
                        required
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Ticker Token</label>
                      <input
                        id="agent-symbol-input"
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        placeholder="e.g. AUDIT"
                        required
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white uppercase focus:outline-none focus:border-brand-purple/40 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Short Description</label>
                      <input
                        id="agent-desc-input"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Reviewing Solidity code safety checklists..."
                        required
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Prompt Fee (ETH)</label>
                      <input
                        id="agent-fee-input"
                        type="number"
                        step="0.0001"
                        value={subFee}
                        onChange={(e) => setSubFee(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">System Directive Prompt (Behavior Control Directives)</label>
                      <button
                        type="button"
                        id="btn-optimize-directive"
                        onClick={handleOptimizePrompt}
                        disabled={optimizingPrompt || !systemPrompt.trim()}
                        className="text-[10px] px-2.5 py-1 rounded bg-brand-purple/10 border border-brand-purple/20 hover:bg-brand-purple hover:border-brand-purple text-brand-purple hover:text-white transition-all duration-200 flex items-center gap-1 font-mono font-bold disabled:opacity-40 disabled:hover:bg-brand-purple/10 disabled:hover:text-brand-purple disabled:hover:border-brand-purple/20 cursor-pointer"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${optimizingPrompt ? "animate-spin" : ""}`} />
                        <span>{optimizingPrompt ? "Optimizing..." : "AI Auto-Optimize"}</span>
                      </button>
                    </div>

                    {/* AI Agent Directive Suggestions */}
                    <div className="space-y-1.5 mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 font-mono">
                          <Sparkles className="w-3 h-3 text-brand-purple" /> Preset AI Agent Suggestions
                        </span>
                        <button
                          type="button"
                          id="add-all-agent-suggestions-btn"
                          onClick={() => {
                            setName("Agunnaya Omniscient Sentinel Core");
                            setSymbol("OMNI");
                            setDescription("Unified autonomous AI Agent providing contract auditing, yield arbitrage, DAO governance, and sentiment analytics.");
                            setSubFee("0.0015");
                            setTone("analytical");
                            setResponseLength("long");
                            setBehaviors(["Self-Correcting", "Objective", "Explanatory", "Strictly Technical"]);
                            const masterDirective = `You are the Agunnaya Omniscient Sentinel Core, an all-in-one autonomous AI Agent operating on Base Mainnet.

CORE DIRECTIVES:
1. SECURITY AUDITING: Scan submitted Solidity smart contracts for reentrancy, integer overflows, unhandled low-level calls, and missing access controls.
2. YIELD OPTIMIZATION: Monitor Base liquidity pools, evaluate APYs, estimate gas overheads, and recommend optimal compounding schedules.
3. DAO GOVERNANCE: Assist in drafting governance proposals, calculating quorum thresholds, and verifying multi-sig treasury allocations.
4. SENTIMENT ANALYTICS: Track on-chain DEX volume surges, wallet accumulation patterns, and token liquidity depth.`;
                            setSystemPrompt(masterDirective);
                            showToast("Added all AI suggestions to agent directives & configuration!", "success");
                          }}
                          className="text-[9px] px-2 py-0.5 rounded-md bg-brand-purple/20 border border-brand-purple/40 hover:bg-brand-purple text-purple-300 hover:text-white transition-all font-mono font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          <span>Add All AI Suggestions</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          {
                            label: "🛡️ Solidity Security Auditor",
                            name: "Agunnaya Security Sentinel",
                            symbol: "AUDIT",
                            desc: "Autonomous smart contract auditor scanning Solidity code for vulnerabilities.",
                            fee: "0.001",
                            prompt: "You are an expert Web3 security auditor. Scan submitted Solidity code for reentrancy, integer overflows, unhandled calls, and access control issues on Base.",
                            tone: "analytical",
                            length: "long",
                            behaviors: ["Skeptical", "Objective", "Strictly Technical"]
                          },
                          {
                            label: "📈 DeFi Yield Arbitrage Bot",
                            name: "Agunnaya Yield Scout",
                            symbol: "YIELD",
                            desc: "Real-time liquidity and APY aggregator scanning Base pools.",
                            fee: "0.0005",
                            prompt: "You are a DeFi yield optimization agent on Base. Analyze pool APYs, gas overheads, and impermanent loss risk to recommend maximum returns.",
                            tone: "professional",
                            length: "medium",
                            behaviors: ["Self-Correcting", "Objective", "Explanatory"]
                          },
                          {
                            label: "🏛️ DAO Governance Strategist",
                            name: "Agunnaya DAO Advisor",
                            symbol: "GOV",
                            desc: "Treasury and proposal strategy generator for decentralized organizations.",
                            fee: "0.0008",
                            prompt: "You are an autonomous DAO strategist. Help users structure governance proposals, calculate quorum thresholds, and audit treasury allocations.",
                            tone: "professional",
                            length: "long",
                            behaviors: ["Encouraging", "Explanatory"]
                          },
                          {
                            label: "📊 Web3 Market Sentiment Sentinel",
                            name: "Agunnaya Sentiment AI",
                            symbol: "SENT",
                            desc: "On-chain DEX liquidity & whale tracking AI agent.",
                            fee: "0.0006",
                            prompt: "You are an autonomous Web3 sentiment analyst. Track DEX trading volumes, wallet accumulation trends, and liquidity depth on Base.",
                            tone: "witty",
                            length: "short",
                            behaviors: ["Skeptical", "Minimalist"]
                          }
                        ].map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            id={`agent-suggestion-chip-${idx}`}
                            onClick={() => {
                              setName(sug.name);
                              setSymbol(sug.symbol);
                              setDescription(sug.desc);
                              setSubFee(sug.fee);
                              setSystemPrompt(sug.prompt);
                              setTone(sug.tone as any);
                              setResponseLength(sug.length as any);
                              setBehaviors(sug.behaviors);
                              showToast(`Loaded AI Agent preset: ${sug.label}`, "info");
                            }}
                            className="text-[10px] px-2 py-1 rounded-lg bg-zinc-950 border border-white/10 hover:border-brand-purple/40 hover:bg-brand-purple/10 text-zinc-400 hover:text-white transition-all font-mono cursor-pointer"
                          >
                            {sug.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      id="agent-directives-input"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={4}
                      placeholder="Declare instructions for Gemini to maintain behavior: e.g. You are a senior Solidity developer auditing contracts for reentrancy bugs. Keep responses technical and objective..."
                      required
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-brand-purple/40"
                    />
                  </div>

                  {/* Personality & Persona Configuration Panel */}
                  <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5 space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white font-display">Personality & Persona</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Fine-tune the cognitive tone and response depth of your agent.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">Response Tone</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["professional", "witty", "concise", "friendly", "analytical"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTone(t)}
                              className={`py-2 px-1 rounded-xl border text-[10px] font-bold capitalize transition-all ${
                                tone === t 
                                  ? "bg-brand-purple/20 border-brand-purple text-white" 
                                  : "bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/10"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">Response Length</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["short", "medium", "long"] as const).map((l) => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setResponseLength(l)}
                              className={`py-2 px-1 rounded-xl border text-[10px] font-bold capitalize transition-all ${
                                responseLength === l 
                                  ? "bg-brand-purple/20 border-brand-purple text-white" 
                                  : "bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/10"
                              }`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">Personality Behaviors</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Self-Correcting", 
                          "Skeptical", 
                          "Enthusiastic", 
                          "Objective", 
                          "Strictly Technical",
                          "Encouraging",
                          "Minimalist",
                          "Explanatory"
                        ].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              if (behaviors.includes(b)) {
                                setBehaviors(behaviors.filter(x => x !== b));
                              } else {
                                setBehaviors([...behaviors, b]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                              behaviors.includes(b)
                                ? "bg-brand-purple/20 border-brand-purple text-white"
                                : "bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/10"
                            }`}
                          >
                            {behaviors.includes(b) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector (AGL Credits vs ETH) */}
                  <div className="p-3 bg-zinc-950 border border-white/10 rounded-xl space-y-2">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
                      Deployment Payment & AGL Liquidity Generation Model
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="deploy-payment-agl-credits"
                        onClick={() => setDeployPaymentMethod("agl_credits")}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                          deployPaymentMethod === "agl_credits"
                            ? "bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-500/10"
                            : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                            <Flame className="w-4 h-4 text-amber-400" />
                            <span>500 AGL Credits</span>
                          </div>
                          <span className="block text-[10px] text-purple-300 font-mono mt-0.5">
                            ⚡ Burns Credits & Injects +0.025 ETH into $AGL LP Pool
                          </span>
                        </div>
                        {deployPaymentMethod === "agl_credits" && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        id="deploy-payment-eth"
                        onClick={() => setDeployPaymentMethod("eth")}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                          deployPaymentMethod === "eth"
                            ? "bg-blue-950/40 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                            : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                            <Coins className="w-4 h-4 text-blue-400" />
                            <span>0.005 ETH Standard</span>
                          </div>
                          <span className="block text-[10px] text-zinc-500 font-mono mt-0.5">
                            Standard Base gas & contract deployment fee
                          </span>
                        </div>
                        {deployPaymentMethod === "eth" && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      id="btn-goto-prompt-preview"
                      onClick={() => setForgeMode("preview")}
                      className="py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/10 text-zinc-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-purple-400" />
                      <span>Preview Prompt Sandbox</span>
                    </button>

                    <button
                      id="agent-create-submit-btn"
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl bg-brand-purple hover:bg-purple-600 font-semibold font-display text-xs text-white shadow-lg shadow-brand-purple/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <BrainCircuit className="w-4 h-4" />
                      <span>{loading ? "Assembling cognitive layers..." : "Deploy AI Agent Worker"}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Live Prompt Preview & Interactive Sandbox */
                <div className="space-y-4 animate-fade-in">
                  {/* Sandbox Header Bar */}
                  <div className="bg-zinc-950/80 p-3 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-white">{name || "Draft AI Agent"}</span>
                      <span className="text-brand-purple uppercase">({symbol || "DRAFT"})</span>
                      <span className="text-zinc-500">| Sub Fee: {subFee} ETH</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                        Model: {selectedModel}
                      </span>
                      <button
                        type="button"
                        onClick={handleExportAgentSpec}
                        className="text-zinc-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10 cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-purple-400" /> Spec JSON
                      </button>
                    </div>
                  </div>

                  {/* Active System Directive Display */}
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block">
                      Draft System Directives:
                    </span>
                    <p className="text-xs text-zinc-300 font-sans italic line-clamp-2">
                      "{systemPrompt || "No custom instructions defined yet. Using standard Web3 AI behavior."}"
                    </p>
                  </div>

                  {/* Sandbox Quick Test Prompts */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold block">
                      Quick Test Queries:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Audit this contract snippet for reentrancy bugs",
                        "How can I maximize my yield on Base DEX pools?",
                        "Draft a governance proposal for a 5 ETH treasury grant",
                        "Explain impermanent loss risk in volatile pairs"
                      ].map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => handleRunPreviewPrompt(e, q)}
                          disabled={previewLoading}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-950 border border-white/10 hover:border-brand-purple/40 hover:bg-brand-purple/10 text-zinc-400 hover:text-white transition-all font-mono cursor-pointer"
                        >
                          ⚡ "{q}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sandbox Message Stream */}
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 min-h-[220px] max-h-[320px] overflow-y-auto space-y-3 font-sans text-xs">
                    {previewMessages.length === 0 ? (
                      <div className="text-center py-12 text-zinc-600 font-mono">
                        <Eye className="w-6 h-6 text-zinc-700 mx-auto mb-2 animate-bounce" />
                        <p>Interactive Prompt Sandbox Ready.</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Submit a sample prompt below to simulate real-time AI responses before deploying.</p>
                      </div>
                    ) : (
                      previewMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-xl p-3 text-xs ${
                            msg.role === "user"
                              ? "bg-brand-purple text-white rounded-br-none font-mono"
                              : "bg-zinc-900 border border-white/10 text-zinc-200 rounded-bl-none leading-relaxed"
                          }`}>
                            <span className="block text-[8px] font-mono text-zinc-400 uppercase mb-1">
                              {msg.role === "user" ? "You (Tester)" : `${name || "Draft Agent"} Output`}
                            </span>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        </div>
                      ))
                    )}

                    {previewLoading && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-zinc-400 flex items-center gap-2 font-mono">
                          <Loader2 className="w-3.5 h-3.5 text-brand-purple animate-spin" />
                          <span>Evaluating directives & generating response...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metrics Bar */}
                  {previewMetrics && (
                    <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-white/5 flex flex-wrap items-center justify-between text-[10px] font-mono text-zinc-400 gap-2">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <Check className="w-3 h-3" /> Directives Evaluated
                      </span>
                      <span>⚡ {previewMetrics.tokensProcessed} tokens</span>
                      <span>⏱️ {previewMetrics.latencyMs}ms latency</span>
                      <span className="text-purple-300">Est. Fee: {subFee} ETH</span>
                    </div>
                  )}

                  {/* Sandbox Input Form */}
                  <form onSubmit={(e) => handleRunPreviewPrompt(e)} className="flex items-center gap-2">
                    <input
                      id="preview-prompt-message-input"
                      type="text"
                      value={previewInput}
                      onChange={(e) => setPreviewInput(e.target.value)}
                      placeholder="Type a test query to verify system directives..."
                      disabled={previewLoading}
                      className="bg-zinc-950 flex-1 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-purple/40"
                    />
                    <button
                      id="btn-send-preview-prompt"
                      type="submit"
                      disabled={previewLoading || !previewInput.trim()}
                      className="px-4 py-2.5 bg-brand-purple hover:bg-purple-600 disabled:bg-zinc-800 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Test Prompt</span>
                    </button>
                  </form>

                  {/* Footer Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setPreviewMessages([])}
                      className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Reset Sandbox
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForgeMode("configure")}
                        className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-950 rounded-lg border border-white/10 cursor-pointer"
                      >
                        Edit Directives
                      </button>

                      <button
                        type="button"
                        onClick={handleCreateAgent}
                        disabled={loading}
                        className="px-4 py-1.5 text-xs font-mono font-bold text-white bg-brand-purple hover:bg-purple-600 rounded-lg shadow-lg shadow-brand-purple/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <BrainCircuit className="w-3.5 h-3.5" />
                        <span>Deploy Agent Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Advanced Chat Panel Box */}
              {activeChatAgent && (
                <div className="glass-panel p-6 rounded-2xl border border-brand-purple/40 bg-zinc-950 space-y-4 animate-fade-in flex flex-col justify-between min-h-[460px]">
                  {/* Chat Panel Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback src={activeChatAgent.avatarUrl} alt={activeChatAgent.name} fallbackText={activeChatAgent.symbol} className="w-10 h-10 rounded-xl object-cover border border-white/5" />
                      <div>
                        <h3 className="text-sm font-bold text-white font-display leading-tight">{activeChatAgent.name} Chat</h3>
                        <span className="text-[10px] font-mono font-bold text-brand-purple uppercase">Directives Node Active</span>
                      </div>
                    </div>

                    {/* Model Switcher row inside header */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/40 p-1 rounded-xl border border-white/5">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-bold px-1.5">Model:</span>
                      <button
                        onClick={() => { setSelectedModel("gemini-3.6-flash"); setHighThinking(false); }}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold transition-all ${
                          selectedModel === "gemini-3.6-flash"
                            ? "bg-zinc-800 text-white border border-white/10"
                            : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        flash (General)
                      </button>
                      <button
                        onClick={() => setSelectedModel("gemini-3.1-pro-preview")}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold transition-all ${
                          selectedModel === "gemini-3.1-pro-preview"
                            ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
                            : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        pro (Thinking)
                      </button>
                      <button
                        onClick={() => { setSelectedModel("gemini-3.1-flash-lite"); setHighThinking(false); }}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold transition-all ${
                          selectedModel === "gemini-3.1-flash-lite"
                            ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/30"
                            : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        lite (Fast)
                      </button>
                    </div>

                    <button 
                      id="close-agent-chat-btn"
                      onClick={() => { setActiveChatAgent(null); setAttachedImage(null); }} 
                      className="text-zinc-500 hover:text-white absolute right-6 top-6 md:static"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cognitive Tuning Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-900/30 p-3 rounded-xl border border-white/5 text-[10px]">
                    {/* High Thinking switch (pro-only) */}
                    <div className="flex items-center justify-between bg-zinc-950/40 p-2 rounded-lg border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-zinc-400 font-bold flex items-center gap-1 font-mono uppercase">
                          <Cpu className="w-3.5 h-3.5 text-brand-purple" /> Reasoning Depth
                        </span>
                        <span className="text-[9px] text-zinc-500">Enable deep-thinking mode</span>
                      </div>
                      <input 
                        type="checkbox" 
                        disabled={selectedModel !== "gemini-3.1-pro-preview"}
                        checked={highThinking && selectedModel === "gemini-3.1-pro-preview"}
                        onChange={(e) => setHighThinking(e.target.checked)}
                        className="rounded bg-zinc-950 border-white/10 text-brand-purple focus:ring-brand-purple w-4 h-4 cursor-pointer disabled:opacity-30"
                      />
                    </div>

                    {/* Google Maps grounding switch */}
                    <div className="flex items-center justify-between bg-zinc-950/40 p-2 rounded-lg border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-zinc-400 font-bold flex items-center gap-1 font-mono uppercase">
                          <MapPin className="w-3.5 h-3.5 text-brand-blue" /> Maps Grounding
                        </span>
                        <span className="text-[9px] text-zinc-500">{location ? "GPS coordinates attached" : "Attach local coordinates"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleMaps}
                        className={`w-8 h-4 rounded-full transition-all relative ${
                          enableMapsGrounding ? "bg-brand-blue" : "bg-zinc-800"
                        }`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                          enableMapsGrounding ? "right-0.5" : "left-0.5"
                        }`}></span>
                      </button>
                    </div>

                    {/* Attachment Info */}
                    <div className="flex items-center gap-2 bg-zinc-950/40 p-2 rounded-lg border border-white/5 font-mono text-zinc-400 text-[9px]">
                      <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <div>
                        <span className="block text-zinc-500 font-bold">MULTIMODAL STATUS:</span>
                        <span>{attachedImage ? "Image ready for analysis" : "No image files loaded"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages List */}
                  <div className="flex-1 overflow-y-auto space-y-4 max-h-64 pr-1 min-h-[160px] border border-white/5 bg-zinc-950/60 p-4 rounded-xl">
                    {chatMessages.map((m, idx) => (
                      <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          m.role === "user"
                            ? "bg-brand-purple/25 text-white border border-brand-purple/30 rounded-br-none"
                            : "bg-zinc-900 border border-white/5 text-zinc-200 rounded-bl-none"
                        }`}>
                          {m.role === "assistant" && (
                            <div className="flex items-center gap-1.5 mb-1.5 text-[9px] text-brand-purple font-bold uppercase tracking-wider font-mono">
                              <Bot className="w-3.5 h-3.5" />
                              <span>{activeChatAgent.name} Consciousness</span>
                            </div>
                          )}

                          {m.image && (
                            <ImageWithFallback src={m.image} alt="Chat attachment" fallbackText="IMG" className="max-w-[200px] max-h-[150px] rounded-lg object-cover mb-2 border border-white/10" />
                          )}

                          <p className="whitespace-pre-line text-zinc-200 font-sans">{m.content}</p>

                          {/* Grounding references link list */}
                          {m.groundingMetadata?.groundingChunks && (
                            <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-mono font-bold">Grounded References:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {m.groundingMetadata.groundingChunks.map((chunk: any, cidx: number) => {
                                  const url = chunk.maps?.uri || chunk.web?.uri;
                                  const label = chunk.maps?.title || chunk.web?.title || "Maps Reference";
                                  if (!url) return null;
                                  return (
                                    <a 
                                      key={cidx}
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-flex items-center gap-1 text-[9px] bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue px-2 py-0.5 rounded border border-brand-blue/30 font-mono transition-all"
                                    >
                                      <MapPin className="w-2.5 h-2.5" />
                                      <span>{label}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-3 text-xs text-zinc-400 rounded-bl-none flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-brand-purple animate-spin" />
                          <span className="font-mono text-[10px]">Processing cognitive directives via {selectedModel}...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form Input with Voice Recording and Image Attachments */}
                  <form onSubmit={handleSendChatMessage} className="space-y-3 pt-2">
                    {attachedImage && (
                      <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 p-2 rounded-xl text-xs text-white max-w-xs animate-fade-in relative">
                        <img 
                          src={`data:${attachedImage.mimeType};base64,${attachedImage.data}`} 
                          alt="Thumbnail preview" 
                          className="w-10 h-10 object-cover rounded-lg border border-white/10" 
                        />
                        <div className="flex-1 overflow-hidden">
                          <span className="block text-[10px] text-zinc-400 font-mono uppercase font-bold">Attached Asset</span>
                          <span className="block text-[8px] text-zinc-500 truncate">{attachedImage.mimeType} Data payload</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setAttachedImage(null)}
                          className="text-zinc-500 hover:text-white hover:bg-white/5 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 p-1.5 rounded-xl focus-within:border-brand-purple/40 transition-all">
                      {/* Attach Image button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-zinc-500 hover:text-brand-purple hover:bg-white/5 rounded-lg transition-all"
                        title="Attach image for Multimodal analysis"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden" 
                      />

                      {/* Microphone Transcription button */}
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 rounded-lg transition-all ${
                          isRecording 
                            ? "bg-red-500/15 text-red-500 animate-pulse" 
                            : "text-zinc-500 hover:text-brand-purple hover:bg-white/5"
                        }`}
                        title={isRecording ? "Stop voice recording" : "Record audio for voice transcription"}
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>

                      {/* Chat Input Text */}
                      <input
                        id="agent-chat-message-input"
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={isRecording ? "Recording speech... Speak clearly." : "Type a message or use speech recorder..."}
                        disabled={chatLoading}
                        className="bg-transparent flex-1 focus:outline-none px-2 py-1 text-xs text-white placeholder:text-zinc-600"
                      />

                      <button
                        id="agent-chat-send-btn"
                        type="submit"
                        disabled={chatLoading || (!chatInput.trim() && !attachedImage)}
                        className="p-2 bg-brand-purple hover:bg-purple-600 rounded-lg text-white disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Deployed AI Agents List */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-brand-purple" /> Deployed AI Workers
              </h3>

              {agents.length === 0 ? (
                <div className="text-center py-24 bg-zinc-950/20 border border-dashed border-white/5 rounded-2xl">
                  <BrainCircuit className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No autonomous agents deployed.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                  {agents.map((agent) => (
                    <div key={agent.id} className="glass-panel rounded-2xl border border-white/5 p-4 bg-zinc-900/10 space-y-4">
                      <div className="flex gap-3">
                      <ImageWithFallback src={agent.avatarUrl} alt={agent.name} fallbackText={agent.symbol} className="w-12 h-12 rounded-xl object-cover border border-white/5 shrink-0" />
                        <div>
                          <h4 className="font-display font-bold text-white text-xs">{agent.name}</h4>
                          <span className="block text-[9px] font-mono text-brand-purple font-bold uppercase">{agent.symbol} Agent</span>
                          <span className="block text-[8px] font-mono text-zinc-500 truncate max-w-[150px]">Token Address: {agent.contractAddress}</span>
                        </div>
                      </div>

                      <p className="text-zinc-400 text-[10px] leading-normal line-clamp-2">
                        {agent.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div>
                          <span className="text-zinc-500">Sub Fee: </span>
                          <span className="text-emerald-400 font-bold">{agent.usageFeeEth} ETH</span>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-500">Queries: </span>
                          <span className="text-white font-bold">{agent.queryCount}</span>
                        </div>
                      </div>

                      {/* Action Buttons: Preview Directives, Prompt Agent & History Log */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          id={`preview-agent-trigger-${agent.id}`}
                          onClick={() => handlePreviewAgentDirectives(agent)}
                          className="py-2 px-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold font-mono rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-purple-400" />
                          <span>Preview</span>
                        </button>

                        <button
                          id={`chat-agent-trigger-${agent.id}`}
                          onClick={() => handleStartChat(agent)}
                          className="py-2 px-1 bg-brand-purple/20 hover:bg-brand-purple text-brand-purple hover:text-white border border-brand-purple/30 text-[10px] font-bold font-mono rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Prompt</span>
                        </button>

                        <button
                          id={`history-agent-trigger-${agent.id}`}
                          onClick={() => {
                            setActiveChatAgent(agent);
                            setActiveTab("history");
                          }}
                          className="py-2 px-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 text-[10px] font-bold font-mono rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Terminal className="w-3 h-3 text-brand-purple" />
                          <span>History</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Embedded Interaction History Log below agents grid */}
            <div className="lg:col-span-3 pt-4">
              <AgentInteractionHistory
                agents={agents}
                activeAgentId={activeChatAgent?.id}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                onSelectAgent={(agent) => {
                  setActiveChatAgent(agent);
                  setChatMessages(agent.chatHistory || []);
                }}
                onLoadPromptToChat={handleLoadPromptToChat}
                onReRunPrompt={handleReRunPrompt}
                onClearHistory={handleClearAgentHistory}
                showToast={showToast}
              />
            </div>
          </motion.div>
        ) : activeTab === "history" ? (
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <AgentInteractionHistory
              agents={agents}
              activeAgentId={activeChatAgent?.id}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onSelectAgent={(agent) => {
                setActiveChatAgent(agent);
                setChatMessages(agent.chatHistory || []);
              }}
              onLoadPromptToChat={handleLoadPromptToChat}
              onReRunPrompt={handleReRunPrompt}
              onClearHistory={handleClearAgentHistory}
              showToast={showToast}
            />
          </motion.div>
        ) : activeTab === "services" ? (
          <motion.div
            key="services-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <AgentServiceRegistry
              showToast={showToast}
              onRefresh={onRefreshAgents}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="creative-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Image Generator space */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
              <div>
                <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-brand-purple animate-pulse" />
                  High-Quality Image Generator
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Synthesize high-fidelity visual assets, token icons, or landing headers utilizing the advanced gemini-3.1-flash-image cognitive framework.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Aspect Ratio</label>
                    <select
                      value={imageAspectRatio}
                      onChange={(e) => setImageAspectRatio(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                    >
                      <option value="1:1">Square (1:1)</option>
                      <option value="16:9">Widescreen (16:9)</option>
                      <option value="9:16">Portrait (9:16)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Image Resolution</label>
                    <select
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                    >
                      <option value="512px">Standard 512px</option>
                      <option value="1K">High Quality 1K</option>
                      <option value="2K">Ultra Quality 2K</option>
                      <option value="4K">Extreme Quality 4K</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="space-y-1 mb-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Visual Prompt Instructions</label>
                      <span className="text-[9px] font-mono text-purple-400 font-bold">Preview Presets:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        { label: "⚡ Holographic Token Emblem", prompt: "A sleek 3D holographic neon lotus emblem floating in dark space, futuristic Web3 token icon, octane render, 8k resolution, glowing violet accents" },
                        { label: "⚡ Base DEX Hero Banner", prompt: "Futuristic decentralized exchange dashboard overview with neon blue charts, glassmorphic trading terminals, high contrast, ultra clean UI layout" },
                        { label: "⚡ AI Agent Cyber Mascot", prompt: "A friendly humanoid AI robotics avatar wearing high-tech visor, isometric perspective, soft purple lighting, metallic finishes" }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          id={`btn-preview-image-preset-${idx}`}
                          onClick={() => {
                            setImagePrompt(preset.prompt);
                            showToast(`Loaded Image Prompt Preview: ${preset.label}`, "info");
                          }}
                          className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 text-[10px] font-mono text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Describe what you want to synthesize: e.g. An elegant dark-themed Web3 workspace with neon cyan dashboard graphics, high-contrast, cyberpunk aesthetic, matte glass finishes..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40"
                  />
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 font-semibold font-display text-xs text-white shadow-lg shadow-brand-purple/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-2"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing visual matrices...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Render High-Quality Asset</span>
                    </>
                  )}
                </button>
              </div>

              {/* Viewport for generated image */}
              <div className="border border-white/5 rounded-2xl bg-black/40 min-h-[220px] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {isGeneratingImage ? (
                  <div className="text-center space-y-2 animate-pulse">
                    <Sparkles className="w-8 h-8 text-brand-purple mx-auto animate-spin" />
                    <p className="text-xs text-zinc-500 font-mono">Resolving color coordinate planes...</p>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="w-full text-center space-y-4">
                    <ImageWithFallback 
                      src={generatedImageUrl} 
                      alt="Synthesized AI Asset" 
                      fallbackText="AI"
                      className="max-h-[300px] mx-auto rounded-xl border border-white/10 shadow-2xl object-contain bg-zinc-950" 
                    />
                    <a
                      href={generatedImageUrl}
                      download="synthesized_asset.png"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-purple hover:text-white bg-brand-purple/10 hover:bg-brand-purple border border-brand-purple/30 px-4 py-2 rounded-xl font-mono font-bold transition-all"
                    >
                      <Download className="w-4 h-4" /> Download Asset
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-600 font-mono text-xs">
                    <Eye className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                    <span>Visual layout viewport is idle. Enter prompt above.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Veo Video Generator space */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
              <div>
                <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-brand-purple animate-pulse" />
                  Veo 3 Temporal Video Synthesizer
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Generate immersive high-fidelity cinematic video loops or loading clips from text prompts or an initial reference image.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Aspect Ratio</label>
                    <select
                      value={videoAspectRatio}
                      onChange={(e) => setVideoAspectRatio(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                    >
                      <option value="16:9">Landscape (16:9)</option>
                      <option value="9:16">Portrait (9:16)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Resolution</label>
                    <select
                      value={videoResolution}
                      onChange={(e) => setVideoResolution(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                    >
                      <option value="720p">HD 720p</option>
                      <option value="1080p">Full HD 1080p</option>
                    </select>
                  </div>
                </div>

                {/* Optional Starting Frame attachment */}
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Start Frame Reference Image (Optional)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleVideoImageChange}
                      className="hidden"
                      id="video-image-input"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById("video-image-input")?.click()}
                      className="px-4 py-2.5 bg-zinc-950 border border-white/10 hover:border-brand-purple/30 rounded-xl text-xs text-zinc-400 hover:text-white transition-all font-mono"
                    >
                      {videoStartImage ? "Change Image" : "Attach Starting Image"}
                    </button>
                    {videoStartImage && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                        <img 
                          src={`data:${videoStartImage.mimeType};base64,${videoStartImage.data}`} 
                          alt="Thumbnail" 
                          className="w-8 h-8 rounded border border-white/15 object-cover" 
                        />
                        <button type="button" onClick={() => setVideoStartImage(null)} className="text-red-400 hover:text-red-300">
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="space-y-1 mb-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Video Prompt Instructions</label>
                      <span className="text-[9px] font-mono text-purple-400 font-bold">Preview Motion Scripts:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        { label: "⚡ Golden Coin Flip Loop", prompt: "A 3D golden crypto coin rotating smoothly in place against a dark indigo starry galaxy background, cinematic lighting, continuous fluid motion loop" },
                        { label: "⚡ Base Liquidity Stream", prompt: "Glowing electric blue streams of data and tokens pulsing along circuit board traces into a central glowing vault core, ultra detailed" },
                        { label: "⚡ Cyber Hologram Globe", prompt: "A spinning translucent holographic globe showing global Web3 node connections, floating digital particles, futuristic sci-fi ambiance" }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          id={`btn-preview-video-preset-${idx}`}
                          onClick={() => {
                            setVideoPrompt(preset.prompt);
                            showToast(`Loaded Motion Script Preview: ${preset.label}`, "info");
                          }}
                          className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 text-[10px] font-mono text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="Describe the motion scene: e.g. A digital golden coin flipping endlessly through deep indigo galactic void, sparks of code and glowing starlight..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40"
                  />
                </div>

                <button
                  onClick={handleGenerateVideo}
                  disabled={isVideoGenerating || !videoPrompt.trim()}
                  className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 font-semibold font-display text-xs text-white shadow-lg shadow-brand-purple/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-2"
                >
                  {isVideoGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating temporal video...</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4 text-white" />
                      <span>Synthesize Veo Cinematic</span>
                    </>
                  )}
                </button>
              </div>

              {/* Viewport for video rendering */}
              <div className="border border-white/5 rounded-2xl bg-black/40 min-h-[200px] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {isVideoGenerating ? (
                  <div className="text-center space-y-3 p-4">
                    <Loader2 className="w-8 h-8 text-brand-purple mx-auto animate-spin" />
                    <p className="text-xs font-mono text-white animate-pulse">{videoProgress}</p>
                    <p className="text-[10px] text-zinc-600 font-mono">Note: Cinematic video synthesis usually takes ~1-2 minutes. Please remain connected.</p>
                  </div>
                ) : generatedVideoUrl ? (
                  <div className="w-full text-center space-y-4">
                    <video 
                      src={generatedVideoUrl} 
                      controls 
                      autoPlay 
                      loop 
                      className="max-h-[300px] mx-auto rounded-xl border border-white/10 shadow-2xl bg-zinc-950"
                    />
                    <a
                      href={generatedVideoUrl}
                      download="veo_synthesis.mp4"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-purple hover:text-white bg-brand-purple/10 hover:bg-brand-purple border border-brand-purple/30 px-4 py-2 rounded-xl font-mono font-bold transition-all"
                    >
                      <Download className="w-4 h-4" /> Download Video
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-600 font-mono text-xs">
                    <Play className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                    <span>Cinematic rendering engine is idle. Submit prompt above.</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AGL Credits Top-Up & Token Liquidity Modal */}
      {isLiquidityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-brand-purple/40 bg-zinc-950 space-y-6 shadow-2xl relative">
            <button
              id="close-liquidity-modal-btn"
              onClick={() => setIsLiquidityModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-3 bg-brand-purple/20 border border-brand-purple/40 rounded-xl text-brand-purple">
                <Flame className="w-6 h-6 animate-pulse text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-white">AGLCredits Liquidity Top-Up</h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Burn AGL Tokens to mint Credits and permanently seed protocol liquidity on Base.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/5 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Connected Wallet:</span>
                  <span className="text-white font-bold">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current AGL Balance:</span>
                  <span className="text-purple-300 font-bold">{(wallet.aglTokenBalance || 0).toLocaleString()} AGL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current Credits:</span>
                  <span className="text-emerald-400 font-bold">{(wallet.aglCredits || 0).toLocaleString()} Credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Protocol LP Backing:</span>
                  <span className="text-amber-400 font-bold">{(wallet.aglLiquidityStaked || 0).toFixed(3)} ETH</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono mb-1">
                  Amount of AGL Tokens to Burn & Convert
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={topUpAglAmount}
                    onChange={(e) => setTopUpAglAmount(e.target.value)}
                    placeholder="10"
                    min="1"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setTopUpAglAmount(String(wallet.aglTokenBalance || 10))}
                    className="absolute right-3 top-2.5 text-[10px] bg-brand-purple/20 text-brand-purple px-2 py-1 rounded font-mono font-bold hover:bg-brand-purple hover:text-white transition-all cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="bg-purple-950/30 border border-purple-500/20 p-3 rounded-xl font-mono text-[10px] text-purple-200 space-y-1">
                <span className="font-bold uppercase text-purple-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Output Summary:
                </span>
                <p>• Mint +{((parseFloat(topUpAglAmount) || 0) * 100).toLocaleString()} AGL Credits to wallet</p>
                <p>• Permanently burn {topUpAglAmount || 0} $AGL supply</p>
                <p>• Inject +{((parseFloat(topUpAglAmount) || 0) * 0.00005).toFixed(5)} ETH into $AGL Bonding Pool</p>
              </div>

              <button
                id="btn-confirm-liquidity-topup"
                onClick={handleBuyCreditsAndInjectLiquidity}
                disabled={isBuyingCredits}
                className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 font-semibold font-mono text-xs text-white shadow-lg shadow-brand-purple/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isBuyingCredits ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Executing Base contract liquidity boost...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4 text-amber-300" />
                    <span>Confirm Token Burn & Liquidity Injection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
