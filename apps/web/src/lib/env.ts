import { z } from "zod";

/** Read per call, not at import, so a test's `vi.stubEnv` still applies; works only alongside the API's `ALLOW_SELF_SIGNUP` (ADR 0011). */
export function selfSignupAllowed(): boolean {
	// stringbool, not Boolean(): "false" is a truthy string and would open the signup screen
	return z
		.stringbool()
		.default(false)
		.parse(import.meta.env.VITE_ALLOW_SELF_SIGNUP);
}
