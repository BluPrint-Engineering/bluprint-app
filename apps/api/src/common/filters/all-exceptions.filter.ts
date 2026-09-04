import { STATUS_CODES } from "node:http";
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

/**
 * Sustenta o contrato de erro da API: o corpo é sempre `{ "error": "<razão HTTP>" }`,
 * no lugar do corpo verboso que o Nest devolve por padrão. `@Catch()` sem argumento
 * pega também a NotFoundException que o router levanta em rota desconhecida.
 */
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
