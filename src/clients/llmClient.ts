import axios from "axios";
import { env } from "../config/env.js";

export type SelectedVibeOption = {
  key: string;
  name: string;
};

export type VibeAnalysis = {
  normalizedVibes: string[];
  placeSearchTerms: string[];
  moodSummary: string;
  expansionStrategy: string;
};

export interface LlmClient {
  analyzeVibes(input: {
    city: string;
    selectedVibes: SelectedVibeOption[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis>;
}

class GeminiLlmClient implements LlmClient {
  async analyzeVibes(input: {
    city: string;
    selectedVibes: SelectedVibeOption[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis> {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const selectedVibesBlock = input.selectedVibes.map((vibe) => `- ${vibe.key}: ${vibe.name}`).join("\n");

    const prompt = `
You are a wedding planning backend classifier.
Return strict JSON with keys normalizedVibes, placeSearchTerms, moodSummary, expansionStrategy.
The city is "${input.city}".
The couple can only choose from preset vibe options.
Selected preset vibes:
${selectedVibesBlock || "- none"}.
Use only the selected preset vibes as the source of vibe interpretation.
Do not treat free text as new vibe labels or new vibe keywords.
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
    selectedVibes: SelectedVibeOption[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis> {
    const selectedVibesBlock = input.selectedVibes.map((vibe) => `${vibe.key}: ${vibe.name}`).join(" | ");

    const prompt = `
You are a wedding planning backend classifier.
Return minified JSON with keys normalizedVibes, placeSearchTerms, moodSummary, expansionStrategy.
City: ${input.city}
The couple can only choose from preset vibe options.
Selected preset vibes: ${selectedVibesBlock || "none"}
Use only the selected preset vibes as the source of vibe interpretation.
Do not treat free text as new vibe labels or new vibe keywords.
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
    selectedVibes: SelectedVibeOption[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis> {
    const selectedKeys = new Set(input.selectedVibes.map((item) => item.key.toLowerCase()));
    const seeds = new Set<string>();
    const searchTerms = new Set<string>();

    if (selectedKeys.has("peaceful-green")) {
      ["peaceful", "green", "nature", "quiet"].forEach((value) => seeds.add(value));
      searchTerms.add("botanical garden");
      searchTerms.add("ecotourism park");
      searchTerms.add("forest park");
    }

    if (selectedKeys.has("royal-heritage")) {
      ["royal", "heritage", "grand"].forEach((value) => seeds.add(value));
      searchTerms.add("heritage fort");
      searchTerms.add("palace");
    }

    if (selectedKeys.has("dreamy-sunset")) {
      ["dreamy", "sunset", "romantic"].forEach((value) => seeds.add(value));
      searchTerms.add("hill viewpoint");
      searchTerms.add("lakefront");
    }

    if (selectedKeys.has("urban-chic")) {
      ["urban", "chic", "modern"].forEach((value) => seeds.add(value));
      searchTerms.add("city garden");
      searchTerms.add("heritage street");
      searchTerms.add("rooftop cafe");
    }

    if (selectedKeys.has("cozy-intimate")) {
      ["cozy", "intimate", "romantic"].forEach((value) => seeds.add(value));
      searchTerms.add("courtyard cafe");
      searchTerms.add("boutique garden");
      searchTerms.add("lakeside cafe");
    }

    if (searchTerms.size === 0) {
      seeds.add("romantic");
      searchTerms.add("photography location");
      searchTerms.add("botanical garden");
    }

    return {
      normalizedVibes: Array.from(seeds),
      placeSearchTerms: Array.from(searchTerms),
      moodSummary: `The couple selected ${input.selectedVibes.map((item) => item.name).join(", ")} for ${input.city}.${input.memorySnippets?.length ? ` Memory hints: ${input.memorySnippets.join(" | ")}` : ""}`,
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
