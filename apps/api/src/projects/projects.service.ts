import {
	ProjectList,
	ProjectListQuery,
	ProjectManager,
	ProjectSummary,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { LicensesRepository } from "../licenses/licenses.repository";
import { MembersRepository } from "../members/members.repository";
import { ProjectsRepository } from "./projects.repository";

@Injectable()
export class ProjectsService {
	constructor(
		private readonly projects: ProjectsRepository,
		private readonly members: MembersRepository,
		private readonly licenses: LicensesRepository,
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
	async create(userId: string, name: string): Promise<ProjectSummary> {
		const membership = await this.members.findByUser(userId);
		if (membership?.role !== "admin") {
			throw new ForbiddenException();
		}
		const { organizationId } = membership;

		const project = await this.projects.insert({ organizationId, name });

		const license = await this.licenses.consumeFree(organizationId, project.id);
		if (!license) {
			throw new ProblemException({
				status: 409,
				code: "NO_FREE_LICENSE",
				detail: "The organization has no free license.",
			});
		}

		return {
			id: project.id,
			name: project.name,
			createdAt: project.createdAt.toISOString(),
			lastActivityAt: project.lastActivityAt.toISOString(),
			role: "admin",
			status: project.status,
		};
	}
}
