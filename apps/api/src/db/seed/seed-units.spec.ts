import { type SeedOrganization, organizations } from "./fixture";
import { assertReservationsFit } from "./seed-units";

const organization: SeedOrganization = {
	name: "Alfa",
	licenses: [100, 50],
	members: [],
	projects: [
		{ name: "Torre A", reservedUnits: 100, members: [] },
		{ name: "Torre B", reservedUnits: 50, members: [] },
	],
};

describe("assertReservationsFit", () => {
	test("accepts reservations that use every contracted unit", () => {
		expect(() => assertReservationsFit(organization)).not.toThrow();
	});

	test("refuses reservations beyond the contracted units, naming the organization", () => {
		const over = {
			...organization,
			projects: [
				...organization.projects,
				{ name: "Torre C", reservedUnits: 1, members: [] },
			],
		};

		expect(() => assertReservationsFit(over)).toThrow(
			'"Alfa" reserves 151 units but contracts 150',
		);
	});

	test("refuses a delivered project that still reserves units, naming it", () => {
		const delivered = {
			...organization,
			projects: [
				{ name: "Torre A", reservedUnits: 100, members: [] },
				{
					name: "Torre B",
					reservedUnits: 50,
					status: "delivered" as const,
					members: [],
				},
			],
		};

		expect(() => assertReservationsFit(delivered)).toThrow(
			'"Torre B" is delivered but reserves 50 units',
		);
	});

	test.each(organizations.map((org) => [org.name, org] as const))(
		"the seeded organization %s fits its licenses",
		(_name, org) => {
			expect(() => assertReservationsFit(org)).not.toThrow();
		},
	);
});
