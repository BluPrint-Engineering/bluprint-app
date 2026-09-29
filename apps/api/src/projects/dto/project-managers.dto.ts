import { projectManagersSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ProjectManagersDto extends createZodDto(projectManagersSchema) {}
