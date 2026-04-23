import type { Request, Response } from "express";
import { z } from "zod";
import { UserService } from "../services/userService.js";

const userService = new UserService();

const onboardSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  partnerName: z.string().min(1),
  homeCity: z.string().min(1),
  preferredBudget: z.string().optional(),
  preferredRadiusKm: z.number().int().positive().optional()
});

export async function onboardUser(request: Request, response: Response) {
  const payload = onboardSchema.parse(request.body);
  const user = await userService.onboard(payload);

  return response.status(201).json({
    message: "User onboarded successfully",
    user
  });
}
