export type DefaultVibeOption = {
  key: string;
  name: string;
  description: string;
  tags: string[];
  placeHints: string[];
};

export const DEFAULT_VIBE_OPTIONS: DefaultVibeOption[] = [
  {
    key: "peaceful-green",
    name: "Peaceful & Green",
    description: "Calm, natural, leafy, and low-noise experiences for romantic shoots.",
    tags: ["peaceful", "green", "nature", "quiet", "romantic"],
    placeHints: ["botanical garden", "ecotourism park", "forest trail", "tea garden", "lakeside garden"]
  },
  {
    key: "royal-heritage",
    name: "Royal & Heritage",
    description: "Classic, architectural, and timeless surroundings for elegant couples.",
    tags: ["royal", "heritage", "grand", "traditional", "luxury"],
    placeHints: ["fort", "palace", "heritage hotel", "museum courtyard", "stepwell"]
  },
  {
    key: "dreamy-sunset",
    name: "Dreamy Sunset",
    description: "Warm, cinematic, and scenic locations that feel soft and emotional.",
    tags: ["sunset", "golden-hour", "dreamy", "open", "romantic"],
    placeHints: ["lake viewpoint", "beach", "hill viewpoint", "riverfront", "sunset point"]
  },
  {
    key: "urban-chic",
    name: "Urban Chic",
    description: "Modern, stylish, city-forward spaces with texture and design.",
    tags: ["urban", "minimal", "modern", "editorial", "stylish"],
    placeHints: ["art district", "design cafe", "modern museum", "rooftop", "creative studio"]
  },
  {
    key: "cozy-intimate",
    name: "Cozy & Intimate",
    description: "Soft, private, and story-like settings for close-up couple storytelling.",
    tags: ["cozy", "intimate", "private", "warm", "emotional"],
    placeHints: ["vineyard", "boutique stay", "garden cafe", "homestay", "orchard"]
  }
];
