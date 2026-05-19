import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";
import OpenAI from "openai";

type AIProvider = "gemini" | "groq" | "openrouter";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIProviderOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callAIProvider(prompt: string, options?: AIProviderOptions): Promise<string> {
  const providers: AIProvider[] = ["gemini", "groq", "openrouter"];

  for (const provider of providers) {
    if (!isProviderConfigured(provider)) continue;

    try {
      const isHealthy = await checkProviderHealth(provider);
      if (!isHealthy) continue;

      const result = await executeProvider(provider, prompt, options);
      if (result) {
        return result;
      }
    } catch (error: any) {
      console.warn(`[AI Provider] ${provider} failed: ${error.message}. Falling back...`);
      // Specifically handle rate limits via retry logic for the same provider
      if (error.status === 429 || error.message?.includes("429")) {
        console.warn(`[AI Provider] Rate limit hit on ${provider}, attempting retry before fallback...`);
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s
          const retryResult = await executeProvider(provider, prompt, options);
          if (retryResult) return retryResult;
        } catch (retryError) {
          console.warn(`[AI Provider] ${provider} retry failed. Proceeding to fallback.`);
        }
      }
    }
  }

  throw new Error("All configured AI providers failed to generate a response.");
}

function isProviderConfigured(provider: AIProvider): boolean {
  switch (provider) {
    case "gemini":
      return !!process.env.GEMINI_API_KEY;
    case "groq":
      return !!process.env.GROQ_API_KEY;
    case "openrouter":
      return !!process.env.OPENROUTER_API_KEY;
  }
}

// Simple health check mechanism (could be expanded to track error rates over time)
const healthStatus: Record<AIProvider, { failures: number; lastFailure: number }> = {
  gemini: { failures: 0, lastFailure: 0 },
  groq: { failures: 0, lastFailure: 0 },
  openrouter: { failures: 0, lastFailure: 0 },
};

async function checkProviderHealth(provider: AIProvider): Promise<boolean> {
  const status = healthStatus[provider];
  // If failed more than 3 times in the last minute, consider unhealthy
  if (status.failures >= 3 && Date.now() - status.lastFailure < 60000) {
    return false;
  }
  // Reset if enough time has passed
  if (Date.now() - status.lastFailure > 60000) {
    healthStatus[provider] = { failures: 0, lastFailure: 0 };
  }
  return true;
}

export function recordProviderFailure(provider: AIProvider) {
  healthStatus[provider].failures += 1;
  healthStatus[provider].lastFailure = Date.now();
}

async function executeProvider(provider: AIProvider, prompt: string, options?: AIProviderOptions): Promise<string> {
  try {
    switch (provider) {
      case "gemini":
        return await executeGemini(prompt, options);
      case "groq":
        return await executeGroq(prompt, options);
      case "openrouter":
        return await executeOpenRouter(prompt, options);
    }
  } catch (error) {
    recordProviderFailure(provider);
    throw error;
  }
}

async function executeGemini(prompt: string, options?: AIProviderOptions): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: options?.model || "gemini-1.5-flash" });
  
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function executeGroq(prompt: string, options?: AIProviderOptions): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: options?.model || "llama3-70b-8192",
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens,
  });

  return completion.choices[0]?.message?.content || "";
}

async function executeOpenRouter(prompt: string, options?: AIProviderOptions): Promise<string> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: options?.model || "meta-llama/llama-3-8b-instruct:free",
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens,
  });

  return completion.choices[0]?.message?.content || "";
}
