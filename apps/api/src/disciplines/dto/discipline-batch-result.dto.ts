import { disciplineBatchResultSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class DisciplineBatchResultDto extends createZodDto(
	disciplineBatchResultSchema,
) {}
