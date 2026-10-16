import { type SeedOrganization, organizations } from "./fixture";
import type { SeedStructure } from "./seed-structure";
import { assertReservationsFit } from "./seed-units";

const twoUnits: SeedStructure = {
	towers: [
		{ name: "Torre A", floors: [{ name: "1º andar", units: ["101", "102"] }] },
	],
};

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

	test("refuses a delivered project that reserves more than the units it used, naming it", () => {
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
			'"Torre B" is delivered but reserves 50 units and uses 0',
		);
	});

	test("accepts a delivered project that reserves exactly the units it used", () => {
		const delivered = {
			...organization,
			projects: [
				{
					name: "Torre B",
					reservedUnits: 2,
					status: "delivered" as const,
					structure: twoUnits,
					members: [],
				},
			],
		};

		expect(() => assertReservationsFit(delivered)).not.toThrow();
	});

	test("refuses a project that reserves fewer units than its structure has, naming it", () => {
		const short = {
			...organization,
			projects: [
				{ name: "Torre A", reservedUnits: 1, structure: twoUnits, members: [] },
			],
		};

		expect(() => assertReservationsFit(short)).toThrow(
			'"Torre A" seeds 2 units but reserves 1',
		);
	});

	test.each(organizations.map((org) => [org.name, org] as const))(
		"the seeded organization %s fits its licenses",
		(_name, org) => {
			expect(() => assertReservationsFit(org)).not.toThrow();
		},
	);
});
