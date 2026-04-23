import type { Request, Response } from "express";
import { z } from "zod";
import { KnowledgeBaseService } from "../services/knowledgeBaseService.js";

const knowledgeBaseService = new KnowledgeBaseService();

const userIdParamsSchema = z.object({
  userId: z.string().min(1)
});

export async function listKnowledgeDocuments(request: Request, response: Response) {
  const params = userIdParamsSchema.parse(request.params);
  const documents = await knowledgeBaseService.listDocuments(params.userId, 20);

  return response.json({
    items: documents
  });
}
