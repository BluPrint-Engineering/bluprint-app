import { problemDetailsSchema } from "@bluprint/shared";
import { createZodDto } from "nestjs-zod";

export class ProblemDetailsDto extends createZodDto(problemDetailsSchema) {}
