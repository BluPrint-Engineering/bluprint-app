import { removeLocationResultSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class RemoveLocationResultDto extends createZodDto(
	removeLocationResultSchema,
) {}
