import { updateTypologySchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class UpdateTypologyDto extends createZodDto(updateTypologySchema) {}
