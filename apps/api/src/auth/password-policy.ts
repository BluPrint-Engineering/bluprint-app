import {
	isGuessablePassword,
	PASSWORD_TOO_GUESSABLE_CODE,
} from "@bluprint/shared";
import { APIError, getSessionFromCtx } from "better-auth/api";
import {
	CHANGE_PASSWORD_PATH,
	RESET_PASSWORD_PATH,
	SIGN_UP_PATH,
} from "./auth-paths";

type AuthMiddlewareContext = Parameters<typeof getSessionFromCtx>[0];

function field(body: unknown, key: string): string | undefined {
	if (typeof body !== "object" || body === null || !(key in body)) {
		return undefined;
	}
	const value = (body as Record<string, unknown>)[key];
	return typeof value === "string" ? value : undefined;
}

/** The new password and whose it is, for the paths that set one; a reset has no signed-in person. */
async function passwordBeingSet(ctx: AuthMiddlewareContext) {
	switch (ctx.path) {
		case SIGN_UP_PATH:
			return {
				password: field(ctx.body, "password"),
				context: {
					name: field(ctx.body, "name"),
					email: field(ctx.body, "email"),
				},
			};
		case CHANGE_PASSWORD_PATH: {
			const session = await getSessionFromCtx(ctx);
			return {
				password: field(ctx.body, "newPassword"),
				context: { name: session?.user.name, email: session?.user.email },
			};
		}
		case RESET_PASSWORD_PATH:
			return { password: field(ctx.body, "newPassword"), context: {} };
		default:
			return undefined;
	}
}

/** Runs before Better Auth's length check; a missing or out-of-bounds password is left for it to reject (ADR 0052). */
export async function rejectGuessablePassword(
	ctx: AuthMiddlewareContext,
): Promise<void> {
	const attempt = await passwordBeingSet(ctx);
	if (!attempt?.password) return;
	if (isGuessablePassword(attempt.password, attempt.context)) {
		throw new APIError("BAD_REQUEST", {
			message: "Password is too easy to guess",
			code: PASSWORD_TOO_GUESSABLE_CODE,
		});
	}
}
