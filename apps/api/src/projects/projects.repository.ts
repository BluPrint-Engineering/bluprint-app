import {
	ProjectSort,
	ProjectStatus,
	ProjectStatusFilter,
} from "@bluprint/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import {
	and,
	asc,
	count,
	desc,
	exists,
	eq,
	isNotNull,
	or,
	sql,
} from "drizzle-orm";
import { user } from "../auth/auth.entity";
import { alias } from "drizzle-orm/pg-core";
import { DatabaseAdapter } from "../db/database.module";
import { member } from "../members/member.entity";
import { projectMember } from "../project-members/project-member.entity";
import { project } from "./project.entity";

/** ilike reads `%`, `_` and `\` as wildcards or escapes, so `q` is escaped to match itself. */
function nameContains(q: string) {
	if (q === "") return undefined;
	const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
	return sql`unaccent(${project.name}) ilike unaccent(${pattern})`;
}

@Injectable()
export class ProjectsRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	/** `offset` counts projects, not pages. */
	async listVisible(
		userId: string,
		{
			q,
			status,
			sort,
			limit,
			offset,
			managerId,
		}: {
			q: string;
			status: ProjectStatusFilter;
			sort: ProjectSort;
			limit: number;
			offset: number;
			managerId?: string | undefined;
		},
	) {
		const managerOf = alias(projectMember, "manager_of");
		const visible = this.txHost.tx.$with("visible").as(
			this.txHost.tx
				.select({
					id: project.id,
					name: project.name,
					createdAt: project.createdAt,
					status: project.status,
					lastActivityAt: project.lastActivityAt,
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
				.where(
					and(
						or(isNotNull(projectMember.id), eq(member.role, "admin")),
						nameContains(q),
						managerId
							? exists(
									this.txHost.tx
										.select({ one: sql`1` })
										.from(managerOf)
										.where(
											and(
												eq(managerOf.projectId, project.id),
												eq(managerOf.userId, managerId),
												eq(managerOf.role, "manager"),
											),
										),
								)
							: undefined,
					),
				),
		);

		// the id tiebreak keeps pages stable: rows created in one transaction share created_at, and names repeat
		const order = {
			recent: [desc(visible.createdAt), desc(visible.id)],
			// ICU compares letters before accents and case, so "Árvore" and "árvore" sort among the A's
			name: [asc(sql`${visible.name} collate "pt-BR-x-icu"`), asc(visible.id)],
			activity: [desc(visible.lastActivityAt), desc(visible.id)],
		}[sort];

		const inStatus = status === "all" ? undefined : eq(visible.status, status);

		const [items, [counted], perStatus] = await Promise.all([
			this.txHost.tx
				.with(visible)
				.select()
				.from(visible)
				.where(inStatus)
				.orderBy(...order)
				.limit(limit)
				.offset(offset),
			this.txHost.tx
				.with(visible)
				.select({ total: count() })
				.from(visible)
				.where(inStatus),
			// the status filter stays out: these counts say what the other statuses hold
			this.txHost.tx
				.with(visible)
				.select({ status: visible.status, total: count() })
				.from(visible)
				.groupBy(visible.status),
		]);

		const counts: Record<ProjectStatus, number> = { active: 0, delivered: 0 };
		for (const row of perStatus) counts[row.status] = row.total;

		return { items, total: counted!.total, counts };
	}

	async listManagers(organizationId: string) {
		return (
			this.txHost.tx
				.select({ id: user.id, name: user.name })
				.from(projectMember)
				.innerJoin(project, eq(project.id, projectMember.projectId))
				// a project_member row alone can name someone from another organization
				.innerJoin(
					member,
					and(
						eq(member.userId, projectMember.userId),
						eq(member.organizationId, project.organizationId),
					),
				)
				.innerJoin(user, eq(user.id, projectMember.userId))
				.where(
					and(
						eq(project.organizationId, organizationId),
						eq(projectMember.role, "manager"),
					),
				)
				// grouped rather than DISTINCT: Postgres wants an ORDER BY expression in the DISTINCT list
				.groupBy(user.id, user.name)
				.orderBy(asc(sql`${user.name} collate "pt-BR-x-icu"`), asc(user.id))
		);
	}

	async insert(values: {
		organizationId: string;
		name: string;
		status?: ProjectStatus | undefined;
	}): Promise<{
		id: string;
		name: string;
		createdAt: Date;
		lastActivityAt: Date;
		status: ProjectStatus;
	}> {
		const [created] = await this.txHost.tx
			.insert(project)
			.values(values)
			.returning({
				id: project.id,
				name: project.name,
				createdAt: project.createdAt,
				status: project.status,
				lastActivityAt: project.lastActivityAt,
			});

		return created!;
	}
}
