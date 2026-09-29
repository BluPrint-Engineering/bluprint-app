import { envSchema } from "./env";

const REQUIRED = {
	DATABASE_URL: "postgresql://bluprint:bluprint@localhost:5432/bluprint",
	BETTER_AUTH_SECRET: "a".repeat(32),
};

const PROXY_SECRET = "p".repeat(32);

describe("PROXY_SECRET", () => {
	test("is required in production", () => {
		const result = envSchema.safeParse({
			...REQUIRED,
			NODE_ENV: "production",
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["PROXY_SECRET"]);
	});

	test("lets production boot once it is set", () => {
		const result = envSchema.safeParse({
			...REQUIRED,
			NODE_ENV: "production",
			PROXY_SECRET,
		});

		expect(result.success).toBe(true);
	});

	test.each([["development"], ["test"], [undefined]])(
		"may be absent when NODE_ENV is %s",
		(NODE_ENV) => {
			const result = envSchema.safeParse({ ...REQUIRED, NODE_ENV });

			expect(result.success).toBe(true);
			expect(result.data?.PROXY_SECRET).toBeUndefined();
		},
	);

	test("refuses a secret shorter than 32 characters", () => {
		const result = envSchema.safeParse({
			...REQUIRED,
			PROXY_SECRET: "too-short",
		});

		expect(result.success).toBe(false);
	});
});
