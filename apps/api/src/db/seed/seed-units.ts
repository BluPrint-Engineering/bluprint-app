import type { SeedOrganization } from "./fixture";

export function assertReservationsFit(organization: SeedOrganization): void {
	const contracted = organization.licenses.reduce(
		(sum, units) => sum + units,
		0,
	);
	const reserved = organization.projects.reduce(
		(sum, seedProject) => sum + seedProject.reservedUnits,
		0,
	);

	if (reserved > contracted) {
		throw new Error(
			`"${organization.name}" reserves ${reserved} units but contracts ${contracted}, raise its licenses in fixture.ts.`,
		);
	}

	const deliveredWithReservation = organization.projects.find(
		(seedProject) =>
			seedProject.status === "delivered" && seedProject.reservedUnits > 0,
	);

	if (deliveredWithReservation) {
		throw new Error(
			`"${deliveredWithReservation.name}" is delivered but reserves ${deliveredWithReservation.reservedUnits} units; a delivered project keeps only the units it used, and a seeded project has used none.`,
		);
	}
}
