import { locationParamsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class LocationParamsDto extends createZodDto(locationParamsSchema) {}
