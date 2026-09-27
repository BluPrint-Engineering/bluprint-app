import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, count, desc, eq, isNotNull, or } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { member } from "../members/member.entity";
import { projectMember } from "../project-members/project-member.entity";
import { project } from "./project.entity";

@Injectable()
export class ProjectsRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	/** `offset` counts projects, not pages. */
	async listVisible(
		userId: string,
		{ limit, offset }: { limit: number; offset: number },
	) {
		const visible = this.txHost.tx.$with("visible").as(
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
				.where(or(isNotNull(projectMember.id), eq(member.role, "admin"))),
		);

		const [items, [counted]] = await Promise.all([
			this.txHost.tx
				.with(visible)
				.select()
				.from(visible)
				// the id tiebreak keeps pages stable: rows created in one transaction share created_at
				.orderBy(desc(visible.createdAt), desc(visible.id))
				.limit(limit)
				.offset(offset),
			this.txHost.tx.with(visible).select({ total: count() }).from(visible),
		]);

		return { items, total: counted!.total };
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
