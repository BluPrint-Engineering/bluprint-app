import { changeTypologySchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ChangeTypologyDto extends createZodDto(changeTypologySchema) {}
