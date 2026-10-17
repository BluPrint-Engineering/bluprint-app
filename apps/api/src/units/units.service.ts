import {
	NO_UNITS_LEFT,
	OrganizationUnits,
	PROJECT_NOT_FOUND,
	ProjectUnitsBalance,
} from "@bluprint/shared";
import { Propagation, Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
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

	async usedByProjects(projectIds: string[]): Promise<Map<string, number>> {
		return this.units.countUsed(projectIds);
	}

	async usedBy(projectId: string): Promise<number> {
		return (await this.units.countUsed([projectId])).get(projectId) ?? 0;
	}

	@Transactional(Propagation.Mandatory)
	async assertAvailable(projectId: string, requested: number): Promise<void> {
		const locked = await this.lockProject(projectId);

		const { remaining } = await this.balanceOf(projectId, locked.reserved);
		if (requested > remaining) {
			throw new ProblemException({
				status: 409,
				code: NO_UNITS_LEFT,
				detail: "The project has fewer units left than the request creates.",
				requested,
				available: remaining,
			});
		}
	}

	@Transactional(Propagation.Mandatory)
	async lockProject(projectId: string) {
		const locked = await this.units.lockProject(projectId);
		if (!locked) throw projectNotFound();

		return locked;
	}

	async balanceOf(
		projectId: string,
		reserved: number,
	): Promise<ProjectUnitsBalance> {
		const used = await this.usedBy(projectId);

		return { reserved, used, remaining: reserved - used };
	}
}

function projectNotFound() {
	return new ProblemException({
		status: 404,
		code: PROJECT_NOT_FOUND,
		detail: "The project does not exist.",
	});
}
