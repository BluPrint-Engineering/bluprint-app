import { unitTypeParamsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class UnitTypeParamsDto extends createZodDto(unitTypeParamsSchema) {}
