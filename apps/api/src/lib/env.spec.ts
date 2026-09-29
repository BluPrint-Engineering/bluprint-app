import { envSchema } from "./env";

const baseEnv = {
	DATABASE_URL: "postgresql://bluprint:bluprint@localhost:5432/bluprint",
	BETTER_AUTH_SECRET: "a".repeat(32),
};
const proxySecret = "p".repeat(32);

describe("PROXY_SECRET", () => {
	test("is required in production", () => {
		const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: "production" });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["PROXY_SECRET"]);
	});

	test("is accepted in production when set", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			NODE_ENV: "production",
			PROXY_SECRET: proxySecret,
		});

		expect(result.success).toBe(true);
	});

	test.each([["development"], ["test"], [undefined]])(
		"may be absent with NODE_ENV=%s",
		(nodeEnv) => {
			const result = envSchema.safeParse({ ...baseEnv, NODE_ENV: nodeEnv });

			expect(result.success).toBe(true);
			expect(result.data?.PROXY_SECRET).toBeUndefined();
		},
	);

	test("rejects a secret shorter than 32 characters", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			PROXY_SECRET: "short",
		});

		expect(result.success).toBe(false);
	});
});
