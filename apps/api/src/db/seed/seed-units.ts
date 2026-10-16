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
}
