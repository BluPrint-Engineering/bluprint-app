import { typologySchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class TypologyDto extends createZodDto(typologySchema) {}
