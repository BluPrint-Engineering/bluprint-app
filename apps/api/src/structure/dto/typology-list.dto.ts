import { typologyListSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class TypologyListDto extends createZodDto(typologyListSchema) {}
