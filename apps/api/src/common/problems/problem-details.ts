import { STATUS_CODES } from "node:http";
import { FieldError, ProblemDetails } from "@bluprint/shared";

export const PROBLEM_JSON = "application/problem+json";

export interface ProblemInit {
	status: number;
	/** Defaults to the reason phrase in SCREAMING_SNAKE_CASE: 404 → `NOT_FOUND`. */
	code?: string | undefined;
	detail?: string | undefined;
	instance?: string | undefined;
	errors?: FieldError[] | undefined;
}

export function codeForStatus(status: number): string {
	return (STATUS_CODES[status] ?? "Error")
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, "_");
}

export function problemDetails({
	status,
	code,
	detail,
	instance,
	errors,
}: ProblemInit): ProblemDetails {
	return {
		type: "about:blank",
		title: STATUS_CODES[status] ?? "Error",
		status,
		code: code ?? codeForStatus(status),
		...(detail !== undefined && { detail }),
		...(instance !== undefined && { instance }),
		...(errors !== undefined && { errors }),
	};
}

export function instanceOf(url: string): string {
	return url.split("?")[0] ?? url;
}
