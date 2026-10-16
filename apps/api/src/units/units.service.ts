import { OrganizationUnits } from "@bluprint/shared";
import { Injectable } from "@nestjs/common";
import { UnitsRepository } from "./units.repository";

@Injectable()
export class UnitsService {
	constructor(private readonly units: UnitsRepository) {}

	async read(organizationId: string): Promise<OrganizationUnits> {
		const { contracted, reserved, reclaimable } =
			await this.units.sum(organizationId);

		return { contracted, reserved, free: contracted - reserved, reclaimable };
	}

	async readForReservation(organizationId: string): Promise<OrganizationUnits> {
		await this.units.lockOrganization(organizationId);

		return this.read(organizationId);
	}
}
