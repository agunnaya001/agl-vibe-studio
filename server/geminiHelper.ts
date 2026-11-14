import { generateText, jsonSchema, Output, type GatewayModelId } from "ai";
import { GoogleGenAI } from "@google/genai";

let aiClientInstance: GoogleGenAI | null = null;

export function getAIClient(): GoogleGenAI {
  if (!aiClientInstance) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "AIzaSy_placeholder_key") {
      throw new Error("GEMINI_API_KEY is not configured. Add a valid server-side Gemini API key to the deployment environment.");
    }
    aiClientInstance = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClientInstance;
}

const DEFAULT_MODELS = [
  "google/gemini-3.8-flash",
  "google/gemini-3.7-flash",
  "google/gemini-3.5-flash",
];

export const Type = {
  OBJECT: "OBJECT",
  ARRAY: "ARRAY",
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
} as const;

export const ThinkingLevel = {
  MINIMAL: "MINIMAL",
  LOW: "LOW",
  HIGH: "HIGH",
} as const;

export function toGatewayModelId(model: string): GatewayModelId {
  return model.includes("/") ? model : `google/${model}`;
}

function toJsonSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;

  const typeMap: Record<string, string> = {
    OBJECT: "object",
    ARRAY: "array",
    STRING: "string",
    NUMBER: "number",
    INTEGER: "integer",
    BOOLEAN: "boolean",
  };

  return {
    ...schema,
    ...(schema.type ? { type: typeMap[schema.type] ?? String(schema.type).toLowerCase() } : {}),
    ...(schema.properties
      ? {
          properties: Object.fromEntries(
            Object.entries(schema.properties).map(([key, value]) => [key, toJsonSchema(value)]),
          ),
        }
      : {}),
    ...(schema.items ? { items: toJsonSchema(schema.items) } : {}),
  };
}

function toModelMessages(contents: unknown): any[] {
  const entries = Array.isArray(contents) ? contents : [contents];
  const messages = entries.map((entry: any) => {
    if (typeof entry === "string") {
      return { role: "user", content: entry };
    }

    const parts = Array.isArray(entry?.parts)
      ? entry.parts
      : entry?.inlineData
        ? [entry]
        : entry?.text
          ? [{ text: entry.text }]
          : [];

    const content = parts.flatMap((part: any) => {
      if (typeof part?.text === "string") return [{ type: "text", text: part.text }];

      const inlineData = part?.inlineData;
      if (!inlineData?.data || !inlineData?.mimeType) return [];

      const data = Buffer.from(inlineData.data, "base64");
      if (inlineData.mimeType.startsWith("image/")) {
        return [{ type: "image", image: data, mediaType: inlineData.mimeType }];
      }

      return [{ type: "file", data, mediaType: inlineData.mimeType }];
    });

    const role = entry?.role === "model" || entry?.role === "assistant" ? "assistant" : "user";
    return { role, content };
  });

  return messages.filter((message) => Array.isArray(message.content) ? message.content.length > 0 : Boolean(message.content));
}

interface GeminiGenerateContentInput {
  model: string;
  contents: unknown;
  config?: {
    systemInstruction?: string;
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: any;
    thinkingConfig?: { thinkingLevel?: "MINIMAL" | "LOW" | "HIGH" };
  };
}

interface GeminiCompatibleClient {
  models: {
    generateContent(input: GeminiGenerateContentInput): Promise<{ text: string }>;
  };
}

const gatewayClient: GeminiCompatibleClient = {
  models: {
    async generateContent(input) {
      const messages = toModelMessages(input.contents);
      if (messages.length === 0) throw new Error("The model request did not contain any supported input.");

      const schema = input.config?.responseSchema ? toJsonSchema(input.config.responseSchema) : undefined;
      const output = schema
        ? Output.object({ schema: jsonSchema(schema) })
        : input.config?.responseMimeType === "application/json"
          ? Output.json()
          : undefined;

      const result = await generateText({
        model: toGatewayModelId(input.model),
        messages,
        ...(input.config?.systemInstruction
          ? { system: input.config.systemInstruction }
          : {}),
        ...(input.config?.temperature !== undefined ? { temperature: input.config.temperature } : {}),
        ...(input.config?.topP !== undefined ? { topP: input.config.topP } : {}),
        ...(input.config?.maxOutputTokens !== undefined
          ? { maxOutputTokens: input.config.maxOutputTokens }
          : {}),
        ...(input.config?.thinkingConfig
          ? { providerOptions: { google: { thinkingConfig: input.config.thinkingConfig } } }
          : {}),
        ...(output ? { output } : {}),
        maxRetries: 0,
      });

      const text = result.output === undefined ? result.text : JSON.stringify(result.output);
      if (!text?.trim()) throw new Error("The AI Gateway returned an empty model response.");
      return { text };
    },
  },
};

export interface GeminiFallbackOptions {
  operationName: string;
  preferredModels?: string[];
  maxRetriesPerModel?: number;
}

export function isRetryableError(error: unknown): boolean {
  const status = Number((error as any)?.statusCode ?? (error as any)?.status ?? 0);
  if (status === 408 || status === 429 || status >= 500) return true;

  const message = String((error as any)?.message ?? error ?? "").toLowerCase();
  return ["timeout", "timed out", "econnreset", "eai_again", "network", "fetch failed"].some(
    (term) => message.includes(term),
  );
}

export async function executeGeminiWithFallback<T>(
  operation: (client: GeminiCompatibleClient, modelName: string) => Promise<T>,
  options: GeminiFallbackOptions,
): Promise<T> {
  const models = [...new Set(options.preferredModels?.length ? options.preferredModels : DEFAULT_MODELS)];
  const retries = Math.max(1, Math.min(options.maxRetriesPerModel ?? 1, 3));
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        return await operation(gatewayClient, model);
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error)) throw error;
        if (attempt + 1 < retries) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
    }
  }

  throw new Error(
    `${options.operationName} is unavailable through Vercel AI Gateway. Please try again later.`,
    { cause: lastError },
  );
}

export function safeParseJson<T>(text: string | undefined, fallback: T): T {
  if (!text?.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
