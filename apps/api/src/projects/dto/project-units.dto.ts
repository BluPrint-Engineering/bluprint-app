import { projectUnitsBalanceSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ProjectUnitsDto extends createZodDto(projectUnitsBalanceSchema) {}
