import { healthQuerySchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class HealthQueryDto extends createZodDto(healthQuerySchema) {}
