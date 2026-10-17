import { renameLocationSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class RenameLocationDto extends createZodDto(renameLocationSchema) {}
