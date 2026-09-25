import { ProjectSummary } from "@bluprint/shared";
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

	async listVisible(userId: string): Promise<ProjectSummary[]> {
		const rows = await this.projects.listVisible(userId);

		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			// z.iso.datetime() needs a string, not a Date, or the serializer 500s
			createdAt: row.createdAt.toISOString(),
			role: row.effectiveRole ?? "admin",
		}));
	}

	@Transactional()
	async create(userId: string, name: string): Promise<ProjectSummary> {
		const organizationId = await this.members.findAdminOrganizationId(userId);
		if (!organizationId) {
			throw new ForbiddenException();
		}

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
			role: "admin",
		};
	}
}
