import { healthQuerySchema } from "@bluprint/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

export const health = new Hono();

const startedAt = Date.now();

health.get("/", zValidator("query", healthQuerySchema), (c) => {
	const { verbose } = c.req.valid("query");

	return c.json({
		status: "ok" as const,
		timestamp: new Date().toISOString(),
		uptime: (Date.now() - startedAt) / 1000,
		...(verbose && {
			verbose: {
				environment: process.env.NODE_ENV ?? "development",
				runtime: `bun ${Bun.version}`,
			},
		}),
	});
});
