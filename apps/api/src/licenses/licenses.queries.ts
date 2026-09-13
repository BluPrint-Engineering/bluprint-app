import { and, eq, isNull } from "drizzle-orm";
import { Executor } from "../db/database.module";
import { license } from "../db/schema";

export async function insertLicenses(
	db: Executor,
	organizationId: string,
	count: number,
): Promise<void> {
	await db
		.insert(license)
		.values(Array.from({ length: count }, () => ({ organizationId })));
}

// One statement, never a read then a write: two concurrent creations would
// both pick the same free row. SKIP LOCKED sends the loser to the next free
// row or to none; `license_project_id_uidx` still holds if this is removed.
export async function consumeFreeLicense(
	db: Executor,
	organizationId: string,
	projectId: string,
): Promise<{ id: string } | undefined> {
	const freeLicense = db
		.select({ id: license.id })
		.from(license)
		.where(
			and(
				eq(license.organizationId, organizationId),
				isNull(license.projectId),
			),
		)
		.limit(1)
		.for("update", { skipLocked: true });

	const [consumed] = await db
		.update(license)
		.set({ projectId })
		.where(eq(license.id, freeLicense))
		.returning({ id: license.id });

	return consumed;
}
