import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { router } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ALLOWED_ORIGINS.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: env.CORS_ALLOW_CREDENTIALS,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", env.CSRF_HEADER_NAME]
    })
  );
  app.use(express.json());
  app.use(
    pinoHttp({
      logger
    })
  );

  app.options("*", cors());
  app.use(router);
  app.use(errorHandler);

  return app;
}
