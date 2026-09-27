import { projectListQuerySchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ProjectListQueryDto extends createZodDto(projectListQuerySchema) {}
