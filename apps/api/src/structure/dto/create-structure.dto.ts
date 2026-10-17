import { createStructureSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class CreateStructureDto extends createZodDto(createStructureSchema) {}
