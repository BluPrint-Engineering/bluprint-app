import type { LocationType } from "@bluprint/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, asc, eq, ne } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "../structure/location.entity";
import { discipline } from "./discipline.entity";
import { locationDiscipline } from "./location-discipline.entity";

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
