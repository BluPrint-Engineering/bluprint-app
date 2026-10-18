import { subtreeRoomsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class SubtreeRoomsDto extends createZodDto(subtreeRoomsSchema) {}
