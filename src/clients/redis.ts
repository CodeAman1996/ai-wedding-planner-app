import Redis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

type CachedRecord = {
  expiresAt: number;
  value: unknown;
};

class InMemoryCache {
  private readonly store = new Map<string, CachedRecord>();

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) {
      return null;
    }

    if (item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  set(key: string, value: unknown, ttlSeconds: number) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }
}

const localCache = new InMemoryCache();

let redis: Redis | null = null;

if (env.ENABLE_REDIS && env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  redis.on("error", (error) => {
    logger.warn({ error }, "Redis unavailable, falling back to in-memory cache");
  });

  redis.connect().catch((error) => {
    logger.warn({ error }, "Redis connect failed, using in-memory cache");
    redis = null;
  });
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) {
      return localCache.get<T>(key);
    }

    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set(key: string, value: unknown, ttlSeconds: number) {
    if (!redis) {
      localCache.set(key, value, ttlSeconds);
      return;
    }

    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }
};
