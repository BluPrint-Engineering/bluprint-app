import { typologyParamsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class TypologyParamsDto extends createZodDto(typologyParamsSchema) {}
