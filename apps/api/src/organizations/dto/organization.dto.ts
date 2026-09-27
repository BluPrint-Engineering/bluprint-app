import { organizationSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class OrganizationDto extends createZodDto(organizationSchema) {}
