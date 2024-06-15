import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "./lib/logger";
import { setupRoutes } from "./api";

const app = new Hono().basePath("/api");

logger.info("Starting events handler...");

serve(
  {
    fetch: app.fetch,
    port: 80,
  },
  (info) => {
    setupRoutes(app);
    logger.info(`Listening on http://localhost:${info.port}`);
  },
);
