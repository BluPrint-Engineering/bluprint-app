import type { SeedOrganization } from "./fixture";
import { countUnits } from "./seed-structure";

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

	for (const seedProject of organization.projects) {
		const used = countUnits(seedProject.structure);

		if (seedProject.reservedUnits < used) {
			throw new Error(
				`"${seedProject.name}" seeds ${used} units but reserves ${seedProject.reservedUnits}; a reservation never drops below the units its project uses.`,
			);
		}

		if (seedProject.delivered && seedProject.reservedUnits !== used) {
			throw new Error(
				`"${seedProject.name}" is delivered but reserves ${seedProject.reservedUnits} units and uses ${used}; a delivered project keeps only the units it used.`,
			);
		}
	}
}
