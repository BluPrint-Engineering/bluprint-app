import { createStructureResultSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class CreateStructureResultDto extends createZodDto(
	createStructureResultSchema,
) {}
