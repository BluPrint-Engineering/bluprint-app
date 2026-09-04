import { STATUS_CODES } from "node:http";
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

/** Keeps every error body as `{ "error": "<HTTP reason>" }` instead of Nest's
 * default. Bare `@Catch()` so it also takes the router's NotFoundException. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		const isHttp = exception instanceof HttpException;
		const status = isHttp
			? exception.getStatus()
			: HttpStatus.INTERNAL_SERVER_ERROR;

		if (!isHttp) {
			console.error(exception);
		}

		host
			.switchToHttp()
			.getResponse<Response>()
			.status(status)
			.json({ error: STATUS_CODES[status] ?? "Error" });
	}
}
