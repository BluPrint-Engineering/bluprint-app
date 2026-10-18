import { moveLocationSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class MoveLocationDto extends createZodDto(moveLocationSchema) {}
