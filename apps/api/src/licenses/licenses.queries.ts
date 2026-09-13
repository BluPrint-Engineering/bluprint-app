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
