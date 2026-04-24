import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";

export function errorHandler(error: Error, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      success: false,
      statusCode: 400,
      message: "Validation failed",
      issues: error.flatten()
    });
  }

  logger.error({ error }, "Unhandled request error");

  return response.status(500).json({
    success: false,
    statusCode: 500,
    message: error.message || "Internal server error"
  });
}
