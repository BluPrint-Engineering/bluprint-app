import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

export function registerErrorHandling(app: Hono): void {
	app.onError((err, c) => {
		if (err instanceof HTTPException) {
			return err.getResponse();
		}
		console.error(err);
		return c.json({ error: "Internal Server Error" }, 500);
	});

	app.notFound((c) => c.json({ error: "Not Found" }, 404));
}
