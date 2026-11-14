export interface AIProjectResult {
  name: string;
  symbol: string;
  description: string;
  solidityCode: string;
  parameters: {
    initialSupply: string;
    mintPrice: string;
    additionalConfig: string;
  };
  securityAudit: string;
  uiTheme: {
    primaryColor: string;
    glowColor: string;
  };
  launchChecklist: string[];
}

async function safeFetchJson<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new Error(`Empty response received from server (${response.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (err: any) {
    throw new Error(`Malformed JSON response (${response.status}): ${err?.message || err}`);
  }
}

export async function generateProjectAI(prompt: string, type: string, accessControl: string = "Ownable"): Promise<AIProjectResult> {
  const response = await fetch("/api/ai/build", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, type, accessControl }),
  });

  if (!response.ok) {
    let errMsg = `Failed to generate project. Code: ${response.status}`;
    try {
      const err = await safeFetchJson(response);
      if (err?.error) errMsg = err.error;
    } catch {}
    throw new Error(errMsg);
  }

  return safeFetchJson<AIProjectResult>(response);
}

export async function chatWithAgentAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  agentProfile: { name: string; symbol: string; description: string; contractAddress: string }
): Promise<string> {
  const response = await fetch("/api/ai/agent-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, agentProfile }),
  });

  if (!response.ok) {
    let errMsg = `Autonomous agent system link broken. Code: ${response.status}`;
    try {
      const err = await safeFetchJson(response);
      if (err?.error) errMsg = err.error;
    } catch {}
    throw new Error(errMsg);
  }

  const result = await safeFetchJson<{ content: string }>(response);
  return result.content;
}

export interface ChatAdvancedOptions {
  model?: string;
  thinkingLevel?: "HIGH" | "LOW" | "MINIMAL";
  image?: { data: string; mimeType: string } | null;
  enableMapsGrounding?: boolean;
  location?: { latitude: number; longitude: number } | null;
  tone?: string;
  responseLength?: string;
  personalityBehaviors?: string[];
}

export async function chatWithAgentAdvancedAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  agentProfile: any,
  options: ChatAdvancedOptions
): Promise<{ content: string; groundingMetadata?: any }> {
  const response = await fetch("/api/ai/agent-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, agentProfile, ...options }),
  });

  if (!response.ok) {
    let errMsg = `Autonomous agent advanced cognitive link broken. Code: ${response.status}`;
    try {
      const err = await safeFetchJson(response);
      if (err?.error) errMsg = err.error;
    } catch {}
    throw new Error(errMsg);
  }

  return safeFetchJson<{ content: string; groundingMetadata?: any }>(response);
}

export async function transcribeAudioAI(audioBytes: string, mimeType?: string): Promise<string> {
  const response = await fetch("/api/ai/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audioBytes, mimeType }),
  });

  if (!response.ok) {
    let errMsg = `Audio transcription module failed. Code: ${response.status}`;
    try {
      const err = await safeFetchJson(response);
      if (err?.error) errMsg = err.error;
    } catch {}
    throw new Error(errMsg);
  }

  const result = await safeFetchJson<{ transcription: string }>(response);
  return result.transcription;
}

export async function generateImageAI(prompt: string, aspectRatio?: string, imageSize?: string): Promise<string> {
  const response = await fetch("/api/ai/generate-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, aspectRatio, imageSize }),
  });

  if (!response.ok) {
    let errMsg = `Image generator module rejected task. Code: ${response.status}`;
    try {
      const err = await safeFetchJson(response);
      if (err?.error) errMsg = err.error;
    } catch {}
    throw new Error(errMsg);
  }

  const result = await safeFetchJson<{ imageUrl: string }>(response);
  return result.imageUrl;
}

export async function generateVideoStartAI(prompt: string, aspectRatio?: string, resolution?: string, base64Image?: string): Promise<string> {
  const response = await fetch("/api/ai/generate-video", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, aspectRatio, resolution, base64Image }),
  });

  if (!response.ok) {
    let errMsg = `Temporal video rendering start failed. Code: ${response.status}`;
    try {
      const err = await safeFetchJson(response);
      if (err?.error) errMsg = err.error;
    } catch {}
    throw new Error(errMsg);
  }

  const result = await safeFetchJson<{ operationName: string }>(response);
  return result.operationName;
}

export async function pollVideoStatusAI(operationName: string): Promise<boolean> {
  const response = await fetch("/api/ai/video-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operationName }),
  });

  if (!response.ok) {
    let errMsg = `Video status query offline. Code: ${response.status}`;
    try {
      const err = await safeFetchJson(response);
      if (err?.error) errMsg = err.error;
    } catch {}
    throw new Error(errMsg);
  }

  const result = await safeFetchJson<{ done: boolean }>(response);
  return result.done;
}

export async function optimizeSystemPromptAI(prompt: string): Promise<string> {
  const response = await fetch("/api/ai/optimize-prompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    let errMsg = `Failed to optimize prompt. Code: ${response.status}`;
    try {
      const err = await safeFetchJson(response);
      if (err?.error) errMsg = err.error;
    } catch {}
    throw new Error(errMsg);
  }

  const result = await safeFetchJson<{ optimizedPrompt: string }>(response);
  return result.optimizedPrompt;
}

export interface AIDeploymentProposal {
  tokenName: string;
  tokenSymbol: string;
  category: string;
  description: string;
  initialSupply: number;
  basePriceEth: number;
  slopeK: number;
  curveModel: string;
  creatorFeePercent: number;
  protocolFeePercent: number;
  antiWhaleMaxPercent: number;
  antiBotCooldownSec: number;
  stakingVaultEnabled: boolean;
  stakingApyPercent: number;
  solidityCode: string;
  securityScore: number;
  securityAuditSummary: string;
  tokenomicsReasoning: string;
  suggestedTags: string[];
  graduationTargetEth: number;
}

export async function proposeDeploymentAI(prompt: string, categoryPreference?: string): Promise<AIDeploymentProposal> {
  try {
    const response = await fetch("/api/ai/propose-deployment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, categoryPreference }),
    });

    if (!response.ok) {
      let errMsg = `Failed to generate deployment proposal. Code: ${response.status}`;
      try {
        const err = await safeFetchJson(response);
        if (err?.error) errMsg = err.error;
      } catch {}
      throw new Error(errMsg);
    }

    return await safeFetchJson<AIDeploymentProposal>(response);
  } catch (err: any) {
    console.error("AI deployment proposal failed:", err);
    throw err;
  }
}

export interface PortfolioAssetHoldings {
  ethAmount: number;
  ethPriceUsd?: number;
  aglAmount: number;
  aglPriceUsd?: number;
  stakedAglAmount: number;
  usdcAmount?: number;
  totalUsdValue: number;
}

export interface RebalanceAction {
  id: string;
  type: "swap" | "stake" | "bridge";
  title: string;
  description: string;
  fromAsset: string;
  toAsset: string;
  amount: string;
  estimatedGasFeeEth: string;
  expectedYieldApy?: string;
  executed?: boolean;
}

export interface RebalanceTargetAllocation {
  asset: string;
  currentPercent: number;
  targetPercent: number;
  targetValueUsd: number;
  reasoning: string;
}

export interface AIPortfolioRebalanceResult {
  summary: string;
  riskProfile: "conservative" | "balanced" | "aggressive";
  targetAllocation: RebalanceTargetAllocation[];
  rebalanceActions: RebalanceAction[];
  marketOutlook: {
    sentiment: string;
    baseL2Trend: string;
    riskAnalysis: string;
    projectedAnnualYieldPercent: number;
  };
}

export async function rebalancePortfolioAI(
  portfolio: PortfolioAssetHoldings,
  riskTolerance: "conservative" | "balanced" | "aggressive",
  customDirectives?: string
): Promise<AIPortfolioRebalanceResult> {
  try {
    const response = await fetch("/api/ai/rebalance-portfolio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ portfolio, riskTolerance, customDirectives }),
    });

    if (!response.ok) {
      let errMsg = `Failed to rebalance portfolio. Code: ${response.status}`;
      try {
        const err = await safeFetchJson(response);
        if (err?.error) errMsg = err.error;
      } catch {}
      throw new Error(errMsg);
    }

    return await safeFetchJson<AIPortfolioRebalanceResult>(response);
  } catch (err: any) {
    console.error("AI portfolio rebalance failed:", err);
    throw err;
  }
}

export interface MultiTurnChatMessage {
  role: "user" | "assistant" | "model" | "system";
  content: string;
}

export interface MultiTurnChatRequest {
  messages: MultiTurnChatMessage[];
  model?: "gemini-3.8-flash" | "gemini-3.7-flash" | "gemini-3.5-flash-lite" | string;
  roleId?: string;
  customSystemInstruction?: string;
  thinkingLevel?: "HIGH" | "LOW" | "MINIMAL";
}

export interface MultiTurnChatResponse {
  success: boolean;
  reply: string;
  modelRequested: string;
  modelUsed: string;
  roleId: string;
  roleName: string;
  latencyMs: number;
  timestamp: number;
  isFallback?: boolean;
}

export async function sendMultiTurnChatMessage(payload: MultiTurnChatRequest): Promise<MultiTurnChatResponse> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let errMsg = `Chat request failed (${response.status})`;
    try {
      const errJson = await safeFetchJson(response);
      if (errJson?.error) errMsg = errJson.error;
    } catch {}
    throw new Error(errMsg);
  }
  return safeFetchJson<MultiTurnChatResponse>(response);
}

export async function fetchChatRoles(): Promise<any[]> {
  try {
    const response = await fetch("/api/ai/chat/roles");
    if (!response.ok) return [];
    const data = await response.json();
    return data.roles || [];
  } catch {
    return [];
  }
}
