import { structureSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class StructureDto extends createZodDto(structureSchema) {}
