import { createUnitTypeSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class CreateUnitTypeDto extends createZodDto(createUnitTypeSchema) {}
