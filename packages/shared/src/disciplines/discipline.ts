import { z } from "zod";

export const disciplineTypes = ["general", "base", "extra"] as const;

export const disciplineTypeSchema = z.enum(disciplineTypes).meta({
	id: "DisciplineType",
	description:
		"What a discipline is: the project's `general` one, one of the two `base` disciplines every project starts with (Hidráulica and Elétrica), or an `extra` one a person created.",
});

export const disciplineSchema = z.object({
	id: z.uuid().meta({ description: "The discipline's id." }),
	name: z.string().meta({
		description: "The discipline's name, free text of 1 to 60 characters.",
		example: "Pintura",
	}),
	color: z
		.string()
		.regex(/^#[0-9A-F]{6}$/)
		.nullable()
		.meta({
			description:
				"The discipline's color as `#RRGGBB`, unique in the project; `null` only for the general discipline.",
			example: "#0D9488",
		}),
	type: disciplineTypeSchema,
	hasOwnPlan: z.boolean().meta({
		description:
			"Whether the discipline has a plan of its own. True for the general and base disciplines, false for a new extra one.",
	}),
	appliesEverywhere: z.boolean().meta({
		description:
			"Whether the discipline applies at every unit and common area by default, or only where it is turned on. Chosen when the discipline is created and never changed.",
	}),
});

export const disciplineListSchema = z.object({
	items: z.array(disciplineSchema).meta({
		description:
			"The project's disciplines: General, Hidráulica, Elétrica, then the extra ones in the order they were created.",
	}),
});

export type DisciplineType = z.infer<typeof disciplineTypeSchema>;
export type Discipline = z.infer<typeof disciplineSchema>;
export type DisciplineList = z.infer<typeof disciplineListSchema>;
