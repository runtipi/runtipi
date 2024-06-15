import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { SystemExecutors } from "./services";
import { getEnv } from "./lib/environment";

const systemExecutors = new SystemExecutors();

export const setupRoutes = (app: Hono) => {
  app.get("/healthcheck", async (c) => c.json({ ok: true }, 200));

  app.use("*", prettyJSON());
  app.use("*", secureHeaders());

  app.use("*", jwt({ secret: getEnv().jwtSecret, alg: "HS256" }));

  app.post("/restart", async (c) => {
    void systemExecutors.restartTipi();
    return c.json({ ok: true }, 200);
  });
};
