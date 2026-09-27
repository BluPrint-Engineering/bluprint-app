import { z } from "zod";

export const PROJECT_PAGE_SIZE = 12;
export const MAX_PROJECT_PAGE_SIZE = 100;

export const projectListQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1).meta({
		description:
			"1-based page number. A page past the last one answers an empty `items` with the real `total`.",
		example: 2,
	}),
	pageSize: z.coerce
		.number()
		.int()
		.min(1)
		.max(MAX_PROJECT_PAGE_SIZE)
		.default(PROJECT_PAGE_SIZE)
		.meta({ description: "Projects per page.", example: PROJECT_PAGE_SIZE }),
});

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
