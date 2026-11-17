import { locationDisciplinesSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class LocationDisciplinesDto extends createZodDto(
	locationDisciplinesSchema,
) {}
