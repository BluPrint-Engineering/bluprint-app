import { projectParamsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ProjectParamsDto extends createZodDto(projectParamsSchema) {}
