export interface ProxyEnv {
	API_ORIGIN: string;
	PROXY_SECRET: string;
}

const PROXY_SECRET_HEADER = "X-Proxy-Secret";
const CLIENT_IP_HEADER = "X-Client-IP";

export async function proxyToApi(
	request: Request,
	env: ProxyEnv,
): Promise<Response> {
	const { pathname, search } = new URL(request.url);
	const target = new URL(pathname + search, env.API_ORIGIN);

	const headers = new Headers(request.headers);
	headers.delete("host");
	headers.delete(PROXY_SECRET_HEADER);
	headers.delete(CLIENT_IP_HEADER);
	headers.set(PROXY_SECRET_HEADER, env.PROXY_SECRET);
	const clientIp = request.headers.get("CF-Connecting-IP");
	if (clientIp) {
		headers.set(CLIENT_IP_HEADER, clientIp);
	}

	return fetch(target, {
		method: request.method,
		headers,
		body: request.body,
		// the browser follows redirects itself, against its own origin
		redirect: "manual",
		duplex: "half",
		// workers-types' RequestInit lacks duplex, which fetch requires to stream a request body
	} as RequestInit);
}
