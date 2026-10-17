import { updateUnitTypeResultSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class UpdateUnitTypeResultDto extends createZodDto(
	updateUnitTypeResultSchema,
) {}
