import { roomParamsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class RoomParamsDto extends createZodDto(roomParamsSchema) {}
