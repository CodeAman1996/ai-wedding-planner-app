import { KnowledgeKind, Prisma } from "@prisma/client";
import { prisma } from "../clients/prisma.js";
import { chunkText } from "../utils/chunkText.js";

type CoupleProfileMemoryInput = {
  userId: number;
  firstName: string;
  lastName?: string;
  partnerName: string;
  homeCity: string;
  preferredBudget?: string;
  preferredRadiusKm: number;
};

type RecommendationMemoryInput = {
  userId: number;
  city: string;
  selectedVibes: string[];
  derivedTags: string[];
  llmSummary: string;
  expansionStrategy: string;
  suggestions: Array<{
    placeId: string;
    name: string;
    address?: string;
    types: string[];
    rating?: number;
    userRatingsTotal?: number;
    latitude?: number;
    longitude?: number;
    sourceUri?: string;
    score: number;
    reason: string;
  }>;
};

type WeddingThemeMemoryInput = {
  userId: number;
  city: string;
  selectedVibes: string[];
  themeName: string;
  themeStory: string;
  colorPalette: string[];
  decorIdeas: string[];
  venueStyles: string[];
  lightingStyle: string;
  guestExperience: string;
  foodStyle: string;
  stationeryStyle: string;
  mustAvoid: string[];
};

export class KnowledgeBaseService {
  async listDocuments(userId: number, limit = 20) {
    return prisma.knowledgeDocument.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        chunks: {
          orderBy: { chunkIndex: "asc" }
        }
      }
    });
  }

  async upsertProfileMemory(input: CoupleProfileMemoryInput) {
    const title = `${input.firstName} and ${input.partnerName} profile`;
    const content = [
      `Couple profile for ${input.firstName}${input.lastName ? ` ${input.lastName}` : ""} and ${input.partnerName}.`,
      `Home city is ${input.homeCity}.`,
      `Preferred budget is ${input.preferredBudget ?? "not specified"}.`,
      `Preferred search radius is ${input.preferredRadiusKm} km.`
    ].join(" ");

    const keywords = [input.homeCity, input.preferredBudget, input.firstName, input.partnerName]
      .filter(Boolean)
      .map((value) => value!.toLowerCase());

    const document = await prisma.knowledgeDocument.upsert({
      where: { referenceKey: `profile:${input.userId}` },
      update: {
        title,
        content,
        keywords,
        metadata: {
          homeCity: input.homeCity,
          preferredBudget: input.preferredBudget,
          preferredRadiusKm: input.preferredRadiusKm
        }
      },
      create: {
        userId: input.userId,
        kind: KnowledgeKind.PROFILE,
        referenceKey: `profile:${input.userId}`,
        title,
        content,
        keywords,
        metadata: {
          homeCity: input.homeCity,
          preferredBudget: input.preferredBudget,
          preferredRadiusKm: input.preferredRadiusKm
        },
        source: "system:onboarding"
      }
    });

    await this.replaceChunks(document.id, content, keywords);

    return document;
  }

  async rememberRecommendation(input: RecommendationMemoryInput) {
    const title = `Location planning for ${input.city}`;
    const content = [
      `Recommendation request for ${input.city}.`,
      `Selected vibes: ${input.selectedVibes.join(", ")}.`,
      `Derived tags: ${input.derivedTags.join(", ")}.`,
      `Planner summary: ${input.llmSummary}.`,
      `Expansion strategy: ${input.expansionStrategy}.`,
      `Suggested places: ${input.suggestions
        .map((place) => `${place.name} (${place.reason})`)
        .join("; ")}.`
    ].join(" ");

    const keywords = Array.from(
      new Set(
        [input.city, ...input.selectedVibes, ...input.derivedTags, ...input.suggestions.flatMap((place) => place.types)].map(
          (value) => value.toLowerCase()
        )
      )
    );

    const document = await prisma.knowledgeDocument.create({
      data: {
        userId: input.userId,
        kind: KnowledgeKind.RECOMMENDATION,
        referenceKey: `recommendation:${input.userId}:${Date.now()}`,
        title,
        content,
        keywords,
        metadata: {
          city: input.city,
          selectedVibes: input.selectedVibes,
          derivedTags: input.derivedTags,
          suggestions: input.suggestions
        },
        source: "system:recommendation"
      }
    });

    await this.replaceChunks(document.id, content, keywords);

    return document;
  }

  async rememberWeddingTheme(input: WeddingThemeMemoryInput) {
    const title = `Wedding theme for ${input.city}: ${input.themeName}`;
    const content = [
      `Wedding theme for ${input.city}.`,
      `Selected vibes: ${input.selectedVibes.join(", ")}.`,
      `Theme name: ${input.themeName}.`,
      `Theme story: ${input.themeStory}.`,
      `Color palette: ${input.colorPalette.join(", ")}.`,
      `Decor direction: ${input.decorIdeas.join(", ")}.`,
      `Venue styles: ${input.venueStyles.join(", ")}.`,
      `Lighting style: ${input.lightingStyle}.`,
      `Guest experience: ${input.guestExperience}.`,
      `Food style: ${input.foodStyle}.`,
      `Stationery style: ${input.stationeryStyle}.`,
      `Avoid: ${input.mustAvoid.join(", ")}.`
    ].join(" ");

    const keywords = Array.from(
      new Set(
        [
          input.city,
          ...input.selectedVibes,
          input.themeName,
          ...input.colorPalette,
          ...input.venueStyles,
          ...input.mustAvoid
        ].map((value) => value.toLowerCase())
      )
    );

    const document = await prisma.knowledgeDocument.create({
      data: {
        userId: input.userId,
        kind: KnowledgeKind.THEME,
        referenceKey: `theme:${input.userId}:${Date.now()}`,
        title,
        content,
        keywords,
        metadata: {
          city: input.city,
          selectedVibes: input.selectedVibes,
          themeName: input.themeName,
          colorPalette: input.colorPalette,
          decorIdeas: input.decorIdeas,
          venueStyles: input.venueStyles,
          mustAvoid: input.mustAvoid
        },
        source: "system:theme-generator"
      }
    });

    await this.replaceChunks(document.id, content, keywords);

    return document;
  }

  async retrieveRelevantContext(userId: number, terms: string[], limit = 6) {
    const normalizedTerms = Array.from(
      new Set(
        terms
          .map((term) => term.trim().toLowerCase())
          .filter((term) => term.length >= 3)
      )
    );

    if (normalizedTerms.length === 0) {
      return [];
    }

    const chunks = await prisma.knowledgeChunk.findMany({
      where: {
        document: {
          userId
        },
        OR: normalizedTerms.map((term) => ({
          content: {
            contains: term,
            mode: "insensitive"
          }
        }))
      },
      include: {
        document: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    return chunks.map((chunk) => ({
      documentId: chunk.documentId,
      documentTitle: chunk.document.title,
      kind: chunk.document.kind,
      content: chunk.content
    }));
  }

  private async replaceChunks(documentId: number, content: string, keywords: string[]) {
    const chunks = chunkText(content);

    await prisma.$transaction([
      prisma.knowledgeChunk.deleteMany({
        where: { documentId }
      }),
      ...chunks.map((chunk, index) =>
        prisma.knowledgeChunk.create({
          data: {
            documentId,
            chunkIndex: index,
            content: chunk,
            keywords
          }
        })
      )
    ]);
  }
}
