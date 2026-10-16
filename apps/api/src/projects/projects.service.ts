import {
	type CreateProject,
	NO_UNITS_LEFT,
	ProjectList,
	ProjectListQuery,
	ProjectManager,
	ProjectSummary,
	ProjectUnits,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { MembersRepository } from "../members/members.repository";
import { UnitsService } from "../units/units.service";
import { ProjectsRepository } from "./projects.repository";

// TODO(#165): used becomes the units the project has created or spent
function unitsOf(reserved: number): ProjectUnits {
	return { reserved, used: 0 };
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

		return {
			items: items.map((row) => ({
				id: row.id,
				name: row.name,
				// z.iso.datetime() needs a string, not a Date, or the serializer 500s
				createdAt: row.createdAt.toISOString(),
				lastActivityAt: row.lastActivityAt.toISOString(),
				role: row.effectiveRole ?? "admin",
				units: unitsOf(row.reservedUnits),
				status: row.status,
			})),
			total,
			counts,
		};
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
		{ name, units }: CreateProject,
	): Promise<ProjectSummary> {
		const membership = await this.members.findByUser(userId);
		if (membership?.role !== "admin") {
			throw new ForbiddenException();
		}
		const { organizationId } = membership;

		const { free } = await this.units.readForReservation(organizationId);
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

		const project = await this.projects.insert({
			organizationId,
			name,
			reservedUnits: units,
		});

		return {
			id: project.id,
			name: project.name,
			createdAt: project.createdAt.toISOString(),
			lastActivityAt: project.lastActivityAt.toISOString(),
			role: "admin",
			units: unitsOf(project.reservedUnits),
			status: project.status,
		};
	}
}
