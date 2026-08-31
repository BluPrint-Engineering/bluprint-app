import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./lib/env";
import { registerErrorHandling } from "./middleware/error";
import { health } from "./routes/health";

export const app = new Hono();

app.use("*", cors({ origin: env.CORS_ORIGIN }));

app.route("/health", health);

registerErrorHandling(app);
