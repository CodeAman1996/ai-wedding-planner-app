import { prisma } from "../clients/prisma.js";
import { createLlmClient, type SelectedVibeOption } from "../clients/llmClient.js";
import { VibeRepository } from "../repositories/vibeRepository.js";
import { HttpError } from "../utils/httpError.js";
import { KnowledgeBaseService } from "./knowledgeBaseService.js";

type GenerateWeddingThemeInput = {
  userId: number;
  selectedVibes: string[];
  city?: string;
  budget?: string;
  season?: string;
  weddingMonth?: string;
  guestCount?: number;
  personality?: string;
  notes?: string;
};

export class WeddingThemeService {
  private readonly llmClient = createLlmClient();
  private readonly vibeRepository = new VibeRepository();
  private readonly knowledgeBaseService = new KnowledgeBaseService();

  async generate(input: GenerateWeddingThemeInput) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { profile: true }
    });

    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    const selectedVibeOptions = await this.resolveSelectedVibeOptions(input.selectedVibes);
    const selectedVibeNames = selectedVibeOptions.map((item) => item.name);
    const city = input.city?.trim() || user.profile?.homeCity;

    if (!city) {
      throw new HttpError(400, "City is required to generate a wedding theme.");
    }

    const budget = input.budget?.trim() || user.profile?.preferredBudget || undefined;
    const personality = input.personality?.trim() || undefined;
    const notes = input.notes?.trim() || undefined;

    const memory = await this.knowledgeBaseService.retrieveRelevantContext(input.userId, [
      city,
      ...selectedVibeNames,
      budget ?? "",
      personality ?? "",
      notes ?? ""
    ]);

    const plan = await this.llmClient.generateWeddingTheme({
      city,
      selectedVibes: selectedVibeOptions,
      coupleNames: [user.firstName, user.profile?.partnerName ?? "Partner"],
      budget,
      season: input.season,
      weddingMonth: input.weddingMonth,
      guestCount: input.guestCount,
      personality,
      notes,
      memorySnippets: memory.map((item) => item.content)
    });

    const weddingTheme = await prisma.weddingTheme.create({
      data: {
        userId: input.userId,
        city,
        season: input.season,
        weddingMonth: input.weddingMonth,
        guestCount: input.guestCount,
        budget,
        personality,
        selectedVibeKeys: selectedVibeOptions.map((item) => item.key),
        selectedVibeNames,
        themeName: plan.themeName,
        themeStory: plan.themeStory,
        colorPalette: plan.colorPalette,
        decorIdeas: plan.decorIdeas,
        outfitIdeas: plan.outfitIdeas,
        venueStyles: plan.venueStyles,
        lightingStyle: plan.lightingStyle,
        photoMood: plan.photoMood,
        guestExperience: plan.guestExperience,
        foodStyle: plan.foodStyle,
        stationeryStyle: plan.stationeryStyle,
        mustAvoid: plan.mustAvoid
      }
    });

    const knowledgeDocument = await this.knowledgeBaseService.rememberWeddingTheme({
      userId: input.userId,
      city,
      selectedVibes: selectedVibeNames,
      themeName: plan.themeName,
      themeStory: plan.themeStory,
      colorPalette: plan.colorPalette,
      decorIdeas: plan.decorIdeas,
      venueStyles: plan.venueStyles,
      lightingStyle: plan.lightingStyle,
      guestExperience: plan.guestExperience,
      foodStyle: plan.foodStyle,
      stationeryStyle: plan.stationeryStyle,
      mustAvoid: plan.mustAvoid
    });

    return {
      id: weddingTheme.id,
      knowledgeDocumentId: knowledgeDocument.id,
      userId: weddingTheme.userId,
      city: weddingTheme.city,
      season: weddingTheme.season,
      weddingMonth: weddingTheme.weddingMonth,
      guestCount: weddingTheme.guestCount,
      budget: weddingTheme.budget,
      personality: weddingTheme.personality,
      selectedVibes: selectedVibeOptions,
      themeName: weddingTheme.themeName,
      themeStory: weddingTheme.themeStory,
      colorPalette: plan.colorPalette,
      decorIdeas: plan.decorIdeas,
      outfitIdeas: plan.outfitIdeas,
      venueStyles: plan.venueStyles,
      lightingStyle: plan.lightingStyle,
      photoMood: plan.photoMood,
      guestExperience: plan.guestExperience,
      foodStyle: plan.foodStyle,
      stationeryStyle: plan.stationeryStyle,
      mustAvoid: plan.mustAvoid,
      usedMemory: memory,
      createdAt: weddingTheme.createdAt
    };
  }

  private async resolveSelectedVibeOptions(selectedVibes: string[]): Promise<SelectedVibeOption[]> {
    const requestedKeys = Array.from(new Set(selectedVibes.map((item) => item.trim().toLowerCase()).filter(Boolean)));
    const vibeOptions = await this.vibeRepository.findByKeys(requestedKeys);

    if (vibeOptions.length === 0) {
      throw new HttpError(400, "Select at least one valid vibe option.");
    }

    const vibeByKey = new Map(vibeOptions.map((item) => [item.key.toLowerCase(), item] as const));
    const resolved = requestedKeys
      .map((key) => vibeByKey.get(key))
      .filter((item): item is (typeof vibeOptions)[number] => Boolean(item))
      .map((item) => ({
        key: item.key,
        name: item.name
      }));

    if (resolved.length === 0) {
      throw new HttpError(400, "Select at least one valid vibe option.");
    }

    return resolved;
  }
}
