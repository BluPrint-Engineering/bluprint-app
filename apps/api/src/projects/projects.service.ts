import {
	type CreateProject,
	EffectiveRole,
	NO_UNITS_LEFT,
	PROJECT_DELIVERED,
	PROJECT_ID_TAKEN,
	PROJECT_NOT_FOUND,
	type ChangeReservation,
	ProjectList,
	ProjectListQuery,
	ProjectManager,
	ProjectStatus,
	ProjectSummary,
	ProjectUnitsBalance,
	RESERVATION_BELOW_USED,
	type RenameProject,
} from "@bluprint/shared";
import { Propagation, Transactional } from "@nestjs-cls/transactional";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { MembersRepository } from "../members/members.repository";
import { UnitsService } from "../units/units.service";
import {
	type ProjectWithDeliverer,
	ProjectsRepository,
} from "./projects.repository";

function toSummary(
	row: {
		id: string;
		name: string;
		createdAt: Date;
		lastActivityAt: Date;
		effectiveRole: EffectiveRole | null;
		reservedUnits: number;
		status: ProjectStatus;
		deliveredAt: Date | null;
		deliveredByName: string | null;
	},
	used: number,
): ProjectSummary {
	return {
		id: row.id,
		name: row.name,
		// z.iso.datetime() needs a string, not a Date, or the serializer 500s
		createdAt: row.createdAt.toISOString(),
		lastActivityAt: row.lastActivityAt.toISOString(),
		role: row.effectiveRole ?? "admin",
		units: { reserved: row.reservedUnits, used },
		status: row.status,
		delivery: row.deliveredAt
			? { at: row.deliveredAt.toISOString(), by: row.deliveredByName }
			: null,
	};
}

@Injectable()
export class ProjectsService {
	constructor(
		private readonly projects: ProjectsRepository,
		private readonly members: MembersRepository,
		private readonly units: UnitsService,
	) {}

	async listVisible(
		userId: string,
		{ page, pageSize, q, status, sort, manager }: ProjectListQuery,
	): Promise<ProjectList> {
		const membership = await this.members.findByUser(userId);
		const { items, total, counts } = await this.projects.listVisible(userId, {
			q,
			status,
			sort,
			managerId: membership?.role === "admin" ? manager : undefined,
			limit: pageSize,
			offset: (page - 1) * pageSize,
		});

		const used = await this.units.usedByProjects(items.map(({ id }) => id));

		return {
			items: items.map((row) => toSummary(row, used.get(row.id) ?? 0)),
			total,
			counts,
		};
	}

	async findVisible(
		userId: string,
		projectId: string,
	): Promise<ProjectSummary> {
		const found = await this.readVisible(userId, projectId);

		return toSummary(found, await this.units.usedBy(projectId));
	}

	async readUnits(
		userId: string,
		projectId: string,
	): Promise<ProjectUnitsBalance> {
		const { reservedUnits } = await this.readVisible(userId, projectId);

		return this.units.balanceOf(projectId, reservedUnits);
	}

	async rename(
		userId: string,
		projectId: string,
		{ name }: RenameProject,
	): Promise<ProjectSummary> {
		const found = await this.readVisible(userId, projectId);
		if (found.effectiveRole === "assistant") {
			throw new ForbiddenException();
		}

		const renamed = await this.projects.renameActive(projectId, name);
		if (!renamed) {
			throw new ProblemException({
				status: 409,
				code: PROJECT_DELIVERED,
				detail: "The project was delivered, so its name can no longer change.",
			});
		}

		return toSummary(
			{ ...found, name: renamed.name },
			await this.units.usedBy(projectId),
		);
	}

	@Transactional()
	async changeReservation(
		userId: string,
		projectId: string,
		{ reserved }: ChangeReservation,
	): Promise<ProjectSummary> {
		const found = await this.readVisible(userId, projectId);
		const membership = await this.members.findByUser(userId);
		if (membership?.role !== "admin") {
			throw new ForbiddenException();
		}

		const locked = await this.units.lockProject(projectId);
		if (locked.status === "delivered") {
			throw new ProblemException({
				status: 409,
				code: PROJECT_DELIVERED,
				detail:
					"The project was delivered, so its reservation can no longer change.",
			});
		}

		const { free } = await this.units.readForReservation(
			membership.organizationId,
		);
		const used = await this.units.usedBy(projectId);
		if (reserved < used) {
			throw new ProblemException({
				status: 409,
				code: RESERVATION_BELOW_USED,
				detail: "The reservation cannot drop below the units the project uses.",
				used,
			});
		}

		const requested = reserved - locked.reserved;
		if (requested > free) {
			throw new ProblemException({
				status: 409,
				code: NO_UNITS_LEFT,
				detail:
					"The organization has fewer free units than the reservation needs to grow by.",
				requested,
				available: free,
			});
		}

		await this.projects.setReservedUnits(projectId, reserved);

		return toSummary({ ...found, reservedUnits: reserved }, used);
	}

	@Transactional(Propagation.Mandatory)
	async beginStructureWrite(userId: string, projectId: string): Promise<void> {
		await this.readVisible(userId, projectId);
		await this.projects.touch(projectId);
	}

	@Transactional()
	async deliver(userId: string, projectId: string): Promise<ProjectSummary> {
		const found = await this.readVisible(userId, projectId);
		if (found.effectiveRole === "assistant") {
			throw new ForbiddenException();
		}

		const locked = await this.units.lockProject(projectId);
		if (locked.status === "delivered") {
			throw new ProblemException({
				status: 409,
				code: PROJECT_DELIVERED,
				detail: "The project was already delivered.",
			});
		}

		await this.units.lockOrganization(locked.organizationId);

		const used = await this.units.usedBy(projectId);
		await this.projects.deliver(projectId, userId, used);

		return toSummary(await this.readVisible(userId, projectId), used);
	}

	private async readVisible(userId: string, projectId: string) {
		const found = await this.projects.findVisible(userId, projectId);
		if (!found) {
			throw new ProblemException({
				status: 404,
				code: PROJECT_NOT_FOUND,
				detail: "The project does not exist or is not visible to the caller.",
			});
		}

		return found;
	}

	async listManagers(userId: string): Promise<ProjectManager[]> {
		const membership = await this.members.findByUser(userId);
		if (membership?.role !== "admin") {
			throw new ForbiddenException();
		}

		return this.projects.listManagers(membership.organizationId);
	}

	@Transactional()
	async create(
		userId: string,
		{ id, name, units }: CreateProject,
	): Promise<ProjectSummary> {
		const membership = await this.members.findByUser(userId);
		if (membership?.role !== "admin") {
			throw new ForbiddenException();
		}
		const { organizationId } = membership;

		const { free } = await this.units.readForReservation(organizationId);

		const existing = await this.projects.findByIdInAnyOrganization(id);
		if (existing) {
			return this.answerExisting(existing, organizationId);
		}

		if (units > free) {
			throw new ProblemException({
				status: 409,
				code: NO_UNITS_LEFT,
				detail:
					"The organization has fewer free units than the project asked to reserve.",
				requested: units,
				available: free,
			});
		}

		const created = await this.projects.insertIfAbsent({
			id,
			organizationId,
			name,
			reservedUnits: units,
		});
		if (!created) {
			return this.answerExisting(
				(await this.projects.findByIdInAnyOrganization(id))!,
				organizationId,
			);
		}

		return toSummary(
			{ ...created, effectiveRole: null, deliveredByName: null },
			0,
		);
	}

	private async answerExisting(
		existing: ProjectWithDeliverer,
		organizationId: string,
	): Promise<ProjectSummary> {
		if (existing.organizationId !== organizationId) {
			throw new ProblemException({
				status: 409,
				code: PROJECT_ID_TAKEN,
				detail: "The project id is already taken.",
			});
		}

		return toSummary(
			{ ...existing, effectiveRole: null },
			await this.units.usedBy(existing.id),
		);
	}
}
