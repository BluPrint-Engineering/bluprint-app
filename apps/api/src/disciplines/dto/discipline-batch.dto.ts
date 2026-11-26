import { disciplineBatchSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class DisciplineBatchDto extends createZodDto(disciplineBatchSchema) {}
