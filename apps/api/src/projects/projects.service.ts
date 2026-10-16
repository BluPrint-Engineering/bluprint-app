import {
	type CreateProject,
	EffectiveRole,
	NO_UNITS_LEFT,
	PROJECT_DELIVERED,
	PROJECT_ID_TAKEN,
	PROJECT_NOT_FOUND,
	ProjectList,
	ProjectListQuery,
	ProjectManager,
	ProjectStatus,
	ProjectSummary,
	ProjectUnits,
	type RenameProject,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { MembersRepository } from "../members/members.repository";
import { UnitsService } from "../units/units.service";
import { type ProjectRow, ProjectsRepository } from "./projects.repository";

// TODO(#165): used becomes the units the project has created or spent
function unitsOf(reserved: number): ProjectUnits {
	return { reserved, used: 0 };
}

function toSummary(row: {
	id: string;
	name: string;
	createdAt: Date;
	lastActivityAt: Date;
	effectiveRole: EffectiveRole | null;
	reservedUnits: number;
	status: ProjectStatus;
}): ProjectSummary {
	return {
		id: row.id,
		name: row.name,
		// z.iso.datetime() needs a string, not a Date, or the serializer 500s
		createdAt: row.createdAt.toISOString(),
		lastActivityAt: row.lastActivityAt.toISOString(),
		role: row.effectiveRole ?? "admin",
		units: unitsOf(row.reservedUnits),
		status: row.status,
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

		return { items: items.map(toSummary), total, counts };
	}

	async findVisible(
		userId: string,
		projectId: string,
	): Promise<ProjectSummary> {
		return toSummary(await this.readVisible(userId, projectId));
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

		return toSummary({ ...found, name: renamed.name });
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

		return toSummary({ ...created, effectiveRole: null });
	}

	private answerExisting(
		existing: ProjectRow,
		organizationId: string,
	): ProjectSummary {
		if (existing.organizationId !== organizationId) {
			throw new ProblemException({
				status: 409,
				code: PROJECT_ID_TAKEN,
				detail: "The project id is already taken.",
			});
		}

		return toSummary({ ...existing, effectiveRole: null });
	}
}
