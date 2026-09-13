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
			// Requires the caller to belong to the organization that owns the
			// project — this join is the isolation boundary: no row, no match.
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
			// A project_member row is sufficient on its own — a plain
			// manager/assistant with no org-level admin role still gets in. The
			// admin check is the fallback for when it's absent; when both are
			// true — an admin who is also project_member — the effective role
			// still wins below.
			.where(or(isNotNull(projectMember.id), eq(member.role, "admin")))
			.orderBy(desc(project.createdAt), desc(project.id))
	);
}
