import type { Response } from "express";

type SuccessPayload = {
  statusCode?: number;
  message?: string;
  data?: unknown;
  meta?: Record<string, unknown>;
};

export function sendSuccess(response: Response, payload: SuccessPayload = {}) {
  const statusCode = payload.statusCode ?? 200;

  return response.status(statusCode).json({
    success: true,
    statusCode,
    message: payload.message ?? "Request completed successfully",
    data: payload.data ?? null,
    ...(payload.meta ? { meta: payload.meta } : {})
  });
}
