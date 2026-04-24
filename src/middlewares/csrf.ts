import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { sendSuccess } from "../utils/apiResponse.js";

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((accumulator, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      return accumulator;
    }

    accumulator[rawKey] = decodeURIComponent(rawValue.join("=") ?? "");
    return accumulator;
  }, {});
}

function buildToken(secret: string) {
  return crypto.createHmac("sha256", secret).update("csrf").digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueCsrfToken(_request: Request, response: Response) {
  const secret = crypto.randomBytes(32).toString("hex");
  const csrfToken = buildToken(secret);

  response.cookie(env.CSRF_COOKIE_NAME, secret, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  return sendSuccess(response, {
    statusCode: 200,
    message: "CSRF token issued",
    data: {
      csrfToken,
      headerName: env.CSRF_HEADER_NAME
    }
  });
}

export function requireCsrfProtection(request: Request, response: Response, next: NextFunction) {
  if (!env.ENABLE_CSRF) {
    return next();
  }

  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return next();
  }

  const cookies = parseCookies(request.headers.cookie);
  const secret = cookies[env.CSRF_COOKIE_NAME];
  const headerValue = request.header(env.CSRF_HEADER_NAME);

  if (!secret || !headerValue) {
    return response.status(403).json({
      success: false,
      statusCode: 403,
      message: "Missing CSRF token"
    });
  }

  const expectedToken = buildToken(secret);
  if (!safeEqual(expectedToken, headerValue)) {
    return response.status(403).json({
      success: false,
      statusCode: 403,
      message: "Invalid CSRF token"
    });
  }

  return next();
}
