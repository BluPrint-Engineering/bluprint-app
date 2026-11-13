import { createDisciplineSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class CreateDisciplineDto extends createZodDto(createDisciplineSchema) {}
