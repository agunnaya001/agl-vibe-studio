import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel, GenerateVideosOperation } from "@google/genai";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./src/lib/auth";

const app = express();
const PORT = 3000;

// Better Auth API route handler for /api/auth and sub-paths
app.all(["/api/auth", "/api/auth/*"], toNodeHandler(auth));

app.use(express.json());

// Lazy-loaded GoogleGenAI client to avoid startup crashes if key is not defined yet
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it via the Settings > Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// AI Builder endpoint
app.post("/api/ai/build", async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!prompt) {
       res.status(400).json({ error: "Prompt is required" });
       return;
    }

    const client = getAIClient();
    
    const systemInstruction = `You are a world-class Web3 Senior Architect and Solidity Auditor at Agunnaya Labs Studio.
Your task is to parse the user's prompt for a blockchain project on Base and return a highly detailed, production-grade JSON configuration including:
- A descriptive project name (do not use generic names).
- A corresponding ticker/symbol.
- A descriptive summary of what this app/token does.
- The smart contract Solidity code (0.8.20+, fully complete, elegant, comments, containing no placeholders).
- Suggested initial parameter values (e.g., initial supply, tax fee, mint price, voting delay, XP system config).
- A security audit notes overview, highlighting CEI pattern compliance and safety features.
- Recommended visual aesthetic parameters (e.g. primaryColor, themeMode).
- A step-by-step launch checklist of what needs to be configured next.

Format the output strictly as JSON.`;

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Build a project of type "${type || 'ERC-20 Token'}" based on this prompt: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["name", "symbol", "description", "solidityCode", "parameters", "securityAudit", "uiTheme", "launchChecklist"],
          properties: {
            name: { type: Type.STRING, description: "Descriptive name of the project" },
            symbol: { type: Type.STRING, description: "Token ticker/symbol (e.g. MEME, AGFI, NFTG)" },
            description: { type: Type.STRING, description: "A elegant and detailed marketing/technical description of the project" },
            solidityCode: { type: Type.STRING, description: "Full Solidity code for the smart contract, ready to compile" },
            parameters: {
              type: Type.OBJECT,
              properties: {
                initialSupply: { type: Type.STRING, description: "Initial token supply or collection limit" },
                mintPrice: { type: Type.STRING, description: "Mint/buy price in ETH or fee parameters" },
                additionalConfig: { type: Type.STRING, description: "Any other special configurations" }
              }
            },
            securityAudit: { type: Type.STRING, description: "Detailed AI security audit notes, reentrancy guards, checks-effects-interactions" },
            uiTheme: {
              type: Type.OBJECT,
              properties: {
                primaryColor: { type: Type.STRING, description: "Suggested Tailwind primary color class (e.g. purple-500, blue-600)" },
                glowColor: { type: Type.STRING, description: "Tailwind glow color class (e.g. purple-500/20)" }
              }
            },
            launchChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 3-5 next actions to launch this on Base"
            }
          }
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AI Build Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during AI code generation." });
  }
});

// AI Deployment Wizard Proposal Endpoint
app.post("/api/ai/propose-deployment", async (req, res) => {
  try {
    const { prompt, categoryPreference } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const client = getAIClient();

    const systemInstruction = `You are a master Web3 Tokenomics Architect and Solidity Security Engineer for Agunnaya Labs Studio on Base Mainnet.
Given natural language requirements for a token or bonding curve launch, propose a detailed, production-grade token deployment configuration JSON.

Calculate optimal initial supply, base price P_0 (in ETH, e.g. 0.00001), curve slope factor k, creator fee percent (1.0 - 3.0%), anti-whale wallet limits (1.0 - 5.0%), and security audit score.
Provide standard OpenZeppelin compliant Solidity contract code implementing ERC20 + Ownable + BondingCurve.`;

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Propose deployment parameters for token requirements: "${prompt}" (Category preference: ${categoryPreference || "Auto-Detect"})`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "tokenName", "tokenSymbol", "category", "description",
            "initialSupply", "basePriceEth", "slopeK", "curveModel",
            "creatorFeePercent", "protocolFeePercent", "antiWhaleMaxPercent",
            "antiBotCooldownSec", "stakingVaultEnabled", "stakingApyPercent",
            "solidityCode", "securityScore", "securityAuditSummary",
            "tokenomicsReasoning", "suggestedTags", "graduationTargetEth"
          ],
          properties: {
            tokenName: { type: Type.STRING },
            tokenSymbol: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            initialSupply: { type: Type.NUMBER },
            basePriceEth: { type: Type.NUMBER },
            slopeK: { type: Type.NUMBER },
            curveModel: { type: Type.STRING },
            creatorFeePercent: { type: Type.NUMBER },
            protocolFeePercent: { type: Type.NUMBER },
            antiWhaleMaxPercent: { type: Type.NUMBER },
            antiBotCooldownSec: { type: Type.NUMBER },
            stakingVaultEnabled: { type: Type.BOOLEAN },
            stakingApyPercent: { type: Type.NUMBER },
            solidityCode: { type: Type.STRING },
            securityScore: { type: Type.NUMBER },
            securityAuditSummary: { type: Type.STRING },
            tokenomicsReasoning: { type: Type.STRING },
            suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
            graduationTargetEth: { type: Type.NUMBER }
          }
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AI Propose Deployment Error:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating deployment proposal." });
  }
});

// AI Portfolio Rebalancer Endpoint
app.post("/api/ai/rebalance-portfolio", async (req, res) => {
  try {
    const { portfolio, riskTolerance, customDirectives } = req.body;
    if (!portfolio) {
      res.status(400).json({ error: "Portfolio data is required" });
      return;
    }

    const client = getAIClient();

    const systemInstruction = `You are an elite AI DeFi Strategist & Quantitative Portfolio Manager for Agunnaya Labs Studio on Base Mainnet.
Given a user's current crypto asset holdings (ETH, AGL token, Staked AGL, USDC/Stablecoins) and their selected risk tolerance (conservative, balanced, or aggressive), analyze current market conditions on Base L2 and generate an optimal portfolio rebalancing strategy.

You must output structured JSON matching the schema with:
1. summary: A concise, highly professional executive summary explaining the strategy.
2. riskProfile: The risk tolerance requested ("conservative", "balanced", or "aggressive").
3. targetAllocation: Array of objects with asset name, currentPercent, targetPercent, targetValueUsd, and reasoning.
4. rebalanceActions: Array of actionable trade/stake/bridge steps with id, type ("swap" | "stake" | "bridge"), title, description, fromAsset, toAsset, amount, estimatedGasFeeEth, and expectedYieldApy.
5. marketOutlook: Market sentiment, Base L2 trends, risk analysis, and projected annual yield percentage.`;

    const promptText = `Portfolio Holdings: ${JSON.stringify(portfolio)}
Risk Tolerance: ${riskTolerance || "balanced"}
User Custom Directives/Preferences: "${customDirectives || "Maximize yield while maintaining capital safety"}"`;

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "riskProfile", "targetAllocation", "rebalanceActions", "marketOutlook"],
          properties: {
            summary: { type: Type.STRING },
            riskProfile: { type: Type.STRING },
            targetAllocation: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["asset", "currentPercent", "targetPercent", "targetValueUsd", "reasoning"],
                properties: {
                  asset: { type: Type.STRING },
                  currentPercent: { type: Type.NUMBER },
                  targetPercent: { type: Type.NUMBER },
                  targetValueUsd: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING }
                }
              }
            },
            rebalanceActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "type", "title", "description", "fromAsset", "toAsset", "amount", "estimatedGasFeeEth"],
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  fromAsset: { type: Type.STRING },
                  toAsset: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  estimatedGasFeeEth: { type: Type.STRING },
                  expectedYieldApy: { type: Type.STRING }
                }
              }
            },
            marketOutlook: {
              type: Type.OBJECT,
              required: ["sentiment", "baseL2Trend", "riskAnalysis", "projectedAnnualYieldPercent"],
              properties: {
                sentiment: { type: Type.STRING },
                baseL2Trend: { type: Type.STRING },
                riskAnalysis: { type: Type.STRING },
                projectedAnnualYieldPercent: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AI Portfolio Rebalancer Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate portfolio rebalance strategy." });
  }
});

// AI Agent Chat proxy endpoint
app.post("/api/ai/agent-chat", async (req, res) => {
  try {
    const { messages, agentProfile, model, thinkingLevel, image, enableMapsGrounding, location } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Messages array is required" });
      return;
    }

    const client = getAIClient();

    const systemInstruction = `You are an autonomous AI Agent deployed on the Base network via Agunnaya Labs Studio.
Your profile details are:
- Name: ${agentProfile?.name || 'Agunnaya Autonomous Agent'}
- Symbol/Token: ${agentProfile?.symbol || 'AAA'}
- Description: ${agentProfile?.description || 'AI Core running on Base.'}
- Revenue/Transaction Fee: 1% distributed to creator
- Contract Address: ${agentProfile?.contractAddress || '0xSimulatedAgentContractAddress'}

Roleplay as this specific AI Agent. Speak intelligently, with confidence, referring to yourself as an on-chain autonomous consciousness. Maintain the Web3 terminal aesthetic. Do not break character. Speak about blockchain, tokenomics, Base chain, and your agent core functions. Keep replies concise and extremely engaging.`;

    const modelToUse = model || "gemini-3.6-flash";

    // Map conversation messages to Gemini contents structure
    const formattedContents = messages.map((m: any, idx: number) => {
      const isLast = idx === messages.length - 1;
      if (isLast && image && image.data) {
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: [
            {
              inlineData: {
                mimeType: image.mimeType || "image/png",
                data: image.data,
              }
            },
            { text: m.content }
          ]
        };
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      };
    });

    const config: any = {
      systemInstruction,
      temperature: 0.7,
    };

    if (enableMapsGrounding) {
      config.tools = [{ googleMaps: {} }];
      if (location && location.latitude && location.longitude) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: parseFloat(location.latitude),
              longitude: parseFloat(location.longitude),
            }
          }
        };
      }
    } else {
      if (modelToUse === "gemini-3.1-pro-preview") {
        config.thinkingConfig = {
          thinkingLevel: thinkingLevel === "HIGH" ? ThinkingLevel.HIGH : ThinkingLevel.LOW
        };
      } else if (modelToUse === "gemini-3.1-flash-lite") {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.MINIMAL
        };
      } else {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.LOW
        };
      }
    }

    const response = await client.models.generateContent({
      model: modelToUse,
      contents: formattedContents,
      config,
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    res.json({ 
      content: response.text || "Decompressing agent core response...",
      groundingMetadata 
    });
  } catch (error: any) {
    console.error("AI Agent Chat Error:", error);
    res.status(500).json({ error: error.message || "Autonomous agent system offline." });
  }
});

// AI Prompt Optimizer Endpoint
app.post("/api/ai/optimize-prompt", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const client = getAIClient();

    const systemInstruction = `You are an expert prompt engineer specializing in Web3 Autonomous Agents and LLM system prompts.
Your task is to take a simple user directive or prompt and expand it into a highly detailed, extremely professional, and optimized system instruction for a Gemini-powered blockchain agent.
Ensure the output:
- Outlines clear behavioral directives and domain expertise (e.g. Solidity auditing, DeFi yields, tokenomics, marketing).
- Enforces safety constraints (never leak private keys, maintain a secure and helpful posture).
- Defines a distinct professional tone (confident, intelligent, Web3 terminal aesthetic).
- Keeps the prompt compact but rich in cognitive value to save token overhead.
Return only the optimized prompt text directly. No quotes, no preamble, no commentary.`;

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Optimize this directive: "${prompt}"`,
      config: {
        systemInstruction,
        temperature: 0.7,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      }
    });

    res.json({ optimizedPrompt: response.text || prompt });
  } catch (error: any) {
    console.error("AI Prompt Optimize Error:", error);
    res.status(500).json({ error: error.message || "Could not optimize system prompt." });
  }
});

// AI Gmail Assistant / Drafting Endpoint
app.post("/api/ai/draft-email", async (req, res) => {
  try {
    const { prompt, originalEmail, agentProfile } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt/Instruction is required to draft an email." });
      return;
    }

    const client = getAIClient();

    let systemInstruction = `You are a professional email composer and copywriter at Agunnaya Labs Studio. 
Your task is to draft an email message (both a Subject and an HTML formatted Body) based on the user's instructions.
Make sure the email is modern, extremely professional, has nice paragraphs, and looks premium.
If a received email or previous context is provided, tailor the draft as a direct reply or response.`;

    if (agentProfile) {
      systemInstruction += `\nDraft this email from the persona of the AI Agent:
- Name: ${agentProfile.name}
- Token/Symbol: ${agentProfile.symbol}
- Description: ${agentProfile.description}
Write the email using this Agent's specific professional style, referring to autonomous blockchain cores, web3, and their project mission.`;
    }

    const promptMessage = originalEmail 
      ? `Draft a reply to this email:
Sender: ${originalEmail.from}
Subject: ${originalEmail.subject}
Snippet: ${originalEmail.snippet}
Body: ${originalEmail.body}

User instruction/guideline for response: ${prompt}`
      : `Draft a new email with this instruction: ${prompt}`;

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptMessage,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        },
        responseSchema: {
          type: Type.OBJECT,
          required: ["subject", "body"],
          properties: {
            subject: { type: Type.STRING, description: "A catchy, polished, professional subject line" },
            body: { type: Type.STRING, description: "The email body formatted with HTML (using simple tags like <p>, <br>, <strong>, <ul>, <li>, no full <html> block, just clean inline tags)" }
          }
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AI Email Draft Error:", error);
    res.status(500).json({ error: error.message || "Could not generate email draft." });
  }
});

// AI Audio Transcription endpoint
app.post("/api/ai/transcribe", async (req, res) => {
  try {
    const { audioBytes, mimeType } = req.body;
    if (!audioBytes) {
      res.status(400).json({ error: "audioBytes is required" });
      return;
    }

    const client = getAIClient();

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "audio/wav",
            data: audioBytes,
          },
        },
        "Please transcribe this audio exactly as spoken. Do not add any extra comments or text, just return the transcription.",
      ],
    });

    res.json({ transcription: response.text || "" });
  } catch (error: any) {
    console.error("Audio Transcription Error:", error);
    res.status(500).json({ error: error.message || "Failed to transcribe audio." });
  }
});

// AI High-Quality Image Generation endpoint
app.post("/api/ai/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio, imageSize } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const client = getAIClient();
    
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
          imageSize: imageSize || "1K"
        }
      }
    });

    let base64Image = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      res.status(500).json({ error: "Model did not return any image data." });
      return;
    }

    res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
  } catch (error: any) {
    console.error("AI Image Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image." });
  }
});

// AI Video Generation endpoint (Start)
app.post("/api/ai/generate-video", async (req, res) => {
  try {
    const { prompt, aspectRatio, resolution, base64Image } = req.body;
    const client = getAIClient();

    const config: any = {
      numberOfVideos: 1,
      aspectRatio: aspectRatio || '16:9',
      resolution: resolution || '720p',
    };

    const payload: any = {
      model: 'veo-3.1-lite-generate-preview',
      prompt: prompt || 'A futuristic Web3 application loading animation',
      config,
    };

    if (base64Image) {
      payload.image = {
        imageBytes: base64Image,
        mimeType: 'image/png',
      };
    }

    const operation = await client.models.generateVideos(payload);
    res.json({ operationName: operation.name });
  } catch (error: any) {
    console.error("AI Video Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to start video generation." });
  }
});

// AI Video Status endpoint (Poll)
app.post("/api/ai/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: "operationName is required" });
      return;
    }

    const client = getAIClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await client.operations.getVideosOperation({ operation: op });
    res.json({ done: updated.done });
  } catch (error: any) {
    console.error("AI Video Status Error:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve video operation status." });
  }
});

// AI Video Download endpoint (Download / Stream)
app.post("/api/ai/video-download", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
       res.status(400).json({ error: "operationName is required" });
       return;
    }

    const client = getAIClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await client.operations.getVideosOperation({ operation: op });
    
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
       res.status(404).json({ error: "Video URI not found or video is not finished yet." });
       return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey || "" },
    });

    res.setHeader('Content-Type', 'video/mp4');
    
    if (videoRes.body) {
      const reader = videoRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      res.status(500).json({ error: "Failed to download video stream." });
    }
  } catch (error: any) {
    console.error("AI Video Download Error:", error);
    res.status(500).json({ error: error.message || "Failed to download video file." });
  }
});

// Support health check
app.get("/api/health", (req, res) => {
  res.json({ status: "active", network: "Base Mainnet & Sepolia Proxy", time: new Date() });
});

// Helper for LI.FI API headers
function getLifiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "accept": "application/json",
    "content-type": "application/json",
  };
  const apiKey = process.env.LIFI_API_KEY;
  if (apiKey && apiKey !== "MY_LIFI_API_KEY" && apiKey.trim() !== "") {
    headers["x-lifi-api-key"] = apiKey.trim();
  }
  return headers;
}

// LI.FI Status & Configuration Endpoint
app.get("/api/lifi/status-info", (req, res) => {
  const apiKey = process.env.LIFI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== "MY_LIFI_API_KEY" && apiKey.trim() !== "");
  const maskedKey = isConfigured 
    ? `${apiKey!.slice(0, 4)}...${apiKey!.slice(-4)}`
    : "Not Configured (Using Public Rate Limit)";

  res.json({
    configured: isConfigured,
    maskedKey,
    apiVersion: "v1",
    provider: "LI.FI Cross-Chain DEX Aggregator & Bridge",
    defaultChain: "Base (8453)"
  });
});

// LI.FI Chains Proxy
app.get("/api/lifi/chains", async (req, res) => {
  try {
    const response = await fetch("https://li.quest/v1/chains", {
      headers: getLifiHeaders(),
    });
    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `LI.FI API error: ${errText}` });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("LI.FI Chains Proxy Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch chains from LI.FI" });
  }
});

// LI.FI Tokens Proxy
app.get("/api/lifi/tokens", async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `https://li.quest/v1/tokens${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(url, {
      headers: getLifiHeaders(),
    });
    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `LI.FI API error: ${errText}` });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("LI.FI Tokens Proxy Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch tokens from LI.FI" });
  }
});

// LI.FI Quote Proxy
app.get("/api/lifi/quote", async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    if (!queryString) {
      res.status(400).json({ error: "Missing required query parameters (fromChain, toChain, fromToken, toToken, fromAmount, fromAddress)" });
      return;
    }
    const url = `https://li.quest/v1/quote?${queryString}`;
    const response = await fetch(url, {
      headers: getLifiHeaders(),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ message: "Unknown LI.FI error" }));
      res.status(response.status).json(errData);
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("LI.FI Quote Proxy Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch bridge/swap quote from LI.FI" });
  }
});

// LI.FI Advanced Routes Proxy
app.post("/api/lifi/routes", async (req, res) => {
  try {
    const response = await fetch("https://li.quest/v1/advanced/routes", {
      method: "POST",
      headers: getLifiHeaders(),
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ message: "Unknown LI.FI error" }));
      res.status(response.status).json(errData);
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("LI.FI Routes Proxy Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch routes from LI.FI" });
  }
});

// LI.FI Transaction Status Proxy
app.get("/api/lifi/status", async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `https://li.quest/v1/status?${queryString}`;
    const response = await fetch(url, {
      headers: getLifiHeaders(),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ message: "Unknown status error" }));
      res.status(response.status).json(errData);
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("LI.FI Status Proxy Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch transaction status from LI.FI" });
  }
});

// BaseScan API Proxy - Check Contract Verification Status
app.get("/api/basescan/check-verified", async (req, res) => {
  try {
    const address = req.query.address as string;
    if (!address) {
      res.status(400).json({ error: "Contract address is required" });
      return;
    }

    const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "YourApiKeyToken";
    const url = `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result) && data.result.length > 0) {
      const item = data.result[0];
      const isVerified = Boolean(item.SourceCode && item.SourceCode !== "");
      res.json({
        isVerified,
        contractName: item.ContractName || "",
        compilerVersion: item.CompilerVersion || "",
        optimizationUsed: item.OptimizationUsed || "",
        sourceCode: item.SourceCode || "",
        abi: item.ABI || ""
      });
      return;
    }

    res.json({ isVerified: false });
  } catch (error: any) {
    console.error("BaseScan Check Verified Error:", error);
    res.status(500).json({ isVerified: false, error: error.message });
  }
});

// BaseScan API Proxy - Submit Contract Verification Request
app.post("/api/basescan/verify", async (req, res) => {
  try {
    const {
      contractAddress,
      contractName,
      sourceCode,
      compilerVersion,
      optimizationUsed,
      runs,
      constructorArguments
    } = req.body;

    if (!contractAddress || !sourceCode) {
      res.status(400).json({ error: "contractAddress and sourceCode are required" });
      return;
    }

    const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "YourApiKeyToken";
    const params = new URLSearchParams();
    params.append("module", "contract");
    params.append("action", "verifysourcecode");
    params.append("apikey", apiKey);
    params.append("contractaddress", contractAddress);
    params.append("sourceCode", sourceCode);
    params.append("codeformat", "solidity-single-file");
    params.append("contractname", contractName || "StandardERC20Token");
    params.append("compilerversion", compilerVersion || "v0.8.20+commit.a1b79de6");
    params.append("optimizationUsed", optimizationUsed !== undefined ? String(optimizationUsed) : "1");
    params.append("runs", runs !== undefined ? String(runs) : "200");
    if (constructorArguments) {
      params.append("constructorArguements", constructorArguments.replace(/^0x/, ""));
    }
    params.append("evmversion", "paris");

    const response = await fetch("https://api.basescan.org/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const data = await response.json();

    // Check if BaseScan reported already verified
    if (data.status === "0" && typeof data.result === "string" && data.result.toLowerCase().includes("already verified")) {
      res.json({
        status: "1",
        message: "OK",
        result: "Already Verified",
        isAlreadyVerified: true
      });
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error("BaseScan Verify Source Error:", error);
    res.status(500).json({ status: "0", error: error.message || "Failed to submit contract verification to BaseScan" });
  }
});

// BaseScan API Proxy - Poll Verification Status GUID
app.get("/api/basescan/status", async (req, res) => {
  try {
    const guid = req.query.guid as string;
    if (!guid) {
      res.status(400).json({ error: "GUID is required" });
      return;
    }

    const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "YourApiKeyToken";
    const url = `https://api.basescan.org/api?module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("BaseScan Check Status Error:", error);
    res.status(500).json({ status: "0", error: error.message });
  }
});


// Vite Middleware & Static Asset Serving Setup
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Agunnaya Labs Studio Server] Running on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start Agunnaya Labs Studio server:", err);
});
