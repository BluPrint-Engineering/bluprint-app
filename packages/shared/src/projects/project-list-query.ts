import { z } from "zod";

export const PROJECT_PAGE_SIZE = 12;
export const MAX_PROJECT_PAGE_SIZE = 100;

export const projectSorts = ["recent", "name"] as const;

export const projectSortSchema = z.enum(projectSorts);

export const MAX_PROJECT_SEARCH_LENGTH = 100;

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
	q: z.string().trim().max(MAX_PROJECT_SEARCH_LENGTH).default("").meta({
		description:
			"Keeps the projects whose name contains this text, wherever in the name it falls. Accents and case never matter: `edificio` finds `Edifício Aurora`. Blank means no search.",
		example: "edificio",
	}),
	sort: projectSortSchema.default("recent").meta({
		description:
			"`recent`: newest first. `name`: alphabetical in pt-BR, where accents and case never move a name out of its letter. Ties break by id, so pages never overlap.",
		example: "name",
	}),
});

export type ProjectSort = z.infer<typeof projectSortSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
