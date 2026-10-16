import { renameProjectSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class RenameProjectDto extends createZodDto(renameProjectSchema) {}
