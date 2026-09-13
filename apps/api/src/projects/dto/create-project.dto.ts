import { createProjectSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class CreateProjectDto extends createZodDto(createProjectSchema) {}
