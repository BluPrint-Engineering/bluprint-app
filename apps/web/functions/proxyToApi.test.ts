import { describe, expect, test, vi } from "vitest";
import { proxyToApi } from "./proxyToApi";

const env = {
	API_ORIGIN: "https://bluprint-api.fly.dev",
	PROXY_SECRET: "proxy-secret-from-the-pages-binding",
};

function fakeApi(response = new Response("{}")) {
	const upstream = vi.fn(async (_input: Request) => response);
	const sent = () => {
		const request = upstream.mock.calls[0]?.[0];
		if (!request) throw new Error("nothing reached the API");
		return request;
	};
	return { upstream, sent };
}

function browserRequest(init: RequestInit = {}) {
	return new Request(
		"https://bluprint.pages.dev/api/auth/sign-in/email?callbackURL=%2Fprojects",
		{
			method: "POST",
			body: JSON.stringify({ email: "eng@example.com", password: "x" }),
			...init,
			headers: {
				Origin: "https://bluprint.pages.dev",
				"Content-Type": "application/json",
				"CF-Connecting-IP": "203.0.113.7",
				...init.headers,
			},
		},
	);
}

describe("proxyToApi", () => {
	test("forwards method, path, query, body and Origin to the API", async () => {
		const { upstream, sent } = fakeApi();

		await proxyToApi(browserRequest(), env, upstream);

		expect(sent().method).toBe("POST");
		expect(sent().url).toBe(
			"https://bluprint-api.fly.dev/api/auth/sign-in/email?callbackURL=%2Fprojects",
		);
		expect(await sent().json()).toEqual({
			email: "eng@example.com",
			password: "x",
		});
		expect(sent().headers.get("Origin")).toBe("https://bluprint.pages.dev");
		expect(sent().headers.get("Content-Type")).toBe("application/json");
	});

	test("injects the proxy secret and the client IP", async () => {
		const { upstream, sent } = fakeApi();

		await proxyToApi(browserRequest(), env, upstream);

		expect(sent().headers.get("X-Proxy-Secret")).toBe(env.PROXY_SECRET);
		expect(sent().headers.get("X-Client-IP")).toBe("203.0.113.7");
	});

	test("discards a secret and an IP sent by the client", async () => {
		const { upstream, sent } = fakeApi();

		await proxyToApi(
			browserRequest({
				headers: {
					"X-Proxy-Secret": "forged-secret",
					"X-Client-IP": "198.51.100.23",
				},
			}),
			env,
			upstream,
		);

		expect(sent().headers.get("X-Proxy-Secret")).toBe(env.PROXY_SECRET);
		expect(sent().headers.get("X-Client-IP")).toBe("203.0.113.7");
	});

	test("forwards no client IP at all when Cloudflare gives none", async () => {
		const { upstream, sent } = fakeApi();

		await proxyToApi(
			new Request("https://bluprint.pages.dev/api/health", {
				headers: { "X-Client-IP": "198.51.100.23" },
			}),
			env,
			upstream,
		);

		expect(sent().headers.get("X-Client-IP")).toBeNull();
	});

	test("hands back each Set-Cookie of the API's response separately", async () => {
		const headers = new Headers();
		headers.append("Set-Cookie", "better-auth.session_token=abc; HttpOnly");
		headers.append("Set-Cookie", "better-auth.session_data=def; HttpOnly");
		const { upstream } = fakeApi(new Response("{}", { status: 200, headers }));

		const response = await proxyToApi(browserRequest(), env, upstream);

		expect(response.status).toBe(200);
		expect(response.headers.getSetCookie()).toEqual([
			"better-auth.session_token=abc; HttpOnly",
			"better-auth.session_data=def; HttpOnly",
		]);
	});
});
