import { addRoomSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class AddRoomDto extends createZodDto(addRoomSchema) {}
