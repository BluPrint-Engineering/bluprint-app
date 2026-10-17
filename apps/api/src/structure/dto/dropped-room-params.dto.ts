import { droppedRoomParamsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class DroppedRoomParamsDto extends createZodDto(
	droppedRoomParamsSchema,
) {}
