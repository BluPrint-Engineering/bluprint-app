import { defaultRoleSchema, effectiveRoleSchema } from "@bluprint/shared";
import { memberRole } from "./member";

describe("member roles", () => {
	test("the Postgres enum lists exactly the shared default roles", () => {
		expect([...memberRole.enumValues].sort()).toEqual(
			[...defaultRoleSchema.options].sort(),
		);
	});

	test("the effective role cannot be admin (RF-116)", () => {
		expect(effectiveRoleSchema.safeParse("admin").success).toBe(false);
	});

	test("every effective role is also a valid default role", () => {
		for (const role of effectiveRoleSchema.options) {
			expect(defaultRoleSchema.safeParse(role).success).toBe(true);
		}
	});
});
