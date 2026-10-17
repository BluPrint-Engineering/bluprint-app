import { locationRefSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class LocationRefDto extends createZodDto(locationRefSchema) {}
