import { z } from "zod";
import { unitChangesSchema, unitTypeRefSchema } from "./unit-type-ref.js";

const locationName = z.string().meta({
	description: "The location's name, free text of 1 to 60 characters.",
	example: "901",
});

export const structureUnitSchema = z.object({
	id: z.uuid(),
	name: locationName,
	unitType: unitTypeRefSchema.nullable().meta({
		description: "The unit type the unit follows, or null when it has none.",
	}),
	changes: unitChangesSchema,
});

export const structureCommonAreaSchema = z.object({
	id: z.uuid(),
	name: locationName,
});

export const structureFloorSchema = z.object({
	id: z.uuid(),
	name: locationName,
	units: z.array(structureUnitSchema).meta({
		description: "The floor's units, in their stored order.",
	}),
	commonAreas: z.array(structureCommonAreaSchema).meta({
		description: "The common areas of this floor, in their stored order.",
	}),
});

export const structureTowerSchema = z.object({
	id: z.uuid(),
	name: locationName,
	floors: z.array(structureFloorSchema).meta({
		description:
			"The tower's floors from the lowest to the highest, in their stored order.",
	}),
	commonAreas: z.array(structureCommonAreaSchema).meta({
		description: "The common areas of this tower, not of one of its floors.",
	}),
});

const count = z.int().nonnegative();

export const structureCountsSchema = z.object({
	towers: count,
	floors: count,
	units: count,
	commonAreas: count.meta({
		description: "Every common area of the project, at any level.",
	}),
});

export const structureSchema = z.object({
	towers: z.array(structureTowerSchema).meta({
		description:
			"The project's towers in their stored order. A project with one tower still lists it: the client decides not to show it.",
	}),
	commonAreas: z.array(structureCommonAreaSchema).meta({
		description: "The common areas of the project itself, outside any tower.",
	}),
	counts: structureCountsSchema,
});

export type StructureUnit = z.infer<typeof structureUnitSchema>;
export type StructureCommonArea = z.infer<typeof structureCommonAreaSchema>;
export type StructureFloor = z.infer<typeof structureFloorSchema>;
export type StructureTower = z.infer<typeof structureTowerSchema>;
export type StructureCounts = z.infer<typeof structureCountsSchema>;
export type Structure = z.infer<typeof structureSchema>;
