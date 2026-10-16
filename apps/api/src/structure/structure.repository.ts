import { TransactionHost } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { DatabaseAdapter } from "../db/database.module";
import { location } from "./location.entity";
import type { LocationRow } from "./location-row";

const columns = {
	id: location.id,
	parentId: location.parentId,
	type: location.type,
	name: location.name,
};

@Injectable()
export class StructureRepository {
	constructor(private readonly txHost: TransactionHost<DatabaseAdapter>) {}

	/** Every location of the project in stored order: siblings by position, the id breaking ties. */
	listByProject(projectId: string): Promise<LocationRow[]> {
		return this.txHost.tx
			.select(columns)
			.from(location)
			.where(eq(location.projectId, projectId))
			.orderBy(asc(location.position), asc(location.id));
	}

	async find(
		projectId: string,
		locationId: string,
	): Promise<LocationRow | undefined> {
		const [found] = await this.txHost.tx
			.select(columns)
			.from(location)
			.where(
				and(eq(location.projectId, projectId), eq(location.id, locationId)),
			);

		return found;
	}

	listChildren(parentId: string): Promise<LocationRow[]> {
		return this.txHost.tx
			.select(columns)
			.from(location)
			.where(eq(location.parentId, parentId))
			.orderBy(asc(location.position), asc(location.id));
	}

	/** From the highest ancestor down to `parentId`. */
	async listAncestors(
		projectId: string,
		parentId: string,
	): Promise<LocationRow[]> {
		const { rows } = await this.txHost.tx.execute<{
			id: string;
			parent_id: string | null;
			type: LocationRow["type"];
			name: string;
		}>(sql`
			with recursive chain as (
				select ${location.id} as id, ${location.parentId} as parent_id, ${location.type} as type, ${location.name} as name, 0 as depth
				from ${location}
				where ${location.id} = ${parentId} and ${location.projectId} = ${projectId}
				union all
				select l.id, l.parent_id, l.type, l.name, chain.depth + 1
				from ${location} l
				join chain on l.id = chain.parent_id
			)
			select id, parent_id, type, name from chain order by depth desc
		`);

		return rows.map((row) => ({
			id: row.id,
			parentId: row.parent_id,
			type: row.type,
			name: row.name,
		}));
	}
}
