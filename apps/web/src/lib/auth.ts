import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	fetchOptions: {
		// re-reads global fetch per call, so a test's vi.stubGlobal("fetch", …) after module import still applies
		customFetchImpl: (...args: Parameters<typeof fetch>) => fetch(...args),
	},
});
