import { ProjectSummary } from "@bluprint/shared";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE, Database } from "../db/database.module";
import { listVisibleProjects } from "./projects.queries";

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
}
