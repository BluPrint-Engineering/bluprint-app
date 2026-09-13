import { healthResponseSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class HealthResponseDto extends createZodDto(healthResponseSchema) {}
