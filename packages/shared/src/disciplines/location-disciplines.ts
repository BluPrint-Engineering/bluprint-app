import { z } from "zod";
import { locationParamsSchema } from "../structure/location-params.js";

export const locationDisciplineSchema = z.object({
	id: z.uuid().meta({ description: "The discipline's id." }),
	name: z.string().meta({
		description: "The discipline's name.",
		example: "Pintura",
	}),
	applies: z.boolean().meta({
		description:
			"Whether the discipline applies at this location: the exception set here when there is one, otherwise the default of its kind of location (ADR 0081).",
	}),
});

export const locationDisciplineListSchema = z
	.array(locationDisciplineSchema)
	.meta({
		description:
			"The project's disciplines except General, in the order of the catalog (Hidráulica, Elétrica, then the extra ones in the order they were created), each resolved for this location.",
	});

export const locationDisciplinesSchema = z.object({
	disciplines: locationDisciplineListSchema,
});

export const locationDisciplineParamsSchema = locationParamsSchema.extend({
	disciplineId: z.uuid().meta({ description: "The discipline's id." }),
});

export const setLocationDisciplineSchema = z.object({
	applies: z.boolean().meta({
		description:
			"Whether the discipline should apply at this location. Asking for what the default already gives removes the exception.",
	}),
});

export type LocationDiscipline = z.infer<typeof locationDisciplineSchema>;
export type LocationDisciplines = z.infer<typeof locationDisciplinesSchema>;
export type LocationDisciplineParams = z.infer<
	typeof locationDisciplineParamsSchema
>;
export type SetLocationDiscipline = z.infer<typeof setLocationDisciplineSchema>;
