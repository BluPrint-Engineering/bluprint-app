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
