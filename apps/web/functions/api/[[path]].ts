import { type ProxyEnv, proxyToApi } from "../proxyToApi";

export const onRequest: PagesFunction<ProxyEnv> = ({ request, env }) =>
	proxyToApi(request, env);
