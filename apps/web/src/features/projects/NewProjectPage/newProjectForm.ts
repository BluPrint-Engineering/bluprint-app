import { z } from "zod";
import { projectNameFormSchema } from "../components/projectNameForm";

const EMPTY_UNITS = "Informe quantas unidades reservar.";

export function validUnits(typed: string, free: number | undefined) {
	const units = Number(typed);
	return typed !== "" && units >= 1 && (free === undefined || units <= free);
}

export function newProjectFormSchema(free: number | undefined) {
	return projectNameFormSchema.extend({
		units: z.string().superRefine((typed, ctx) => {
			if (validUnits(typed, free)) return;
			const message =
				typed === "" || !free
					? EMPTY_UNITS
					: free === 1
						? "Só há 1 unidade livre."
						: `De 1 a ${free} unidades.`;
			ctx.addIssue({ code: "custom", message });
		}),
	});
}

export type NewProjectFormValues = z.infer<
	ReturnType<typeof newProjectFormSchema>
>;
