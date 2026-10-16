import { PROJECT_NAME_MAX_LENGTH } from "@bluprint/shared";
import { z } from "zod";

export const projectNameFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Informe o nome da obra.")
		.max(
			PROJECT_NAME_MAX_LENGTH,
			`O nome pode ter no máximo ${PROJECT_NAME_MAX_LENGTH} caracteres.`,
		),
});

export type ProjectNameFormValues = z.infer<typeof projectNameFormSchema>;
