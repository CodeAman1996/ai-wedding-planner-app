import { cache } from "../clients/redis.js";
import { createLlmClient, type SelectedVibeOption } from "../clients/llmClient.js";
import { OsmClient, type GeocodeResult, type OsmPlace } from "../clients/osmClient.js";
import { env } from "../config/env.js";
import { VibeRepository } from "../repositories/vibeRepository.js";
import { HttpError } from "../utils/httpError.js";
import { KnowledgeBaseService } from "./knowledgeBaseService.js";

type RecommendationInput = {
  userId: number;
  city: string;
  selectedVibes: string[];
  freeText?: string;
  allowNearbySearch?: boolean;
};

type RankedPlace = {
  place: OsmPlace;
  score: number;
  reason: string;
};

export class RecommendationService {
  private readonly llmClient = createLlmClient();
  private readonly mapsClient = new OsmClient();
  private readonly knowledgeBaseService = new KnowledgeBaseService();
  private readonly vibeRepository = new VibeRepository();

  async generate(input: RecommendationInput) {
    const selectedVibeOptions = await this.resolveSelectedVibeOptions(input.selectedVibes);
    const selectedVibeNames = selectedVibeOptions.map((item) => item.name);

    const memory = await this.knowledgeBaseService.retrieveRelevantContext(input.userId, [
      input.city,
      ...selectedVibeNames,
      input.freeText ?? ""
    ]);

    const analysis = await this.llmClient.analyzeVibes({
      city: input.city,
      selectedVibes: selectedVibeOptions,
      freeText: input.freeText,
      memorySnippets: memory.map((item) => item.content)
    });

    const geocode = await this.mapsClient.geocodeCity(input.city);
    if (!geocode) {
      throw new Error(`Could not geocode city: ${input.city}`);
    }

    const allPlaces = await this.findPlaces(geocode, analysis.placeSearchTerms, input.allowNearbySearch ?? true);
    const ranked = this.rankPlaces(allPlaces, analysis.normalizedVibes).slice(0, env.MAX_LOCATION_RESULTS);

    const suggestions = ranked.map((entry) => ({
      placeId: entry.place.id,
      name: entry.place.name ?? "Unknown place",
      address: entry.place.formattedAddress,
      types: entry.place.types ?? [],
      rating: entry.place.rating,
      userRatingsTotal: entry.place.userRatingCount,
      latitude: entry.place.location?.latitude,
      longitude: entry.place.location?.longitude,
      sourceUri: entry.place.sourceUri,
      score: Number(entry.score.toFixed(2)),
      reason: entry.reason
    }));

    const knowledgeDocument = await this.knowledgeBaseService.rememberRecommendation({
      userId: input.userId,
      city: input.city,
      selectedVibes: selectedVibeNames,
      derivedTags: analysis.normalizedVibes,
      llmSummary: analysis.moodSummary,
      expansionStrategy: analysis.expansionStrategy,
      suggestions
    });

    return {
      knowledgeDocumentId: knowledgeDocument.id,
      city: input.city,
      coordinates: geocode,
      selectedVibes: selectedVibeOptions,
      normalizedVibes: analysis.normalizedVibes,
      searchTerms: analysis.placeSearchTerms,
      llmSummary: analysis.moodSummary,
      expansionStrategy: analysis.expansionStrategy,
      usedMemory: memory,
      suggestions
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

  private async findPlaces(geocode: GeocodeResult, searchTerms: string[], allowNearbySearch: boolean) {
    const seen = new Map<string, OsmPlace>();

    for (const term of searchTerms) {
      const cacheKey = `places:${geocode.formattedAddress}:${term}:base`;
      const cached = await cache.get<OsmPlace[]>(cacheKey);
      const results =
        cached ??
        (await this.mapsClient.searchText(
          term,
          env.MAX_LOCATION_RESULTS,
          {
            latitude: geocode.latitude,
            longitude: geocode.longitude,
            city: geocode.formattedAddress
          },
          env.BASE_SEARCH_RADIUS_KM
        ));

      if (!cached) {
        await cache.set(cacheKey, results, env.CACHE_TTL_SECONDS);
      }

      for (const place of results) {
        seen.set(place.id, place);
      }

      if (allowNearbySearch && results.length < 3) {
        const nearbyCacheKey = `places:${geocode.formattedAddress}:${term}:expanded`;
        const nearbyCached = await cache.get<OsmPlace[]>(nearbyCacheKey);
        const nearbyResults =
          nearbyCached ??
          (await this.mapsClient.searchText(
            term,
            env.MAX_LOCATION_RESULTS,
            {
              latitude: geocode.latitude,
              longitude: geocode.longitude,
              city: geocode.formattedAddress
            },
            env.EXPANDED_SEARCH_RADIUS_KM
          ));

        if (!nearbyCached) {
          await cache.set(nearbyCacheKey, nearbyResults, env.CACHE_TTL_SECONDS);
        }

        for (const place of nearbyResults) {
          seen.set(place.id, place);
        }
      }
    }

    return Array.from(seen.values());
  }

  private rankPlaces(places: OsmPlace[], vibes: string[]): RankedPlace[] {
    const normalizedVibes = vibes.map((item) => item.toLowerCase());

    return places
      .map((place) => {
        const types = (place.types ?? []).map((item) => item.toLowerCase());
        let score = 0;
        const reasons: string[] = [];

        if (normalizedVibes.some((value) => ["peace", "peaceful", "green", "nature", "quiet"].includes(value))) {
          if (
            types.some((type) =>
              ["park", "garden", "garden:botanical", "wood", "forest", "national_park", "protected_area"].includes(type)
            )
          ) {
            score += 30;
            reasons.push("Strong nature match for a calm and green pre-wedding shoot.");
          }
        }

        if (normalizedVibes.some((value) => ["royal", "heritage", "grand"].includes(value))) {
          if (types.some((type) => ["museum", "castle", "fort", "monument", "ruins"].includes(type))) {
            score += 22;
            reasons.push("Fits a heritage and classic photo-story look.");
          }
        }

        if (normalizedVibes.some((value) => ["sunset", "dreamy", "romantic"].includes(value))) {
          if (types.some((type) => ["viewpoint", "peak", "park", "water", "lake"].includes(type))) {
            score += 18;
            reasons.push("Likely to support scenic and cinematic golden-hour frames.");
          }
        }

        const importanceBoost = (place.importance ?? 0) * 25;
        score += importanceBoost;

        if (reasons.length === 0) {
          reasons.push("Worth considering based on general popularity and visual potential.");
        }

        return {
          place,
          score,
          reason: reasons.join(" ")
        };
      })
      .sort((left, right) => right.score - left.score);
  }
}
