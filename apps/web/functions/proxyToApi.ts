export interface ProxyEnv {
	API_ORIGIN: string;
	PROXY_SECRET: string;
}

const PROXY_SECRET_HEADER = "X-Proxy-Secret";
/** Its own header, not X-Forwarded-For: Fly's proxy appends Cloudflare's IP to that one. */
const CLIENT_IP_HEADER = "X-Client-IP";

export function proxyToApi(
	request: Request,
	env: ProxyEnv,
	upstream: (request: Request) => Promise<Response>,
): Promise<Response> {
	const { pathname, search } = new URL(request.url);
	const forwarded = new Request(
		new URL(pathname + search, env.API_ORIGIN),
		request,
	);

	forwarded.headers.set(PROXY_SECRET_HEADER, env.PROXY_SECRET);
	forwarded.headers.delete(CLIENT_IP_HEADER);
	const clientIp = request.headers.get("CF-Connecting-IP");
	if (clientIp !== null) forwarded.headers.set(CLIENT_IP_HEADER, clientIp);

	return upstream(forwarded);
}
