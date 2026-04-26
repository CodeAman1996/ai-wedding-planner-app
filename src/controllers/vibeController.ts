import type { Request, Response } from "express";
import { VibeCatalogService } from "../services/vibeCatalogService.js";
import { sendSuccess } from "../utils/apiResponse.js";

const vibeCatalogService = new VibeCatalogService();

export async function listVibes(_request: Request, response: Response) {
  const vibes = await vibeCatalogService.list();
  return sendSuccess(response, {
    statusCode: 200,
    message: "Vibes fetched successfully",
    data: {
      items: vibes
    }
  });
}
