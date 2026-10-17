import {
	NO_UNITS_LEFT,
	OrganizationReservations,
	OrganizationUnits,
	PROJECT_DELIVERED,
	PROJECT_NOT_FOUND,
	ProjectUnitsBalance,
	RESERVATION_BELOW_USED,
	type UpdateReservations,
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

	async readReservations(
		organizationId: string,
	): Promise<OrganizationReservations> {
		const [rows, delivered] = await Promise.all([
			this.units.listInProgress(organizationId),
			this.units.sumDelivered(organizationId),
		]);
		const used = await this.units.countUsed(
			rows.map(({ projectId }) => projectId),
		);

		return {
			items: rows.map((row) => ({
				...row,
				used: used.get(row.projectId) ?? 0,
			})),
			delivered: { projects: delivered.projects, used: delivered.units },
		};
	}

	@Transactional(Propagation.Mandatory)
	async changeReservations(
		organizationId: string,
		{ items }: UpdateReservations,
	): Promise<OrganizationReservations> {
		const locked = new Map(
			(
				await this.units.lockProjectsOf(
					organizationId,
					items.map(({ projectId }) => projectId),
				)
			).map((row) => [row.id, row]),
		);
		await this.units.lockOrganization(organizationId);

		for (const { projectId } of items) {
			if (!locked.has(projectId)) {
				throw new ProblemException({
					status: 404,
					code: PROJECT_NOT_FOUND,
					detail: "A project of the request does not exist.",
					projectId,
				});
			}
		}
		for (const { projectId } of items) {
			if (locked.get(projectId)!.status === "delivered") {
				throw new ProblemException({
					status: 409,
					code: PROJECT_DELIVERED,
					detail:
						"A project of the request was delivered, so its reservation can no longer change.",
					projectId,
				});
			}
		}

		const used = await this.units.countUsed(
			items.map(({ projectId }) => projectId),
		);
		const belowUsed = items.flatMap(({ projectId, reserved }) => {
			const projectUsed = used.get(projectId) ?? 0;
			return reserved < projectUsed ? [{ projectId, used: projectUsed }] : [];
		});
		if (belowUsed.length > 0) {
			throw new ProblemException({
				status: 409,
				code: RESERVATION_BELOW_USED,
				detail: "A reservation cannot drop below the units its project uses.",
				items: belowUsed,
			});
		}

		const { free } = await this.read(organizationId);
		const requested = items.reduce(
			(sum, { projectId, reserved }) =>
				sum + reserved - locked.get(projectId)!.reserved,
			0,
		);
		if (requested > free) {
			throw new ProblemException({
				status: 409,
				code: NO_UNITS_LEFT,
				detail:
					"The organization has fewer free units than the reservations need to grow by.",
				requested,
				available: free,
			});
		}

		for (const { projectId, reserved } of items) {
			await this.units.setReserved(projectId, reserved);
		}

		return this.readReservations(organizationId);
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
