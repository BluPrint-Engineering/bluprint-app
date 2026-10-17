import { changeReservationSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ChangeReservationDto extends createZodDto(
	changeReservationSchema,
) {}
