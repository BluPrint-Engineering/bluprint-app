import { locationDetailSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class LocationDetailDto extends createZodDto(locationDetailSchema) {}
