import { renameRoomSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class RenameRoomDto extends createZodDto(renameRoomSchema) {}
