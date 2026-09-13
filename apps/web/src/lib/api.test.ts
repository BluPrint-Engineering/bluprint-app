import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiFetch } from "./api";

function stubFetch(response: Response) {
	vi.stubGlobal(
		"fetch",
		vi.fn(() => Promise.resolve(response)),
	);
}

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
	const error = await promise.catch((e: unknown) => e);
	expect(error).toBeInstanceOf(ApiError);
	return error as ApiError;
}

describe("apiFetch", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("exposes the problem's code on a failed request", async () => {
		stubFetch(
			new Response(
				JSON.stringify({
					type: "about:blank",
					title: "Unauthorized",
					status: 401,
					code: "UNAUTHORIZED",
					instance: "/api/projects",
				}),
				{
					status: 401,
					headers: { "Content-Type": "application/problem+json" },
				},
			),
		);

		const error = await failureOf(apiFetch("/projects", z.unknown()));

		expect(error.status).toBe(401);
		expect(error.problem?.code).toBe("UNAUTHORIZED");
	});

	test("still fails with the status when the body is not problem details", async () => {
		stubFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

		const error = await failureOf(apiFetch("/projects", z.unknown()));

		expect(error.status).toBe(502);
		expect(error.problem).toBeUndefined();
	});
});
