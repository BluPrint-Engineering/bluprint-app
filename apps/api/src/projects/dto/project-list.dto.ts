import { projectListSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ProjectListDto extends createZodDto(projectListSchema) {}
