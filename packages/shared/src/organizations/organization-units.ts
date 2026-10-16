import { z } from "zod";

export const NO_UNITS_LEFT = "NO_UNITS_LEFT";

const unitCount = z.int().nonnegative();

export const organizationUnitsSchema = z.object({
	contracted: unitCount.meta({
		description: "Units bought by the organization: the sum of its licenses.",
		example: 500,
	}),
	reserved: unitCount.meta({
		description:
			"Units held by the reservations of all the organization's projects.",
		example: 320,
	}),
	free: unitCount.meta({
		description:
			"`contracted` minus `reserved`: the units a new project can still reserve.",
		example: 180,
	}),
	reclaimable: unitCount.meta({
		description:
			"Reserved but not used by projects in progress: what the admin can take back by lowering their reservations. Delivered projects hold none.",
		example: 120,
	}),
});

export type OrganizationUnits = z.infer<typeof organizationUnitsSchema>;
