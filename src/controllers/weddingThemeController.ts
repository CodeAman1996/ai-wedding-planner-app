import type { Request, Response } from "express";
import { z } from "zod";
import { WeddingThemeService } from "../services/weddingThemeService.js";
import { sendSuccess } from "../utils/apiResponse.js";

const weddingThemeService = new WeddingThemeService();

const weddingThemeSchema = z.object({
  userId: z.coerce.number().int().positive(),
  selectedVibes: z.array(z.string().min(1)).min(1),
  city: z.string().min(1).optional(),
  budget: z.string().min(1).optional(),
  season: z.string().min(1).optional(),
  weddingMonth: z.string().min(1).optional(),
  guestCount: z.coerce.number().int().positive().optional(),
  personality: z.string().min(1).optional(),
  notes: z.string().min(1).optional()
});

export async function generateWeddingTheme(request: Request, response: Response) {
  const payload = weddingThemeSchema.parse(request.body);
  const result = await weddingThemeService.generate(payload);

  return sendSuccess(response, {
    statusCode: 201,
    message: "Wedding theme generated successfully",
    data: result
  });
}
