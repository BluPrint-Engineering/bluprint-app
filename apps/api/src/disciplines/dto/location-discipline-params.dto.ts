import { locationDisciplineParamsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class LocationDisciplineParamsDto extends createZodDto(
	locationDisciplineParamsSchema,
) {}
