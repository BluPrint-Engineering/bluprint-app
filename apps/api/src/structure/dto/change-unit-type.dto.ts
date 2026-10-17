import { changeUnitTypeSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ChangeUnitTypeDto extends createZodDto(changeUnitTypeSchema) {}
