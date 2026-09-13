import { ArgumentMetadata, HttpStatus, PipeTransform } from "@nestjs/common";
import { FieldError } from "@bluprint/shared";
import { ZodValidationException, ZodValidationPipe } from "nestjs-zod";
import { ProblemException } from "../problems/problem.exception";

interface Issue {
	code: string;
	path: PropertyKey[];
	message: string;
}

/** Wraps `nestjs-zod`'s pipe rather than configuring it: its exception factory
 * never learns whether the input was the body, the query or a param, and the
 * pointer needs it. */
export class RequestValidationPipe implements PipeTransform {
	private readonly zod = new ZodValidationPipe();

	transform(value: unknown, metadata: ArgumentMetadata): unknown {
		try {
			return this.zod.transform(value, metadata);
		} catch (error) {
			if (!(error instanceof ZodValidationException)) throw error;
			const errors = issuesOf(error.getZodError()).map((issue) =>
				fieldError(metadata.type, issue),
			);
			throw new ProblemException({
				status: HttpStatus.BAD_REQUEST,
				code: "VALIDATION_FAILED",
				detail:
					errors.length === 1
						? "1 input is invalid."
						: `${errors.length} inputs are invalid.`,
				errors,
			});
		}
	}
}

function issuesOf(zodError: unknown): Issue[] {
	return typeof zodError === "object" &&
		zodError !== null &&
		"issues" in zodError &&
		Array.isArray(zodError.issues)
		? (zodError.issues as Issue[])
		: [];
}

export function fieldError(location: string, issue: Issue): FieldError {
	const segments = [location, ...issue.path.map(String)].map((segment) =>
		segment.replaceAll("~", "~0").replaceAll("/", "~1"),
	);
	return {
		pointer: `/${segments.join("/")}`,
		code: issue.code.toUpperCase(),
		detail: issue.message,
	};
}
