import { setLocationDisciplineSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class SetLocationDisciplineDto extends createZodDto(
	setLocationDisciplineSchema,
) {}
