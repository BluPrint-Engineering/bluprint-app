import { type SQL, sql } from "drizzle-orm";
import { location } from "./location.entity";
import { droppedRoom, room } from "./room.entity";

export interface UnitChangesRow extends Record<string, unknown> {
	unit_id: string;
	n: number;
}

export function unitChangesQuery(projectId: string, unitId?: string): SQL {
	const onlyThisUnit = unitId ? sql`and l.id = ${unitId}` : sql``;

	return sql`
		select changed.location_id as unit_id, count(*)::int as n
		from (
			select r.location_id
			from ${room} r
			join ${location} l on l.id = r.location_id
			where l.project_id = ${projectId} and l.unit_type_id is not null
				and (r.unit_type_room_id is null or r.renamed)
				${onlyThisUnit}
			union all
			select d.location_id
			from ${droppedRoom} d
			join ${location} l on l.id = d.location_id
			where l.project_id = ${projectId} and l.unit_type_id is not null
				${onlyThisUnit}
		) changed
		group by changed.location_id
	`;
}
