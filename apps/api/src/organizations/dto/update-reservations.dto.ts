import { updateReservationsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class UpdateReservationsDto extends createZodDto(
	updateReservationsSchema,
) {}
