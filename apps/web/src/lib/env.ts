import { z } from "zod";

/**
 * Mirrors the API's `ALLOW_SELF_SIGNUP` and only works alongside it (ADR 0011). Vite inlines the
 * value at build time; read per call, not at import, so a test's `vi.stubEnv` still applies.
 */
export function selfSignupAllowed(): boolean {
	// stringbool, not Boolean(): "false" is a truthy string and would open the signup screen
	return z
		.stringbool()
		.default(false)
		.parse(import.meta.env.VITE_ALLOW_SELF_SIGNUP);
}
