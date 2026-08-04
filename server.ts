import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel, GenerateVideosOperation } from "@google/genai";

const app = express();
const PORT = 3000;
const MAX_PROMPT_LENGTH = 12_000;
const MAX_MESSAGE_COUNT = 40;
const MAX_IMAGE_BYTES = 8_000_000;
const allowedModels = new Set(["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"]);
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

app.disable("x-powered-by");
app.use(express.json({ limit: "10mb", strict: true }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://generativelanguage.googleapis.com https://*.googleapis.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
  next();
});

function clientIp(req: express.Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function rateLimit(req: express.Request, res: express.Response) {
  const now = Date.now();
  const key = clientIp(req);
  const bucket = requestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > 30) {
    res.status(429).json({ error: "Too many AI requests. Try again shortly." });
    return false;
  }
  return true;
}

function requirePrompt(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_PROMPT_LENGTH
    ? value.trim()
    : null;
}

function safeError(res: express.Response, label: string, error: unknown) {
  console.error(`[${label}]`, error instanceof Error ? error.message : "unknown error");
  res.status(500).json({ error: "The AI service is temporarily unavailable." });
}

app.use("/api/ai", (req, res, next) => rateLimit(req, res) ? next() : undefined);

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
    const safePrompt = requirePrompt(prompt);
    if (!safePrompt) {
      res.status(400).json({ error: "A prompt between 1 and 12,000 characters is required." });
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
      model: "gemini-3.5-flash",
      contents: `Build a project of type "${typeof type === "string" && type.length < 100 ? type : "ERC-20 Token"}" based on this prompt: "${safePrompt}"`,
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
    safeError(res, "AI Build Error", error);
  }
});

// AI Agent Chat proxy endpoint
app.post("/api/ai/agent-chat", async (req, res) => {
  try {
    const { messages, agentProfile, model, thinkingLevel, image, enableMapsGrounding, location } = req.body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGE_COUNT) {
      res.status(400).json({ error: "Messages must contain between 1 and 40 items." });
      return;
    }
    const validMessages = messages.every((message: any) =>
      message && (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" && message.content.length <= MAX_PROMPT_LENGTH
    );
    if (!validMessages) {
      res.status(400).json({ error: "Each message must have a valid role and bounded text content." });
      return;
    }
    if (image?.data && (typeof image.data !== "string" || image.data.length > MAX_IMAGE_BYTES)) {
      res.status(400).json({ error: "Image input is too large." });
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

    const modelToUse = typeof model === "string" && allowedModels.has(model) ? model : "gemini-3.5-flash";

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
    safeError(res, "AI Agent Chat Error", error);
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
      model: "gemini-3.5-flash",
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
    safeError(res, "AI Prompt Optimize Error", error);
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
      model: "gemini-3.5-flash",
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
      model: "gemini-3.5-flash",
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
