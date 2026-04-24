import axios from "axios";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export type GeocodeResult = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export type OsmPlace = {
  id: string;
  name: string;
  formattedAddress?: string;
  types: string[];
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  sourceUri?: string;
  importance?: number;
  source: "overpass";
};

type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type NominatimSearchResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name?: string;
  name?: string;
  type?: string;
  category?: string;
  importance?: number;
  osm_type?: string;
  osm_id?: number;
};

type SearchLocation = {
  latitude: number;
  longitude: number;
  city: string;
};

const TERM_SELECTORS: Array<{
  matcher: RegExp;
  selectors: Array<{ key: string; value: string }>;
}> = [
  {
    matcher: /(botanical|garden)/i,
    selectors: [
      { key: "leisure", value: "garden" },
      { key: "garden:type", value: "botanical" },
      { key: "leisure", value: "park" }
    ]
  },
  {
    matcher: /(forest|woods?|jungle|green|eco)/i,
    selectors: [
      { key: "natural", value: "wood" },
      { key: "landuse", value: "forest" },
      { key: "boundary", value: "national_park" },
      { key: "boundary", value: "protected_area" },
      { key: "leisure", value: "park" }
    ]
  },
  {
    matcher: /(lake|lakeside|lakefront|riverfront|water)/i,
    selectors: [
      { key: "natural", value: "water" },
      { key: "water", value: "lake" },
      { key: "waterway", value: "riverbank" },
      { key: "leisure", value: "park" }
    ]
  },
  {
    matcher: /(hill|sunset|viewpoint|peak)/i,
    selectors: [
      { key: "tourism", value: "viewpoint" },
      { key: "natural", value: "peak" },
      { key: "natural", value: "hill" }
    ]
  },
  {
    matcher: /(royal|heritage|fort|palace|castle|stepwell)/i,
    selectors: [
      { key: "historic", value: "castle" },
      { key: "historic", value: "fort" },
      { key: "historic", value: "monument" },
      { key: "tourism", value: "museum" },
      { key: "historic", value: "ruins" }
    ]
  },
  {
    matcher: /(museum|art|creative|urban|studio)/i,
    selectors: [
      { key: "tourism", value: "museum" },
      { key: "tourism", value: "artwork" },
      { key: "amenity", value: "arts_centre" },
      { key: "amenity", value: "cafe" }
    ]
  },
  {
    matcher: /(vineyard|orchard|homestay|boutique|cozy|intimate)/i,
    selectors: [
      { key: "landuse", value: "vineyard" },
      { key: "landuse", value: "orchard" },
      { key: "tourism", value: "guest_house" },
      { key: "tourism", value: "hotel" },
      { key: "amenity", value: "cafe" }
    ]
  }
];

export class OsmClient {
  private readonly http = axios.create({
    headers: {
      "User-Agent": env.OSM_USER_AGENT
    },
    timeout: env.OVERPASS_TIMEOUT_MS
  });

  async geocodeCity(city: string): Promise<GeocodeResult | null> {
    const response = await this.http.get(`${env.NOMINATIM_BASE_URL}/search`, {
      params: {
        q: city,
        format: "jsonv2",
        limit: 1,
        addressdetails: 1
      }
    });

    const first = response.data?.[0];
    if (!first) {
      return null;
    }

    return {
      formattedAddress: first.display_name ?? city,
      latitude: Number(first.lat),
      longitude: Number(first.lon)
    };
  }

  async searchText(term: string, pageSize: number, location: SearchLocation, radiusKm: number): Promise<OsmPlace[]> {
    const selectors = this.getSelectorsForTerm(term);
    const radiusMeters = Math.max(1000, Math.round(radiusKm * 1000));
    const seen = new Map<string, OsmPlace>();
    let overpassFailed = false;
    let shouldShortCircuitToFallback = false;

    for (const selector of selectors.slice(0, 4)) {
      if (shouldShortCircuitToFallback) {
        break;
      }

      const query = this.buildOverpassQuery([selector], null, location, radiusMeters);
      let elements: OverpassElement[] = [];

      try {
        elements = await this.fetchElements(query);
      } catch (error) {
        overpassFailed = true;
        shouldShortCircuitToFallback = this.shouldShortCircuit(error);
        logger.warn(
          {
            term,
            selector,
            shortCircuitToFallback: shouldShortCircuitToFallback,
            error: this.summarizeError(error)
          },
          "Overpass selector query failed"
        );
        continue;
      }

      for (const element of elements) {
        const place = this.mapElementToPlace(element, location.city);
        if (place) {
          seen.set(place.id, place);
        }
      }

      if (seen.size >= pageSize) {
        break;
      }
    }

    if (seen.size < pageSize) {
      const nameRegex = this.buildNameRegex(term);
      if (nameRegex && !shouldShortCircuitToFallback) {
        const nameQuery = this.buildOverpassQuery([], nameRegex, location, radiusMeters, true);
        try {
          const elements = await this.fetchElements(nameQuery);

          for (const element of elements) {
            const place = this.mapElementToPlace(element, location.city);
            if (place) {
              seen.set(place.id, place);
            }
          }
        } catch (error) {
          overpassFailed = true;
          shouldShortCircuitToFallback = this.shouldShortCircuit(error);
          logger.warn(
            {
              term,
              shortCircuitToFallback: shouldShortCircuitToFallback,
              error: this.summarizeError(error)
            },
            "Overpass name query failed"
          );
        }
      }
    }

    if (seen.size === 0 && overpassFailed) {
      logger.warn({ term, city: location.city }, "Falling back to Nominatim text search because Overpass is unavailable");

      const fallbackPlaces = await this.searchWithNominatim(term, pageSize, location.city);
      for (const place of fallbackPlaces) {
        seen.set(place.id, place);
      }
    }

    return Array.from(seen.values()).slice(0, pageSize);
  }

  private async searchWithNominatim(term: string, pageSize: number, city: string): Promise<OsmPlace[]> {
    const response = await this.http.get(`${env.NOMINATIM_BASE_URL}/search`, {
      params: {
        q: `${term} in ${city}`,
        format: "jsonv2",
        limit: pageSize,
        addressdetails: 1
      }
    });

    const results = (response.data ?? []) as NominatimSearchResult[];

    return results
      .map((result) => this.mapNominatimResultToPlace(result, city))
      .filter((place): place is OsmPlace => Boolean(place));
  }

  private buildOverpassQuery(
    selectors: Array<{ key: string; value: string }>,
    nameValue: string | null,
    location: SearchLocation,
    radiusMeters: number,
    isRegex = false
  ) {
    const blocks = selectors.map(
      ({ key, value }) =>
        `nwr(around:${radiusMeters},${location.latitude},${location.longitude})["${this.escapeQuotes(key)}"="${this.escapeQuotes(value)}"];`
    );

    if (nameValue) {
      blocks.push(
        isRegex
          ? `nwr(around:${radiusMeters},${location.latitude},${location.longitude})["name"~"${nameValue}",i];`
          : `nwr(around:${radiusMeters},${location.latitude},${location.longitude})["name"="${this.escapeQuotes(nameValue)}"];`
      );
    }

    return `
[out:json][timeout:20];
(
  ${blocks.join("\n  ")}
);
out center tags;
`;
  }

  private async fetchElements(query: string) {
    const endpoints = [env.OVERPASS_API_URL, ...env.OVERPASS_FALLBACK_URLS].filter(Boolean);
    let lastError: unknown;

    for (const endpoint of endpoints) {
      try {
        const response = await this.http.post(
          endpoint,
          new URLSearchParams({
            data: query
          }).toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": env.OSM_USER_AGENT
            },
            timeout: env.OVERPASS_TIMEOUT_MS
          }
        );

        return (response.data?.elements ?? []) as OverpassElement[];
      } catch (error) {
        lastError = error;
        logger.warn({ endpoint, error: this.summarizeError(error) }, "Overpass request failed, trying next endpoint if available");
      }
    }

    throw lastError;
  }

  private shouldShortCircuit(error: unknown) {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    return [429, 502, 503, 504].includes(error.response?.status ?? 0);
  }

  private summarizeError(error: unknown) {
    if (!axios.isAxiosError(error)) {
      return error;
    }

    return {
      message: error.message,
      code: error.code,
      status: error.response?.status
    };
  }

  private getSelectorsForTerm(term: string) {
    const collected = TERM_SELECTORS.filter((entry) => entry.matcher.test(term)).flatMap((entry) => entry.selectors);

    if (collected.length > 0) {
      return this.deduplicateSelectors(collected);
    }

    return [
      { key: "tourism", value: "attraction" },
      { key: "leisure", value: "park" },
      { key: "natural", value: "wood" }
    ];
  }

  private deduplicateSelectors(selectors: Array<{ key: string; value: string }>) {
    const seen = new Set<string>();
    return selectors.filter((selector) => {
      const signature = `${selector.key}:${selector.value}`;
      if (seen.has(signature)) {
        return false;
      }
      seen.add(signature);
      return true;
    });
  }

  private buildNameRegex(term: string) {
    const parts = term
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((part) => part.length >= 4)
      .slice(0, 4);

    if (parts.length === 0) {
      return null;
    }

    return parts.map((part) => this.escapeRegex(part)).join("|");
  }

  private mapElementToPlace(element: OverpassElement, fallbackCity: string): OsmPlace | null {
    const tags = element.tags ?? {};
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;

    if (!latitude || !longitude) {
      return null;
    }

    const types = this.extractTypes(tags);
    const name = tags.name ?? tags["official_name"] ?? `${types[0] ?? "place"} in ${fallbackCity}`;
    const address = this.formatAddress(tags, fallbackCity);

    return {
      id: `${element.type}/${element.id}`,
      name,
      formattedAddress: address,
      types,
      location: {
        latitude,
        longitude
      },
      importance: this.estimateImportance(tags),
      sourceUri: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      source: "overpass"
    };
  }

  private mapNominatimResultToPlace(result: NominatimSearchResult, fallbackCity: string): OsmPlace | null {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    const types = [result.category, result.type]
      .filter(Boolean)
      .map((value) => value!.toLowerCase());

    const name =
      result.name ??
      result.display_name?.split(",")[0]?.trim() ??
      `${types[0] ?? "place"} in ${fallbackCity}`;

    return {
      id: result.osm_id ? `${result.osm_type ?? "node"}/${result.osm_id}` : `nominatim/${result.place_id}`,
      name,
      formattedAddress: result.display_name ?? fallbackCity,
      types: Array.from(new Set(types)),
      location: {
        latitude,
        longitude
      },
      importance: result.importance ?? 0,
      sourceUri:
        result.osm_id && result.osm_type
          ? `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`
          : undefined,
      source: "overpass"
    };
  }

  private extractTypes(tags: Record<string, string>) {
    const typeKeys = ["tourism", "leisure", "natural", "historic", "amenity", "boundary", "landuse", "water"];
    const values = typeKeys
      .map((key) => tags[key])
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    if (tags["garden:type"]) {
      values.push(`garden:${tags["garden:type"].toLowerCase()}`);
    }

    return Array.from(new Set(values));
  }

  private formatAddress(tags: Record<string, string>, fallbackCity: string) {
    const parts = [
      tags["addr:suburb"],
      tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"] ?? fallbackCity,
      tags["addr:state"]
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : fallbackCity;
  }

  private estimateImportance(tags: Record<string, string>) {
    let score = 0;

    if (tags.name) {
      score += 0.35;
    }

    if (tags.wikipedia || tags.wikidata) {
      score += 0.4;
    }

    if (tags.tourism || tags.historic || tags.leisure) {
      score += 0.25;
    }

    return Math.min(score, 1);
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private escapeQuotes(value: string) {
    return value.replace(/"/g, '\\"');
  }
}
