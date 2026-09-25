import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { member } from "../members/member.entity";
import { projectMember } from "../project-members/project-member.entity";
import { project } from "./project.entity";

@Injectable()
export class ProjectsRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async listVisible(userId: string) {
		return (
			this.txHost.tx
				.select({
					id: project.id,
					name: project.name,
					createdAt: project.createdAt,
					effectiveRole: projectMember.role,
				})
				.from(project)
				// tenant isolation boundary: without it, a project_member row alone reaches another organization's project
				.innerJoin(
					member,
					and(
						eq(member.organizationId, project.organizationId),
						eq(member.userId, userId),
					),
				)
				.leftJoin(
					projectMember,
					and(
						eq(projectMember.projectId, project.id),
						eq(projectMember.userId, userId),
					),
				)
				// an org admin sees every project; anyone else only those they're a member of (ADR 0022)
				.where(or(isNotNull(projectMember.id), eq(member.role, "admin")))
				.orderBy(desc(project.createdAt), desc(project.id))
		);
	}

	async insert(values: {
		organizationId: string;
		name: string;
	}): Promise<{ id: string; name: string; createdAt: Date }> {
		const [created] = await this.txHost.tx
			.insert(project)
			.values(values)
			.returning({
				id: project.id,
				name: project.name,
				createdAt: project.createdAt,
			});

		return created!;
	}
}
