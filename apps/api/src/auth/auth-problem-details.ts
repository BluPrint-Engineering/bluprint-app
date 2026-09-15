import {
	PROBLEM_JSON,
	problemDetails,
} from "../common/problems/problem-details";

type Handler = (request: Request) => Promise<Response>;

// Better Auth's name for VALIDATION_FAILED; its body has a message but no per-field errors
const BETTER_AUTH_VALIDATION_CODE = "VALIDATION_ERROR";

/** Wraps the handler, not onResponse: the rate limiter answers 429 before any plugin hook runs. */
export function withProblemDetails(handler: Handler): Handler {
	return async (request) => {
		const response = await handler(request);
		if (response.status < 400) return response;

		const { code, message } = await betterAuthError(response);
		const headers = new Headers(response.headers);
		headers.set("Content-Type", PROBLEM_JSON);
		headers.delete("Content-Length");

		const problem = problemDetails({
			status: response.status,
			code: code === BETTER_AUTH_VALIDATION_CODE ? "VALIDATION_FAILED" : code,
			detail: message,
			instance: new URL(request.url).pathname,
		});

		return new Response(JSON.stringify(problem), {
			status: response.status,
			headers,
		});
	};
}

/** The body is JSON for an `APIError`, but empty for a 404 or an unhandled 500. */
async function betterAuthError(
	response: Response,
): Promise<{ code?: string | undefined; message?: string | undefined }> {
	try {
		const body: unknown = JSON.parse(await response.text());
		if (typeof body !== "object" || body === null) return {};
		return {
			code:
				"code" in body && typeof body.code === "string" ? body.code : undefined,
			message:
				"message" in body && typeof body.message === "string"
					? body.message
					: undefined,
		};
	} catch {
		return {};
	}
}
