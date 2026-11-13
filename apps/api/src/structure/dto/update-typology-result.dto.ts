import { updateTypologyResultSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class UpdateTypologyResultDto extends createZodDto(
	updateTypologyResultSchema,
) {}
