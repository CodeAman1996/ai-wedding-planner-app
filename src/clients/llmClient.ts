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

export type WeddingThemePlan = {
  themeName: string;
  themeStory: string;
  colorPalette: string[];
  decorIdeas: string[];
  outfitIdeas: string[];
  venueStyles: string[];
  lightingStyle: string;
  photoMood: string[];
  guestExperience: string;
  foodStyle: string;
  stationeryStyle: string;
  mustAvoid: string[];
};

export interface LlmClient {
  analyzeVibes(input: {
    city: string;
    selectedVibes: SelectedVibeOption[];
    freeText?: string;
    memorySnippets?: string[];
  }): Promise<VibeAnalysis>;
  generateWeddingTheme(input: {
    city: string;
    selectedVibes: SelectedVibeOption[];
    coupleNames: string[];
    budget?: string;
    season?: string;
    weddingMonth?: string;
    guestCount?: number;
    personality?: string;
    notes?: string;
    memorySnippets?: string[];
  }): Promise<WeddingThemePlan>;
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

  async generateWeddingTheme(input: {
    city: string;
    selectedVibes: SelectedVibeOption[];
    coupleNames: string[];
    budget?: string;
    season?: string;
    weddingMonth?: string;
    guestCount?: number;
    personality?: string;
    notes?: string;
    memorySnippets?: string[];
  }): Promise<WeddingThemePlan> {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const selectedVibesBlock = input.selectedVibes.map((vibe) => `- ${vibe.key}: ${vibe.name}`).join("\n");

    const prompt = `
You are a wedding planning creative director.
Return strict JSON with keys:
themeName, themeStory, colorPalette, decorIdeas, outfitIdeas, venueStyles, lightingStyle, photoMood, guestExperience, foodStyle, stationeryStyle, mustAvoid.
The couple names are: ${input.coupleNames.join(" and ")}.
City: ${input.city}
Selected preset vibes:
${selectedVibesBlock || "- none"}.
Use only the preset vibes above as the vibe source.
Budget: ${input.budget ?? "not specified"}
Season: ${input.season ?? "not specified"}
Wedding month: ${input.weddingMonth ?? "not specified"}
Guest count: ${input.guestCount ?? "not specified"}
Couple personality: ${input.personality ?? "not specified"}
Additional notes: ${input.notes ?? "none"}
Relevant memory snippets:
${input.memorySnippets?.length ? input.memorySnippets.join("\n") : "none"}.
Keep the response practical for an Indian wedding planning backend.
Color palette should contain 3 to 5 colors.
Decor ideas, outfit ideas, venue styles, photo mood, and mustAvoid should be concise arrays.
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

    return JSON.parse(text) as WeddingThemePlan;
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

  async generateWeddingTheme(input: {
    city: string;
    selectedVibes: SelectedVibeOption[];
    coupleNames: string[];
    budget?: string;
    season?: string;
    weddingMonth?: string;
    guestCount?: number;
    personality?: string;
    notes?: string;
    memorySnippets?: string[];
  }): Promise<WeddingThemePlan> {
    const selectedVibesBlock = input.selectedVibes.map((vibe) => `${vibe.key}: ${vibe.name}`).join(" | ");

    const prompt = `
You are a wedding planning creative director.
Return minified JSON with keys themeName, themeStory, colorPalette, decorIdeas, outfitIdeas, venueStyles, lightingStyle, photoMood, guestExperience, foodStyle, stationeryStyle, mustAvoid.
Couple: ${input.coupleNames.join(" and ")}
City: ${input.city}
Selected preset vibes: ${selectedVibesBlock || "none"}
Budget: ${input.budget ?? "not specified"}
Season: ${input.season ?? "not specified"}
Wedding month: ${input.weddingMonth ?? "not specified"}
Guest count: ${input.guestCount ?? "not specified"}
Couple personality: ${input.personality ?? "not specified"}
Additional notes: ${input.notes ?? "none"}
Relevant memory snippets: ${input.memorySnippets?.join(" | ") ?? "none"}
Use only the preset vibes above as the vibe source.
`;

    const response = await axios.post(`${env.OLLAMA_BASE_URL}/api/generate`, {
      model: env.LLM_MODEL,
      prompt,
      stream: false,
      format: "json"
    });

    return JSON.parse(response.data.response) as WeddingThemePlan;
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

  async generateWeddingTheme(input: {
    city: string;
    selectedVibes: SelectedVibeOption[];
    coupleNames: string[];
    budget?: string;
    season?: string;
    weddingMonth?: string;
    guestCount?: number;
    personality?: string;
    notes?: string;
    memorySnippets?: string[];
  }): Promise<WeddingThemePlan> {
    const selectedKeys = new Set(input.selectedVibes.map((item) => item.key.toLowerCase()));
    const palette = new Set<string>(["ivory"]);
    const decorIdeas = new Set<string>(["layered florals", "ambient candles"]);
    const outfitIdeas = new Set<string>(["coordinated pastel looks"]);
    const venueStyles = new Set<string>(["garden venue"]);
    const photoMood = new Set<string>(["soft portraits", "golden-hour frames"]);
    const mustAvoid = new Set<string>(["harsh neon lighting"]);

    let themeName = "Signature Wedding Story";
    let themeStory = `A polished celebration for ${input.coupleNames.join(" and ")} in ${input.city}, blending elegance with personal warmth.`;
    let lightingStyle = "Warm diffused lighting with candle and fairy-light accents.";
    let guestExperience = "Relaxed, graceful, and personal with thoughtful hospitality touches.";
    let foodStyle = "A balanced regional menu with elevated live counters.";
    let stationeryStyle = "Refined print suite with textured paper and understated detailing.";

    if (selectedKeys.has("peaceful-green")) {
      themeName = "Whispering Garden";
      themeStory = `A calm nature-led wedding in ${input.city} with soft romance, greenery, and intimate elegance.`;
      ["sage", "eucalyptus", "soft beige"].forEach((item) => palette.add(item));
      ["wild greenery tablescapes", "botanical aisle styling"].forEach((item) => decorIdeas.add(item));
      ["sage lehenga accents", "ivory sherwani styling"].forEach((item) => outfitIdeas.add(item));
      ["botanical garden", "eco-resort lawn"].forEach((item) => venueStyles.add(item));
      ["quiet candid moments", "leaf-framed couple shots"].forEach((item) => photoMood.add(item));
      mustAvoid.add("overly metallic decor");
    }

    if (selectedKeys.has("royal-heritage")) {
      themeName = "Royal Garden Reverie";
      themeStory = `A heritage-forward celebration in ${input.city} that balances regal details with romantic softness.`;
      ["antique gold", "dusty rose"].forEach((item) => palette.add(item));
      ["brass lamps", "arched floral installations"].forEach((item) => decorIdeas.add(item));
      ["embroidered regal silhouettes", "heritage jewelry styling"].forEach((item) => outfitIdeas.add(item));
      ["haveli courtyard", "palace lawn"].forEach((item) => venueStyles.add(item));
      ["grand entry frames", "architectural portraits"].forEach((item) => photoMood.add(item));
      mustAvoid.add("minimalist industrial decor");
    }

    if (selectedKeys.has("dreamy-sunset")) {
      ["peach", "blush"].forEach((item) => palette.add(item));
      ["sunset aisle setup", "floating candles"].forEach((item) => decorIdeas.add(item));
      ["sunset-toned drapes", "light-reflective fabrics"].forEach((item) => outfitIdeas.add(item));
      ["lakefront deck", "sunset viewpoint lawn"].forEach((item) => venueStyles.add(item));
      ["sun flare portraits", "silhouette shots"].forEach((item) => photoMood.add(item));
      lightingStyle = "Golden-hour photography followed by warm lantern and fairy-light ambience.";
      mustAvoid.add("midday outdoor ceremony timing");
    }

    if (selectedKeys.has("urban-chic")) {
      ["charcoal", "champagne"].forEach((item) => palette.add(item));
      ["modern lounge seating", "clean line stage design"].forEach((item) => decorIdeas.add(item));
      ["structured contemporary silhouettes", "statement accessories"].forEach((item) => outfitIdeas.add(item));
      ["rooftop venue", "design-led banquet"].forEach((item) => venueStyles.add(item));
      ["editorial couple portraits", "city-light detail shots"].forEach((item) => photoMood.add(item));
      stationeryStyle = "Modern editorial stationery with minimal typography and luxe finishes.";
    }

    if (selectedKeys.has("cozy-intimate")) {
      ["rosewood", "soft mauve"].forEach((item) => palette.add(item));
      ["family-style seating", "cluster candle decor"].forEach((item) => decorIdeas.add(item));
      ["comfort-led festive outfits", "soft layered styling"].forEach((item) => outfitIdeas.add(item));
      ["boutique lawn", "courtyard venue"].forEach((item) => venueStyles.add(item));
      ["close family candids", "table conversation moments"].forEach((item) => photoMood.add(item));
      guestExperience = "Warm, emotionally rich, and intentionally intimate with close-knit hosting.";
      mustAvoid.add("oversized stage-heavy setup");
    }

    if (input.budget?.toLowerCase().includes("budget")) {
      mustAvoid.add("large imported floral installations");
    }

    if (input.notes?.trim()) {
      themeStory = `${themeStory} Special note: ${input.notes.trim()}`;
    }

    if (input.memorySnippets?.length) {
      guestExperience = `${guestExperience} Built around the couple's stored preferences and planning history.`;
    }

    return {
      themeName,
      themeStory,
      colorPalette: Array.from(palette).slice(0, 5),
      decorIdeas: Array.from(decorIdeas).slice(0, 6),
      outfitIdeas: Array.from(outfitIdeas).slice(0, 6),
      venueStyles: Array.from(venueStyles).slice(0, 5),
      lightingStyle,
      photoMood: Array.from(photoMood).slice(0, 6),
      guestExperience,
      foodStyle,
      stationeryStyle,
      mustAvoid: Array.from(mustAvoid).slice(0, 5)
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
