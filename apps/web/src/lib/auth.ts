import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	// no baseURL: its relative default already matches the proxied /api/auth; see docs/adr/0009-single-origin-api-prefix-and-proxy.md
	fetchOptions: {
		// re-reads global fetch per call, so a test's vi.stubGlobal("fetch", …) after module import still applies
		customFetchImpl: (...args: Parameters<typeof fetch>) => fetch(...args),
	},
});
