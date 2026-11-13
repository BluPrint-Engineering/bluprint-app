import { sql } from "drizzle-orm";
import type { Database } from "../db/database.module";
import { discipline } from "./discipline.entity";

const DEFAULT_DISCIPLINES = [
	{ name: "Geral", color: null, type: "general" },
	{ name: "Hidráulica", color: "#2563EB", type: "base" },
	{ name: "Elétrica", color: "#D97706", type: "base" },
] as const;

export async function insertDefaultDisciplines(
	tx: Pick<Database, "insert">,
	projectId: string,
): Promise<void> {
	await tx.insert(discipline).values(
		DEFAULT_DISCIPLINES.map((entry) => ({
			...entry,
			projectId,
			hasOwnPlan: true,
			appliesEverywhere: true,
			createdAt: sql`clock_timestamp()`,
		})),
	);
}
