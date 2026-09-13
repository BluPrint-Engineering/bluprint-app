import { Executor } from "../db/database.module";
import { organization } from "../db/schema";

export async function insertOrganization(
	db: Executor,
	values: { name: string },
): Promise<{ id: string }> {
	const [created] = await db
		.insert(organization)
		.values(values)
		.returning({ id: organization.id });

	return created!;
}
