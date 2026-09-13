import { effectiveRoleSchema, projectAccessRoleSchema } from "@bluprint/shared";
import { projectMemberRole } from "./project-member";

describe("project_member roles", () => {
	test("the Postgres enum lists exactly the shared effective roles", () => {
		expect([...projectMemberRole.enumValues].sort()).toEqual(
			[...effectiveRoleSchema.options].sort(),
		);
	});

	test("the enum cannot hold admin (RF-116)", () => {
		expect(projectMemberRole.enumValues).not.toContain("admin");
	});

	test("the access role reported to the client is effective roles plus admin", () => {
		expect([...projectAccessRoleSchema.options].sort()).toEqual(
			[...effectiveRoleSchema.options, "admin"].sort(),
		);
	});
});
