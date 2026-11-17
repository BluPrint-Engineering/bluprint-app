import { type SQL, sql } from "drizzle-orm";
import { location } from "./location.entity";
import { droppedRoom, room } from "./room.entity";

export interface LocationChangesRow extends Record<string, unknown> {
	location_id: string;
	n: number;
}

export function locationChangesQuery(
	projectId: string,
	locationId?: string,
): SQL {
	const onlyThisLocation = locationId ? sql`and l.id = ${locationId}` : sql``;

	return sql`
		select changed.location_id, count(*)::int as n
		from (
			select r.location_id
			from ${room} r
			join ${location} l on l.id = r.location_id
			where l.project_id = ${projectId} and l.typology_id is not null
				and (r.typology_room_id is null or r.renamed)
				${onlyThisLocation}
			union all
			select d.location_id
			from ${droppedRoom} d
			join ${location} l on l.id = d.location_id
			where l.project_id = ${projectId} and l.typology_id is not null
				${onlyThisLocation}
		) changed
		group by changed.location_id
	`;
}
