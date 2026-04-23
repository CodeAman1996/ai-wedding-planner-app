import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off", ""].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const stringArrayFromEnv = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}, z.array(z.string()));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  ENABLE_REDIS: booleanFromEnv.default(false),
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  LLM_PROVIDER: z.enum(["gemini", "ollama", "mock"]).default("mock"),
  LLM_MODEL: z.string().default("gemini-2.5-flash-lite"),
  NOMINATIM_BASE_URL: z.string().default("https://nominatim.openstreetmap.org"),
  OVERPASS_API_URL: z.string().default("https://overpass-api.de/api/interpreter"),
  OVERPASS_FALLBACK_URLS: stringArrayFromEnv.default(["https://overpass.private.coffee/api/interpreter"]),
  OVERPASS_TIMEOUT_MS: z.coerce.number().default(45000),
  OSM_USER_AGENT: z.string().default("ai-wedding-planner/0.1 (contact: your-email@example.com)"),
  CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  BASE_SEARCH_RADIUS_KM: z.coerce.number().default(25),
  EXPANDED_SEARCH_RADIUS_KM: z.coerce.number().default(80),
  MAX_LOCATION_RESULTS: z.coerce.number().default(12)
});

export const env = envSchema.parse(process.env);
