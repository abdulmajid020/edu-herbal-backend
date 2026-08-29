import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { corsOptions } from "./config/cors";
import apiRouter from "./routes";
import { errorHandler } from "./middlewares/errorHandler.middleware";

export function createApp(): Express {
  const app = express();

  // Basic security and parsing middlewares
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));

  // API Root index
  app.get("/", (req, res) => {
    res.status(200).json({
      name: "Edu-Herbal Clinic Backend API",
      status: "running",
      documentation: "/api/health",
      endpoints: "/api/*",
      version: "1.0.0",
    });
  });

  // Mount API router
  app.use("/api", apiRouter);

  // Fallback 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.originalUrl} not found.`,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
