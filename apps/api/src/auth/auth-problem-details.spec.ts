import { withProblemDetails } from "./auth-problem-details";

const REQUEST = new Request(
	"http://localhost:3000/api/auth/sign-in/email?x=1",
	{
		method: "POST",
	},
);

function answering(response: Response) {
	return withProblemDetails(() => Promise.resolve(response));
}

describe("withProblemDetails", () => {
	test("leaves a successful response untouched", async () => {
		const ok = Response.json({ token: "t" });

		expect(await answering(ok)(REQUEST)).toBe(ok);
	});

	test("keeps Better Auth's code and message as code and detail", async () => {
		const res = await answering(
			Response.json(
				{
					message: "Invalid email or password",
					code: "INVALID_EMAIL_OR_PASSWORD",
				},
				{ status: 401 },
			),
		)(REQUEST);

		expect(res.status).toBe(401);
		expect(res.headers.get("content-type")).toBe("application/problem+json");
		expect(await res.json()).toEqual({
			type: "about:blank",
			title: "Unauthorized",
			status: 401,
			code: "INVALID_EMAIL_OR_PASSWORD",
			detail: "Invalid email or password",
			instance: "/api/auth/sign-in/email",
		});
	});

	test("derives the code from the status when Better Auth sends none, keeping its headers", async () => {
		const res = await answering(
			new Response(
				JSON.stringify({
					message: "Too many requests. Please try again later.",
				}),
				{ status: 429, headers: { "X-Retry-After": "42" } },
			),
		)(REQUEST);

		expect(res.headers.get("x-retry-after")).toBe("42");
		expect(await res.json()).toMatchObject({
			status: 429,
			code: "TOO_MANY_REQUESTS",
		});
	});

	test("answers an empty body with the status alone", async () => {
		const res = await answering(new Response(null, { status: 404 }))(REQUEST);

		expect(await res.json()).toEqual({
			type: "about:blank",
			title: "Not Found",
			status: 404,
			code: "NOT_FOUND",
			instance: "/api/auth/sign-in/email",
		});
	});

	test("renames Better Auth's validation code to ours", async () => {
		const res = await answering(
			Response.json(
				{
					message: "[body.email] Invalid email address",
					code: "VALIDATION_ERROR",
				},
				{ status: 400 },
			),
		)(REQUEST);

		expect(await res.json()).toMatchObject({ code: "VALIDATION_FAILED" });
	});
});
