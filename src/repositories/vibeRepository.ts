import { prisma } from "../clients/prisma.js";

export class VibeRepository {
  async listActive() {
    return prisma.vibeOption.findMany({
      orderBy: { name: "asc" }
    });
  }

  async findByKeys(keys: string[]) {
    if (keys.length === 0) {
      return [];
    }

    return prisma.vibeOption.findMany({
      where: {
        key: {
          in: keys
        }
      }
    });
  }
}
