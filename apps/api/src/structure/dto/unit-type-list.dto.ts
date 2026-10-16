import { unitTypeListSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class UnitTypeListDto extends createZodDto(unitTypeListSchema) {}
