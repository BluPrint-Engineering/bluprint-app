import { updateUnitTypeSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class UpdateUnitTypeDto extends createZodDto(updateUnitTypeSchema) {}
