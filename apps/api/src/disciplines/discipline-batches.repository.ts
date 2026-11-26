import type { DisciplineBatchTarget, LocationType } from "@bluprint/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "../structure/location.entity";
import { discipline } from "./discipline.entity";
import { locationDiscipline } from "./location-discipline.entity";

const BATCH_KINDS: LocationType[] = ["unit", "common_area"];

@Injectable()
export class DisciplineBatchesRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	findLocations(
		projectId: string,
		ids: string[],
	): Promise<{ id: string; type: LocationType }[]> {
		return this.txHost.tx
			.select({ id: location.id, type: location.type })
			.from(location)
			.where(and(eq(location.projectId, projectId), inArray(location.id, ids)));
	}

	scopeOf(projectId: string, target: DisciplineBatchTarget): SQL {
		const kinds = and(
			eq(location.projectId, projectId),
			inArray(location.type, BATCH_KINDS),
		);

		switch (target.type) {
			case "locations":
				return and(kinds, inArray(location.id, target.locationIds))!;
			case "floor":
				return and(kinds, eq(location.parentId, target.locationId))!;
			case "tower": {
				const floor = alias(location, "tower_floor");
				const floorsOfTower = this.txHost.tx
					.select({ id: floor.id })
					.from(floor)
					.where(
						and(eq(floor.parentId, target.locationId), eq(floor.type, "floor")),
					);
				return and(
					kinds,
					or(
						eq(location.parentId, target.locationId),
						inArray(location.parentId, floorsOfTower),
					),
				)!;
			}
		}
	}

	async count(scope: SQL): Promise<number> {
		const [counted] = await this.txHost.tx
			.select({ total: sql<number>`count(*)::int` })
			.from(location)
			.where(scope);

		return counted!.total;
	}

	async setExceptions(
		projectId: string,
		scope: SQL,
		disciplineIds: string[],
		applies: boolean,
	): Promise<void> {
		if (disciplineIds.length === 0) return;

		await this.txHost.tx.insert(locationDiscipline).select(
			this.txHost.tx
				.select({
					locationId: location.id,
					disciplineId: discipline.id,
					projectId: location.projectId,
					applies: sql<boolean>`${applies}::boolean`.as("applies"),
				})
				.from(location)
				.innerJoin(
					discipline,
					and(
						eq(discipline.projectId, projectId),
						inArray(discipline.id, disciplineIds),
					),
				)
				.where(scope),
		);
	}

	async clearExceptions(scope: SQL, disciplineIds: string[]): Promise<void> {
		if (disciplineIds.length === 0) return;

		await this.txHost.tx
			.delete(locationDiscipline)
			.where(
				and(
					inArray(locationDiscipline.disciplineId, disciplineIds),
					inArray(
						locationDiscipline.locationId,
						this.txHost.tx
							.select({ id: location.id })
							.from(location)
							.where(scope),
					),
				),
			);
	}
}
