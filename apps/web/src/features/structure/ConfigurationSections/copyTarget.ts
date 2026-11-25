import {
	createTypologySchema,
	type Typology,
	type TypologyLocationType,
} from "@bluprint/shared";
import { z } from "zod";
import { uuidV7 } from "@/lib/uuidV7";
import type { CopyTypology } from "../api";
import type { RoomListItem } from "../components/RoomList";

export interface CopyTarget {
	original: { id: string; name: string };
	locationType: TypologyLocationType;
	id: string;
	rooms: RoomListItem[];
	name?: string;
}

const keptCopySchema = createTypologySchema.extend({
	copy: z.object({ typologyId: z.string(), name: z.string() }),
});

export function copyTargetOf(typology: Typology): CopyTarget {
	return {
		original: { id: typology.id, name: typology.name },
		locationType: typology.locationType,
		id: uuidV7(),
		rooms: typology.rooms.map(({ name }) => ({ id: uuidV7(), name })),
	};
}

export function keptCopyTarget(variables: unknown): CopyTarget | undefined {
	const kept = keptCopySchema.safeParse(variables);
	if (!kept.success) return undefined;
	const { id, name, locationType, rooms, copy } = kept.data;
	return {
		original: { id: copy.typologyId, name: copy.name },
		locationType,
		id,
		rooms,
		name,
	};
}

export function copyRequest(target: CopyTarget, name: string): CopyTypology {
	return {
		id: target.id,
		name,
		locationType: target.locationType,
		rooms: target.rooms.map(({ id, name: roomName }) => ({
			id,
			name: roomName,
		})),
		copy: { typologyId: target.original.id, name: target.original.name },
	};
}
