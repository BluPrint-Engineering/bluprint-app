import { afterEach, describe, expect, test, vi } from "vitest";
import { proxyToApi } from "./proxyToApi";

const env = {
	API_ORIGIN: "https://api.example.test",
	PROXY_SECRET: "the-pages-secret",
};

function stubFetch(response: Response = new Response("ok")) {
	const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

async function forwarded(fetchMock: ReturnType<typeof stubFetch>) {
	const [url, init] = fetchMock.mock.calls[0] ?? [];
	const upstream = new Request(url as string, init);
	return { url: upstream.url, upstream, body: await upstream.text() };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("proxyToApi", () => {
	test("forwards method, path, query, body and Origin to the API origin", async () => {
		const fetchMock = stubFetch();

		await proxyToApi(
			new Request(
				"https://app.pages.dev/api/auth/sign-in/email?next=%2Fa&x=1",
				{
					method: "POST",
					headers: {
						Origin: "https://app.pages.dev",
						"Content-Type": "application/json",
						Cookie: "session=abc",
					},
					body: JSON.stringify({ email: "a@b.co" }),
				},
			),
			env,
		);

		const { url, upstream, body } = await forwarded(fetchMock);
		expect(url).toBe(
			"https://api.example.test/api/auth/sign-in/email?next=%2Fa&x=1",
		);
		expect(upstream.method).toBe("POST");
		expect(body).toBe(JSON.stringify({ email: "a@b.co" }));
		expect(upstream.headers.get("origin")).toBe("https://app.pages.dev");
		expect(upstream.headers.get("content-type")).toBe("application/json");
		expect(upstream.headers.get("cookie")).toBe("session=abc");
	});

	test("sets the proxy secret and the client IP from Cloudflare", async () => {
		const fetchMock = stubFetch();

		await proxyToApi(
			new Request("https://app.pages.dev/api/projects", {
				headers: { "CF-Connecting-IP": "198.51.100.7" },
			}),
			env,
		);

		const { upstream } = await forwarded(fetchMock);
		expect(upstream.headers.get("x-proxy-secret")).toBe(env.PROXY_SECRET);
		expect(upstream.headers.get("x-client-ip")).toBe("198.51.100.7");
	});

	test("discards a secret and an IP the client sent itself", async () => {
		const fetchMock = stubFetch();

		await proxyToApi(
			new Request("https://app.pages.dev/api/projects", {
				headers: {
					"X-Proxy-Secret": "guessed",
					"X-Client-IP": "203.0.113.99",
					"CF-Connecting-IP": "198.51.100.7",
				},
			}),
			env,
		);

		const { upstream } = await forwarded(fetchMock);
		expect(upstream.headers.get("x-proxy-secret")).toBe(env.PROXY_SECRET);
		expect(upstream.headers.get("x-client-ip")).toBe("198.51.100.7");
	});

	test("sends no client IP when Cloudflare gave none, whatever the client claimed", async () => {
		const fetchMock = stubFetch();

		await proxyToApi(
			new Request("https://app.pages.dev/api/projects", {
				headers: { "X-Client-IP": "203.0.113.99" },
			}),
			env,
		);

		const { upstream } = await forwarded(fetchMock);
		expect(upstream.headers.get("x-client-ip")).toBeNull();
	});

	test("returns each Set-Cookie of the response as its own header", async () => {
		const headers = new Headers({ "Content-Type": "application/json" });
		headers.append("Set-Cookie", "session=abc; Path=/; HttpOnly");
		headers.append("Set-Cookie", "session_data=xyz; Path=/; HttpOnly");
		stubFetch(new Response("{}", { status: 200, headers }));

		const res = await proxyToApi(
			new Request("https://app.pages.dev/api/auth/sign-in/email", {
				method: "POST",
			}),
			env,
		);

		expect(res.headers.getSetCookie()).toEqual([
			"session=abc; Path=/; HttpOnly",
			"session_data=xyz; Path=/; HttpOnly",
		]);
	});

	test("returns the status and body of the API untouched", async () => {
		stubFetch(new Response('{"code":"UNAUTHORIZED"}', { status: 401 }));

		const res = await proxyToApi(
			new Request("https://app.pages.dev/api/projects"),
			env,
		);

		expect(res.status).toBe(401);
		expect(await res.text()).toBe('{"code":"UNAUTHORIZED"}');
	});

	test("passes an API redirect on to the browser instead of following it", async () => {
		const fetchMock = stubFetch(
			new Response(null, { status: 302, headers: { Location: "/somewhere" } }),
		);

		const res = await proxyToApi(
			new Request("https://app.pages.dev/api/auth/callback"),
			env,
		);

		expect(fetchMock.mock.calls[0]?.[1]?.redirect).toBe("manual");
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe("/somewhere");
	});
});
