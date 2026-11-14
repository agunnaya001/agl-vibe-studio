import express from "express";
import path from "path";
import fs from "fs";
import { Type, ThinkingLevel, GenerateVideosOperation } from "@google/genai";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./src/lib/auth.ts";
import { registerAISuiteRoutes } from "./server/aiSuiteRoutes.ts";
import { registerAgentOrchestratorRoutes } from "./server/agentOrchestratorRoutes.ts";
import { registerAutonomousAgentRoutes } from "./server/autonomousAgentRoutes.ts";
import { crossChainLiquidityRoutes } from "./server/crossChainLiquidityRoutes.ts";
import { ventureGrantsRoutes } from "./server/ventureGrantsRoutes.ts";
import { registerGeminiChatRoutes } from "./server/geminiChatRoutes.ts";
import { getAIClient, safeParseJson, executeGeminiWithFallback } from "./server/geminiHelper.ts";

const app = express();

// Ensure the application container always binds to port 3000 as required by the runtime environment
const PORT = (process.env.PORT && process.env.PORT !== "8080") ? parseInt(process.env.PORT, 10) : 3000;

// Trust reverse proxy (Cloud Run / Nginx ingress)
app.set("trust proxy", true);

// Fast-path Health check endpoints for Cloud Run & Nginx load balancers
app.get(["/health", "/healthz", "/_health", "/api/health", "/api/healthz"], (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "Agunnaya Labs Studio",
  });
});

// Better Auth API route handler for /api/auth and sub-paths
app.all(["/api/auth", "/api/auth/*"], toNodeHandler(auth));

app.use(express.json());

// Register Gemini Web3 AI Suite routes (Security Auditor, dApp Generator, Contract Explainer, Onchain Agent, Game Builder)
registerAISuiteRoutes(app);

// Register Gemini Multi-Turn Chatbot API (Gemini 3.8 Flash, 3.7 Flash, and 3.5 Flash-Lite)
registerGeminiChatRoutes(app);

// Register Agentic Web3 Orchestrator & Tool routes
registerAgentOrchestratorRoutes(app);

// Register Autonomous Self-Executing AI Agents with Dedicated Treasury routes
registerAutonomousAgentRoutes(app);

// Register Cross-Chain Routes & Unified Bonding Curve Liquidity via LI.FI
app.use("/api/crosschain", crossChainLiquidityRoutes);

// Register Protocol Treasury-Funded Venture Grants & POL Co-Investment routes
app.use("/api/venture-grants", ventureGrantsRoutes);

// AI Builder endpoint
app.post("/api/ai/build", async (req, res) => {
  const { prompt, type, accessControl } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
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

    const response = await executeGeminiWithFallback(
      async (client, modelName) => {
        return await client.models.generateContent({
          model: modelName,
          contents: `Build a project of type "${type || 'ERC-20 Token'}" with ${accessControl || 'Ownable'} access control, based on this prompt: "${prompt}"`,
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
      },
      {
        operationName: "AI Build Project",
        preferredModels: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"],
      }
    );

    const text = response.text || "{}";
    const parsed = safeParseJson(text, null);
    if (!parsed) throw new Error("Could not parse AI project JSON");
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Build provider error:", error?.message || error);
    return res.status(503).json({
      error: "AI project generation is temporarily unavailable. Check Gemini API credentials, model access, and quota, then retry.",
      code: "AI_PROVIDER_UNAVAILABLE",
    });
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

    const systemInstruction = `You are a master Web3 Tokenomics Architect and Solidity Security Engineer for Agunnaya Labs Studio on Base Mainnet.
Given natural language requirements for a token or bonding curve launch, propose a detailed, production-grade token deployment configuration JSON.

Calculate optimal initial supply, base price P_0 (in ETH, e.g. 0.00001), curve slope factor k, creator fee percent (1.0 - 3.0%), anti-whale wallet limits (1.0 - 5.0%), and security audit score.
Provide standard OpenZeppelin compliant Solidity contract code implementing ERC20 + Ownable + BondingCurve.`;

    const response = await executeGeminiWithFallback(
      async (client, modelName) => {
        return await client.models.generateContent({
          model: modelName,
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
      },
      {
        operationName: "AI Propose Deployment",
        preferredModels: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"],
      }
    );

    const text = response.text || "{}";
    const parsed = safeParseJson(text, null);
    if (!parsed) throw new Error("Could not parse AI proposal JSON");
    res.json(parsed);
  } catch (error: any) {
    console.error("AI deployment proposal provider error:", error?.message || error);
    return res.status(503).json({
      error: "AI deployment proposals are temporarily unavailable. Check Gemini API credentials, model access, and quota, then retry.",
      code: "AI_PROVIDER_UNAVAILABLE",
    });
  }
});

// AI Portfolio Rebalancer Endpoint — fail closed until verified price feeds are configured.
app.post("/api/ai/rebalance-portfolio", (_req, res) => {
  return res.status(503).json({
    error: "Portfolio rebalancing is unavailable until verified ETH, AGL, and stablecoin price/balance sources are configured. No strategy or executable transaction plan was generated.",
    code: "PRICE_DATA_UNAVAILABLE",
  });
});

// AI Agent Chat proxy endpoint
app.post("/api/ai/agent-chat", async (req, res) => {
  const { 
    messages, 
    agentProfile, 
    model, 
    thinkingLevel, 
    image, 
    enableMapsGrounding, 
    location,
    tone,
    responseLength,
    personalityBehaviors 
  } = req.body || {};
  
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Messages array is required" });
    return;
  }

  try {
    const client = getAIClient();

    let systemInstruction = `You are an autonomous AI Agent deployed on the Base network via Agunnaya Labs Studio.
Your profile details are:
- Name: ${agentProfile?.name || 'Agunnaya Autonomous Agent'}
- Symbol/Token: ${agentProfile?.symbol || 'AAA'}
- Description: ${agentProfile?.description || 'AI Core running on Base.'}
- Revenue/Transaction Fee: 1% distributed to creator
- Contract Address: ${agentProfile?.contractAddress || '0xSimulatedAgentContractAddress'}

${tone ? `COGNITIVE TONE: Your response tone must be strictly ${tone.toUpperCase()}.` : ''}
${responseLength ? `RESPONSE DEPTH: Keep your responses ${responseLength.toUpperCase()}.` : ''}
${personalityBehaviors && personalityBehaviors.length > 0 ? `PERSONALITY BEHAVIORS: You must embody these specific traits: ${personalityBehaviors.join(", ")}.` : ''}

Roleplay as this specific AI Agent. Speak intelligently, with confidence, referring to yourself as an on-chain autonomous consciousness. Maintain the Web3 terminal aesthetic. Do not break character. Speak about blockchain, tokenomics, Base chain, and your agent core functions. Keep replies engaging and adhere strictly to your assigned tone and depth constraints.`;

    const allowedAgentModels = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"];
    const modelToUse = allowedAgentModels.includes(model) ? model : "gemini-3.8-flash";

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
      if (modelToUse === "gemini-3.5-flash-lite") {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.MINIMAL
        };
      } else {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.LOW
        };
      }
    }

    const response = await executeGeminiWithFallback(
      async (client, modelName) => {
        return await client.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config,
        });
      },
      {
        operationName: "Agent Chat",
        preferredModels: [modelToUse, "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"],
      }
    );

    res.json({
      content: response.text || "Decompressing agent core response...",
    });
  } catch (error: any) {
    console.error("AI Agent Chat provider error:", error?.message || error);
    return res.status(503).json({
      error: "AI agent chat is temporarily unavailable. Check Gemini API credentials, model access, and quota, then retry.",
      code: "AI_PROVIDER_UNAVAILABLE",
    });
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

    const systemInstruction = `You are an expert prompt engineer specializing in Web3 Autonomous Agents and LLM system prompts.
Your task is to take a simple user directive or prompt and expand it into a highly detailed, extremely professional, and optimized system instruction for a Gemini-powered blockchain agent.
Ensure the output:
- Outlines clear behavioral directives and domain expertise (e.g. Solidity auditing, DeFi yields, tokenomics, marketing).
- Enforces safety constraints (never leak private keys, maintain a secure and helpful posture).
- Defines a distinct professional tone (confident, intelligent, Web3 terminal aesthetic).
- Keeps the prompt compact but rich in cognitive value to save token overhead.
Return only the optimized prompt text directly. No quotes, no preamble, no commentary.`;

    const response = await executeGeminiWithFallback(
      async (client, modelName) => {
        return await client.models.generateContent({
          model: modelName,
          contents: `Optimize this directive: "${prompt}"`,
          config: {
            systemInstruction,
            temperature: 0.7,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW
            }
          }
        });
      },
      {
        operationName: "Optimize Prompt",
        preferredModels: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"],
      }
    );

    res.json({ optimizedPrompt: response.text || prompt });
  } catch (error: any) {
    console.error("AI Prompt Optimize Error:", error);
    return res.status(503).json({
      error: "AI prompt optimization is temporarily unavailable. Check Gemini API credentials, model access, and quota, then retry.",
      code: "AI_PROVIDER_UNAVAILABLE",
    });
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

    const response = await executeGeminiWithFallback(
      async (client, modelName) => {
        return await client.models.generateContent({
          model: modelName,
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
      },
      {
        operationName: "Draft Email",
        preferredModels: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"],
      }
    );

    const parsed = safeParseJson(response.text, null);
    if (!parsed || typeof parsed.subject !== "string" || typeof parsed.body !== "string") {
      throw new Error("Gemini returned an invalid email draft payload.");
    }
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Email Draft provider error:", error?.message || error);
    return res.status(503).json({
      error: "AI email drafting is temporarily unavailable. Check Gemini API credentials, model access, and quota, then retry.",
      code: "AI_PROVIDER_UNAVAILABLE",
    });
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

    const response = await executeGeminiWithFallback(
      async (client, modelName) => {
        return await client.models.generateContent({
          model: modelName,
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
      },
      {
        operationName: "Transcribe Audio",
        preferredModels: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"],
      }
    );

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

// AI Gateway Status Endpoint
app.get("/api/ai/gateway-status", (req, res) => {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const isGatewayConfigured = Boolean(
    gatewayKey && gatewayKey !== "MY_AI_GATEWAY_API_KEY" && gatewayKey.trim() !== ""
  );

  const geminiKey = process.env.GEMINI_API_KEY;
  const isGeminiConfigured = Boolean(
    geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim() !== ""
  );

  res.json({
    gatewayConfigured: isGatewayConfigured,
    geminiConfigured: isGeminiConfigured,
    maskedGatewayKey: isGatewayConfigured
      ? `${gatewayKey!.slice(0, 4)}...${gatewayKey!.slice(-4)}`
      : "Not Configured (Using direct server Gemini routes)",
    provider: "Direct Gemini API (server-side)"
  });
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

// Gas oracle endpoint intentionally fails closed until every displayed field is backed by a live source.
// Do not substitute static gas prices, block numbers, congestion ratios, ETH/USD prices, or fee estimates.
app.get("/api/gas/oracle", async (req, res) => {
  res.status(503).json({
    success: false,
    code: "GAS_ORACLE_UNAVAILABLE",
    error: "A verified live gas oracle and fee-estimation source is not configured. Use the connected wallet's provider for transaction gas estimation.",
    chainId: Number(req.query.chainId || 8453),
    source: null,
    timestamp: new Date().toISOString()
  });
});

// BaseScan & Etherscan API V2 Proxy - Check Contract Verification Status
app.get("/api/basescan/check-verified", async (req, res) => {
  try {
    const address = req.query.address as string;
    const chainId = (req.query.chainId as string) || "8453"; // Default 8453 for Base Mainnet
    if (!address) {
      res.status(400).json({ error: "Contract address is required" });
      return;
    }

    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "YourApiKeyToken";
    let url = `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    if (process.env.ETHERSCAN_API_KEY) {
      url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    }

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
    console.error("Contract Check Verified Error:", error);
    res.status(500).json({ isVerified: false, error: error.message });
  }
});

// BaseScan & Etherscan API V2 Proxy - Submit Contract Verification Request
app.post("/api/basescan/verify", async (req, res) => {
  try {
    const {
      contractAddress,
      contractName,
      sourceCode,
      compilerVersion,
      optimizationUsed,
      runs,
      constructorArguments,
      chainId = "8453"
    } = req.body;

    if (!contractAddress || !sourceCode) {
      res.status(400).json({ error: "contractAddress and sourceCode are required" });
      return;
    }

    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "YourApiKeyToken";
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

    let verifyUrl = "https://api.basescan.org/api";
    if (process.env.ETHERSCAN_API_KEY) {
      verifyUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}`;
    }

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const data = await response.json();

    // Check if explorer reported already verified
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
    console.error("Contract Verify Source Error:", error);
    res.status(500).json({ status: "0", error: error.message || "Failed to submit contract verification" });
  }
});

// -------------------------------------------------------------
// DAO GOVERNANCE API ENDPOINTS
// -------------------------------------------------------------
// Governance API is deliberately read-only/unavailable until wired to the deployed
// AgunnayaDAO Governor, TimelockController and wAGL contracts. Never serve seeded
// proposals, fabricated proposal IDs, fake vote tallies, or in-memory proposal writes.
const governanceUnavailable = (_req: any, res: any) => res.status(503).json({
  success: false,
  code: "GOVERNANCE_ONCHAIN_SOURCE_UNAVAILABLE",
  error: "On-chain governance reads are not configured for this API. Use the verified AgunnayaDAO Governor contract and Base explorer until an RPC-backed indexer is integrated.",
  chainId: 8453,
  contracts: {
    governor: "0x3fFCb92A17caeaAd1342DD76978b566C8aEC7010",
    timelock: "0x900D315C91D9e54F3fa3412D475009d905bf6744",
    votesWrapper: "0xA27C9BA04D06EcAF766EF4e074b403DAf19A3d69",
    token: "0xea1221b4d80a89bd8c75248fae7c176bd1854698"
  }
});
app.get("/api/governance/overview", governanceUnavailable);
app.get("/api/governance/proposals", governanceUnavailable);
app.post("/api/governance/proposals", governanceUnavailable);

// BaseScan & Etherscan API V2 Proxy - Poll Verification Status GUID
app.get("/api/basescan/status", async (req, res) => {
  try {
    const guid = req.query.guid as string;
    const chainId = (req.query.chainId as string) || "8453";
    if (!guid) {
      res.status(400).json({ error: "GUID is required" });
      return;
    }

    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "YourApiKeyToken";
    let url = `https://api.basescan.org/api?module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`;
    if (process.env.ETHERSCAN_API_KEY) {
      url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Contract Check Status Error:", error);
    res.status(500).json({ status: "0", error: error.message });
  }
});


// BaseScan & Etherscan API V2 Proxy - Fetch Last 10 Recent On-Chain Transactions
app.get(["/api/wallet/transactions", "/api/basescan/txlist"], async (req, res) => {
  try {
    const address = req.query.address as string;
    const chainId = (req.query.chainId as string) || "8453"; // Default 8453 for Base Mainnet
    const limit = Math.min(25, Math.max(1, parseInt((req.query.limit as string) || "10", 10)));

    if (!address || !address.startsWith("0x") || address.length !== 42) {
      res.status(400).json({ error: "A valid 42-character EVM address is required" });
      return;
    }

    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "YourApiKeyToken";
    
    // Normal Transactions URL
    let txListUrl = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;
    // ERC-20 Token Transfers URL
    let tokenTxUrl = `https://api.basescan.org/api?module=account&action=tokentx&address=${address}&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;

    if (process.env.ETHERSCAN_API_KEY) {
      txListUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;
      tokenTxUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokentx&address=${address}&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;
    }

    const [txResponse, tokenTxResponse] = await Promise.allSettled([
      fetch(txListUrl).then(r => r.json()),
      fetch(tokenTxUrl).then(r => r.json())
    ]);

    const txResult = txResponse.status === "fulfilled" && txResponse.value?.status === "1" && Array.isArray(txResponse.value?.result)
      ? txResponse.value.result
      : [];

    const tokenResult = tokenTxResponse.status === "fulfilled" && tokenTxResponse.value?.status === "1" && Array.isArray(tokenTxResponse.value?.result)
      ? tokenTxResponse.value.result
      : [];

    const formattedTxs: any[] = [];
    const seenHashes = new Set<string>();

    // Process normal transactions
    for (const tx of txResult) {
      const isSender = tx.from?.toLowerCase() === address.toLowerCase();
      const isContractCreation = !tx.to || tx.to === "" || tx.contractAddress;
      const rawValue = BigInt(tx.value || "0");
      const valueEth = Number(rawValue) / 1e18;
      const gasUsed = tx.gasUsed ? BigInt(tx.gasUsed) : null;
      const gasPrice = tx.gasPrice ? BigInt(tx.gasPrice) : null;
      const gasFeeEth = gasUsed !== null && gasPrice !== null
        ? Number(gasUsed * gasPrice) / 1e18
        : null;
      
      let type = isSender ? "send" : "receive";
      if (isContractCreation) type = "deploy";
      else if (tx.input && tx.input !== "0x" && tx.input.length > 10) type = "contract_call";

      let functionName = tx.functionName || "";
      if (!functionName && type === "contract_call") {
        functionName = `Call (${tx.input.slice(0, 10)})`;
      }

      seenHashes.add(tx.hash);
      formattedTxs.push({
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        timeStamp: parseInt(tx.timeStamp, 10),
        from: tx.from,
        to: tx.to || tx.contractAddress || "",
        value: tx.value,
        valueEth,
        gasUsed: gasUsed?.toString() ?? null,
        gasPrice: gasPrice?.toString() ?? null,
        gasFeeEth,
        isError: tx.isError === "1",
        status: tx.isError === "1" ? "failed" : "confirmed",
        functionName,
        type,
        tokenSymbol: "ETH",
        tokenName: "Ethereum",
        tokenDecimal: 18,
        explorerUrl: `https://${chainId === "84532" ? "sepolia." : ""}basescan.org/tx/${tx.hash}`
      });
    }

    // Process token transfer activities
    for (const ttx of tokenResult) {
      if (!seenHashes.has(ttx.hash)) {
        seenHashes.add(ttx.hash);
        const isSender = ttx.from?.toLowerCase() === address.toLowerCase();
        const decimals = parseInt(ttx.tokenDecimal || "18", 10);
        const rawValue = BigInt(ttx.value || "0");
        const tokenAmount = Number(rawValue) / Math.pow(10, decimals);
        formattedTxs.push({
          hash: ttx.hash,
          blockNumber: ttx.blockNumber,
          timeStamp: parseInt(ttx.timeStamp, 10),
          from: ttx.from,
          to: ttx.to,
          value: ttx.value,
          valueEth: tokenAmount,
          gasUsed: null,
          gasPrice: null,
          gasFeeEth: null,
          isError: false,
          status: "confirmed",
          functionName: `Transfer ${ttx.tokenSymbol || "Tokens"}`,
          type: isSender ? "send" : "receive",
          tokenSymbol: ttx.tokenSymbol || "TOKEN",
          tokenName: ttx.tokenName || "ERC20 Token",
          tokenDecimal: decimals,
          tokenContract: ttx.contractAddress,
          explorerUrl: `https://${chainId === "84532" ? "sepolia." : ""}basescan.org/tx/${ttx.hash}`
        });
      }
    }

    // Sort descending by timestamp and truncate to limit
    formattedTxs.sort((a, b) => b.timeStamp - a.timeStamp);
    const finalTxs = formattedTxs.slice(0, limit);

    res.json({
      success: true,
      address,
      chainId,
      count: finalTxs.length,
      limit,
      transactions: finalTxs,
      explorerUrl: `https://${chainId === "84532" ? "sepolia." : ""}basescan.org/address/${address}`,
      source: process.env.ETHERSCAN_API_KEY ? "Etherscan V2 Unified API (Base)" : "BaseScan API"
    });
  } catch (error: any) {
    console.error("Fetch Wallet Transactions Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to fetch on-chain transactions",
      transactions: []
    });
  }
});

// 404 Handler for missing /api endpoints
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found", path: req.originalUrl });
});

// Vite Middleware & Static Asset Serving Setup
const isDev =
  process.env.NODE_ENV === "development" ||
  Boolean(process.env.K_SERVICE && process.env.K_SERVICE.includes("-dev-"));

const isCompiledBundle = typeof __filename === "string" && (__filename.endsWith(".cjs") || __filename.includes("dist"));
const isProduction =
  !isDev &&
  (process.env.NODE_ENV === "production" ||
   isCompiledBundle ||
   Boolean(process.env.K_SERVICE && !process.env.K_SERVICE.includes("-dev-")));

const startServer = async () => {
  if (isProduction) {
    // Resolve dist path reliably in production container (safe across ESM & CommonJS)
    const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
    const candidatePaths = [
      path.join(process.cwd(), "dist"),
      path.resolve(currentDir, "dist"),
      path.resolve(currentDir, "../dist"),
    ];
    const distPath = candidatePaths.find((p) => fs.existsSync(path.join(p, "index.html"))) || path.join(process.cwd(), "dist");

    app.use(express.static(distPath, {
      maxAge: "1d",
      redirect: false,
    }));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err && !res.headersSent) {
            next(err);
          }
        });
      } else {
        res.status(200).send("<!DOCTYPE html><html><head><title>Agunnaya Labs Studio</title></head><body><div id='root'></div></body></html>");
      }
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          allowedHosts: true,
          hmr: process.env.DISABLE_HMR !== "true",
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error("[Vite Middleware Startup Error]", viteErr);
    }
  }

  // Global Express error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Server Error]", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: "Internal Server Error", message: err?.message || "An unexpected error occurred" });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Agunnaya Labs Studio Server] Running on http://0.0.0.0:${PORT} (${isProduction ? "production" : "development"})`);
  });

  server.on("error", (err: any) => {
    console.error("[Server Error on Listen]", err);
    process.exit(1);
  });

  // Graceful shutdown handling for Cloud Run & container orchestration
  const shutdown = (signal: string) => {
    console.log(`[Process] Received ${signal}. Closing server gracefully...`);
    server.close(() => {
      console.log("[Process] HTTP server closed cleanly.");
      process.exit(0);
    });
    // Force shutdown after 10s if connections linger
    setTimeout(() => {
      console.error("[Process] Forced exit after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

// Export the configured Express app so Vercel can serve the API routes as a serverless function.
export { app };

// Cloud Run / local container entrypoint. Vercel imports the Express app through api/[...path].ts
// and must not start a second listening server inside the function runtime.
if (process.env.VERCEL !== "1") {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[Process] Unhandled Promise Rejection:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("[Process] Uncaught Exception:", error);
  });

  startServer().catch((err) => {
    console.error("Failed to start Agunnaya Labs Studio server:", err);
    process.exit(1);
  });
}
