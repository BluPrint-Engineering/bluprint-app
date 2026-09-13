import { projectSummarySchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ProjectSummaryDto extends createZodDto(projectSummarySchema) {}
