import { organizationUnitsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class OrganizationUnitsDto extends createZodDto(
	organizationUnitsSchema,
) {}
