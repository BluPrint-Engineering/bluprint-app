import { z } from "zod";

export const reservationRowSchema = z.object({
	projectId: z.uuid(),
	name: z.string().meta({ example: "Edifício Aurora" }),
	reserved: z.int().nonnegative().meta({
		description: "Units the project holds.",
		example: 300,
	}),
	used: z.int().nonnegative().meta({
		description:
			"Units the project has used: the least its reservation can be.",
		example: 180,
	}),
});

export const organizationReservationsSchema = z.object({
	items: z.array(reservationRowSchema).meta({
		description:
			"Every project in progress, by name, in one response. Delivered projects are not rows: their reservation is what they used and cannot change.",
	}),
	delivered: z
		.object({
			projects: z.int().nonnegative().meta({
				description: "How many projects were delivered.",
				example: 2,
			}),
			used: z.int().nonnegative().meta({
				description:
					"Units the delivered projects hold: delivery set each reservation to the units the project used.",
				example: 450,
			}),
		})
		.meta({
			description:
				"What the delivered projects hold, so `items` and `delivered` add up to the organization's reserved units.",
		}),
});

export const RESERVATIONS_PER_REQUEST_MAX = 500;

export const updateReservationsSchema = z.object({
	items: z
		.array(
			z.object({
				projectId: z.uuid(),
				reserved: z.int().nonnegative().meta({
					description: "The units the project reserves from now on.",
					example: 450,
				}),
			}),
		)
		.min(1)
		.max(RESERVATIONS_PER_REQUEST_MAX)
		.refine(
			(items) =>
				new Set(items.map(({ projectId }) => projectId)).size === items.length,
			{ message: "Each project can appear only once." },
		)
		.meta({
			description:
				"The projects whose reservation changes, each once. All change or none does.",
		}),
});

export type ReservationRow = z.infer<typeof reservationRowSchema>;
export type OrganizationReservations = z.infer<
	typeof organizationReservationsSchema
>;
export type UpdateReservations = z.infer<typeof updateReservationsSchema>;
