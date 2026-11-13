import { disciplineListSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class DisciplineListDto extends createZodDto(disciplineListSchema) {}
