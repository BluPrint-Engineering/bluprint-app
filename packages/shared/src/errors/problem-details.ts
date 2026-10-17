import { z } from "zod";

export const fieldErrorSchema = z.object({
	pointer: z.string().meta({
		description:
			"JSON Pointer to the offending input, rooted at where it was sent: `/body`, `/query` or `/param`.",
		example: "/query/verbose",
	}),
	code: z.string().meta({ example: "INVALID_FORMAT" }),
	detail: z.string().meta({ example: "Invalid input" }),
});

export const problemDetailsSchema = z.object({
	type: z.string().meta({ example: "about:blank" }),
	title: z.string().meta({
		description: "The HTTP reason phrase for `status`.",
		example: "Not Found",
	}),
	status: z.number().int().meta({ example: 404 }),
	code: z.string().meta({
		description:
			"Stable and machine-readable. Clients branch and translate on this, never on `title` or `detail`.",
		example: "NOT_FOUND",
	}),
	detail: z.string().optional().meta({
		description: "What went wrong in this occurrence, in English.",
	}),
	instance: z.string().optional().meta({
		description: "The request path, without its query string.",
		example: "/api/projects",
	}),
	errors: z.array(fieldErrorSchema).optional().meta({
		description: "One entry per invalid input, present on `VALIDATION_FAILED`.",
	}),
	requested: z.int().optional().meta({
		description:
			"Units the request asked for from the free units, present on `NO_UNITS_LEFT`.",
		example: 80,
	}),
	available: z.int().optional().meta({
		description:
			"Units that were free when the request was refused, present on `NO_UNITS_LEFT`.",
		example: 30,
	}),
	used: z.int().optional().meta({
		description:
			"Units the project uses, present on `RESERVATION_BELOW_USED`: the least its reservation can be.",
		example: 250,
	}),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
