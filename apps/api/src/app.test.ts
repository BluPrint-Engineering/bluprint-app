import { describe, expect, test } from "bun:test";
import { healthResponseSchema } from "@bluprint/shared";
import { app } from "./app";

describe("GET /health", () => {
	test("returns ok status matching the shared schema", async () => {
		const res = await app.request("/health");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(healthResponseSchema.parse(body).status).toBe("ok");
	});

	test("includes verbose details when requested", async () => {
		const res = await app.request("/health?verbose=true");

		expect(res.status).toBe(200);
		const body = healthResponseSchema.parse(await res.json());
		expect(body.verbose?.runtime).toContain("bun");
	});

	test("rejects an invalid verbose value", async () => {
		const res = await app.request("/health?verbose=maybe");

		expect(res.status).toBe(400);
	});
});

describe("unknown routes", () => {
	test("returns a 404 error", async () => {
		const res = await app.request("/no-such-route");

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "Not Found" });
	});
});
