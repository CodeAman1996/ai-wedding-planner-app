import type { Request, Response } from "express";
import { z } from "zod";
import { RecommendationService } from "../services/recommendationService.js";

const recommendationService = new RecommendationService();

const recommendationSchema = z.object({
  userId: z.string().min(1),
  city: z.string().min(1),
  selectedVibes: z.array(z.string().min(1)).min(1),
  freeText: z.string().optional(),
  allowNearbySearch: z.boolean().optional()
});

export async function generateLocationRecommendations(request: Request, response: Response) {
  const payload = recommendationSchema.parse(request.body);
  const result = await recommendationService.generate(payload);
  return response.status(201).json(result);
}
