import { prisma } from "../clients/prisma.js";
import { DEFAULT_VIBE_OPTIONS } from "../constants/defaultVibes.js";

export class VibeRepository {
  async listActive() {
    return prisma.vibeOption.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
  }

  async seedDefaults() {
    const writes = DEFAULT_VIBE_OPTIONS.map((vibe) =>
      prisma.vibeOption.upsert({
        where: { key: vibe.key },
        update: {
          name: vibe.name,
          description: vibe.description,
          tags: vibe.tags,
          placeHints: vibe.placeHints,
          isActive: true
        },
        create: {
          key: vibe.key,
          name: vibe.name,
          description: vibe.description,
          tags: vibe.tags,
          placeHints: vibe.placeHints,
          isActive: true
        }
      })
    );

    return Promise.all(writes);
  }
}
