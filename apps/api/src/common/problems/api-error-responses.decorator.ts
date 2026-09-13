import { STATUS_CODES } from "node:http";
import { applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";
import { ProblemDetailsDto } from "./problem-details.dto";
import { PROBLEM_JSON, problemDetails } from "./problem-details";

/** Examples come from `problemDetails()`, the function the filter answers with,
 * so they cannot drift from a real response. */
export function ApiErrorResponses(...statuses: number[]): MethodDecorator {
	return applyDecorators(
		ApiExtraModels(ProblemDetailsDto),
		...statuses.map((status) =>
			ApiResponse({
				status,
				description: STATUS_CODES[status] ?? "Error",
				content: {
					[PROBLEM_JSON]: {
						schema: { $ref: getSchemaPath(ProblemDetailsDto) },
						example: exampleFor(status),
					},
				},
			}),
		),
	);
}

export function exampleFor(status: number) {
	return status === 400
		? problemDetails({
				status,
				code: "VALIDATION_FAILED",
				detail: "1 input is invalid.",
				errors: [
					{
						pointer: "/body/name",
						code: "TOO_SMALL",
						detail: "Too small: expected string to have >=1 characters",
					},
				],
			})
		: problemDetails({ status });
}
