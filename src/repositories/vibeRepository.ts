import { prisma } from "../clients/prisma.js";
import { DEFAULT_VIBE_OPTIONS } from "../constants/defaultVibes.js";

export class VibeRepository {
  async listActive() {
    return prisma.vibeOption.findMany({
      orderBy: { name: "asc" }
    });
  }

  async seedDefaults() {
    const writes = DEFAULT_VIBE_OPTIONS.map((vibe) =>
      prisma.vibeOption.upsert({
        where: { key: vibe.key },
        update: {
          name: vibe.name
        },
        create: {
          key: vibe.key,
          name: vibe.name
        }
      })
    );

    return Promise.all(writes);
  }
}
