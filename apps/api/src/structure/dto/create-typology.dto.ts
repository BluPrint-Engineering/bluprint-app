import { createTypologySchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class CreateTypologyDto extends createZodDto(createTypologySchema) {}
