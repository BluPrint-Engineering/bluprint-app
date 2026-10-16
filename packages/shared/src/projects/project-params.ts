import { z } from "zod";

export const projectParamsSchema = z.object({
	id: z.uuid().meta({ description: "The project's id." }),
});

export type ProjectParams = z.infer<typeof projectParamsSchema>;
