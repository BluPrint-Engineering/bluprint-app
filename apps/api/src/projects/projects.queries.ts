import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import { Executor } from "../db/database.module";
import { member, project, projectMember } from "../db/schema";

export function listVisibleProjects(db: Executor, userId: string) {
	return (
		db
			.select({
				id: project.id,
				name: project.name,
				createdAt: project.createdAt,
				effectiveRole: projectMember.role,
			})
			.from(project)
			// The tenant isolation boundary: without it, a project_member row alone
			// would reach another organization's project.
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
			// Organization membership alone admits only an admin; a default role
			// never authorizes: docs/adr/0022-roles-live-on-project-membership.md
			.where(or(isNotNull(projectMember.id), eq(member.role, "admin")))
			.orderBy(desc(project.createdAt), desc(project.id))
	);
}
