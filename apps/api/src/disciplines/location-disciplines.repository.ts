import type { LocationType } from "@bluprint/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "../structure/location.entity";
import { discipline } from "./discipline.entity";
import { locationDiscipline } from "./location-discipline.entity";

const INSERT_CHUNK = 1000;

export interface LocationDisciplineRow {
	id: string;
	name: string;
	type: typeof discipline.$inferSelect.type;
	appliesEverywhere: boolean;
	exception: boolean | null;
}

@Injectable()
export class LocationDisciplinesRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	async findLocation(
		projectId: string,
		locationId: string,
	): Promise<{ id: string; type: LocationType } | undefined> {
		const [found] = await this.txHost.tx
			.select({ id: location.id, type: location.type })
			.from(location)
			.where(
				and(eq(location.id, locationId), eq(location.projectId, projectId)),
			);

		return found;
	}

	listSpecific(
		projectId: string,
		locationId: string,
	): Promise<LocationDisciplineRow[]> {
		return this.txHost.tx
			.select({
				id: discipline.id,
				name: discipline.name,
				type: discipline.type,
				appliesEverywhere: discipline.appliesEverywhere,
				exception: locationDiscipline.applies,
			})
			.from(discipline)
			.leftJoin(
				locationDiscipline,
				and(
					eq(locationDiscipline.disciplineId, discipline.id),
					eq(locationDiscipline.locationId, locationId),
				),
			)
			.where(
				and(
					eq(discipline.projectId, projectId),
					ne(discipline.type, "general"),
				),
			)
			.orderBy(
				asc(discipline.type),
				asc(discipline.createdAt),
				asc(discipline.id),
			);
	}

	async exceptionsByLocation(
		locationIds: string[],
	): Promise<Map<string, { disciplineId: string; applies: boolean }[]>> {
		const byLocation = new Map<
			string,
			{ disciplineId: string; applies: boolean }[]
		>();
		if (locationIds.length === 0) return byLocation;

		const rows = await this.txHost.tx
			.select({
				locationId: locationDiscipline.locationId,
				disciplineId: locationDiscipline.disciplineId,
				applies: locationDiscipline.applies,
			})
			.from(locationDiscipline)
			.innerJoin(discipline, eq(discipline.id, locationDiscipline.disciplineId))
			.where(inArray(locationDiscipline.locationId, locationIds))
			.orderBy(
				asc(discipline.type),
				asc(discipline.createdAt),
				asc(discipline.id),
			);
		for (const { locationId, disciplineId, applies } of rows) {
			const list = byLocation.get(locationId);
			if (list) list.push({ disciplineId, applies });
			else byLocation.set(locationId, [{ disciplineId, applies }]);
		}
		return byLocation;
	}

	async setException(values: {
		locationId: string;
		disciplineId: string;
		projectId: string;
		applies: boolean;
	}): Promise<void> {
		await this.txHost.tx
			.insert(locationDiscipline)
			.values(values)
			.onConflictDoUpdate({
				target: [
					locationDiscipline.locationId,
					locationDiscipline.disciplineId,
				],
				set: { applies: values.applies },
			});
	}

	async insertExceptions(
		values: {
			locationId: string;
			disciplineId: string;
			projectId: string;
			applies: boolean;
		}[],
	): Promise<void> {
		for (let start = 0; start < values.length; start += INSERT_CHUNK) {
			await this.txHost.tx
				.insert(locationDiscipline)
				.values(values.slice(start, start + INSERT_CHUNK));
		}
	}

	async clearException(
		locationId: string,
		disciplineId: string,
	): Promise<void> {
		await this.txHost.tx
			.delete(locationDiscipline)
			.where(
				and(
					eq(locationDiscipline.locationId, locationId),
					eq(locationDiscipline.disciplineId, disciplineId),
				),
			);
	}
}
