import { roomNamesSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class RoomNamesDto extends createZodDto(roomNamesSchema) {}
