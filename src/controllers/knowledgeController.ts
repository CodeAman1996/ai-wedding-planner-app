import type { Request, Response } from "express";
import { z } from "zod";
import { KnowledgeBaseService } from "../services/knowledgeBaseService.js";
import { sendSuccess } from "../utils/apiResponse.js";

const knowledgeBaseService = new KnowledgeBaseService();

const userIdParamsSchema = z.object({
  userId: z.coerce.number().int().positive()
});

export async function listKnowledgeDocuments(request: Request, response: Response) {
  const params = userIdParamsSchema.parse(request.params);
  const documents = await knowledgeBaseService.listDocuments(params.userId, 20);

  return sendSuccess(response, {
    statusCode: 200,
    message: "Knowledge documents fetched successfully",
    data: {
      items: documents
    }
  });
}
