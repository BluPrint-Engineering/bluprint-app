import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { comparableNameSql, discipline } from "./discipline.entity";

export type DisciplineRow = typeof discipline.$inferSelect;

@Injectable()
export class DisciplinesRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	list(projectId: string): Promise<DisciplineRow[]> {
		return this.txHost.tx
			.select()
			.from(discipline)
			.where(eq(discipline.projectId, projectId))
			.orderBy(
				asc(discipline.type),
				asc(discipline.createdAt),
				asc(discipline.id),
			);
	}

	async find(disciplineId: string): Promise<DisciplineRow | undefined> {
		const [found] = await this.txHost.tx
			.select()
			.from(discipline)
			.where(eq(discipline.id, disciplineId));

		return found;
	}

	async findByName(
		projectId: string,
		name: string,
	): Promise<DisciplineRow | undefined> {
		const [found] = await this.txHost.tx
			.select()
			.from(discipline)
			.where(
				and(
					eq(discipline.projectId, projectId),
					sql`${comparableNameSql(discipline.name)} = ${comparableNameSql(sql`${name}::text`)}`,
				),
			);

		return found;
	}

	async countExtras(projectId: string): Promise<number> {
		const [counted] = await this.txHost.tx
			.select({ total: count() })
			.from(discipline)
			.where(
				and(eq(discipline.projectId, projectId), eq(discipline.type, "extra")),
			);

		return counted!.total;
	}

	async usedColors(projectId: string): Promise<Set<string>> {
		const rows = await this.txHost.tx
			.select({ color: discipline.color })
			.from(discipline)
			.where(eq(discipline.projectId, projectId));

		return new Set(rows.flatMap(({ color }) => (color ? [color] : [])));
	}

	async insertExtra(values: {
		id: string;
		projectId: string;
		name: string;
		color: string;
		appliesEverywhere: boolean;
	}): Promise<DisciplineRow> {
		const [created] = await this.txHost.tx
			.insert(discipline)
			.values({
				...values,
				type: "extra",
				hasOwnPlan: false,
				createdAt: sql`clock_timestamp()`,
			})
			.returning();

		return created!;
	}
}
