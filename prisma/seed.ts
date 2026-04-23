import { PrismaClient } from "@prisma/client";
import { DEFAULT_VIBE_OPTIONS } from "../src/constants/defaultVibes.js";

const prisma = new PrismaClient();

async function main() {
  for (const vibe of DEFAULT_VIBE_OPTIONS) {
    await prisma.vibeOption.upsert({
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
    });
  }

  console.log(`Seeded ${DEFAULT_VIBE_OPTIONS.length} vibe options.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
