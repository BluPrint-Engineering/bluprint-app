import { z } from "zod";

export const DISCIPLINE_NAME_MAX_LENGTH = 60;

export const disciplineNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(DISCIPLINE_NAME_MAX_LENGTH)
	.meta({
		description: `The discipline's name, trimmed, 1 to ${DISCIPLINE_NAME_MAX_LENGTH} characters. Unique in the project, ignoring accents, case and repeated spaces, and never "Geral".`,
		example: "Pintura",
	});

export const createDisciplineSchema = z.object({
	id: z.uuid().meta({
		description:
			"The discipline's id, chosen by the client and kept across retries: sending it again answers the discipline already created instead of creating another (ADR 0085).",
		example: "0190a000-0000-7000-8000-0000000000d1",
	}),
	name: disciplineNameSchema,
	appliesEverywhere: z.boolean().meta({
		description:
			"True when the discipline applies at every unit and common area, false when it applies only where it is turned on. Fixed once created (ADR 0081).",
	}),
});

export type CreateDiscipline = z.infer<typeof createDisciplineSchema>;
