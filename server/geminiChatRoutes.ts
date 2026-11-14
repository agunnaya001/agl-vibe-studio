import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "AIzaSy_placeholder_key") return null;
  return new GoogleGenAI({ apiKey });
}

export interface ChatMessageDto {
  role: "user" | "assistant" | "model" | "system";
  content: string;
}

export interface ChatRolePreset {
  id: string;
  name: string;
  badge: string;
  recommendedModel: "gemini-3.8-flash" | "gemini-3.5-flash-lite" | "gemini-3.7-flash";
  description: string;
  systemInstruction: string;
}

export const CHAT_ROLES: ChatRolePreset[] = [
  {
    id: "carbon-auditor",
    name: "Carbon Security Auditor",
    badge: "Deep Reasoning",
    recommendedModel: "gemini-3.8-flash",
    description: "Rigorous formal verification, CEI checks, reentrancy audits, EVM storage layout, and assembly-level vulnerability modeling.",
    systemInstruction: `You are the Lead Smart Contract Security Auditor at Agunnaya Labs on Base L2. 
You specialize in deep mathematical reasoning, checks-effects-interactions (CEI) validation, reentrancy protection, ERC-4337 paymaster exploit mitigation, and ERC-20 bonding curve mathematics.
Always review smart contracts with paranoia: point out exact lines of vulnerability, provide formal remediation code snippets with OpenZeppelin v5 standards, and summarize exploit vectors clearly.`
  },
  {
    id: "argon-dapp-master",
    name: "Argon dApp Architect",
    badge: "Complex Interactive",
    recommendedModel: "gemini-3.8-flash",
    description: "Full-stack Web3 application synthesis, Viem/Wagmi v2 integration, Base Paymaster sponsorship, and high-complexity UI logic.",
    systemInstruction: `You are the Principal dApp Architect at Agunnaya Labs.
You excel at multi-file architecture, React 19 + TypeScript patterns, Tailwind CSS, Wagmi v2 / Viem hooks, Base L2 gas optimization, and LI.FI cross-chain bridging routes.
Deliver modular, production-ready, clean TypeScript code with zero unnecessary dependencies, proper safe area styling, and bulletproof error boundaries.`
  },
  {
    id: "flash-advisor",
    name: "Flash Protocol Advisor",
    badge: "General Tasks",
    recommendedModel: "gemini-3.8-flash",
    description: "Versatile Web3 guidance: bonding curve mathematics, tokenomics, DAO governance, staking pools, and Base ecosystem analytics.",
    systemInstruction: `You are the Agunnaya Labs Core Web3 Advisor powered by Gemini 3.8 Flash.
You provide clear, accurate, and insightful explanations of linear bonding curves (P(S) = P0 + k*S), staking vault APYs, Base Network gas dynamics, and token factory standards.
Respond concisely, format math formulas clearly, and provide practical next steps for builders and creators.`
  },
  {
    id: "lite-synthesizer",
    name: "Lite Rapid Synthesizer",
    badge: "Ultra Fast",
    recommendedModel: "gemini-3.5-flash-lite",
    description: "Low-latency assistant for quick answers, ABI function summaries, regex pattern matching, and transaction decoding.",
    systemInstruction: `You are the Ultra-Fast Agunnaya Labs Synthesizer.
Provide quick, accurate, bulleted answers with minimal latency. Summarize EVM topics, decode function signatures, and generate concise snippets on demand.`
  }
];

// GET /api/ai/chat/roles - Returns available roles and model recommendations
router.get("/roles", (_req: Request, res: Response) => {
  res.json({
    roles: CHAT_ROLES,
    models: [
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", role: "General & Reasoning", bestFor: "Audits, architecture, tokenomics & Q&A" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", role: "Fast Tasks", bestFor: "Quick summaries & rapid snippets" },
      { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", role: "Alternative Stable", bestFor: "Complex Web3 tasks" }
    ]
  });
});

// POST /api/ai/chat - Multi-turn conversational endpoint
router.post("/", async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { 
      messages, 
      model = "gemini-3.8-flash", 
      roleId = "flash-advisor",
      customSystemInstruction,
      thinkingLevel
    } = req.body as {
      messages: ChatMessageDto[];
      model?: string;
      roleId?: string;
      customSystemInstruction?: string;
      thinkingLevel?: "HIGH" | "LOW" | "MINIMAL";
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array must be non-empty." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ 
        error: "GEMINI_API_KEY is not configured on the server. Please check environment configuration." 
      });
    }

    // Resolve Role Preset
    const rolePreset = CHAT_ROLES.find(r => r.id === roleId) || CHAT_ROLES[2];
    const systemInstruction = customSystemInstruction?.trim() || rolePreset.systemInstruction;

    // Validate Model Alias
    const ALLOWED_MODELS = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.7-flash"
    ];
    let targetModel = ALLOWED_MODELS.includes(model) ? model : "gemini-3.8-flash";

    // Format Multi-Turn Contents for @google/genai SDK
    // The SDK accepts contents as array of { role: 'user' | 'model', parts: [{ text }] }
    const contents = messages
      .filter(m => m.role === "user" || m.role === "assistant" || m.role === "model")
      .map(m => ({
        role: m.role === "assistant" ? "model" : (m.role === "model" ? "model" : "user"),
        parts: [{ text: m.content }]
      }));

    if (contents.length === 0) {
      return res.status(400).json({ error: "No user or assistant messages provided." });
    }

    const config: any = {
      systemInstruction,
      temperature: 0.7,
      maxOutputTokens: 3000
    };

    // If Carbon reasoning is selected and thinkingLevel is set
    if (roleId === "carbon-auditor" && thinkingLevel && targetModel === "gemini-3.8-flash") {
      config.thinkingConfig = {
        thinkingLevel: thinkingLevel === "HIGH" ? "HIGH" : "LOW"
      };
    }

    let responseText = "";
    let modelUsed = targetModel;
    let isFallback = false;

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config
      });
      responseText = response.text || "";
    } catch (modelErr: any) {
      console.warn(`[GeminiChat] Model ${targetModel} call failed, trying gemini-3.8-flash fallback:`, modelErr?.message || modelErr);
      if (targetModel !== "gemini-3.8-flash") {
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents,
            config: {
              systemInstruction,
              temperature: 0.7
            }
          });
          responseText = fallbackResponse.text || "";
          modelUsed = "gemini-3.8-flash (fallback)";
          isFallback = true;
        } catch (fallbackErr: any) {
          throw new Error(fallbackErr?.message || "All Gemini model endpoints failed");
        }
      } else {
        throw modelErr;
      }
    }

    const latencyMs = Date.now() - startTime;

    return res.json({
      success: true,
      reply: responseText,
      modelRequested: targetModel,
      modelUsed,
      roleId: rolePreset.id,
      roleName: rolePreset.name,
      latencyMs,
      timestamp: Date.now(),
      isFallback
    });

  } catch (error: any) {
    console.error("[GeminiChat] Error in /api/ai/chat:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process multi-turn chat with Gemini."
    });
  }
});

export function registerGeminiChatRoutes(app: any) {
  app.use("/api/ai/chat", router);
}

export default router;
