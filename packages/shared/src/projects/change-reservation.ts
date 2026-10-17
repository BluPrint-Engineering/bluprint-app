import { z } from "zod";

export const changeReservationSchema = z.object({
	reserved: z.int().nonnegative().meta({
		description:
			"The units the project reserves from now on: at least the units it uses and at most its current reservation plus the organization's free units.",
		example: 450,
	}),
});

export type ChangeReservation = z.infer<typeof changeReservationSchema>;
