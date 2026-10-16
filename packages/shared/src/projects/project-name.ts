import { z } from "zod";

export const PROJECT_NAME_MAX_LENGTH = 120;

export const projectNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(PROJECT_NAME_MAX_LENGTH)
	.meta({
		description: "The project's name.",
		example: "Casa Moinhos",
	});
