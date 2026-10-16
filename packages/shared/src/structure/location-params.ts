import { z } from "zod";
import { projectParamsSchema } from "../projects/project-params.js";

export const locationParamsSchema = projectParamsSchema.extend({
	locationId: z.uuid().meta({ description: "The location's id." }),
});

export type LocationParams = z.infer<typeof locationParamsSchema>;
