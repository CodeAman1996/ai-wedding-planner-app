import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { firebaseAuth } from "../clients/firebaseAdmin.js";

export async function requireFirebaseAuth(request: Request, response: Response, next: NextFunction) {
  if (!env.ENABLE_FIREBASE_AUTH) {
    return next();
  }

  try {
    const authHeader = request.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(401).json({
        success: false,
        statusCode: 401,
        message: "Missing or invalid Authorization header"
      });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    request.firebaseUser = decodedToken;

    return next();
  } catch (_error) {
    return response.status(401).json({
      success: false,
      statusCode: 401,
      message: "Unauthorized"
    });
  }
}
