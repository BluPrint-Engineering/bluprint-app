import { organizationReservationsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class OrganizationReservationsDto extends createZodDto(
	organizationReservationsSchema,
) {}
