import axios from "axios";
import { env } from "../config/env.js";

export type VibeAnalysis = {
  normalizedVibes: string[];
  placeSearchTerms: string[];
  moodSummary: string;
  expansionStrategy: string;
};

export interface LlmClient {
  analyzeVibes(input: {
    city: string;
    selectedVibes: string[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis>;
}

class GeminiLlmClient implements LlmClient {
  async analyzeVibes(input: {
    city: string;
    selectedVibes: string[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis> {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const prompt = `
You are a wedding planning backend classifier.
Return strict JSON with keys normalizedVibes, placeSearchTerms, moodSummary, expansionStrategy.
The city is "${input.city}".
Selected vibes: ${input.selectedVibes.join(", ")}.
Free text: ${input.freeText ?? "none"}.
Relevant memory snippets:
${input.memorySnippets?.length ? input.memorySnippets.join("\n") : "none"}.
Choose location types suitable for pre-wedding shoots and keep placeSearchTerms short.
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.LLM_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    return JSON.parse(text) as VibeAnalysis;
  }
}

class OllamaLlmClient implements LlmClient {
  async analyzeVibes(input: {
    city: string;
    selectedVibes: string[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis> {
    const prompt = `
You are a wedding planning backend classifier.
Return minified JSON with keys normalizedVibes, placeSearchTerms, moodSummary, expansionStrategy.
City: ${input.city}
Selected vibes: ${input.selectedVibes.join(", ")}
Free text: ${input.freeText ?? "none"}
Relevant memory snippets: ${input.memorySnippets?.join(" | ") ?? "none"}
`;

    const response = await axios.post(`${env.OLLAMA_BASE_URL}/api/generate`, {
      model: env.LLM_MODEL,
      prompt,
      stream: false,
      format: "json"
    });

    return JSON.parse(response.data.response) as VibeAnalysis;
  }
}

class MockLlmClient implements LlmClient {
  async analyzeVibes(input: {
    city: string;
    selectedVibes: string[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis> {
    const normalized = input.selectedVibes.flatMap((item) =>
      item
        .toLowerCase()
        .split(/[,&/]/g)
        .map((part) => part.trim())
        .filter(Boolean)
    );

    const seeds = new Set(normalized);
    const searchTerms = new Set<string>();

    if (normalized.some((value) => ["peace", "peaceful", "green", "nature", "quiet"].includes(value))) {
      searchTerms.add("botanical garden");
      searchTerms.add("ecotourism park");
      searchTerms.add("forest park");
    }

    if (normalized.some((value) => ["royal", "heritage", "grand"].includes(value))) {
      searchTerms.add("heritage fort");
      searchTerms.add("palace");
    }

    if (normalized.some((value) => ["sunset", "dreamy", "romantic"].includes(value))) {
      searchTerms.add("hill viewpoint");
      searchTerms.add("lakefront");
    }

    if (searchTerms.size === 0) {
      searchTerms.add("photography location");
      searchTerms.add("botanical garden");
    }

    return {
      normalizedVibes: Array.from(seeds),
      placeSearchTerms: Array.from(searchTerms),
      moodSummary: `The couple is leaning toward ${Array.from(seeds).join(", ")} aesthetics in ${input.city}.${input.memorySnippets?.length ? ` Memory hints: ${input.memorySnippets.join(" | ")}` : ""}`,
      expansionStrategy: "If the city has weak matches, search nearby districts and then suggest the closest stronger city options."
    };
  }
}

export function createLlmClient(): LlmClient {
  if (env.LLM_PROVIDER === "gemini") {
    return new GeminiLlmClient();
  }

  if (env.LLM_PROVIDER === "ollama") {
    return new OllamaLlmClient();
  }

  return new MockLlmClient();
}
