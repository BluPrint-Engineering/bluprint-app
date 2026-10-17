import { unitTypeSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class UnitTypeDto extends createZodDto(unitTypeSchema) {}
