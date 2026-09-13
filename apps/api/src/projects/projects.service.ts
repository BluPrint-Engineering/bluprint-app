import { ProjectSummary } from "@bluprint/shared";
import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { DATABASE, Database } from "../db/database.module";
import { consumeFreeLicense } from "../licenses/licenses.queries";
import { findAdminOrganizationId } from "../members/members.queries";
import { insertProject, listVisibleProjects } from "./projects.queries";

@Injectable()
export class ProjectsService {
	constructor(@Inject(DATABASE) private readonly db: Database) {}

	async listVisible(userId: string): Promise<ProjectSummary[]> {
		const rows = await listVisibleProjects(this.db, userId);

		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			// The serializer parses against `z.iso.datetime()` before JSON ever
			// happens — a `Date` would fail that check with a 500.
			createdAt: row.createdAt.toISOString(),
			role: row.effectiveRole ?? "admin",
		}));
	}

	async create(userId: string, name: string): Promise<ProjectSummary> {
		const organizationId = await findAdminOrganizationId(this.db, userId);
		if (!organizationId) {
			throw new ForbiddenException();
		}

		const created = await this.db.transaction(async (tx) => {
			const project = await insertProject(tx, { organizationId, name });

			const license = await consumeFreeLicense(tx, organizationId, project.id);
			if (!license) {
				throw new ProblemException({
					status: 409,
					code: "NO_FREE_LICENSE",
					detail: "The organization has no free license.",
				});
			}

			return project;
		});

		return {
			id: created.id,
			name: created.name,
			createdAt: created.createdAt.toISOString(),
			role: "admin",
		};
	}
}
