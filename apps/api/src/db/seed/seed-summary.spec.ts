import type { SeedOrganization, SeedPerson } from "./fixture";
import { describeAccountRoles } from "./seed-summary";

const admin: SeedPerson = { name: "Root", email: "root@x.test" };
const ana: SeedPerson = { name: "Ana", email: "ana@x.test" };
const bia: SeedPerson = { name: "Bia", email: "bia@x.test" };
const orphan: SeedPerson = { name: "Zed", email: "zed@x.test" };

const organizations: SeedOrganization[] = [
	{
		name: "Alfa",
		licenses: 1,
		members: [
			{ email: ana.email, role: "admin" },
			{ email: bia.email, role: "manager" },
		],
		projects: [],
	},
	{
		name: "Beta",
		licenses: 1,
		members: [{ email: bia.email, role: "assistant" }],
		projects: [],
	},
];

describe("describeAccountRoles", () => {
	const lines = describeAccountRoles(
		[admin, ana, bia, orphan],
		organizations,
		admin,
	);

	test("labels the platform admin", () => {
		expect(lines[0]).toEqual({ email: "root@x.test", roles: "platform admin" });
	});

	test("labels an organization member with role and organization", () => {
		expect(lines[1]).toEqual({ email: "ana@x.test", roles: "admin @ Alfa" });
	});

	test("joins the roles of a person in several organizations", () => {
		expect(lines[2]).toEqual({
			email: "bia@x.test",
			roles: "manager @ Alfa, assistant @ Beta",
		});
	});

	test("labels a person with no role as none", () => {
		expect(lines[3]).toEqual({ email: "zed@x.test", roles: "none" });
	});
});
