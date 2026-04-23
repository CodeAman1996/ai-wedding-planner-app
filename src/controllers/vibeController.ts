import type { Request, Response } from "express";
import { VibeCatalogService } from "../services/vibeCatalogService.js";

const vibeCatalogService = new VibeCatalogService();

export async function listVibes(_request: Request, response: Response) {
  const vibes = await vibeCatalogService.list();
  return response.json({ items: vibes });
}

export async function seedVibes(_request: Request, response: Response) {
  const items = await vibeCatalogService.seed();
  return response.status(201).json({
    message: "Default vibes synced to database",
    count: items.length
  });
}
